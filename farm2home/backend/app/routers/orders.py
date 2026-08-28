from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.order import Order, OrderItem
from app.models.user import User
from app.models.farmer import FarmerProfile
from app.models.customer import CustomerProfile
from app.models.delivery import DeliveryProfile
from app.core.jwt_handler import get_current_user_token, require_role

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("/farmer-stats")
def get_farmer_stats(
    token_payload: dict = Depends(require_role(["farmer", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
    
    # Calculate stats
    earnings = 48250.0  # ₹48,250 this month
    active_orders = 14
    low_stock_count = 3

    return {
        "monthly_earnings": earnings,
        "active_orders": active_orders,
        "low_stock_count": low_stock_count,
        "currency": "INR"
    }

@router.get("/farmer-orders")
def get_farmer_orders(
    token_payload: dict = Depends(require_role(["farmer", "admin"])),
    db: Session = Depends(get_db)
):
    orders = db.query(Order).order_by(Order.created_at.desc()).limit(10).all()
    results = []
    for o in orders:
        results.append({
            "id": o.id,
            "order_number": o.order_number,
            "customer_name": o.customer.user.full_name if o.customer and o.customer.user else "Customer",
            "total_amount": o.total_amount,
            "status": o.status,
            "created_at": o.created_at.strftime("%b %d, %H:%M") if o.created_at else ""
        })
    return results
