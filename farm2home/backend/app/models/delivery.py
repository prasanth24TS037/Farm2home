from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class DeliveryProfile(Base):
    __tablename__ = "delivery_agents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    vehicle_type = Column(String(50), default="Motorcycle")
    vehicle_number = Column(String(50), nullable=True)
    license_number = Column(String(100), nullable=True)
    is_on_duty = Column(Boolean, default=True)
    current_lat = Column(Float, nullable=True)
    current_lng = Column(Float, nullable=True)
    total_deliveries = Column(Integer, default=0)
    completed_today = Column(Integer, default=0)
    total_earnings = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="delivery_profile")
    assigned_orders = relationship("Order", back_populates="delivery_agent")
    deliveries = relationship("Delivery", back_populates="delivery_agent")

class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False, index=True)
    delivery_agent_id = Column(Integer, ForeignKey("delivery_agents.id"), nullable=True, index=True)
    
    pickup_address = Column(String(500), nullable=False)
    drop_address = Column(String(500), nullable=False)
    pickup_lat = Column(Float, nullable=True)
    pickup_lng = Column(Float, nullable=True)
    drop_lat = Column(Float, nullable=True)
    drop_lng = Column(Float, nullable=True)
    
    status = Column(String(50), default="unassigned", index=True)  # unassigned, assigned, accepted, picked_up, out_for_delivery, delivered, cancelled
    
    assigned_at = Column(DateTime, nullable=True)
    picked_up_at = Column(DateTime, nullable=True)
    delivered_at = Column(DateTime, nullable=True)
    
    proof_of_delivery_url = Column(String(500), nullable=True)
    delivery_otp = Column(String(10), nullable=True)
    payout_amount = Column(Float, default=65.0)
    distance_km = Column(Float, default=4.5)
    
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    order = relationship("Order", back_populates="deliveries")
    farmer = relationship("FarmerProfile", back_populates="deliveries")
    delivery_agent = relationship("DeliveryProfile", back_populates="deliveries")
