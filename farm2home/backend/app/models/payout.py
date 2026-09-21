from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True)
    payout_reference = Column(String(50), unique=True, index=True, nullable=False)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    status = Column(String(50), default="pending", index=True)  # pending, processing, paid, rejected
    payout_method = Column(String(50), default="UPI")  # UPI, Bank Transfer
    account_reference_masked = Column(String(100), nullable=True)  # e.g. "••••4417" or "farmer@okhdfcbank"
    requested_at = Column(DateTime, default=datetime.utcnow, index=True)
    settled_at = Column(DateTime, nullable=True)
    notes = Column(Text, nullable=True)

    # STRICT SECURITY: No plaintext full bank account numbers or card data stored.

    # Relationships
    farmer = relationship("FarmerProfile")
