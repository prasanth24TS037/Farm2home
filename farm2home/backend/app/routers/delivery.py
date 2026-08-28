from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.order import Order
from app.models.delivery import DeliveryProfile
from app.models.user import User
from app.core.jwt_handler import get_current_user_token, require_role

router = APIRouter(prefix="/delivery", tags=["Delivery"])

class StatusUpdateRequest(BaseModel):
    status: str # accepted, picked_up, out_for_delivery, delivered

class DutyToggleRequest(BaseModel):
    is_on_duty: bool

@router.get("/dashboard")
def get_delivery_dashboard(
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    
    # Active job (centerpiece)
    active_order = db.query(Order).filter(Order.status.in_(["assigned", "accepted", "picked_up", "out_for_delivery"])).first()
    
    active_delivery_data = None
    if active_order:
        active_delivery_data = {
            "order_id": active_order.id,
            "order_number": active_order.order_number,
            "status": active_order.status,
            "pickup_name": "Ramesh Organic Farm",
            "pickup_address": active_order.pickup_address or "Plot 12, Cauvery Delta Road, Thanjavur",
            "pickup_phone": "+91 98765 43210",
            "drop_name": active_order.customer.user.full_name if active_order.customer and active_order.customer.user else "Priya Sharma",
            "drop_address": active_order.delivery_address or "Flat 4B, Greenwoods Apt, Gandhi Road",
            "drop_phone": "+91 91234 56789",
            "items_summary": "4.5 kg fresh produce (Tomatoes, Spinach, Rice)",
            "payout": 65.0,
            "distance_km": 4.2,
            "est_time_mins": 18
        }

    # Upcoming jobs
    upcoming_orders = db.query(Order).filter(Order.status == "confirmed").limit(4).all()
    upcoming_list = []
    for u in upcoming_orders:
        upcoming_list.append({
            "order_id": u.id,
            "order_number": u.order_number,
            "pickup_area": "Kavitha Natural Farms",
            "drop_area": "Anna Nagar",
            "distance_km": 6.1,
            "payout": 85.0
        })

    return {
        "agent_name": driver.user.full_name if driver and driver.user else "Delivery Partner",
        "is_on_duty": driver.is_on_duty if driver else True,
        "stats": {
            "total_deliveries_today": driver.total_deliveries if driver else 12,
            "completed_today": driver.completed_today if driver else 9
        },
        "active_delivery": active_delivery_data,
        "upcoming_deliveries": upcoming_list
    }

@router.post("/toggle-duty")
def toggle_duty(
    req: DutyToggleRequest,
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
    if driver:
        driver.is_on_duty = req.is_on_duty
        db.commit()
    return {"message": "Duty status updated", "is_on_duty": req.is_on_duty}

@router.post("/orders/{order_id}/update-status")
def update_delivery_status(
    order_id: int,
    req: StatusUpdateRequest,
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = req.status
    if req.status == "delivered":
        user_id = int(token_payload.get("sub"))
        driver = db.query(DeliveryProfile).filter(DeliveryProfile.user_id == user_id).first()
        if driver:
            driver.completed_today += 1
            driver.total_deliveries += 1
    db.commit()
    return {"message": f"Order status updated to {req.status}", "status": order.status}
