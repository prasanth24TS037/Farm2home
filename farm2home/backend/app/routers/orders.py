import uuid
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.order import Order, OrderItem
from app.models.delivery import Delivery, DeliveryProfile
from app.models.product import Product
from app.models.user import User
from app.models.farmer import FarmerProfile
from app.models.customer import CustomerProfile
from app.models.cart import CartItem
from app.models.payment import Payment
from app.models.notification import Notification
from app.core.jwt_handler import get_current_user_token, require_role

router = APIRouter(prefix="/orders", tags=["Orders"])

class CreateOrderRequest(BaseModel):
    delivery_address: str
    city: str
    pincode: str
    phone: Optional[str] = None
    full_name: Optional[str] = None
    delivery_slot: Optional[str] = "Morning (7 AM - 10 AM)"
    notes: Optional[str] = None
    payment_method: Optional[str] = "UPI"
    idempotency_key: Optional[str] = None

def generate_order_number(db: Session) -> str:
    import random
    while True:
        num = f"F2H-{random.randint(10000, 99999)}"
        exists = db.query(Order).filter(Order.order_number == num).first()
        if not exists:
            return num

def serialize_order_item(item: OrderItem):
    p = item.product
    farmer = item.farmer or (p.farmer if p else None)
    farmer_name = "Direct Farm Harvest"
    if farmer:
        farmer_name = farmer.farm_name or (farmer.user.full_name if farmer.user else "Direct Farm Harvest")
    elif p and p.farmer:
        farmer_name = p.farmer.farm_name or (p.farmer.user.full_name if p.farmer.user else "Direct Farm Harvest")

    return {
        "id": item.id,
        "product_id": item.product_id,
        "farmer_id": item.farmer_id or (p.farmer_id if p else None),
        "name": p.name if p else "Farm Fresh Item",
        "quantity": item.quantity,
        "unit": p.unit if p else "kg",
        "unit_price": item.unit_price,
        "subtotal": item.subtotal,
        "image_url": p.image_url if p else None,
        "farmer_name": farmer_name,
        "farmer_farm_name": farmer.farm_name if farmer else None,
        "farmer_location": farmer.location if farmer else None
    }

def serialize_order(order: Order):
    items_data = [serialize_order_item(item) for item in order.items]
    subtotal = sum(item["subtotal"] for item in items_data)

    payment_info = None
    if order.payment:
        payment_info = {
            "payment_id": order.payment.payment_id,
            "payment_status": order.payment.payment_status,
            "payment_method": order.payment.payment_method,
            "transaction_time": order.payment.transaction_time.strftime("%b %d, %Y %I:%M %p") if order.payment.transaction_time else None
        }

    deliveries_data = []
    for d in (order.deliveries or []):
        agent_info = None
        if d.delivery_agent and d.delivery_agent.user:
            agent_info = {
                "id": d.delivery_agent.id,
                "name": d.delivery_agent.user.full_name,
                "phone": d.delivery_agent.user.phone,
                "vehicle_type": d.delivery_agent.vehicle_type,
                "vehicle_number": d.delivery_agent.vehicle_number,
                "is_on_duty": d.delivery_agent.is_on_duty
            }
        f_name = d.farmer.farm_name if d.farmer else (d.farmer.user.full_name if d.farmer and d.farmer.user else "Local Farm")
        deliveries_data.append({
            "id": d.id,
            "order_id": d.order_id,
            "farmer_id": d.farmer_id,
            "farmer_name": f_name,
            "pickup_address": d.pickup_address,
            "drop_address": d.drop_address,
            "status": d.status,
            "delivery_agent": agent_info,
            "payout_amount": d.payout_amount,
            "distance_km": d.distance_km,
            "assigned_at": d.assigned_at.isoformat() if d.assigned_at else None,
            "picked_up_at": d.picked_up_at.isoformat() if d.picked_up_at else None,
            "delivered_at": d.delivered_at.isoformat() if d.delivered_at else None
        })

    # Primary delivery agent for backward compatibility
    primary_agent = deliveries_data[0]["delivery_agent"] if deliveries_data else None
    primary_status = deliveries_data[0]["status"] if deliveries_data else ("unassigned" if order.status == "confirmed" else "pending")

    return {
        "id": order.id,
        "order_number": order.order_number,
        "status": order.status,
        "payment_status": order.payment_status,
        "payment_method": order.payment_method,
        "total_amount": round(order.total_amount, 2),
        "delivery_fee": round(order.delivery_fee, 2),
        "subtotal": round(subtotal, 2),
        "delivery_address": order.delivery_address,
        "delivery_slot": order.delivery_slot or "Standard Same-Day Farm Delivery",
        "notes": order.notes,
        "created_at": order.created_at.strftime("%b %d, %Y %I:%M %p") if order.created_at else "",
        "customer": {
            "name": order.customer.user.full_name if order.customer and order.customer.user else "Customer",
            "phone": order.customer.user.phone if order.customer and order.customer.user else "",
            "email": order.customer.user.email if order.customer and order.customer.user else ""
        },
        "items": items_data,
        "payment": payment_info,
        "deliveries": deliveries_data,
        "delivery_agent": primary_agent,
        "delivery_status": primary_status
    }

