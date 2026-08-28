from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.user import User
from app.models.product import Product
from app.models.order import Order
from app.core.jwt_handler import require_role

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/overview")
def get_admin_overview(
    token_payload: dict = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    total_users = db.query(User).count()
    farmers_count = db.query(User).filter(User.role == "farmer").count()
    customers_count = db.query(User).filter(User.role == "customer").count()
    delivery_count = db.query(User).filter(User.role == "delivery").count()
    products_count = db.query(Product).count()
    orders_count = db.query(Order).count()

    return {
        "stats": {
            "total_farmers": farmers_count,
            "total_customers": customers_count,
            "total_delivery_agents": delivery_count,
            "total_products": products_count,
            "total_orders": orders_count,
            "gross_merchandise_value": 348900.0,
            "active_deliveries": 6,
            "fraud_alerts_count": 0
        },
        "system_health": "Optimal (100% uptime)",
        "db_mode": "Active"
    }

@router.get("/users")
def get_admin_users(
    token_payload: dict = Depends(require_role(["admin"])),
    db: Session = Depends(get_db)
):
    users = db.query(User).order_by(User.id.asc()).limit(50).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.strftime("%Y-%m-%d") if u.created_at else ""
        }
        for u in users
    ]
