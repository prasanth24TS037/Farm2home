import os
import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query, File, UploadFile
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.product import Product, Category
from app.models.farmer import FarmerProfile
from app.models.user import User
from app.schemas.product import ProductResponse, QuickPriceUpdateRequest, QuickStockUpdateRequest, QuickImageUpdateRequest, ProductCreate
from app.core.jwt_handler import get_current_user_token, require_role

UPLOAD_DIR = os.path.join("app", "static", "uploads", "products")
os.makedirs(UPLOAD_DIR, exist_ok=True)
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB limit
ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"]

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[ProductResponse])
def get_products(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    farmer_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Product)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))
    if farmer_id:
        query = query.filter(Product.farmer_id == farmer_id)

    products = query.order_by(Product.created_at.desc()).all()
    results = []
    for p in products:
        results.append(ProductResponse(
            id=p.id,
            farmer_id=p.farmer_id,
            category_id=p.category_id,
            name=p.name,
            description=p.description,
            price_per_unit=p.price_per_unit,
            unit=p.unit,
            stock_quantity=p.stock_quantity,
            low_stock_threshold=p.low_stock_threshold,
            image_url=p.image_url,
            is_organic=p.is_organic,
            rating=p.rating,
            review_count=p.review_count,
            ai_suggested_price=p.ai_suggested_price,
            ai_price_confidence=p.ai_price_confidence,
            farmer_name=p.farmer.user.full_name if p.farmer and p.farmer.user else "Verified Farmer",
            farmer_location=p.farmer.location if p.farmer else "Tamil Nadu"
        ))
    return results

@router.get("/my-products", response_model=List[ProductResponse])
def get_my_products(
    token_payload: dict = Depends(require_role(["farmer"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    products = db.query(Product).filter(Product.farmer_id == farmer.id).all()
    results = []
    for p in products:
        results.append(ProductResponse(
            id=p.id,
            farmer_id=p.farmer_id,
            category_id=p.category_id,
            name=p.name,
            description=p.description,
            price_per_unit=p.price_per_unit,
            unit=p.unit,
            stock_quantity=p.stock_quantity,
            low_stock_threshold=p.low_stock_threshold,
            image_url=p.image_url,
            is_organic=p.is_organic,
            rating=p.rating,
            review_count=p.review_count,
            ai_suggested_price=p.ai_suggested_price,
            ai_price_confidence=p.ai_price_confidence,
            farmer_name=farmer.user.full_name if farmer.user else "Farmer",
            farmer_location=farmer.location
        ))
    return results

@router.patch("/{product_id}/quick-price")
def quick_update_price(
    product_id: int,
    req: QuickPriceUpdateRequest,
    token_payload: dict = Depends(require_role(["farmer", "admin"])),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.price_per_unit = req.price_per_unit
    db.commit()
    return {"message": "Price updated successfully", "new_price": product.price_per_unit}

@router.patch("/{product_id}/quick-stock")
def quick_update_stock(
    product_id: int,
    req: QuickStockUpdateRequest,
    token_payload: dict = Depends(require_role(["farmer", "admin"])),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product.stock_quantity = req.stock_quantity
    db.commit()
    return {"message": "Stock updated successfully", "new_stock": product.stock_quantity}

@router.patch("/{product_id}/quick-image")
async def quick_update_image(
    product_id: int,
    image: UploadFile = File(...),
    token_payload: dict = Depends(require_role(["farmer", "admin"])),
    db: Session = Depends(get_db)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    user_id = int(token_payload.get("sub"))
    role = token_payload.get("role")
    if role != "admin":
        farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
        if not farmer or product.farmer_id != farmer.id:
            raise HTTPException(status_code=403, detail="Not authorized to update image for this product")

    # 1. Validate image MIME type
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Only JPEG, PNG, and WebP images are allowed."
        )

    # 2. Validate file size (5MB limit)
    contents = await image.read()
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds 5MB limit. Please select a smaller photo."
        )

    # 3. Clean up old local image file if it exists
    if product.image_url and product.image_url.startswith("/static/uploads/products/"):
        old_filename = os.path.basename(product.image_url)
        old_filepath = os.path.join(UPLOAD_DIR, old_filename)
        if os.path.exists(old_filepath):
            try:
                os.remove(old_filepath)
            except Exception as e:
                print(f"Old file cleanup warning: {e}")

    # 4. Save unique new file
    ext = os.path.splitext(image.filename)[1].lower() or ".jpg"
    unique_filename = f"prod_{product_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(UPLOAD_DIR, unique_filename)

    with open(filepath, "wb") as f:
        f.write(contents)

    servable_url = f"/static/uploads/products/{unique_filename}"
    product.image_url = servable_url
    db.commit()
    db.refresh(product)

    return {
        "message": "Image updated successfully",
        "image_url": product.image_url,
        "new_image_url": product.image_url
    }

@router.post("", response_model=ProductResponse)
def create_product(
    req: ProductCreate,
    token_payload: dict = Depends(require_role(["farmer", "admin"])),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    farmer = db.query(FarmerProfile).filter(FarmerProfile.user_id == user_id).first()
    if not farmer:
        raise HTTPException(status_code=404, detail="Farmer profile not found")

    new_prod = Product(
        farmer_id=farmer.id,
        category_id=req.category_id,
        name=req.name,
        description=req.description,
        price_per_unit=req.price_per_unit,
        unit=req.unit or "kg",
        stock_quantity=req.stock_quantity,
        image_url=req.image_url,
        is_organic=req.is_organic or False,
        ai_suggested_price=round(req.price_per_unit * 1.05, 2)
    )
    db.add(new_prod)
    db.commit()
    db.refresh(new_prod)

    return ProductResponse(
        id=new_prod.id,
        farmer_id=new_prod.farmer_id,
        category_id=new_prod.category_id,
        name=new_prod.name,
        description=new_prod.description,
        price_per_unit=new_prod.price_per_unit,
        unit=new_prod.unit,
        stock_quantity=new_prod.stock_quantity,
        low_stock_threshold=new_prod.low_stock_threshold,
        image_url=new_prod.image_url,
        is_organic=new_prod.is_organic,
        rating=new_prod.rating,
        review_count=new_prod.review_count,
        ai_suggested_price=new_prod.ai_suggested_price,
        ai_price_confidence=new_prod.ai_price_confidence,
        farmer_name=farmer.user.full_name if farmer.user else "Farmer",
        farmer_location=farmer.location
    )

@router.get("/categories")
def get_categories(db: Session = Depends(get_db)):
    categories = db.query(Category).all()
    return [{"id": c.id, "name": c.name, "icon": c.icon} for c in categories]
