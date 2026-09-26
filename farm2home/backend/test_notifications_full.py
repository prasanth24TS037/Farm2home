import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.database import Base, get_db
from app.main import app
from app.models.user import User
from app.models.farmer import FarmerProfile
from app.models.customer import CustomerProfile
from app.models.delivery import DeliveryProfile, Delivery
from app.models.product import Category, Product
from app.models.order import Order, OrderItem
from app.models.notification import Notification
from app.models.payout import Payout
from app.core.security import get_password_hash
from app.core.jwt_handler import create_access_token
from app.services.notification_service import NotificationService

# Isolated SQLite in-memory database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

client = TestClient(app)

class TestNotificationsFull:
    @pytest.fixture(autouse=True)
    def setup_db(self):
        app.dependency_overrides[get_db] = override_get_db
        Base.metadata.create_all(bind=engine)
        db = TestingSessionLocal()

        # 1. Create Users
        # Farmer 1
        farmer1_user = User(
            id=101,
            email="farmer1@farm2home.com",
            phone="9876500001",
            full_name="Ramesh Organic Farms",
            hashed_password=get_password_hash("Farmer@123"),
            role="farmer"
        )
        db.add(farmer1_user)
        db.flush()
        farmer1_profile = FarmerProfile(
            id=11,
            user_id=farmer1_user.id,
            farm_name="Ramesh Organic Farm",
            location="Thanjavur Delta, TN"
        )
        db.add(farmer1_profile)

        # Farmer 2
        farmer2_user = User(
            id=102,
            email="farmer2@farm2home.com",
            phone="9876500002",
            full_name="Lakshmi Greens & Herbs",
            hashed_password=get_password_hash("Farmer@123"),
            role="farmer"
        )
        db.add(farmer2_user)
        db.flush()
        farmer2_profile = FarmerProfile(
            id=12,
            user_id=farmer2_user.id,
            farm_name="Lakshmi Greens",
            location="Trichy Agro Zone, TN"
        )
        db.add(farmer2_profile)

        # Customer
        customer_user = User(
            id=201,
            email="customer@farm2home.com",
            phone="9876500003",
            full_name="Ananya Sharma",
            hashed_password=get_password_hash("Customer@123"),
            role="customer"
        )
        db.add(customer_user)
        db.flush()
        cust_profile = CustomerProfile(
            id=21,
            user_id=customer_user.id,
            delivery_address="No 14, Anna Nagar 2nd Street",
            city="Chennai",
            pincode="600040"
        )
        db.add(cust_profile)

        # Delivery Agent 1
        driver1_user = User(
            id=301,
            email="driver1@farm2home.com",
            phone="9876500004",
            full_name="Karthik Delivery Hero",
            hashed_password=get_password_hash("Driver@123"),
            role="delivery"
        )
        db.add(driver1_user)
        db.flush()
        driver1_profile = DeliveryProfile(
            id=31,
            user_id=driver1_user.id,
            vehicle_type="Electric Scooter",
            vehicle_number="TN-09-EV-1122",
            is_on_duty=True
        )
        db.add(driver1_profile)

        # Delivery Agent 2 (for reassignment testing)
        driver2_user = User(
            id=302,
            email="driver2@farm2home.com",
            phone="9876500005",
            full_name="Vijay Express Partner",
            hashed_password=get_password_hash("Driver@123"),
            role="delivery"
        )
        db.add(driver2_user)
        db.flush()
        driver2_profile = DeliveryProfile(
            id=32,
            user_id=driver2_user.id,
            vehicle_type="Motorcycle",
            vehicle_number="TN-09-BK-9988",
            is_on_duty=True
        )
        db.add(driver2_profile)

        # Category & Products
        cat = Category(id=1, name="Fresh Vegetables", description="Direct harvest vegetables")
        db.add(cat)
        db.flush()

        prod1 = Product(
            id=1,
            name="Country Tomatoes",
            farmer_id=farmer1_profile.id,
            category_id=cat.id,
            price_per_unit=40.0,
            stock_quantity=100.0,
            unit="kg"
        )
        prod2 = Product(
            id=2,
            name="Fresh Palak Greens",
            farmer_id=farmer2_profile.id,
            category_id=cat.id,
            price_per_unit=25.0,
            stock_quantity=50.0,
            unit="bunch"
        )
        db.add_all([prod1, prod2])
        db.commit()
        db.close()

        yield
        Base.metadata.drop_all(bind=engine)
        app.dependency_overrides.clear()

    def test_01_multi_farmer_order_notifications(self):
        """
        Multi-farmer checkout: Farmer A and Farmer B must each receive their own separate
        notification containing ONLY their respective products and subtotal.
        """
        db = TestingSessionLocal()
        order = Order(
            id=501,
            order_number="F2H-50001",
            customer_id=21,
            total_amount=135.0,  # 80 + 25 + 30 fee
            delivery_fee=30.0,
            status="confirmed",
            payment_status="completed",
            delivery_address="No 14, Anna Nagar, Chennai",
            pickup_address="Ramesh Organic Farm | Lakshmi Greens"
        )
        db.add(order)
        db.flush()

        item1 = OrderItem(
            order_id=order.id,
            product_id=1,
            farmer_id=11,
            quantity=2.0,
            unit_price=40.0,
            subtotal=80.0
        )
        item2 = OrderItem(
            order_id=order.id,
            product_id=2,
            farmer_id=12,
            quantity=1.0,
            unit_price=25.0,
            subtotal=25.0
        )
        db.add_all([item1, item2])
        db.commit()

        # Trigger notification service
        notifs = NotificationService.create_order_farmer_notifications(order, db)
        db.commit()

        assert len(notifs) == 2, "Expected 2 separate notifications for 2 distinct farmers"

        # Verify Farmer 1 Notification
        f1_notif = db.query(Notification).filter(Notification.user_id == 101).first()
        assert f1_notif is not None
        assert f1_notif.type == "new_order"
        assert "Country Tomatoes" in f1_notif.message
        assert "Fresh Palak" not in f1_notif.message, "Farmer 1 must NOT see Farmer 2's products!"
        assert "80.00" in f1_notif.message, "Farmer 1 subtotal should be ₹80.00"

        # Verify Farmer 2 Notification
        f2_notif = db.query(Notification).filter(Notification.user_id == 102).first()
        assert f2_notif is not None
        assert f2_notif.type == "new_order"
        assert "Fresh Palak" in f2_notif.message
        assert "Country Tomatoes" not in f2_notif.message, "Farmer 2 must NOT see Farmer 1's products!"
        assert "25.00" in f2_notif.message, "Farmer 2 subtotal should be ₹25.00"
        db.close()

    def test_02_delivery_assignment_and_reassignment_notifications(self):
        """
        Delivery assignment notifies Driver 1.
        Upon Driver 1 rejection and reassignment, Driver 2 gets notified, and Driver 1 does not get stale notifications.
        """
        db = TestingSessionLocal()
        order = Order(
            id=502,
            order_number="F2H-50002",
            customer_id=21,
            total_amount=100.0,
            status="confirmed",
            payment_status="completed",
            delivery_address="No 14, Anna Nagar, Chennai"
        )
        db.add(order)
        db.flush()

        leg = Delivery(
            id=601,
            order_id=order.id,
            farmer_id=11,
            delivery_agent_id=31,  # Driver 1
            pickup_address="Ramesh Organic Farm, Thanjavur",
            drop_address="No 14, Anna Nagar, Chennai",
            status="assigned",
            payout_amount=65.0,
            distance_km=4.0
        )
        db.add(leg)
        db.commit()

        # Step 1: Assign to Driver 1
        notif1 = NotificationService.create_delivery_assignment_notification(leg, db)
        db.commit()

        assert notif1 is not None
        assert notif1.user_id == 301  # Driver 1 user id
        assert notif1.type == "new_assignment"
        assert "Ramesh Organic Farm" in notif1.message
        assert "Anna Nagar" in notif1.message

        # Step 2: Driver 1 Rejects via API endpoint
        driver1_token = create_access_token("301", "delivery")
        resp = client.post(
            f"/api/delivery/orders/{leg.id}/reject",
            headers={"Authorization": f"Bearer {driver1_token}"}
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["reassigned"] is True

        # Check that Driver 2 received a notification
        db.expire_all()
        driver2_notif = db.query(Notification).filter(
            Notification.user_id == 302,
            Notification.type == "new_assignment"
        ).first()
        assert driver2_notif is not None, "Newly assigned Driver 2 must receive notification"
        assert driver2_notif.related_delivery_id == leg.id

        # Confirm Driver 1 did not get a second assignment notification
        driver1_notif_count = db.query(Notification).filter(
            Notification.user_id == 301,
            Notification.type == "new_assignment"
        ).count()
        assert driver1_notif_count == 1, "Driver 1 should only have their original notification"
        db.close()

    def test_03_delivery_status_transitions_multi_party_notifications(self):
        """
        Transitioning to 'picked_up' notifies customer.
        Transitioning to 'delivered' notifies customer, farmer, and driver.
        """
        db = TestingSessionLocal()
        order = Order(
            id=503,
            order_number="F2H-50003",
            customer_id=21,
            total_amount=120.0,
            status="confirmed",
            payment_status="completed",
            delivery_address="No 14, Anna Nagar, Chennai"
        )
        db.add(order)
        db.flush()

        item = OrderItem(
            order_id=order.id,
            product_id=1,
            farmer_id=11,
            quantity=3.0,
            unit_price=40.0,
            subtotal=120.0
        )
        db.add(item)

        leg = Delivery(
            id=602,
            order_id=order.id,
            farmer_id=11,
            delivery_agent_id=31,
            pickup_address="Ramesh Organic Farm, Thanjavur",
            drop_address="No 14, Anna Nagar, Chennai",
            status="accepted",
            payout_amount=70.0,
            distance_km=5.0
        )
        db.add(leg)
        db.commit()

        driver1_token = create_access_token("301", "delivery")

        # Step 1: Mark Picked Up
        resp1 = client.post(
            f"/api/delivery/orders/{leg.id}/update-status",
            json={"status": "picked_up"},
            headers={"Authorization": f"Bearer {driver1_token}"}
        )
        assert resp1.status_code == 200

        # Verify Customer notification
        cust_pickup_notif = db.query(Notification).filter(
            Notification.user_id == 201,  # Customer user id
            Notification.type == "order_picked_up"
        ).first()
        assert cust_pickup_notif is not None
        assert "F2H-50003" in cust_pickup_notif.title
        assert "picked up" in cust_pickup_notif.message

        # Step 2: Mark Delivered
        resp2 = client.post(
            f"/api/delivery/orders/{leg.id}/update-status",
            json={"status": "delivered", "otp": "4421"},
            headers={"Authorization": f"Bearer {driver1_token}"}
        )
        assert resp2.status_code == 200

        # Verify Customer received 'order_delivered'
        cust_del_notif = db.query(Notification).filter(
            Notification.user_id == 201,
            Notification.type == "order_delivered"
        ).first()
        assert cust_del_notif is not None

        # Verify Farmer received 'order_delivered' for their harvest
        farmer_del_notif = db.query(Notification).filter(
            Notification.user_id == 101,
            Notification.type == "order_delivered"
        ).first()
        assert farmer_del_notif is not None
        assert "Ananya Sharma" in farmer_del_notif.message
        assert "Country Tomatoes" in farmer_del_notif.message

        # Verify Driver received delivery completion notification
        driver_del_notif = db.query(Notification).filter(
            Notification.user_id == 301,
            Notification.type == "order_delivered"
        ).first()
        assert driver_del_notif is not None
        assert "+₹70" in driver_del_notif.message
        db.close()

    def test_04_notifications_api_endpoints_and_read_isolation(self):
        """
        Test GET /notifications, PATCH /notifications/{id}/read, PATCH /notifications/read-all,
        and verify strict multi-tenant privacy (User A cannot see or mark User B's notifications).
        """
        db = TestingSessionLocal()
        # Seed 3 notifications for Farmer 1 and 2 for Driver 1
        n1 = Notification(user_id=101, title="Notif 1", message="Msg 1", type="order", is_read=False)
        n2 = Notification(user_id=101, title="Notif 2", message="Msg 2", type="order", is_read=False)
        n3 = Notification(user_id=101, title="Notif 3", message="Msg 3", type="order", is_read=True)

        n_driver = Notification(user_id=301, title="Driver Notif", message="Driver Msg", type="delivery", is_read=False)
        db.add_all([n1, n2, n3, n_driver])
        db.commit()
        db.refresh(n1)
        db.refresh(n_driver)

        farmer_token = create_access_token("101", "farmer")
        driver_token = create_access_token("301", "delivery")

        # 1. GET /notifications for Farmer
        resp = client.get("/api/notifications", headers={"Authorization": f"Bearer {farmer_token}"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["unread_count"] == 2
        assert data["total_count"] == 3
        assert len(data["notifications"]) == 3
        # Ensure driver notification is NOT visible
        assert all(n["user_id"] == 101 for n in data["notifications"])

        # 2. Mark single notification read
        resp_read = client.patch(
            f"/api/notifications/{n1.id}/read",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert resp_read.status_code == 200
        assert resp_read.json()["unread_count"] == 1

        # 3. Privacy Test: Driver attempts to mark Farmer's notification as read -> 404/403
        resp_unauth = client.patch(
            f"/api/notifications/{n2.id}/read",
            headers={"Authorization": f"Bearer {driver_token}"}
        )
        assert resp_unauth.status_code in [404, 403]

        # 4. Mark all read for Farmer
        resp_all = client.patch(
            "/api/notifications/read-all",
            headers={"Authorization": f"Bearer {farmer_token}"}
        )
        assert resp_all.status_code == 200
        assert resp_all.json()["unread_count"] == 0

        # Confirm Driver's notification is still unread
        resp_driver = client.get("/api/notifications", headers={"Authorization": f"Bearer {driver_token}"})
        assert resp_driver.json()["unread_count"] == 1
        db.close()