@router.post("")
def create_order(
    req: CreateOrderRequest,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Ensure customer profile
    customer_profile = user.customer_profile
    if not customer_profile:
        customer_profile = CustomerProfile(
            user_id=user.id,
            delivery_address=req.delivery_address,
            city=req.city,
            pincode=req.pincode
        )
        db.add(customer_profile)
        db.flush()

    # Get cart items
    cart_items = db.query(CartItem).filter(CartItem.user_id == user_id).all()
    if not cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Your cart is empty. Please add farm produce before proceeding."
        )

    # Duplicate submission guard: check if an identical pending order was placed within last 15 seconds
    recent_time = datetime.utcnow() - timedelta(seconds=15)
    recent_order = db.query(Order).filter(
        Order.customer_id == customer_profile.id,
        Order.created_at >= recent_time
    ).order_by(Order.created_at.desc()).first()

    if recent_order and recent_order.status in ["pending", "confirmed"]:
        return {
            "status": "success",
            "message": "Order already processed.",
            "order": serialize_order(recent_order)
        }

    # Atomic transaction for stock verification, order creation, stock decrement, and cart clearing
    try:
        subtotal = 0.0
        distinct_farmers = set()

        # 1. Check stock and farmer foreign key for all items first
        for item in cart_items:
            product = item.product
            if not product:
                raise HTTPException(status_code=400, detail="One or more products in your cart are no longer available.")
            if not product.farmer_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Produce '{product.name}' has invalid farmer attribution. Checkout cannot proceed."
                )
            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for '{product.name}'. Requested: {item.quantity}, Available: {product.stock_quantity} {product.unit}."
                )
            subtotal += product.price_per_unit * item.quantity
            if product.farmer:
                distinct_farmers.add(product.farmer)

        delivery_fee = 30.0
        grand_total = round(subtotal + delivery_fee, 2)
        order_num = generate_order_number(db)

        formatted_address = f"{req.delivery_address}, {req.city} - {req.pincode}"
        if req.phone:
            formatted_address += f" (Ph: {req.phone})"

        # Dynamic pickup addresses from real participating farms
        pickup_locations = []
        for f in distinct_farmers:
            fname = f.farm_name or (f.user.full_name if f.user else "Local Farm")
            loc = f.location or f.district or "Tamil Nadu"
            pickup_locations.append(f"{fname}, {loc}")
        pickup_address_str = " | ".join(pickup_locations) if pickup_locations else "Partner Family Farm"

        # 2. Create Order
        new_order = Order(
            order_number=order_num,
            customer_id=customer_profile.id,
            total_amount=grand_total,
            delivery_fee=delivery_fee,
            status="pending",
            payment_status="pending",
            payment_method=req.payment_method or "UPI",
            delivery_address=formatted_address,
            pickup_address=pickup_address_str,
            delivery_slot=req.delivery_slot,
            notes=req.notes
        )
        db.add(new_order)
        db.flush()

        # 3. Create OrderItems and Decrement Stock
        for item in cart_items:
            product = item.product
            line_subtotal = round(product.price_per_unit * item.quantity, 2)

            if product.stock_quantity < item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Insufficient stock for '{product.name}'."
                )

            order_item = OrderItem(
                order_id=new_order.id,
                product_id=product.id,
                farmer_id=product.farmer_id,
                quantity=item.quantity,
                unit_price=product.price_per_unit,
                subtotal=line_subtotal
            )
            db.add(order_item)

            # Decrement stock
            product.stock_quantity = max(0.0, product.stock_quantity - item.quantity)

        # 4. Clear Customer's Cart
        for item in cart_items:
            db.delete(item)

        db.commit()
        db.refresh(new_order)

        return {
            "status": "success",
            "message": "Order created successfully",
            "order": serialize_order(new_order)
        }

    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to place order: {str(exc)}"
        )

