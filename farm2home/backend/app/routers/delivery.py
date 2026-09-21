from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.order import Order, OrderItem
from app.models.delivery import DeliveryProfile, Delivery
from app.models.user import User
from app.models.farmer import FarmerProfile
from app.models.notification import Notification
from app.core.jwt_handler import get_current_user_token, require_role

router = APIRouter(prefix="/delivery", tags=["Delivery"])

class StatusUpdateRequest(BaseModel):
    status: str  # accepted, picked_up, out_for_delivery, delivered, cancelled
    proof_url: Optional[str] = None
    otp: Optional[str] = None

class DutyToggleRequest(BaseModel):
    is_on_duty: bool

def assign_delivery_leg(delivery: Delivery, db: Session, exclude_agent_id: Optional[int] = None) -> bool:
    """
    Attempts to assign an unassigned delivery leg to an on-duty delivery agent.
    If exclude_agent_id is provided, avoids assigning to that agent.
    """
    query = db.query(DeliveryProfile).filter(DeliveryProfile.is_on_duty == True)
    if exclude_agent_id:
        query = query.filter(DeliveryProfile.id != exclude_agent_id)
    candidates = query.all()
    if not candidates:
        delivery.delivery_agent_id = None
        delivery.status = "unassigned"
        delivery.assigned_at = None
        db.commit()
        return False

    chosen = candidates[0]
    delivery.delivery_agent_id = chosen.id
    delivery.status = "assigned"
    delivery.assigned_at = datetime.utcnow()

    if chosen.user_id:
        ord_num = delivery.order.order_number if delivery.order else f"ORD-{delivery.order_id}"
        notif = Notification(
            user_id=chosen.user_id,
            title=f"Delivery Assigned #{ord_num}",
            message=f"New pickup assigned from {delivery.farmer.farm_name if delivery.farmer else 'Farm'} for order #{ord_num}.",
            type="delivery"
        )
        db.add(notif)

    db.commit()
    return True

def create_order_delivery_legs(order: Order, db: Session) -> List[Delivery]:
    """
    Creates one Delivery leg per unique farmer represented in the order items,
    and assigns to available on-duty delivery agents (or marks unassigned if none).
    """
    existing_legs = db.query(Delivery).filter(Delivery.order_id == order.id).all()
    if existing_legs:
        return existing_legs

    farmers_dict = {}
    for item in order.items:
        f = item.farmer or (item.product.farmer if item.product else None)
        if f and f.id not in farmers_dict:
            farmers_dict[f.id] = f

    if not farmers_dict:
        return []

    on_duty_agents = db.query(DeliveryProfile).filter(DeliveryProfile.is_on_duty == True).all()

    legs = []
    for idx, (farmer_id, farmer) in enumerate(farmers_dict.items()):
        fname = farmer.farm_name or (farmer.user.full_name if farmer.user else "Farm")
        floc = farmer.location or farmer.district or "Tamil Nadu"
        pickup_addr = f"{fname}, {floc}"

        assigned_agent = None
        status_val = "unassigned"
        assigned_at = None

        if on_duty_agents:
            assigned_agent = on_duty_agents[idx % len(on_duty_agents)]
            status_val = "assigned"
            assigned_at = datetime.utcnow()

        leg = Delivery(
            order_id=order.id,
            farmer_id=farmer.id,
            delivery_agent_id=assigned_agent.id if assigned_agent else None,
            pickup_address=pickup_addr,
            drop_address=order.delivery_address,
            pickup_lat=order.pickup_lat or 10.79,
            pickup_lng=order.pickup_lng or 79.13,
            drop_lat=order.drop_lat or 10.81,
            drop_lng=order.drop_lng or 79.15,
            status=status_val,
            assigned_at=assigned_at,
            payout_amount=65.0,
            distance_km=4.5
        )
        db.add(leg)
        legs.append(leg)

        if assigned_agent and assigned_agent.user_id:
            notif = Notification(
                user_id=assigned_agent.user_id,
                title=f"New Delivery Assignment #{order.order_number}",
                message=f"New pickup assigned from {fname} for order #{order.order_number}.",
                type="delivery"
            )
            db.add(notif)

    if legs and legs[0].delivery_agent_id:
        order.delivery_agent_id = legs[0].delivery_agent_id

    db.flush()
    return legs

