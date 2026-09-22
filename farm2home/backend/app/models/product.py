from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    icon = Column(String(50), default="Sprout")
    description = Column(String(255), nullable=True)

    products = relationship("Product", back_populates="category")

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    price_per_unit = Column(Float, nullable=False)
    unit = Column(String(20), default="kg") # kg, bunch, piece, liter, dozen
    stock_quantity = Column(Float, default=0.0)
    low_stock_threshold = Column(Float, default=10.0)
    image_url = Column(String(500), nullable=True)
    is_organic = Column(Boolean, default=False)
    rating = Column(Float, default=4.8)
    review_count = Column(Integer, default=0)
    ai_suggested_price = Column(Float, nullable=True)
    ai_price_confidence = Column(Float, default=0.92)
    is_active = Column(Boolean, default=True, index=True)
    deleted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    farmer = relationship("FarmerProfile", back_populates="products")
    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")
