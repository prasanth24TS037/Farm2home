import uuid
import random
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.order import Order, OrderItem
from app.models.payment import Payment
from app.models.notification import Notification
from app.models.user import User
from app.models.farmer import FarmerProfile
from app.models.payout import Payout
from app.core.jwt_handler import get_current_user_token, require_role

router = APIRouter(prefix="/payments", tags=["Payments"])

class ProcessPaymentRequest(BaseModel):
    order_id: int
    payment_method: str = Field(description="UPI, Card, Net Banking, or Cash on Delivery")
    upi_id: Optional[str] = None
    bank_name: Optional[str] = None
    card_last_four: Optional[str] = None
    card_network: Optional[str] = None
    simulate_failure: bool = False

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

def generate_payment_id() -> str:
    return f"PAY-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(100000, 999999)}"

def generate_payout_reference() -> str:
    return f"PO-{datetime.utcnow().strftime('%Y%m%d')}-{random.randint(10000, 99999)}"

@router.post("/process")
def process_payment(
    req: ProcessPaymentRequest,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    order = db.query(Order).filter(Order.id == req.order_id).first()

    if not order:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if order.customer and order.customer.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized for this order")

    # If order is already confirmed with payment completed, return success
    if order.status == "confirmed" and order.payment_status == "completed" and not req.simulate_failure:
        return {
            "status": "success",
            "message": "Payment already confirmed for this order",
            "payment_id": order.payment.payment_id if order.payment else generate_payment_id(),
            "order_id": order.id,
            "order_number": order.order_number
        }

    # Handle simulated failure test case
    if req.simulate_failure:
        failed_payment_id = generate_payment_id()
        payment_record = Payment(
            payment_id=failed_payment_id,
            order_id=order.id,
            payment_status="failed",
            amount=order.total_amount,
            payment_method=req.payment_method
        )
        db.add(payment_record)
        order.payment_status = "failed"
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bank gateway rejected transaction. Please verify card/UPI details or choose an alternate payment method."
        )

    # Successful payment simulation (or COD confirmation)
    payment_id = generate_payment_id()
    is_cod = req.payment_method.lower() in ["cash on delivery", "cod"]

    payment_record = Payment(
        payment_id=payment_id,
        order_id=order.id,
        payment_status="completed" if not is_cod else "pending",
        amount=order.total_amount,
        payment_method=req.payment_method,
        transaction_time=datetime.utcnow()
    )
    db.add(payment_record)

    order.status = "confirmed"
    order.payment_status = "completed" if not is_cod else "pending"
    order.payment_method = req.payment_method

    # Create delivery leg per farmer & auto-assign to real on-duty agent
    from app.routers.delivery import create_order_delivery_legs
    create_order_delivery_legs(order, db)

    # Notify relevant farmer(s) strictly for their own items and subtotal
    from app.services.notification_service import NotificationService
    NotificationService.create_order_farmer_notifications(order, db)

    db.commit()
    db.refresh(order)

    return {
        "status": "success",
        "message": "Payment verified and order confirmed successfully!" if not is_cod else "Order placed with Cash on Delivery successfully!",
        "payment_id": payment_id,
        "order_id": order.id,
        "order_number": order.order_number,
        "total_amount": order.total_amount,
        "payment_method": order.payment_method,
        "payment_status": order.payment_status
    }

