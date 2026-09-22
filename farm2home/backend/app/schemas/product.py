from typing import Optional
from pydantic import BaseModel

class QuickPriceUpdateRequest(BaseModel):
    price_per_unit: float

class QuickStockUpdateRequest(BaseModel):
    stock_quantity: float

class QuickImageUpdateRequest(BaseModel):
    image_url: str

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    price_per_unit: float
    unit: Optional[str] = "kg"
    stock_quantity: float
    image_url: Optional[str] = None
    is_organic: Optional[bool] = False

class ProductResponse(BaseModel):
    id: int
    farmer_id: int
    category_id: Optional[int]
    name: str
    description: Optional[str]
    price_per_unit: float
    unit: str
    stock_quantity: float
    low_stock_threshold: float
    image_url: Optional[str]
    is_organic: bool
    rating: float
    review_count: int
    ai_suggested_price: Optional[float]
    ai_price_confidence: Optional[float]
    farmer_name: Optional[str] = None
    farmer_location: Optional[str] = None
    is_active: bool = True
    has_orders: bool = False

    class Config:
        from_attributes = True
