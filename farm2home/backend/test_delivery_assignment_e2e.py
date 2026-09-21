import sys
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
from app.models.payment import Payment
from app.models.cart import CartItem
from app.core.security import get_password_hash
from app.core.jwt_handler import create_access_token
from app.routers.delivery import create_order_delivery_legs, assign_delivery_leg

class TestDeliveryAssignmentE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        Base.metadata.create_all(bind=engine)
        ensure_schema_columns()
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        cls.test_email_suffix = "_dlv_test@farm2home.com"
        cls.cleanup_test_data()

        # Step 1: Create 2 Farmers (Farmer A & Farmer B)
        cls.user_farmer_a = User(
            full_name="Farmer Ramesh A",
            email=f"farmer_a{cls.test_email_suffix}",
            hashed_password=get_password_hash("Pass@123"),
            role="farmer"
        )
        cls.db.add(cls.user_farmer_a)
        cls.db.flush()

        cls.profile_farmer_a = FarmerProfile(
            user_id=cls.user_farmer_a.id,
            farm_name="Ramesh Organic Fields",
            location="Thanjavur Delta, Tamil Nadu",
            total_earnings=0.0
        )
        cls.db.add(cls.profile_farmer_a)
        cls.db.flush()

        cls.user_farmer_b = User(
            full_name="Farmer Kavitha B",
            email=f"farmer_b{cls.test_email_suffix}",
            hashed_password=get_password_hash("Pass@123"),
            role="farmer"
        )
        cls.db.add(cls.user_farmer_b)
        cls.db.flush()

        cls.profile_farmer_b = FarmerProfile(
            user_id=cls.user_farmer_b.id,
            farm_name="Kavitha Eco Groves",
            location="Pollachi Coconut Belt, Coimbatore",
            total_earnings=0.0
        )
        cls.db.add(cls.profile_farmer_b)
        cls.db.flush()

        # Step 2: Create Customer B
        cls.user_customer = User(
            full_name="Customer Priya B",
            email=f"customer_b{cls.test_email_suffix}",
            phone="+91 99887 76655",
            hashed_password=get_password_hash("Pass@123"),
            role="customer"
        )
        cls.db.add(cls.user_customer)
        cls.db.flush()

        cls.profile_customer = CustomerProfile(
            user_id=cls.user_customer.id,
            delivery_address="Flat 502, Lotus Towers, Anna Nagar, Chennai",
            city="Chennai",
            pincode="600040"
        )
        cls.db.add(cls.profile_customer)
        cls.db.flush()

        # Step 3: Create Category and Products
        cls.cat = cls.db.query(Category).first()
        if not cls.cat:
            cls.cat = Category(name="Test Veg", icon="Carrot")
            cls.db.add(cls.cat)
            cls.db.flush()

        cls.product_a = Product(
            farmer_id=cls.profile_farmer_a.id,
            category_id=cls.cat.id,
            name="Thanjavur Heirloom Tomatoes",
            price_per_unit=40.0,
            unit="kg",
            stock_quantity=100.0,
            low_stock_threshold=10.0
        )
        cls.product_b = Product(
            farmer_id=cls.profile_farmer_b.id,
            category_id=cls.cat.id,
            name="Pollachi Fresh Tender Coconuts",
            price_per_unit=50.0,
            unit="piece",
            stock_quantity=80.0,
            low_stock_threshold=10.0
        )
        cls.db.add_all([cls.product_a, cls.product_b])
        cls.db.flush()

        # Step 4: Create Delivery Agent D and Delivery Agent E (Both On-Duty)
        cls.user_agent_d = User(
            full_name="Delivery Partner Agent D",
            email=f"agent_d{cls.test_email_suffix}",
            phone="+91 91111 22222",
            hashed_password=get_password_hash("Pass@123"),
            role="delivery"
        )
        cls.db.add(cls.user_agent_d)
        cls.db.flush()

        cls.profile_agent_d = DeliveryProfile(
            user_id=cls.user_agent_d.id,
            vehicle_type="Electric Scooter (EV-Pro)",
            vehicle_number="TN-01-D-1001",
            license_number="DL-TN-01-2024-D",
            is_on_duty=True
        )
        cls.db.add(cls.profile_agent_d)
        cls.db.flush()

        cls.user_agent_e = User(
            full_name="Delivery Partner Agent E",
            email=f"agent_e{cls.test_email_suffix}",
            phone="+91 93333 44444",
            hashed_password=get_password_hash("Pass@123"),
            role="delivery"
        )
        cls.db.add(cls.user_agent_e)
        cls.db.flush()

        cls.profile_agent_e = DeliveryProfile(
            user_id=cls.user_agent_e.id,
            vehicle_type="Cargo Bike (EV-Cargo)",
            vehicle_number="TN-01-E-2002",
            license_number="DL-TN-01-2024-E",
            is_on_duty=True
        )
        cls.db.add(cls.profile_agent_e)
        cls.db.commit()

        # Auth tokens
        cls.token_farmer_a = create_access_token(cls.user_farmer_a.id, "farmer")
        cls.token_farmer_b = create_access_token(cls.user_farmer_b.id, "farmer")
        cls.token_customer = create_access_token(cls.user_customer.id, "customer")
        cls.token_agent_d = create_access_token(cls.user_agent_d.id, "delivery")
        cls.token_agent_e = create_access_token(cls.user_agent_e.id, "delivery")

    @classmethod
    def cleanup_test_data(cls):
        cls.db.rollback()
        test_users = cls.db.query(User).filter(User.email.like(f"%{cls.test_email_suffix}")).all()
        user_ids = [u.id for u in test_users]
        if user_ids:
            farmers = cls.db.query(FarmerProfile).filter(FarmerProfile.user_id.in_(user_ids)).all()
            farmer_ids = [f.id for f in farmers]
            customers = cls.db.query(CustomerProfile).filter(CustomerProfile.user_id.in_(user_ids)).all()
            cust_ids = [c.id for c in customers]
            agents = cls.db.query(DeliveryProfile).filter(DeliveryProfile.user_id.in_(user_ids)).all()
            agent_ids = [a.id for a in agents]

            # Delete deliveries
            cls.db.query(Delivery).filter(
                (Delivery.farmer_id.in_(farmer_ids)) |
                (Delivery.delivery_agent_id.in_(agent_ids))
            ).delete(synchronize_session=False)

            # Delete orders & items & payments
            orders = cls.db.query(Order).filter(Order.customer_id.in_(cust_ids)).all()
            order_ids = [o.id for o in orders]
            if order_ids:
                cls.db.query(Delivery).filter(Delivery.order_id.in_(order_ids)).delete(synchronize_session=False)
                cls.db.query(Payment).filter(Payment.order_id.in_(order_ids)).delete(synchronize_session=False)
                cls.db.query(OrderItem).filter(OrderItem.order_id.in_(order_ids)).delete(synchronize_session=False)
                cls.db.query(Order).filter(Order.id.in_(order_ids)).delete(synchronize_session=False)

            cls.db.query(Product).filter(Product.farmer_id.in_(farmer_ids)).delete(synchronize_session=False)
            cls.db.query(CartItem).filter(CartItem.user_id.in_(user_ids)).delete(synchronize_session=False)
            cls.db.query(DeliveryProfile).filter(DeliveryProfile.user_id.in_(user_ids)).delete(synchronize_session=False)
            cls.db.query(FarmerProfile).filter(FarmerProfile.user_id.in_(user_ids)).delete(synchronize_session=False)
            cls.db.query(CustomerProfile).filter(CustomerProfile.user_id.in_(user_ids)).delete(synchronize_session=False)
            cls.db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
            cls.db.commit()

    @classmethod
    def tearDownClass(cls):
        cls.cleanup_test_data()
        cls.db.close()

    def test_01_both_agents_created_and_on_duty(self):
        """1. Verify Agent D and Agent E exist and are both on-duty"""
        self.assertTrue(self.profile_agent_d.is_on_duty)
        self.assertTrue(self.profile_agent_e.is_on_duty)
        self.assertNotEqual(self.profile_agent_d.id, self.profile_agent_e.id)

    def test_02_and_03_multi_farmer_order_creates_two_delivery_legs(self):
        """2 & 3. Multi-farmer order creates two distinct delivery legs (one per farmer)"""
        # Place order with items from Farmer A and Farmer B
        db = SessionLocal()
        order = Order(
            order_number="F2H-E2E-TEST-001",
            customer_id=self.profile_customer.id,
            total_amount=210.0,
            delivery_fee=30.0,
            status="pending",
            payment_status="pending",
            delivery_address=self.profile_customer.delivery_address,
            pickup_address="Multiple Farm Locations"
        )
        db.add(order)
        db.flush()

        item_a = OrderItem(
            order_id=order.id,
            product_id=self.product_a.id,
            farmer_id=self.profile_farmer_a.id,
            quantity=2.0,
            unit_price=40.0,
            subtotal=80.0
        )
        item_b = OrderItem(
            order_id=order.id,
            product_id=self.product_b.id,
            farmer_id=self.profile_farmer_b.id,
            quantity=2.0,
            unit_price=50.0,
            subtotal=100.0
        )
        db.add_all([item_a, item_b])
        db.commit()
        db.refresh(order)

        # Confirm payment via payment process endpoint
        res = self.client.post(
            "/api/payments/process",
            json={"order_id": order.id, "payment_method": "UPI", "simulate_failure": False},
            headers={"Authorization": f"Bearer {self.token_customer}"}
        )
        self.assertEqual(res.status_code, 200, res.text)

        # Verify two deliveries rows are created
        legs = db.query(Delivery).filter(Delivery.order_id == order.id).all()
        self.assertEqual(len(legs), 2, "Expected exactly 2 delivery legs for 2 distinct farmers")

        # Confirm each leg points to the corresponding farmer
        farmer_ids_in_legs = {leg.farmer_id for leg in legs}
        self.assertIn(self.profile_farmer_a.id, farmer_ids_in_legs)
        self.assertIn(self.profile_farmer_b.id, farmer_ids_in_legs)

        # Check pickup address sourced from real farm location
        leg_a = next(l for l in legs if l.farmer_id == self.profile_farmer_a.id)
        self.assertIn(self.profile_farmer_a.farm_name, leg_a.pickup_address)
        self.assertIn(self.profile_farmer_a.location, leg_a.pickup_address)
        self.assertEqual(leg_a.drop_address, order.delivery_address)

        leg_b = next(l for l in legs if l.farmer_id == self.profile_farmer_b.id)
        self.assertIn(self.profile_farmer_b.farm_name, leg_b.pickup_address)
        self.assertIn(self.profile_farmer_b.location, leg_b.pickup_address)
        self.assertEqual(leg_b.drop_address, order.delivery_address)

        TestDeliveryAssignmentE2E.shared_order_id = order.id
        db.close()

    def test_04_independent_assignment_of_legs(self):
        """4. Assign Farmer A's leg to Agent D and Farmer B's leg to Agent E"""
        db = SessionLocal()
        order_id = TestDeliveryAssignmentE2E.shared_order_id
        legs = db.query(Delivery).filter(Delivery.order_id == order_id).all()

        leg_a = next(l for l in legs if l.farmer_id == self.profile_farmer_a.id)
        leg_b = next(l for l in legs if l.farmer_id == self.profile_farmer_b.id)

        leg_a.delivery_agent_id = self.profile_agent_d.id
        leg_a.status = "assigned"
        leg_a.assigned_at = datetime.utcnow()

        leg_b.delivery_agent_id = self.profile_agent_e.id
        leg_b.status = "assigned"
        leg_b.assigned_at = datetime.utcnow()

        db.commit()

        TestDeliveryAssignmentE2E.leg_a_id = leg_a.id
        TestDeliveryAssignmentE2E.leg_b_id = leg_b.id
        db.close()

    def test_05_agent_d_sees_only_farmer_a_leg(self):
        """5. Log in as Agent D: only Farmer A's leg appears in Home, Route, History"""
        # Home/Dashboard
        res_dash = self.client.get("/api/delivery/dashboard", headers={"Authorization": f"Bearer {self.token_agent_d}"})
        self.assertEqual(res_dash.status_code, 200)
        data = res_dash.json()
        active = data.get("active_deliveries", [])
        
        # Must have leg A
        active_ids = [d["delivery_id"] for d in active]
        self.assertIn(TestDeliveryAssignmentE2E.leg_a_id, active_ids)
        self.assertNotIn(TestDeliveryAssignmentE2E.leg_b_id, active_ids)

        # Check pickup address is Farmer A's location
        leg_d_view = next(d for d in active if d["delivery_id"] == TestDeliveryAssignmentE2E.leg_a_id)
        self.assertEqual(leg_d_view["pickup_name"], self.profile_farmer_a.farm_name)
        self.assertEqual(leg_d_view["drop_address"], self.profile_customer.delivery_address)

        # Route tab
        res_route = self.client.get("/api/delivery/route", headers={"Authorization": f"Bearer {self.token_agent_d}"})
        self.assertEqual(res_route.status_code, 200)
        route_stops = res_route.json().get("route", [])
        route_delivery_ids = {s.get("delivery_id") for s in route_stops}
        self.assertIn(TestDeliveryAssignmentE2E.leg_a_id, route_delivery_ids)
        self.assertNotIn(TestDeliveryAssignmentE2E.leg_b_id, route_delivery_ids)

    def test_06_agent_e_sees_only_farmer_b_leg(self):
        """6. Log in as Agent E: only Farmer B's leg appears, Farmer A's leg is nowhere visible"""
        res_dash = self.client.get("/api/delivery/dashboard", headers={"Authorization": f"Bearer {self.token_agent_e}"})
        self.assertEqual(res_dash.status_code, 200)
        data = res_dash.json()
        active = data.get("active_deliveries", [])

        active_ids = [d["delivery_id"] for d in active]
        self.assertIn(TestDeliveryAssignmentE2E.leg_b_id, active_ids)
        self.assertNotIn(TestDeliveryAssignmentE2E.leg_a_id, active_ids)

        # Route tab
        res_route = self.client.get("/api/delivery/route", headers={"Authorization": f"Bearer {self.token_agent_e}"})
        self.assertEqual(res_route.status_code, 200)
        route_stops = res_route.json().get("route", [])
        route_delivery_ids = {s.get("delivery_id") for s in route_stops}
        self.assertIn(TestDeliveryAssignmentE2E.leg_b_id, route_delivery_ids)
        self.assertNotIn(TestDeliveryAssignmentE2E.leg_a_id, route_delivery_ids)

    def test_07_farmer_a_sees_agent_d_not_agent_e(self):
        """7. Log in as Farmer A: Orders view shows Agent D (not Agent E)"""
        res = self.client.get("/api/orders/farmer-orders", headers={"Authorization": f"Bearer {self.token_farmer_a}"})
        self.assertEqual(res.status_code, 200)
        orders = res.json()

        matching_order = next((o for o in orders if o["id"] == TestDeliveryAssignmentE2E.shared_order_id), None)
        self.assertIsNotNone(matching_order, "Farmer A should see their portion of the order")

        # Must show Agent D's name and phone
        self.assertIsNotNone(matching_order.get("delivery_agent"))
        self.assertEqual(matching_order["delivery_agent"]["name"], self.user_agent_d.full_name)
        self.assertEqual(matching_order["delivery_agent"]["phone"], self.user_agent_d.phone)

        # Farmer B must see Agent E
        res_b = self.client.get("/api/orders/farmer-orders", headers={"Authorization": f"Bearer {self.token_farmer_b}"})
        self.assertEqual(res_b.status_code, 200)
        matching_b = next((o for o in res_b.json() if o["id"] == TestDeliveryAssignmentE2E.shared_order_id), None)
        self.assertIsNotNone(matching_b)
        self.assertEqual(matching_b["delivery_agent"]["name"], self.user_agent_e.full_name)

    def test_08_customer_order_tracking_shows_both_legs(self):
        """8. Customer B order tracking correctly reflects both legs and respective real agents"""
        res = self.client.get(f"/api/orders/{TestDeliveryAssignmentE2E.shared_order_id}", headers={"Authorization": f"Bearer {self.token_customer}"})
        self.assertEqual(res.status_code, 200)
        data = res.json()

        deliveries = data.get("deliveries", [])
        self.assertEqual(len(deliveries), 2)

        leg_a_data = next(d for d in deliveries if d["farmer_id"] == self.profile_farmer_a.id)
        self.assertEqual(leg_a_data["delivery_agent"]["name"], self.user_agent_d.full_name)
        self.assertEqual(leg_a_data["pickup_address"], f"{self.profile_farmer_a.farm_name}, {self.profile_farmer_a.location}")

        leg_b_data = next(d for d in deliveries if d["farmer_id"] == self.profile_farmer_b.id)
        self.assertEqual(leg_b_data["delivery_agent"]["name"], self.user_agent_e.full_name)
        self.assertEqual(leg_b_data["pickup_address"], f"{self.profile_farmer_b.farm_name}, {self.profile_farmer_b.location}")

    def test_09_agent_reject_returns_to_unassigned_and_reassigns(self):
        """9. Agent D rejects assignment: returns to unassigned / reassigns to other on-duty agent"""
        res = self.client.post(
            f"/api/delivery/orders/{TestDeliveryAssignmentE2E.leg_a_id}/reject",
            headers={"Authorization": f"Bearer {self.token_agent_d}"}
        )
        self.assertEqual(res.status_code, 200)

        # Agent D must no longer see leg A in active deliveries
        res_dash = self.client.get("/api/delivery/dashboard", headers={"Authorization": f"Bearer {self.token_agent_d}"})
        active_ids = [d["delivery_id"] for d in res_dash.json().get("active_deliveries", [])]
        self.assertNotIn(TestDeliveryAssignmentE2E.leg_a_id, active_ids)

        # The leg was reassigned to Agent E (the other on-duty agent) or returned to unassigned
        db = SessionLocal()
        leg = db.query(Delivery).filter(Delivery.id == TestDeliveryAssignmentE2E.leg_a_id).first()
        self.assertNotEqual(leg.delivery_agent_id, self.profile_agent_d.id)
        db.close()

    def test_10_off_duty_agent_never_assigned(self):
        """10. Toggle Agent E off-duty: confirm Agent E is never assigned while off-duty"""
        db = SessionLocal()
        try:
            # Set all agents off-duty temporarily to test zero-agent unassigned state
            db.query(DeliveryProfile).update({DeliveryProfile.is_on_duty: False})
            db.commit()

            # Create a new order with all agents off-duty
            new_order = Order(
                order_number="F2H-E2E-OFFDUTY-002",
                customer_id=self.profile_customer.id,
                total_amount=70.0,
                delivery_fee=30.0,
                status="confirmed",
                payment_status="completed",
                delivery_address=self.profile_customer.delivery_address
            )
            db.add(new_order)
            db.flush()

            item = OrderItem(
                order_id=new_order.id,
                product_id=self.product_a.id,
                farmer_id=self.profile_farmer_a.id,
                quantity=1.0,
                unit_price=40.0,
                subtotal=40.0
            )
            db.add(item)
            db.commit()

            # Trigger delivery leg creation
            legs = create_order_delivery_legs(new_order, db)
            self.assertEqual(len(legs), 1)
            self.assertIsNone(legs[0].delivery_agent_id, "Must remain unassigned when no agents are on duty")
            self.assertEqual(legs[0].status, "unassigned")

            # Commit session before client call to avoid sqlite lock
            db.commit()

            # Turn ONLY Agent D on-duty via API, leaving Agent E strictly OFF-duty
            res_d = self.client.post(
                "/api/delivery/toggle-duty",
                json={"is_on_duty": True},
                headers={"Authorization": f"Bearer {self.token_agent_d}"}
            )
            self.assertEqual(res_d.status_code, 200)

            # Confirm Agent E is still off duty in DB
            db.expire_all()
            agent_e_db = db.query(DeliveryProfile).filter(DeliveryProfile.id == self.profile_agent_e.id).first()
            self.assertFalse(agent_e_db.is_on_duty)

            # Trigger assignment for this unassigned leg
            assigned = assign_delivery_leg(legs[0], db)
            self.assertTrue(assigned)
            db.refresh(legs[0])
            # Must be assigned to on-duty Agent D, NEVER to off-duty Agent E!
            self.assertEqual(legs[0].delivery_agent_id, self.profile_agent_d.id)
            self.assertNotEqual(legs[0].delivery_agent_id, self.profile_agent_e.id)

        finally:
            # Restore all agents back to on-duty
            db.query(DeliveryProfile).update({DeliveryProfile.is_on_duty: True})
            db.commit()
            db.close()

if __name__ == "__main__":
    unittest.main()