@router.get("/notifications")
def get_user_notifications(
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    notifs = db.query(Notification).filter(
        Notification.user_id == user_id
    ).order_by(Notification.created_at.desc()).limit(15).all()

    return [
        {
            "id": n.id,
            "title": n.title,
            "message": n.message,
            "type": n.type,
            "is_read": n.is_read,
            "created_at": n.created_at.strftime("%b %d, %H:%M") if n.created_at else ""
        }
        for n in notifs
    ]

# ---------------------------------------------------------------------------
# FARMER EARNINGS & PAYOUTS ENDPOINTS
# ---------------------------------------------------------------------------

@router.get("/farmer-earnings")
def get_farmer_earnings(
    token_payload: dict = Depends(require_role(["farmer", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()

    if not farmer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farmer profile not found"
        )

    # Completed & confirmed orders with this farmer's order items
    farmer_order_items = (
        db.query(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(OrderItem.farmer_id == farmer.id)
        .order_by(Order.created_at.desc())
        .all()
    )

    # Group order items by order
    unique_orders = {}
    for item in farmer_order_items:
        o = item.order
        if o.id not in unique_orders:
            unique_orders[o.id] = {
                "order": o,
                "items": []
            }
        unique_orders[o.id]["items"].append(item)

    # Calculate real order transactions
    now = datetime.utcnow()
    current_month_key = now.strftime("%Y-%m")
    
    total_lifetime_earnings = 0.0
    earnings_this_month = 0.0
    transactions = []

    for order_id, data in sorted(unique_orders.items(), key=lambda x: x[1]["order"].created_at or datetime.min, reverse=True):
        o = data["order"]
        f_items = data["items"]
        if not f_items:
            continue

        gross = sum(i.subtotal for i in f_items)
        platform_fee = 0.0  # 0% direct farmer model
        net = gross - platform_fee

        is_completed = o.payment_status == "completed" or o.status in ["delivered", "confirmed", "assigned", "picked_up", "out_for_delivery"]
        if is_completed:
            total_lifetime_earnings += net
            if o.created_at and o.created_at.strftime("%Y-%m") == current_month_key:
                earnings_this_month += net

        items_summary = ", ".join(f"{i.product.name if i.product else 'Farm Produce'} ({i.quantity}{i.product.unit if i.product else 'kg'})" for i in f_items)
        customer_name = o.customer.user.full_name if o.customer and o.customer.user else "Customer"

        settlement_status = "paid" if o.status == "delivered" else ("processing" if o.status in ["assigned", "picked_up", "out_for_delivery"] else "pending")

        transactions.append({
            "id": o.id,
            "order_number": o.order_number,
            "created_at": o.created_at.strftime("%b %d, %Y %I:%M %p") if o.created_at else "Recent",
            "raw_date": o.created_at.isoformat() if o.created_at else "",
            "customer_name": customer_name,
            "items_summary": items_summary or "Farm Harvest Item",
            "gross_amount": round(gross, 2),
            "platform_fee": round(platform_fee, 2),
            "net_amount": round(net, 2),
            "order_status": o.status,
            "payment_status": o.payment_status,
            "settlement_status": settlement_status,
            "payment_method": o.payment_method
        })

    # Payouts history
    payouts = db.query(Payout).filter(Payout.farmer_id == farmer.id).order_by(Payout.requested_at.desc()).all()
    
    paid_out_amount = sum(p.amount for p in payouts if p.status == "paid")
    pending_payout_amount = sum(p.amount for p in payouts if p.status in ["pending", "processing"])
    pending_balance = max(0.0, total_lifetime_earnings - paid_out_amount - pending_payout_amount)

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

    # Payout destination masked view
    masked_desc = "Not configured"
    if farmer.payout_method == "UPI" and farmer.payout_upi_id:
        masked_desc = f"UPI: {farmer.payout_upi_id}"
    elif farmer.payout_account_last_four:
        bank = farmer.payout_bank_name or "Bank"
        masked_desc = f"••••{farmer.payout_account_last_four} ({bank})"
    elif farmer.payout_upi_id:
        masked_desc = f"UPI: {farmer.payout_upi_id}"

    return {
        "summary": {
            "total_earnings": round(total_lifetime_earnings, 2),
            "earnings_this_month": round(earnings_this_month, 2),
            "pending_balance": round(pending_balance, 2),
            "paid_out_amount": round(paid_out_amount, 2),
            "min_payout_amount": 500.0
        },
        "transactions": transactions,
        "payouts": payouts_data,
        "payout_account": {
            "payout_method": farmer.payout_method or "UPI",
            "payout_upi_id": farmer.payout_upi_id or "",
            "payout_account_holder": farmer.payout_account_holder or farmer.user.full_name,
            "payout_account_last_four": farmer.payout_account_last_four or "",
            "payout_bank_name": farmer.payout_bank_name or "",
            "payout_bank_ifsc": farmer.payout_bank_ifsc or "",
            "masked_display": masked_desc
        }
    }

@router.get("/delivery-earnings")
def get_delivery_earnings_payment(
    token_payload: dict = Depends(require_role(["delivery", "admin"])),
    db: Session = Depends(get_db)
):
    from app.routers.delivery import get_delivery_earnings
    return get_delivery_earnings(token_payload=token_payload, db=db)

@router.post("/payout-request")
def request_payout(
    req: PayoutRequestPayload,
    token_payload: dict = Depends(require_role(["farmer", "delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    user_role = token_payload.get("role", "")

    if user_role == "delivery":
        from app.routers.delivery import request_delivery_payout
        return request_delivery_payout(req=req, token_payload=token_payload, db=db)

    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    MIN_PAYOUT = 500.0
    if req.amount < MIN_PAYOUT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Minimum settlement payout request amount is ₹{MIN_PAYOUT:,.0f}"
        )

    # Compute available balance from real order items
    order_items = (
        db.query(OrderItem)
        .join(Order, OrderItem.order_id == Order.id)
        .filter(
            OrderItem.farmer_id == farmer.id,
            Order.payment_status.in_(["completed", "pending"])
        ).all()
    )

    total_gross = sum(i.subtotal for i in order_items)
    payouts = db.query(Payout).filter(Payout.farmer_id == farmer.id).all()
    settled_or_pending = sum(p.amount for p in payouts if p.status in ["paid", "pending", "processing"])
    available_balance = max(0.0, total_gross - settled_or_pending)

    if req.amount > available_balance:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested amount ₹{req.amount:,.2f} exceeds available pending balance of ₹{available_balance:,.2f}"
        )

    # Determine masked account reference
    if farmer.payout_method == "UPI" and farmer.payout_upi_id:
        account_ref = farmer.payout_upi_id
    elif farmer.payout_account_last_four:
        account_ref = f"••••{farmer.payout_account_last_four}"
    else:
        account_ref = farmer.payout_upi_id or f"{farmer.user.phone or 'farmer'}@upi"

    new_payout = Payout(
        payout_reference=generate_payout_reference(),
        farmer_id=farmer.id,
        amount=round(req.amount, 2),
        status="pending",
        payout_method=farmer.payout_method or "UPI",
        account_reference_masked=account_ref,
        requested_at=datetime.utcnow(),
        notes=req.notes
    )
    db.add(new_payout)

    # Add confirmation notification
    from app.services.notification_service import NotificationService
    NotificationService.create_payout_notification(new_payout, db)

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
def update_payout_account(
    req: PayoutAccountPayload,
    token_payload: dict = Depends(require_role(["farmer", "delivery", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    user_role = token_payload.get("role", "")

    if user_role == "delivery":
        from app.routers.delivery import update_delivery_payout_account
        return update_delivery_payout_account(req=req, token_payload=token_payload, db=db)

    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    # Strict Security: Only store sanitized last 4 digits if bank account is passed
    farmer.payout_method = req.payout_method
    if req.upi_id:
        farmer.payout_upi_id = req.upi_id.strip()
    if req.account_holder:
        farmer.payout_account_holder = req.account_holder.strip()
    if req.account_number:
        clean_acc = req.account_number.strip().replace(" ", "").replace("-", "")
        farmer.payout_account_last_four = clean_acc[-4:] if len(clean_acc) >= 4 else clean_acc
    if req.bank_name:
        farmer.payout_bank_name = req.bank_name.strip()
    if req.bank_ifsc:
        farmer.payout_bank_ifsc = req.bank_ifsc.strip().upper()

    db.commit()
    db.refresh(farmer)

    masked_desc = "Configured"
    if farmer.payout_method == "UPI" and farmer.payout_upi_id:
        masked_desc = f"UPI: {farmer.payout_upi_id}"
    elif farmer.payout_account_last_four:
        bank = farmer.payout_bank_name or "Bank"
        masked_desc = f"••••{farmer.payout_account_last_four} ({bank})"

    return {
        "status": "success",
        "message": "Payout destination updated successfully",
        "payout_account": {
            "payout_method": farmer.payout_method,
            "payout_upi_id": farmer.payout_upi_id,
            "payout_account_holder": farmer.payout_account_holder,
            "payout_account_last_four": farmer.payout_account_last_four,
            "payout_bank_name": farmer.payout_bank_name,
            "payout_bank_ifsc": farmer.payout_bank_ifsc,
            "masked_display": masked_desc
        }
    }
