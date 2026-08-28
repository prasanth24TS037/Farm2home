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
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="delivery_profile")
    assigned_orders = relationship("Order", back_populates="delivery_agent")
