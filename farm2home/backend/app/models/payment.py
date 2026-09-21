from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(String(100), unique=True, index=True, nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    payment_status = Column(String(50), nullable=False)  # completed, pending, failed
    amount = Column(Float, nullable=False)
    payment_method = Column(String(50), nullable=False)  # UPI, Card, Net Banking, Cash on Delivery
    transaction_time = Column(DateTime, default=datetime.utcnow)

    # STRICT SECURITY REQUIREMENT: No raw card numbers, CVVs, or expiry dates are stored.

    # Relationships
    order = relationship("Order", back_populates="payment")