@router.get("/dashboard")
def get_delivery_dashboard(
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    # Strictly filter active deliveries by THIS driver's ID
    active_legs = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_agent_id == driver.id,
            Delivery.status.in_(["assigned", "accepted", "picked_up", "out_for_delivery"])
        )
        .order_by(Delivery.created_at.desc())
        .all()
    )

    active_deliveries = []
    for leg in active_legs:
        o = leg.order
        farmer = leg.farmer

        # Produce summary specific to this farmer's leg
        f_items = [it for it in (o.items if o else []) if it.farmer_id == leg.farmer_id]
        total_weight = sum(it.quantity for it in f_items)
        items_summary = f"{total_weight:.1f} kg farm produce" if total_weight > 0 else "Fresh farm produce"
        if f_items:
            names = [f"{it.product.name if it.product else 'Produce'} ({it.quantity}{it.product.unit if it.product else 'kg'})" for it in f_items]
            items_summary = ", ".join(names)

        active_deliveries.append({
            "delivery_id": leg.id,
            "order_id": leg.order_id,
            "order_number": o.order_number if o else f"ORD-{leg.order_id}",
            "status": leg.status,
            "pickup_name": farmer.farm_name or (farmer.user.full_name if farmer and farmer.user else "Farm"),
            "pickup_address": leg.pickup_address,
            "pickup_phone": farmer.user.phone if farmer and farmer.user and farmer.user.phone else "+91 98765 43210",
            "drop_name": o.customer.user.full_name if o and o.customer and o.customer.user else "Customer",
            "drop_address": leg.drop_address,
            "drop_phone": o.customer.user.phone if o and o.customer and o.customer.user else "",
            "items_summary": items_summary,
            "payout": leg.payout_amount,
            "distance_km": leg.distance_km,
            "est_time_mins": max(12, int(leg.distance_km * 4)),
            "pickup_lat": leg.pickup_lat or 10.79,
            "pickup_lng": leg.pickup_lng or 79.13,
            "drop_lat": leg.drop_lat or 10.81,
            "drop_lng": leg.drop_lng or 79.15
        })

    # Upcoming jobs: genuinely unassigned jobs available in pool for on-duty drivers
    upcoming_legs = []
    if driver.is_on_duty:
        unassigned_query = db.query(Delivery).filter(Delivery.status == "unassigned").limit(4).all()
        for u in unassigned_query:
            u_farm = u.farmer.farm_name if u.farmer else "Local Farm"
            drop_loc = u.drop_address.split(",")[-2].strip() if "," in u.drop_address else (u.drop_address or "Customer Area")
            upcoming_legs.append({
                "delivery_id": u.id,
                "order_id": u.order_id,
                "order_number": u.order.order_number if u.order else f"ORD-{u.order_id}",
                "pickup_area": u_farm,
                "drop_area": drop_loc,
                "distance_km": u.distance_km,
                "payout": u.payout_amount
            })

    return {
        "agent_name": driver.user.full_name if driver.user else "Delivery Partner",
        "is_on_duty": driver.is_on_duty,
        "stats": {
            "total_deliveries_today": driver.total_deliveries,
            "completed_today": driver.completed_today
        },
        "active_deliveries": active_deliveries,
        "upcoming_deliveries": upcoming_legs
    }

