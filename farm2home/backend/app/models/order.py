from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.database import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String(50), unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    delivery_agent_id = Column(Integer, ForeignKey("delivery_agents.id"), nullable=True, index=True)
    total_amount = Column(Float, nullable=False)
    delivery_fee = Column(Float, default=30.0)
    status = Column(String(50), default="pending", index=True)  # pending, confirmed, assigned, picked_up, out_for_delivery, delivered, cancelled
    payment_status = Column(String(50), default="completed") # pending, completed, failed
    payment_method = Column(String(50), default="UPI")
    delivery_address = Column(String(500), nullable=False)
    pickup_address = Column(String(500), nullable=True)
    pickup_lat = Column(Float, nullable=True)
    pickup_lng = Column(Float, nullable=True)
    drop_lat = Column(Float, nullable=True)
    drop_lng = Column(Float, nullable=True)
    delivery_slot = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    proof_of_delivery_url = Column(String(500), nullable=True)
    delivery_otp = Column(String(10), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    customer = relationship("CustomerProfile", back_populates="orders")
    delivery_agent = relationship("DeliveryProfile", back_populates="assigned_orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    payments = relationship("Payment", back_populates="order", cascade="all, delete-orphan", order_by="desc(Payment.id)")
    deliveries = relationship("Delivery", back_populates="order", cascade="all, delete-orphan")

    @property
    def payment(self):
        if not self.payments:
            return None
        # Prefer completed payment, else latest
        return next((p for p in self.payments if p.payment_status == "completed"), self.payments[0])

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    farmer_id = Column(Integer, ForeignKey("farmers.id"), nullable=False, index=True)
    quantity = Column(Float, nullable=False)
    unit_price = Column(Float, nullable=False)
    subtotal = Column(Float, nullable=False)

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")
    farmer = relationship("FarmerProfile", back_populates="order_items")
