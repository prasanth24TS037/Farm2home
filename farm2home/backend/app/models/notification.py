from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="order", index=True)  # new_order, new_assignment, order_picked_up, order_delivered, payout_processed, system
    related_order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    related_delivery_id = Column(Integer, ForeignKey("deliveries.id"), nullable=True)
    is_read = Column(Boolean, default=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="notifications")
    order = relationship("Order")
    delivery = relationship("Delivery")
