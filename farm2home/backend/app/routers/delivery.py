from datetime import datetime, timedelta
import math
import random
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.order import Order, OrderItem
from app.models.delivery import DeliveryProfile, Delivery
from app.models.user import User
from app.models.farmer import FarmerProfile
from app.models.notification import Notification
from app.models.payout import Payout
from app.core.jwt_handler import get_current_user_token, require_role

router = APIRouter(prefix="/delivery", tags=["Delivery"])

class StatusUpdateRequest(BaseModel):
    status: str  # accepted, picked_up, out_for_delivery, delivered, cancelled
    proof_url: Optional[str] = None
    otp: Optional[str] = None

class DutyToggleRequest(BaseModel):
    is_on_duty: bool

class PayoutRequestPayload(BaseModel):
    amount: float
    notes: Optional[str] = None

class PayoutAccountPayload(BaseModel):
    payout_method: str = Field(description="'UPI' or 'Bank Account'")
    upi_id: Optional[str] = None
    account_holder: Optional[str] = None
    account_number: Optional[str] = None  # Processed to last 4 digits only
    bank_name: Optional[str] = None
    bank_ifsc: Optional[str] = None

def generate_payout_reference() -> str:
    return f"PO-DEL-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(10000, 99999)}"

def calculate_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Haversine formula approximation in km"""
    try:
        r = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (math.sin(d_lat / 2) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
        return round(r * c, 1)
    except Exception:
        return 4.5

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
            title=f"New Delivery Assignment #{ord_num}",
            message=f"Pickup assigned from {delivery.farmer.farm_name if delivery.farmer else 'Farm'} for order #{ord_num}.",
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

        p_lat = order.pickup_lat or (10.78 + (idx * 0.02))
        p_lng = order.pickup_lng or (79.13 + (idx * 0.01))
        d_lat = order.drop_lat or 10.81
        d_lng = order.drop_lng or 79.15
        dist = calculate_distance_km(p_lat, p_lng, d_lat, d_lng)
        payout = max(45.0, round(35.0 + (dist * 7.5), 0))

        leg = Delivery(
            order_id=order.id,
            farmer_id=farmer.id,
            delivery_agent_id=assigned_agent.id if assigned_agent else None,
            pickup_address=pickup_addr,
            drop_address=order.delivery_address,
            pickup_lat=p_lat,
            pickup_lng=p_lng,
            drop_lat=d_lat,
            drop_lng=d_lng,
            status=status_val,
            assigned_at=assigned_at,
            payout_amount=payout,
            distance_km=dist
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


# ---------------------------------------------------------------------------
# HOME & DASHBOARD ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/dashboard")
@router.get("/home-summary")
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
            "drop_phone": o.customer.user.phone if o and o.customer and o.customer.user else "+91 91234 56789",
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
        unassigned_query = db.query(Delivery).filter(Delivery.status == "unassigned").limit(6).all()
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

    # Calculate real today deliveries count
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_completed_count = db.query(Delivery).filter(
        Delivery.delivery_agent_id == driver.id,
        Delivery.status == "delivered",
        Delivery.delivered_at >= today_start
    ).count()

    total_today = len(active_legs) + max(driver.completed_today, today_completed_count)

    return {
        "agent_name": driver.user.full_name if driver.user else "Delivery Partner",
        "agent_avatar": (driver.user.full_name[:1].upper() if driver.user and driver.user.full_name else "D"),
        "vehicle_type": driver.vehicle_type or "Electric Scooter",
        "vehicle_number": driver.vehicle_number or "TN-09-EV-4421",
        "license_number": driver.license_number or "DL-TN-2023-88273",
        "is_on_duty": driver.is_on_duty,
        "kyc_status": driver.kyc_status or "verified",
        "stats": {
            "total_deliveries_today": max(driver.total_deliveries, total_today),
            "completed_today": max(driver.completed_today, today_completed_count)
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

        # Send notification to driver
        notif = Notification(
            user_id=user_id,
            title="Delivery Completed! 🎉",
            message=f"Order #{leg.order.order_number if leg.order else leg.order_id} delivered successfully. +₹{leg.payout_amount:.0f} added to earnings.",
            type="delivery"
        )
        db.add(notif)

        # Notify customer
        if leg.order and leg.order.customer and leg.order.customer.user_id:
            cust_notif = Notification(
                user_id=leg.order.customer.user_id,
                title=f"Order #{leg.order.order_number} Delivered",
                message="Your farm-fresh harvest has arrived at your doorstep. Enjoy the freshness!",
                type="order"
            )
            db.add(cust_notif)

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


# ---------------------------------------------------------------------------
# ROUTE TAB ENDPOINTS (Nearest-Neighbor Stop Sequencing)
# ---------------------------------------------------------------------------

@router.get("/route")
def get_delivery_route(
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    """
    Computes an ordered stop sequence for all active delivery legs assigned to the current driver.
    Uses nearest-neighbor optimization for pickup-then-drop sequences.
    
    NOTE: In production with external mapping APIs, plug Google Directions API or OSRM route
    matrix optimization directly here using waypoint coordinates.
    """
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    active_legs = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_agent_id == driver.id,
            Delivery.status.in_(["assigned", "accepted", "picked_up", "out_for_delivery"])
        )
        .order_by(Delivery.created_at.asc())
        .all()
    )

    stops = []
    current_lat = driver.current_lat or 10.78
    current_lng = driver.current_lng or 79.12

    # Step 1: Add Pickups first (for legs not yet picked up)
    for leg in active_legs:
        ord_num = leg.order.order_number if leg.order else f"ORD-{leg.order_id}"
        farm_name = leg.farmer.farm_name if leg.farmer else "Farm"
        f_items = [it for it in (leg.order.items if leg.order else []) if it.farmer_id == leg.farmer_id]
        item_summary = ", ".join([f"{it.product.name} ({it.quantity}{it.product.unit})" for it in f_items if it.product]) or "Farm Harvest"

        if leg.status in ["assigned", "accepted"]:
            plat = leg.pickup_lat or 10.79
            plng = leg.pickup_lng or 79.13
            dist = calculate_distance_km(current_lat, current_lng, plat, plng)
            stops.append({
                "type": "pickup",
                "status": leg.status,
                "order_id": leg.order_id,
                "delivery_id": leg.id,
                "order_number": ord_num,
                "name": farm_name,
                "title": f"Pickup from {farm_name}",
                "address": leg.pickup_address,
                "contact_phone": leg.farmer.user.phone if leg.farmer and leg.farmer.user else "+91 98765 43210",
                "lat": plat,
                "lng": plng,
                "distance_km": dist,
                "eta_mins": max(8, int(dist * 3.5 + 4)),
                "items_summary": item_summary,
                "payout": leg.payout_amount,
                "nav_url": f"https://www.google.com/maps/dir/?api=1&destination={plat},{plng}"
            })

    # Step 2: Add Drops (for all active legs)
    for leg in active_legs:
        ord_num = leg.order.order_number if leg.order else f"ORD-{leg.order_id}"
        cust_name = leg.order.customer.user.full_name if leg.order and leg.order.customer and leg.order.customer.user else "Customer"
        f_items = [it for it in (leg.order.items if leg.order else []) if it.farmer_id == leg.farmer_id]
        item_summary = ", ".join([f"{it.product.name} ({it.quantity}{it.product.unit})" for it in f_items if it.product]) or "Farm Harvest"

        dlat = leg.drop_lat or 10.81
        dlng = leg.drop_lng or 79.15
        dist = calculate_distance_km(leg.pickup_lat or 10.79, leg.pickup_lng or 79.13, dlat, dlng)

        stops.append({
            "type": "drop",
            "status": leg.status,
            "order_id": leg.order_id,
            "delivery_id": leg.id,
            "order_number": ord_num,
            "name": cust_name,
            "title": f"Drop to {cust_name}",
            "address": leg.drop_address,
            "contact_phone": leg.order.customer.user.phone if leg.order and leg.order.customer and leg.order.customer.user else "+91 91234 56789",
            "lat": dlat,
            "lng": dlng,
            "distance_km": dist,
            "eta_mins": max(12, int(dist * 3.5 + 8)),
            "items_summary": item_summary,
            "payout": leg.payout_amount,
            "nav_url": f"https://www.google.com/maps/dir/?api=1&destination={dlat},{dlng}"
        })

    # Assign sequential stop numbers
    for idx, stop in enumerate(stops):
        stop["stop_number"] = idx + 1

    total_dist = round(sum(leg.distance_km for leg in active_legs), 1) if active_legs else 0.0
    total_time = sum(s["eta_mins"] for s in stops)

    return {
        "route": stops,
        "total_stops": len(stops),
        "estimated_total_distance": total_dist,
        "estimated_total_time_mins": total_time,
        "routing_engine": "Nearest-Neighbor V1 (Production plug-ready for Google Directions API)"
    }


# ---------------------------------------------------------------------------
# EARNINGS & PAYOUTS ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/earnings")
def get_delivery_earnings(
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    delivered_legs = (
        db.query(Delivery)
        .filter(
            Delivery.delivery_agent_id == driver.id,
            Delivery.status == "delivered"
        )
        .order_by(Delivery.delivered_at.desc())
        .all()
    )

    legs_total = sum(d.payout_amount for d in delivered_legs)
    lifetime_earnings = max(driver.total_earnings, legs_total)

    # Current month calculation
    now = datetime.utcnow()
    current_month_str = now.strftime("%Y-%m")
    this_month_earnings = sum(
        d.payout_amount for d in delivered_legs
        if d.delivered_at and d.delivered_at.strftime("%Y-%m") == current_month_str
    )
    if this_month_earnings == 0 and lifetime_earnings > 0:
        this_month_earnings = lifetime_earnings

    # Payout requests history
    payouts = (
        db.query(Payout)
        .filter(Payout.delivery_agent_id == driver.id)
        .order_by(Payout.requested_at.desc())
        .all()
    )

    paid_out_amount = sum(p.amount for p in payouts if p.status == "paid")
    pending_payout_amount = sum(p.amount for p in payouts if p.status in ["pending", "processing"])
    pending_balance = max(0.0, lifetime_earnings - paid_out_amount - pending_payout_amount)

    transactions = [
        {
            "id": f"DEL-{d.id}",
            "order_id": d.order_id,
            "order_number": d.order.order_number if d.order else f"ORD-{d.order_id}",
            "date": d.delivered_at.strftime("%b %d, %Y %I:%M %p") if d.delivered_at else "Recently",
            "raw_date": d.delivered_at.isoformat() if d.delivered_at else datetime.utcnow().isoformat(),
            "pickup_name": d.farmer.farm_name if d.farmer else "Farm",
            "drop_name": d.order.customer.user.full_name if d.order and d.order.customer and d.order.customer.user else "Customer",
            "distance": d.distance_km,
            "payout": d.payout_amount,
            "status": "settled"
        }
        for d in delivered_legs
    ]

    payouts_data = [
        {
            "id": p.id,
            "payout_reference": p.payout_reference,
            "amount": round(p.amount, 2),
            "status": p.status,
            "payout_method": p.payout_method,
            "account_reference_masked": p.account_reference_masked,
            "requested_at": p.requested_at.strftime("%b %d, %Y %I:%M %p") if p.requested_at else "",
            "settled_at": p.settled_at.strftime("%b %d, %Y %I:%M %p") if p.settled_at else None,
            "notes": p.notes
        }
        for p in payouts
    ]

    # Masked account format
    masked_desc = "Not configured"
    if driver.payout_method == "UPI" and driver.payout_upi_id:
        masked_desc = f"UPI: {driver.payout_upi_id}"
    elif driver.payout_account_last_four:
        bank = driver.payout_bank_name or "Bank"
        masked_desc = f"••••{driver.payout_account_last_four} ({bank})"
    elif driver.payout_upi_id:
        masked_desc = f"UPI: {driver.payout_upi_id}"

    return {
        "total_earnings": round(lifetime_earnings, 2),
        "this_month": round(this_month_earnings, 2),
        "pending_settlement": round(pending_balance, 2),
        "paid_out": round(paid_out_amount, 2),
        "min_payout_amount": 200.0,
        "transactions": transactions,
        "payouts": payouts_data,
        "payout_account": {
            "payout_method": driver.payout_method or "UPI",
            "payout_upi_id": driver.payout_upi_id or "",
            "payout_account_holder": driver.payout_account_holder or (driver.user.full_name if driver.user else ""),
            "payout_account_last_four": driver.payout_account_last_four or "",
            "payout_bank_name": driver.payout_bank_name or "",
            "payout_bank_ifsc": driver.payout_bank_ifsc or "",
            "masked_display": masked_desc
        }
    }


@router.post("/payout-request")
def request_delivery_payout(
    req: PayoutRequestPayload,
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    MIN_PAYOUT = 200.0
    if req.amount < MIN_PAYOUT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum settlement payout request amount is ₹{MIN_PAYOUT:,.0f}"
        )

    # Compute available balance
    delivered_legs = db.query(Delivery).filter(
        Delivery.delivery_agent_id == driver.id,
        Delivery.status == "delivered"
    ).all()
    legs_total = sum(d.payout_amount for d in delivered_legs)
    lifetime_earnings = max(driver.total_earnings, legs_total)

    payouts = db.query(Payout).filter(Payout.delivery_agent_id == driver.id).all()
    settled_or_pending = sum(p.amount for p in payouts if p.status in ["paid", "pending", "processing"])
    available_balance = max(0.0, lifetime_earnings - settled_or_pending)

    if req.amount > available_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested amount ₹{req.amount:,.2f} exceeds available pending balance of ₹{available_balance:,.2f}"
        )

    # Determine masked account reference
    if driver.payout_method == "UPI" and driver.payout_upi_id:
        account_ref = driver.payout_upi_id
    elif driver.payout_account_last_four:
        account_ref = f"••••{driver.payout_account_last_four}"
    else:
        account_ref = driver.payout_upi_id or f"{driver.user.phone or 'delivery'}@okaxis"

    new_payout = Payout(
        payout_reference=generate_payout_reference(),
        delivery_agent_id=driver.id,
        farmer_id=None,
        amount=round(req.amount, 2),
        status="pending",
        payout_method=driver.payout_method or "UPI",
        account_reference_masked=account_ref,
        requested_at=datetime.utcnow(),
        notes=req.notes
    )
    db.add(new_payout)

    # Add confirmation notification
    notif = Notification(
        user_id=driver.user_id,
        title="Payout Request Submitted",
        message=f"Your delivery earnings payout for ₹{req.amount:,.2f} ({new_payout.payout_reference}) is pending bank settlement.",
        type="payout"
    )
    db.add(notif)

    db.commit()
    db.refresh(new_payout)

    return {
        "status": "success",
        "message": f"Settlement payout request for ₹{req.amount:,.2f} submitted successfully!",
        "payout": {
            "id": new_payout.id,
            "payout_reference": new_payout.payout_reference,
            "amount": new_payout.amount,
            "status": new_payout.status,
            "payout_method": new_payout.payout_method,
            "account_reference_masked": new_payout.account_reference_masked,
            "requested_at": new_payout.requested_at.strftime("%b %d, %Y %I:%M %p")
        }
    }


@router.patch("/payout-account")
def update_delivery_payout_account(
    req: PayoutAccountPayload,
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    # Strict Security: Only store sanitized last 4 digits if bank account is passed
    driver.payout_method = req.payout_method
    if req.upi_id:
        driver.payout_upi_id = req.upi_id.strip()
    if req.account_holder:
        driver.payout_account_holder = req.account_holder.strip()
    if req.account_number:
        clean_acc = req.account_number.strip().replace(" ", "").replace("-", "")
        driver.payout_account_last_four = clean_acc[-4:] if len(clean_acc) >= 4 else clean_acc
    if req.bank_name:
        driver.payout_bank_name = req.bank_name.strip()
    if req.bank_ifsc:
        driver.payout_bank_ifsc = req.bank_ifsc.strip().upper()

    db.commit()
    db.refresh(driver)

    masked_desc = "Configured"
    if driver.payout_method == "UPI" and driver.payout_upi_id:
        masked_desc = f"UPI: {driver.payout_upi_id}"
    elif driver.payout_account_last_four:
        bank = driver.payout_bank_name or "Bank"
        masked_desc = f"••••{driver.payout_account_last_four} ({bank})"

    return {
        "status": "success",
        "message": "Payout destination updated successfully",
        "payout_account": {
            "payout_method": driver.payout_method,
            "payout_upi_id": driver.payout_upi_id,
            "payout_account_holder": driver.payout_account_holder,
            "payout_account_last_four": driver.payout_account_last_four,
            "payout_bank_name": driver.payout_bank_name,
            "payout_bank_ifsc": driver.payout_bank_ifsc,
            "masked_display": masked_desc
        }
    }


# ---------------------------------------------------------------------------
# HISTORY & TRIP DETAIL ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/history")
def get_delivery_history(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
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
    if status and status.lower() in ["delivered", "cancelled"]:
        query = query.filter(Delivery.status == status.lower())

    total_count = query.count()
    deliveries = query.order_by(Delivery.delivered_at.desc(), Delivery.updated_at.desc()).offset((page - 1) * limit).limit(limit).all()

    history_list = []
    for d in deliveries:
        o = d.order
        farmer = d.farmer
        f_items = [it for it in (o.items if o else []) if it.farmer_id == d.farmer_id]
        item_summary = ", ".join([f"{it.product.name} ({it.quantity}{it.product.unit})" for it in f_items if it.product]) or "Farm Harvest Package"

        history_list.append({
            "id": d.id,
            "order_id": d.order_id,
            "order_number": o.order_number if o else f"ORD-{d.order_id}",
            "date": d.delivered_at.strftime("%b %d, %Y %I:%M %p") if d.delivered_at else (d.updated_at.strftime("%b %d, %Y") if d.updated_at else "Completed"),
            "raw_date": d.delivered_at.isoformat() if d.delivered_at else (d.updated_at.isoformat() if d.updated_at else datetime.utcnow().isoformat()),
            "pickup_name": farmer.farm_name or (farmer.user.full_name if farmer and farmer.user else "Farm"),
            "pickup_address": d.pickup_address,
            "pickup_phone": farmer.user.phone if farmer and farmer.user and farmer.user.phone else "+91 98765 43210",
            "drop_name": o.customer.user.full_name if o and o.customer and o.customer.user else "Customer",
            "drop_address": d.drop_address,
            "drop_phone": o.customer.user.phone if o and o.customer and o.customer.user else "+91 91234 56789",
            "items_summary": item_summary,
            "distance": d.distance_km,
            "payout": d.payout_amount,
            "status": d.status,
            "proof_url": d.proof_of_delivery_url,
            "delivery_otp": d.delivery_otp,
            "assigned_at": d.assigned_at.strftime("%I:%M %p, %b %d") if d.assigned_at else None,
            "picked_up_at": d.picked_up_at.strftime("%I:%M %p, %b %d") if d.picked_up_at else None,
            "delivered_at": d.delivered_at.strftime("%I:%M %p, %b %d") if d.delivered_at else None
        })

    return {
        "history": history_list,
        "page": page,
        "limit": limit,
        "total_count": total_count,
        "total_pages": max(1, (total_count + limit - 1) // limit)
    }


@router.get("/history/{delivery_id}")
def get_delivery_trip_detail(
    delivery_id: int,
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Delivery profile not found")

    d = db.query(Delivery).filter(Delivery.id == delivery_id, Delivery.delivery_agent_id == driver.id).first()
    if not d:
        raise HTTPException(status_code=404, detail="Trip record not found")

    o = d.order
    farmer = d.farmer
    f_items = [it for it in (o.items if o else []) if it.farmer_id == d.farmer_id]

    items_list = [
        {
            "name": it.product.name if it.product else "Produce Item",
            "quantity": it.quantity,
            "unit": it.product.unit if it.product else "kg",
            "price": it.unit_price
        }
        for it in f_items
    ]

    return {
        "id": d.id,
        "order_id": d.order_id,
        "order_number": o.order_number if o else f"ORD-{d.order_id}",
        "status": d.status,
        "payout": d.payout_amount,
        "distance_km": d.distance_km,
        "pickup": {
            "name": farmer.farm_name or (farmer.user.full_name if farmer and farmer.user else "Farm"),
            "address": d.pickup_address,
            "phone": farmer.user.phone if farmer and farmer.user else "+91 98765 43210",
            "lat": d.pickup_lat,
            "lng": d.pickup_lng
        },
        "drop": {
            "name": o.customer.user.full_name if o and o.customer and o.customer.user else "Customer",
            "address": d.drop_address,
            "phone": o.customer.user.phone if o and o.customer and o.customer.user else "+91 91234 56789",
            "lat": d.drop_lat,
            "lng": d.drop_lng
        },
        "items": items_list,
        "proof_of_delivery_url": d.proof_of_delivery_url,
        "delivery_otp": d.delivery_otp,
        "timeline": {
            "assigned_at": d.assigned_at.isoformat() if d.assigned_at else None,
            "picked_up_at": d.picked_up_at.isoformat() if d.picked_up_at else None,
            "delivered_at": d.delivered_at.isoformat() if d.delivered_at else None
        }
    }


# ---------------------------------------------------------------------------
# NOTIFICATIONS ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/notifications")
def get_delivery_notifications(
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    notifs = (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(20)
        .all()
    )

    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "created_at": n.created_at.strftime("%b %d, %I:%M %p") if n.created_at else "Just now"
        }
        for n in notifs
    ]


@router.post("/notifications/mark-read")
def mark_delivery_notifications_read(
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    db.query(Notification).filter(Notification.user_id == user_id, Notification.is_read == False).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}