@router.post("/toggle-duty")
@router.patch("/availability")
def toggle_duty(
    req: DutyToggleRequest,
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    driver.is_on_duty = req.is_on_duty
    db.commit()
    return {"message": "Duty status updated", "is_on_duty": driver.is_on_duty}

@router.post("/orders/{order_id}/update-status")
@router.post("/legs/{order_id}/update-status")
def update_delivery_status(
    order_id: int,
    req: StatusUpdateRequest,
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    # Match by delivery ID first, then by order ID for this driver
    leg = db.query(Delivery).filter(Delivery.id == order_id, Delivery.delivery_agent_id == driver.id).first()
    if not leg:
        leg = db.query(Delivery).filter(Delivery.order_id == order_id, Delivery.delivery_agent_id == driver.id).first()

    if not leg:
        raise HTTPException(status_code=404, detail="Assigned delivery leg not found for this driver")

    allowed_statuses = ["accepted", "picked_up", "out_for_delivery", "delivered", "cancelled"]
    if req.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status: {req.status}")

    leg.status = req.status
    now = datetime.utcnow()
    if req.status == "picked_up":
        leg.picked_up_at = now
    elif req.status == "delivered":
        leg.delivered_at = now
        if req.proof_url:
            leg.proof_of_delivery_url = req.proof_url
        if req.otp:
            leg.delivery_otp = req.otp

        driver.completed_today += 1
        driver.total_deliveries += 1
        driver.total_earnings += leg.payout_amount

    # Update overall order status if all legs are complete
    order = leg.order
    if order:
        all_legs = db.query(Delivery).filter(Delivery.order_id == order.id).all()
        if all_legs and all(l.status == "delivered" for l in all_legs):
            order.status = "delivered"
        elif any(l.status in ["out_for_delivery", "picked_up"] for l in all_legs):
            order.status = "out_for_delivery"

    db.commit()
    return {"message": f"Delivery status updated to {req.status}", "status": leg.status, "delivery_id": leg.id}

@router.post("/orders/{order_id}/reject")
@router.post("/legs/{order_id}/reject")
def reject_delivery(
    order_id: int,
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    leg = db.query(Delivery).filter(Delivery.id == order_id, Delivery.delivery_agent_id == driver.id).first()
    if not leg:
        leg = db.query(Delivery).filter(Delivery.order_id == order_id, Delivery.delivery_agent_id == driver.id).first()

    if not leg:
        raise HTTPException(status_code=404, detail="Assigned delivery leg not found for this driver")

    prev_agent_id = driver.id
    leg.delivery_agent_id = None
    leg.status = "unassigned"
    leg.assigned_at = None
    db.commit()

    # Reassign to another on-duty agent if available
    reassigned = assign_delivery_leg(leg, db, exclude_agent_id=prev_agent_id)

    return {
        "message": "Delivery rejected and returned to pool",
        "status": leg.status,
        "reassigned": reassigned,
        "delivery_id": leg.id
    }

@router.get("/route")
def get_delivery_route(
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    active_legs = db.query(Delivery).filter(
        Delivery.delivery_agent_id == driver.id,
        Delivery.status.in_(["assigned", "accepted", "picked_up", "out_for_delivery"])
    ).all()

    stops = []
    for leg in active_legs:
        ord_num = leg.order.order_number if leg.order else f"ORD-{leg.order_id}"
        farm_name = leg.farmer.farm_name if leg.farmer else "Farm"

        if leg.status in ["assigned", "accepted"]:
            stops.append({
                "type": "pickup",
                "order_id": leg.order_id,
                "delivery_id": leg.id,
                "lat": leg.pickup_lat or 10.79,
                "lng": leg.pickup_lng or 79.13,
                "address": leg.pickup_address,
                "name": f"Pickup from {farm_name} ({ord_num})"
            })
        if leg.status in ["assigned", "accepted", "picked_up", "out_for_delivery"]:
            cust_name = leg.order.customer.user.full_name if leg.order and leg.order.customer and leg.order.customer.user else "Customer"
            stops.append({
                "type": "drop",
                "order_id": leg.order_id,
                "delivery_id": leg.id,
                "lat": leg.drop_lat or 10.81,
                "lng": leg.drop_lng or 79.15,
                "address": leg.drop_address,
                "name": f"Drop to {cust_name} ({ord_num})"
            })

    return {
        "route": stops,
        "estimated_total_distance": round(sum(leg.distance_km for leg in active_legs), 1) if active_legs else 0.0
    }

@router.get("/history")
def get_delivery_history(
    page: int = 1,
    limit: int = 10,
    status: Optional[str] = None,
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    query = db.query(Delivery).filter(
        Delivery.delivery_agent_id == driver.id,
        Delivery.status.in_(["delivered", "cancelled"])
    )
    if status:
        query = query.filter(Delivery.status == status)

    deliveries = query.order_by(Delivery.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()

    history_list = []
    for d in deliveries:
        history_list.append({
            "id": d.id,
            "order_id": d.order_id,
            "order_number": d.order.order_number if d.order else f"ORD-{d.order_id}",
            "date": d.delivered_at.isoformat() if d.delivered_at else (d.updated_at.isoformat() if d.updated_at else datetime.utcnow().isoformat()),
            "pickup_name": d.farmer.farm_name if d.farmer else "Farm",
            "drop_name": d.order.customer.user.full_name if d.order and d.order.customer and d.order.customer.user else "Customer",
            "distance": d.distance_km,
            "payout": d.payout_amount,
            "status": d.status
        })

    total_count = query.count()
    return {
        "history": history_list,
        "page": page,
        "total_pages": max(1, (total_count + limit - 1) // limit)
    }

@router.get("/earnings")
def get_delivery_earnings(
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    delivered_legs = db.query(Delivery).filter(
        Delivery.delivery_agent_id == driver.id,
        Delivery.status == "delivered"
    ).all()

    real_total = sum(d.payout_amount for d in delivered_legs) + driver.total_earnings

    trx_list = [
        {
            "id": f"LEG-{d.id}",
            "date": d.delivered_at.isoformat() if d.delivered_at else datetime.utcnow().isoformat(),
            "order_number": d.order.order_number if d.order else f"ORD-{d.order_id}",
            "distance": d.distance_km,
            "payout": d.payout_amount,
            "status": "settled"
        }
        for d in delivered_legs
    ]

    return {
        "total_earnings": round(real_total, 2),
        "this_month": round(real_total, 2),
        "pending_settlement": 0.0,
        "paid_out": round(real_total, 2),
        "transactions": trx_list
    }