@router.get("/my-orders")
def get_customer_orders(
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.customer_profile:
        return []

    orders = db.query(Order).filter(
        Order.customer_id == user.customer_profile.id
    ).order_by(Order.created_at.desc()).all()

    return [serialize_order(o) for o in orders]

@router.get("/farmer-stats")
def get_farmer_stats(
    token_payload: dict = Depends(require_role(["farmer", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
    
    if not farmer:
        return {
            "monthly_earnings": 0.0,
            "active_orders": 0,
            "low_stock_count": 0,
            "currency": "INR"
        }

    # Calculate real stats from database using OrderItem.farmer_id
    active_order_items = db.query(OrderItem).join(Order, OrderItem.order_id == Order.id).filter(
        OrderItem.farmer_id == farmer.id,
        Order.status.in_(["pending", "confirmed", "assigned", "picked_up", "out_for_delivery"])
    ).all()
    
    active_orders_count = len(set(item.order_id for item in active_order_items))

    # Real delivered / confirmed earnings for this farmer's products
    delivered_items = db.query(OrderItem).join(Order, OrderItem.order_id == Order.id).filter(
        OrderItem.farmer_id == farmer.id,
        Order.status.in_(["confirmed", "delivered"])
    ).all()
    real_earnings = sum(item.subtotal for item in delivered_items)

    # Low stock count
    low_stock = sum(1 for p in farmer.products if p.stock_quantity <= p.low_stock_threshold)

    return {
        "monthly_earnings": round(real_earnings, 2),
        "active_orders": active_orders_count,
        "low_stock_count": low_stock,
        "currency": "INR"
    }

@router.get("/farmer-orders")
def get_farmer_orders(
    token_payload: dict = Depends(require_role(["farmer", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
    if not farmer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farmer profile not found")

    # Real query: find all OrderItems belonging to this farmer
    farmer_order_items = (
        db.query(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(OrderItem.farmer_id == farmer.id)
        .order_by(Order.created_at.desc())
        .all()
    )

    # Group order items by order
    orders_map = {}
    for item in farmer_order_items:
        o = item.order
        if o.id not in orders_map:
            orders_map[o.id] = {
                "order": o,
                "items": []
            }
        orders_map[o.id]["items"].append(item)

    results = []
    for o_id, data in sorted(orders_map.items(), key=lambda x: x[1]["order"].created_at or datetime.min, reverse=True):
        o = data["order"]
        f_items = data["items"]
        item_names = ", ".join(
            f"{i.product.name if i.product else 'Fresh Produce'} ({i.quantity}{i.product.unit if i.product else 'kg'})"
            for i in f_items
        )
        farmer_subtotal = sum(i.subtotal for i in f_items)

        # Look up delivery leg specifically for this farmer and order
        leg = db.query(Delivery).filter(Delivery.order_id == o.id, Delivery.farmer_id == farmer.id).first()
        agent_data = None
        if leg and leg.delivery_agent and leg.delivery_agent.user:
            agent_data = {
                "id": leg.delivery_agent.id,
                "name": leg.delivery_agent.user.full_name,
                "phone": leg.delivery_agent.user.phone,
                "vehicle_type": leg.delivery_agent.vehicle_type,
                "vehicle_number": leg.delivery_agent.vehicle_number
            }

        results.append({
            "id": o.id,
            "order_number": o.order_number,
            "customer_name": o.customer.user.full_name if o.customer and o.customer.user else "Customer",
            "customer_phone": o.customer.user.phone if o.customer and o.customer.user else "",
            "delivery_address": o.delivery_address,
            "items_summary": item_names or "Farm Fresh Produce",
            "total_amount": round(farmer_subtotal, 2),
            "status": o.status,
            "delivery_status": leg.status if leg else ("unassigned" if o.status == "confirmed" else "pending"),
            "delivery_agent": agent_data,
            "pickup_address": leg.pickup_address if leg else (f"{farmer.farm_name}, {farmer.location}" if farmer else ""),
            "payment_status": o.payment_status,
            "delivery_slot": o.delivery_slot or "Standard Delivery",
            "created_at": o.created_at.strftime("%b %d, %H:%M") if o.created_at else "",
            "items": [serialize_order_item(i) for i in f_items]
        })
    return results

class UpdateFarmerOrderStatusRequest(BaseModel):
    status: str

@router.patch("/{order_id}/farmer-status")
def update_farmer_order_status(
    order_id: int,
    req: UpdateFarmerOrderStatusRequest,
    token_payload: dict = Depends(require_role(["farmer", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Security check: Ensure this farmer owns at least one item in this order
    owns_item = any(item.farmer_id == farmer.id for item in order.items)
    if not owns_item and token_payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied: You do not own items in this order")

    allowed_statuses = ["pending", "confirmed", "processing", "packed", "delivered"]
    if req.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status '{req.status}'")

    order.status = req.status
    db.commit()
    db.refresh(order)
    return {"status": "success", "order_id": order.id, "new_status": order.status}

@router.get("/{order_id}")
def get_order(
    order_id: int,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    order = db.query(Order).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    user_id = int(token_payload.get("sub"))
    role = token_payload.get("role")

    # Customer can only view their own orders
    if role == "customer" and (not order.customer or order.customer.user_id != user_id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    # Farmer can only view orders containing their items
    if role == "farmer":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
        if not farmer or not any(item.farmer_id == farmer.id for item in order.items):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return serialize_order(order)
