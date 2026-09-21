from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class FarmerProfile(Base):
    __tablename__ = "farmers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    farm_name = Column(String(255), nullable=True)
    location = Column(String(255), nullable=True)
    district = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    pincode = Column(String(20), nullable=True)
    farm_size_acres = Column(Float, default=0.0)
    organic_certified = Column(Boolean, default=False)
    total_earnings = Column(Float, default=0.0)
    payout_method = Column(String(50), default="UPI")
    payout_upi_id = Column(String(100), nullable=True)
    payout_account_holder = Column(String(100), nullable=True)
    payout_account_last_four = Column(String(10), nullable=True)
    payout_bank_name = Column(String(100), nullable=True)
    payout_bank_ifsc = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="farmer_profile")
    products = relationship("Product", back_populates="farmer", cascade="all, delete-orphan")
    payouts = relationship("Payout", back_populates="farmer", cascade="all, delete-orphan")
    order_items = relationship("OrderItem", back_populates="farmer")
    deliveries = relationship("Delivery", back_populates="farmer")

