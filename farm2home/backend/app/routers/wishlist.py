from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.wishlist import WishlistItem
from app.models.product import Product
from app.core.jwt_handler import get_current_user_token

router = APIRouter(prefix="/wishlist", tags=["Wishlist"])

@router.get("")
def get_wishlist(
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    items = db.query(WishlistItem).filter(WishlistItem.user_id == user_id).all()
    product_ids = [item.product_id for item in items]
    products = db.query(Product).filter(Product.id.in_(product_ids)).all() if product_ids else []

    results = []
    for p in products:
        results.append({
            "id": p.id,
            "name": p.name,
            "price_per_unit": p.price_per_unit,
            "unit": p.unit,
            "image_url": p.image_url,
            "rating": p.rating,
            "farmer_name": p.farmer.user.full_name if p.farmer and p.farmer.user else "Delta Farmer"
        })
    return {
        "product_ids": product_ids,
        "products": results
    }

@router.post("/{product_id}")
def add_to_wishlist(
    product_id: int,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    existing = db.query(WishlistItem).filter(WishlistItem.user_id == user_id, WishlistItem.product_id == product_id).first()
    if not existing:
        new_item = WishlistItem(user_id=user_id, product_id=product_id)
        db.add(new_item)
        db.commit()
    return {"status": "success", "product_id": product_id}

@router.delete("/{product_id}")
def remove_from_wishlist(
    product_id: int,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    existing = db.query(WishlistItem).filter(WishlistItem.user_id == user_id, WishlistItem.product_id == product_id).first()
    if existing:
        db.delete(existing)
        db.commit()
    return {"status": "success", "product_id": product_id}
