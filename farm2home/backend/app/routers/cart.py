from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.cart import CartItem
from app.models.product import Product
from app.models.user import User
from app.core.jwt_handler import get_current_user_token

router = APIRouter(prefix="/cart", tags=["Cart"])

class AddToCartRequest(BaseModel):
    product_id: int
    quantity: float = Field(default=1.0, gt=0)

class UpdateCartItemRequest(BaseModel):
    quantity: float = Field(ge=0)

def format_cart_item(item: CartItem):
    p = item.product
    farmer_name = "Direct Farm Harvest"
    if p and p.farmer:
        farmer_name = p.farmer.farm_name or (p.farmer.user.full_name if p.farmer.user else "Direct Farm Harvest")

    return {
        "id": item.id,
        "product_id": item.product_id,
        "farmer_id": p.farmer_id if p else None,
        "farmer_name": farmer_name,
        "farm_name": p.farmer.farm_name if p and p.farmer else None,
        "farmer_location": p.farmer.location if p and p.farmer else None,
        "quantity": item.quantity,
        "name": p.name if p else "Unknown Produce",
        "price_per_unit": p.price_per_unit if p else 0.0,
        "unit": p.unit if p else "kg",
        "image_url": p.image_url if p else None,
        "stock_quantity": p.stock_quantity if p else 0.0,
        "line_total": round((p.price_per_unit if p else 0.0) * item.quantity, 2)
    }

@router.get("")
def get_cart(
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    items = db.query(CartItem).filter(CartItem.user_id == user_id).order_by(CartItem.created_at.asc()).all()

    formatted_items = []
    subtotal = 0.0
    total_items_count = 0

    for item in items:
        # Check if product still exists
        if not item.product:
            db.delete(item)
            continue
        
        # If product stock changed and is now less than in cart, cap to available stock
        if item.product.stock_quantity < item.quantity:
            if item.product.stock_quantity <= 0:
                db.delete(item)
                continue
            else:
                item.quantity = item.product.stock_quantity
                db.flush()

        formatted = format_cart_item(item)
        formatted_items.append(formatted)
        subtotal += formatted["line_total"]
        total_items_count += item.quantity

    db.commit()
    subtotal = round(subtotal, 2)
    delivery_fee = 30.0 if formatted_items else 0.0
    grand_total = round(subtotal + delivery_fee, 2)

    return {
        "items": formatted_items,
        "subtotal": subtotal,
        "delivery_fee": delivery_fee,
        "grand_total": grand_total,
        "total_items": total_items_count
    }

@router.post("")
def add_to_cart(
    req: AddToCartRequest,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    product = db.query(Product).filter(Product.id == req.product_id).first()
    if not product or not product.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product is unavailable or discontinued")

    if product.stock_quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Sorry, '{product.name}' is currently out of stock."
        )

    # Check existing item
    cart_item = db.query(CartItem).filter(
        CartItem.user_id == user_id,
        CartItem.product_id == req.product_id
    ).first()

    target_qty = req.quantity
    if cart_item:
        target_qty += cart_item.quantity

    if target_qty > product.stock_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Requested quantity exceeds available stock of {product.stock_quantity} {product.unit}."
        )

    if cart_item:
        cart_item.quantity = target_qty
    else:
        cart_item = CartItem(
            user_id=user_id,
            product_id=req.product_id,
            quantity=req.quantity
        )
        db.add(cart_item)

    db.commit()
    db.refresh(cart_item)

    return {
        "status": "success",
        "message": f"Added {product.name} to your basket",
        "item": format_cart_item(cart_item)
    }

@router.patch("/{item_id}")
def update_cart_item(
    item_id: int,
    req: UpdateCartItemRequest,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    cart_item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == user_id).first()

    # Also support matching by product_id if item_id not found as cart_item.id
    if not cart_item:
        cart_item = db.query(CartItem).filter(CartItem.product_id == item_id, CartItem.user_id == user_id).first()

    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")

    if req.quantity <= 0:
        db.delete(cart_item)
        db.commit()
        return {"status": "removed", "item_id": item_id}

    product = cart_item.product
    if product and req.quantity > product.stock_quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only {product.stock_quantity} {product.unit} available in stock."
        )

    cart_item.quantity = req.quantity
    db.commit()
    db.refresh(cart_item)

    return {
        "status": "success",
        "item": format_cart_item(cart_item)
    }

@router.delete("/{item_id}")
def remove_cart_item(
    item_id: int,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    cart_item = db.query(CartItem).filter(CartItem.id == item_id, CartItem.user_id == user_id).first()
    if not cart_item:
        cart_item = db.query(CartItem).filter(CartItem.product_id == item_id, CartItem.user_id == user_id).first()

    if cart_item:
        db.delete(cart_item)
        db.commit()

    return {"status": "success", "message": "Item removed from cart"}

@router.delete("")
def clear_cart(
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    db.query(CartItem).filter(CartItem.user_id == user_id).delete()
    db.commit()
    return {"status": "success", "message": "Cart cleared"}
