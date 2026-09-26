import unittest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.db.database import SessionLocal, Base, engine
from app.db.seed import ensure_schema_columns
from app.models.user import User
from app.models.farmer import FarmerProfile
from app.models.customer import CustomerProfile
from app.models.delivery import DeliveryProfile, Delivery
from app.models.product import Product, Category
from app.models.order import Order, OrderItem
from app.models.payout import Payout
from app.core.security import get_password_hash
from app.core.jwt_handler import create_access_token

class TestDeliveryDashboardFull(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        ensure_schema_columns()
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        cls.suffix = "_dash_test@farm2home.com"

        # Cleanup prior test data
        cls.cleanup()

        # Create Farmer
        cls.farmer_user = User(
            full_name="Farmer Dashboard Delta",
            email=f"farmer{cls.suffix}",
            phone="+91 91111 22222",
            hashed_password=get_password_hash("Pass@123"),
            role="farmer"
        )
        cls.db.add(cls.farmer_user)
        cls.db.flush()

        cls.farmer_profile = FarmerProfile(
            user_id=cls.farmer_user.id,
            farm_name="Delta Green Harvest",
            location="Thanjavur, Tamil Nadu"
        )
        cls.db.add(cls.farmer_profile)
        cls.db.flush()

        # Create Customer
        cls.cust_user = User(
            full_name="Customer Dash",
            email=f"cust{cls.suffix}",
            phone="+91 93333 44444",
            hashed_password=get_password_hash("Pass@123"),
            role="customer"
        )
        cls.db.add(cls.cust_user)
        cls.db.flush()

        cls.cust_profile = CustomerProfile(
            user_id=cls.cust_user.id,
            delivery_address="304 Maple St, Chennai",
            city="Chennai"
        )
        cls.db.add(cls.cust_profile)
        cls.db.flush()

        # Create or fetch Category & Product
        cls.cat = cls.db.query(Category).filter(Category.name == "Fresh Vegetables").first()
        if not cls.cat:
            cls.cat = cls.db.query(Category).first()
        if not cls.cat:
            cls.cat = Category(name="Test Veg Dash", icon="Carrot")
            cls.db.add(cls.cat)
            cls.db.flush()

        cls.prod = Product(
            farmer_id=cls.farmer_profile.id,
            category_id=cls.cat.id,
            name="Organic Carrots",
            price_per_unit=50.0,
            unit="kg",
            stock_quantity=100.0
        )
        cls.db.add(cls.prod)
        cls.db.flush()

        # Create Agent 1 (Ram)
        cls.agent1_user = User(
            full_name="Ram Kumar",
            email=f"ram{cls.suffix}",
            phone="+91 97777 88888",
            hashed_password=get_password_hash("Pass@123"),
            role="delivery"
        )
        cls.db.add(cls.agent1_user)
        cls.db.flush()

        cls.agent1_profile = DeliveryProfile(
            user_id=cls.agent1_user.id,
            vehicle_type="Electric Scooter",
            vehicle_number="TN-09-EV-1111",
            license_number="DL-TN-2023-1111",
            is_on_duty=True,
            total_deliveries=5,
            completed_today=2,
            total_earnings=350.0,
            payout_method="UPI",
            payout_upi_id="ram.delivery@okaxis",
            payout_account_holder="Ram Kumar",
            payout_account_last_four="1111",
            kyc_status="verified"
        )
        cls.db.add(cls.agent1_profile)
        cls.db.flush()

        # Create Agent 2 (Shiva)
        cls.agent2_user = User(
            full_name="Shiva Sundar",
            email=f"shiva{cls.suffix}",
            phone="+91 96666 55555",
            hashed_password=get_password_hash("Pass@123"),
            role="delivery"
        )
        cls.db.add(cls.agent2_user)
        cls.db.flush()

        cls.agent2_profile = DeliveryProfile(
            user_id=cls.agent2_user.id,
            vehicle_type="Motorcycle",
            vehicle_number="TN-09-MC-2222",
            license_number="DL-TN-2023-2222",
            is_on_duty=True,
            total_deliveries=0,
            completed_today=0,
            total_earnings=0.0
        )
        cls.db.add(cls.agent2_profile)
        cls.db.commit()

        cls.token_agent1 = create_access_token(subject=cls.agent1_user.id, role="delivery")
        cls.token_agent2 = create_access_token(subject=cls.agent2_user.id, role="delivery")

    @classmethod
    def cleanup(cls):
        users = cls.db.query(User).filter(User.email.like(f"%{cls.suffix}")).all()
        for u in users:
            cls.db.query(Payout).filter(Payout.delivery_agent_id.in_(
                cls.db.query(DeliveryProfile.id).filter(DeliveryProfile.user_id == u.id)
            )).delete(synchronize_session=False)
            cls.db.query(Delivery).filter(Delivery.delivery_agent_id.in_(
                cls.db.query(DeliveryProfile.id).filter(DeliveryProfile.user_id == u.id)
            )).delete(synchronize_session=False)
            cls.db.query(DeliveryProfile).filter(DeliveryProfile.user_id == u.id).delete(synchronize_session=False)
            cls.db.query(CustomerProfile).filter(CustomerProfile.user_id == u.id).delete(synchronize_session=False)
            cls.db.query(FarmerProfile).filter(FarmerProfile.user_id == u.id).delete(synchronize_session=False)
            cls.db.query(User).filter(User.id == u.id).delete(synchronize_session=False)
        cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.cleanup()
        cls.db.close()

    def test_01_duty_toggle_persistence(self):
        headers = {"Authorization": f"Bearer {self.token_agent1}"}

        # Toggle to off duty
        res = self.client.patch("/api/delivery/availability", json={"is_on_duty": False}, headers=headers)
        self.assertEqual(res.status_code, 200)
        self.assertFalse(res.json()["is_on_duty"])

        # Check dashboard reflects off duty
        dash = self.client.get("/api/delivery/dashboard", headers=headers).json()
        self.assertFalse(dash["is_on_duty"])

        # Toggle back to on duty
        res2 = self.client.post("/api/delivery/toggle-duty", json={"is_on_duty": True}, headers=headers)
        self.assertEqual(res2.status_code, 200)
        self.assertTrue(res2.json()["is_on_duty"])

    def test_02_delivery_lifecycle_progression(self):
        headers = {"Authorization": f"Bearer {self.token_agent1}"}
        import random

        # Create an order and delivery leg assigned to Agent 1
        ord_no = f"ORD-TEST-{random.randint(10000, 99999)}"
        order = Order(
            order_number=ord_no,
            customer_id=self.cust_profile.id,
            total_amount=200.0,
            status="confirmed",
            payment_status="completed",
            delivery_address="304 Maple St, Chennai"
        )
        self.db.add(order)
        self.db.flush()

        item = OrderItem(
            order_id=order.id,
            product_id=self.prod.id,
            farmer_id=self.farmer_profile.id,
            quantity=4.0,
            unit_price=50.0,
            subtotal=200.0
        )
        self.db.add(item)
        self.db.flush()

        leg = Delivery(
            order_id=order.id,
            farmer_id=self.farmer_profile.id,
            delivery_agent_id=self.agent1_profile.id,
            pickup_address="Delta Green Harvest, Thanjavur",
            drop_address=order.delivery_address,
            pickup_lat=10.79,
            pickup_lng=79.13,
            drop_lat=10.81,
            drop_lng=79.15,
            status="assigned",
            payout_amount=75.0,
            distance_km=5.0
        )
        self.db.add(leg)
        self.db.commit()

        # Step 1: Accept
        res_accept = self.client.post(
            f"/api/delivery/orders/{leg.id}/update-status",
            json={"status": "accepted"},
            headers=headers
        )
        self.assertEqual(res_accept.status_code, 200)
        self.assertEqual(res_accept.json()["status"], "accepted")

        # Step 2: Picked Up
        res_pickup = self.client.post(
            f"/api/delivery/orders/{leg.id}/update-status",
            json={"status": "picked_up"},
            headers=headers
        )
        self.assertEqual(res_pickup.status_code, 200)
        self.assertEqual(res_pickup.json()["status"], "picked_up")

        # Step 3: Out for Delivery
        res_out = self.client.post(
            f"/api/delivery/orders/{leg.id}/update-status",
            json={"status": "out_for_delivery"},
            headers=headers
        )
        self.assertEqual(res_out.status_code, 200)
        self.assertEqual(res_out.json()["status"], "out_for_delivery")

        # Step 4: Mark Delivered with Proof URL & OTP
        res_del = self.client.post(
            f"/api/delivery/orders/{leg.id}/update-status",
            json={"status": "delivered", "proof_url": "https://example.com/pod.jpg", "otp": "4421"},
            headers=headers
        )
        self.assertEqual(res_del.status_code, 200)
        self.assertEqual(res_del.json()["status"], "delivered")

        # Confirm appears in history
        hist = self.client.get("/api/delivery/history", headers=headers).json()
        self.assertTrue(any(h["id"] == leg.id and h["status"] == "delivered" for h in hist["history"]))

        # Confirm detail view works
        detail = self.client.get(f"/api/delivery/history/{leg.id}", headers=headers).json()
        self.assertEqual(detail["id"], leg.id)
        self.assertEqual(detail["proof_of_delivery_url"], "https://example.com/pod.jpg")

    def test_03_reject_reassignment(self):
        headers1 = {"Authorization": f"Bearer {self.token_agent1}"}
        headers2 = {"Authorization": f"Bearer {self.token_agent2}"}
        import random

        # Create unaccepted delivery assigned to Agent 1
        ord_no2 = f"ORD-TEST-{random.randint(10000, 99999)}"
        order = Order(
            order_number=ord_no2,
            customer_id=self.cust_profile.id,
            total_amount=150.0,
            status="confirmed",
            payment_status="completed",
            delivery_address="304 Maple St, Chennai"
        )
        self.db.add(order)
        self.db.flush()

        leg = Delivery(
            order_id=order.id,
            farmer_id=self.farmer_profile.id,
            delivery_agent_id=self.agent1_profile.id,
            pickup_address="Delta Green Harvest, Thanjavur",
            drop_address=order.delivery_address,
            status="assigned",
            payout_amount=60.0,
            distance_km=4.0
        )
        self.db.add(leg)
        self.db.commit()

        # Agent 1 rejects
        res_rej = self.client.post(f"/api/delivery/orders/{leg.id}/reject", headers=headers1)
        self.assertEqual(res_rej.status_code, 200)

        # Agent 1 should no longer have it active
        dash1 = self.client.get("/api/delivery/dashboard", headers=headers1).json()
        self.assertFalse(any(d["delivery_id"] == leg.id for d in dash1["active_deliveries"]))

    def test_04_route_generation(self):
        headers = {"Authorization": f"Bearer {self.token_agent1}"}
        import random

        # Create an active delivery
        ord_no3 = f"ORD-ROUTE-{random.randint(10000, 99999)}"
        order = Order(
            order_number=ord_no3,
            customer_id=self.cust_profile.id,
            total_amount=100.0,
            status="confirmed",
            payment_status="completed",
            delivery_address="304 Maple St, Chennai"
        )
        self.db.add(order)
        self.db.flush()

        leg = Delivery(
            order_id=order.id,
            farmer_id=self.farmer_profile.id,
            delivery_agent_id=self.agent1_profile.id,
            pickup_address="Delta Green Harvest, Thanjavur",
            drop_address=order.delivery_address,
            pickup_lat=10.79,
            pickup_lng=79.13,
            drop_lat=10.81,
            drop_lng=79.15,
            status="accepted",
            payout_amount=65.0,
            distance_km=4.5
        )
        self.db.add(leg)
        self.db.commit()

        route_res = self.client.get("/api/delivery/route", headers=headers).json()
        self.assertIn("route", route_res)
        self.assertTrue(len(route_res["route"]) >= 2)
        # Verify nav url exists for turning navigation
        self.assertTrue(route_res["route"][0]["nav_url"].startswith("https://www.google.com/maps/dir/"))

    def test_05_earnings_and_payout_request(self):
        headers = {"Authorization": f"Bearer {self.token_agent1}"}

        # Fetch earnings
        earnings = self.client.get("/api/delivery/earnings", headers=headers).json()
        self.assertIn("total_earnings", earnings)
        self.assertIn("pending_settlement", earnings)
        self.assertIn("payout_account", earnings)

        # Update payout destination
        res_acc = self.client.patch(
            "/api/delivery/payout-account",
            json={"payout_method": "UPI", "upi_id": "ram.new@okhdfc"},
            headers=headers
        )
        self.assertEqual(res_acc.status_code, 200)
        self.assertEqual(res_acc.json()["payout_account"]["payout_upi_id"], "ram.new@okhdfc")

        # Request payout if balance >= 200
        if earnings["pending_settlement"] >= 200:
            po_res = self.client.post(
                "/api/delivery/payout-request",
                json={"amount": 200.0, "notes": "Weekly settlement"},
                headers=headers
            )
            self.assertEqual(po_res.status_code, 200)
            self.assertEqual(po_res.json()["payout"]["status"], "pending")

    def test_06_driver_isolation(self):
        headers1 = {"Authorization": f"Bearer {self.token_agent1}"}
        headers2 = {"Authorization": f"Bearer {self.token_agent2}"}

        # Agent 2 should not see Agent 1's history or active deliveries
        dash2 = self.client.get("/api/delivery/dashboard", headers=headers2).json()
        hist2 = self.client.get("/api/delivery/history", headers=headers2).json()

        self.assertEqual(len(dash2["active_deliveries"]), 0)
        self.assertEqual(len(hist2["history"]), 0)

if __name__ == "__main__":
    unittest.main()
