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
from app.models.product import Product, Category
from app.models.order import Order, OrderItem
from app.models.cart import CartItem
from app.core.security import get_password_hash
from app.core.jwt_handler import create_access_token

class TestFarmerOrderLinkageE2E(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        ensure_schema_columns()
        cls.client = TestClient(app)
        cls.db = SessionLocal()

        # Clean up any previous test data
        cls.test_email_suffix = "_linkage_test@farm2home.com"
        cls.cleanup_test_data()

        # 1. Create Farmer A
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
            location="Thanjavur Delta",
            total_earnings=0.0
        )
        cls.db.add(cls.profile_farmer_a)
        cls.db.flush()

        # 2. Create Farmer B
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
            location="Pollachi",
            total_earnings=0.0
        )
        cls.db.add(cls.profile_farmer_b)
        cls.db.flush()

        # 3. Create Farmer C (Unrelated, 0 products in test order)
        cls.user_farmer_c = User(
            full_name="Farmer Murugan C",
            email=f"farmer_c{cls.test_email_suffix}",
            hashed_password=get_password_hash("Pass@123"),
            role="farmer"
        )
        cls.db.add(cls.user_farmer_c)
        cls.db.flush()

        cls.profile_farmer_c = FarmerProfile(
            user_id=cls.user_farmer_c.id,
            farm_name="Murugan Mountain Farm",
            location="Nilgiris",
            total_earnings=0.0
        )
        cls.db.add(cls.profile_farmer_c)
        cls.db.flush()

        # 4. Create Customer
        cls.user_customer = User(
            full_name="Priya Customer",
            email=f"customer{cls.test_email_suffix}",
            hashed_password=get_password_hash("Pass@123"),
            role="customer"
        )
        cls.db.add(cls.user_customer)
        cls.db.flush()

        cls.profile_customer = CustomerProfile(
            user_id=cls.user_customer.id,
            delivery_address="42 Lotus Gardens",
            city="Chennai",
            pincode="600042"
        )
        cls.db.add(cls.profile_customer)
        cls.db.flush()

        # 5. Create Category and Products
        cls.category = cls.db.query(Category).first()
        if not cls.category:
            cls.category = Category(name="Test Veggies")
            cls.db.add(cls.category)
            cls.db.flush()

        # Product A owned by Farmer A: Country Tomatoes @ Rs. 40/kg, stock 50
        cls.prod_a = Product(
            farmer_id=cls.profile_farmer_a.id,
            category_id=cls.category.id,
            name="Country Tomatoes (நாட்டு தக்காளி)",
            price_per_unit=40.0,
            unit="kg",
            stock_quantity=50.0,
            low_stock_threshold=5.0
        )
        cls.db.add(cls.prod_a)

        # Product B owned by Farmer B: Samba Rice @ Rs. 120/kg, stock 50
        cls.prod_b = Product(
            farmer_id=cls.profile_farmer_b.id,
            category_id=cls.category.id,
            name="Samba Rice (மாப்பிள்ளை சம்பா)",
            price_per_unit=120.0,
            unit="kg",
            stock_quantity=50.0,
            low_stock_threshold=5.0
        )
        cls.db.add(cls.prod_b)

        cls.db.commit()

        # Tokens
        cls.token_farmer_a = create_access_token(cls.user_farmer_a.id, "farmer")
        cls.token_farmer_b = create_access_token(cls.user_farmer_b.id, "farmer")
        cls.token_farmer_c = create_access_token(cls.user_farmer_c.id, "farmer")
        cls.token_customer = create_access_token(cls.user_customer.id, "customer")

    @classmethod
    def cleanup_test_data(cls):
        try:
            test_users = cls.db.query(User).filter(User.email.like(f"%{cls.test_email_suffix}")).all()
            user_ids = [u.id for u in test_users]
            if user_ids:
                # delete cart items
                cls.db.query(CartItem).filter(CartItem.user_id.in_(user_ids)).delete(synchronize_session=False)

                # find farmer profile ids
                f_profiles = cls.db.query(FarmerProfile).filter(FarmerProfile.user_id.in_(user_ids)).all()
                f_ids = [f.id for f in f_profiles]

                # find customer profile ids
                c_profiles = cls.db.query(CustomerProfile).filter(CustomerProfile.user_id.in_(user_ids)).all()
                c_ids = [c.id for c in c_profiles]

                # delete order items
                cls.db.query(OrderItem).filter(OrderItem.farmer_id.in_(f_ids)).delete(synchronize_session=False)

                # delete orders
                cls.db.query(Order).filter(Order.customer_id.in_(c_ids)).delete(synchronize_session=False)

                # delete products
                cls.db.query(Product).filter(Product.farmer_id.in_(f_ids)).delete(synchronize_session=False)

                # delete profiles
                cls.db.query(FarmerProfile).filter(FarmerProfile.user_id.in_(user_ids)).delete(synchronize_session=False)
                cls.db.query(CustomerProfile).filter(CustomerProfile.user_id.in_(user_ids)).delete(synchronize_session=False)

                # delete users
                cls.db.query(User).filter(User.id.in_(user_ids)).delete(synchronize_session=False)
                cls.db.commit()
        except Exception as e:
            cls.db.rollback()
            print("Cleanup warning:", e)

    @classmethod
    def tearDownClass(cls):
        cls.cleanup_test_data()
        cls.db.close()

    def test_01_multi_farmer_checkout_and_attribution(self):
        """Step 1 & 2: Add Farmer A and Farmer B products to customer cart and checkout."""
        # 1. Customer adds 2kg of Product A (Farmer A) = Rs. 80
        res = self.client.post(
            "/api/cart",
            headers={"Authorization": f"Bearer {self.token_customer}"},
            json={"product_id": self.prod_a.id, "quantity": 2.0}
        )
        self.assertEqual(res.status_code, 200, res.text)

        # 2. Customer adds 3kg of Product B (Farmer B) = Rs. 360
        res = self.client.post(
            "/api/cart",
            headers={"Authorization": f"Bearer {self.token_customer}"},
            json={"product_id": self.prod_b.id, "quantity": 3.0}
        )
        self.assertEqual(res.status_code, 200, res.text)

        # 3. Check Cart format: confirms farmer attribution exists
        cart_res = self.client.get(
            "/api/cart",
            headers={"Authorization": f"Bearer {self.token_customer}"}
        )
        self.assertEqual(cart_res.status_code, 200)
        cart_data = cart_res.json()
        self.assertEqual(len(cart_data["items"]), 2)
        # Expected subtotal = 80 + 360 = 440
        self.assertEqual(cart_data["subtotal"], 440.0)

        # 4. Place Order
        order_res = self.client.post(
            "/api/orders",
            headers={"Authorization": f"Bearer {self.token_customer}"},
            json={
                "delivery_address": "42 Lotus Gardens",
                "city": "Chennai",
                "pincode": "600042",
                "phone": "9876543210",
                "full_name": "Priya Customer",
                "payment_method": "UPI"
            }
        )
        self.assertEqual(order_res.status_code, 200, order_res.text)
        created_order = order_res.json()["order"]
        TestFarmerOrderLinkageE2E.order_id = created_order["id"]

        # 5. Confirm Order Items in DB captured farmer_id at order time
        db_items = self.db.query(OrderItem).filter(OrderItem.order_id == TestFarmerOrderLinkageE2E.order_id).all()
        self.assertEqual(len(db_items), 2)
        
        farmer_ids_in_items = {it.farmer_id for it in db_items}
        self.assertIn(self.profile_farmer_a.id, farmer_ids_in_items)
        self.assertIn(self.profile_farmer_b.id, farmer_ids_in_items)

        # Process payment to confirm order
        pay_res = self.client.post(
            "/api/payments/process",
            headers={"Authorization": f"Bearer {self.token_customer}"},
            json={"order_id": TestFarmerOrderLinkageE2E.order_id, "payment_method": "UPI"}
        )
        self.assertEqual(pay_res.status_code, 200, pay_res.text)

    def test_02_farmer_a_orders_view_isolation(self):
        """Step 3: Farmer A logs in — confirms their Orders view shows ONLY Farmer A's item."""
        res = self.client.get(
            "/api/orders/farmer-orders",
            headers={"Authorization": f"Bearer {self.token_farmer_a}"}
        )
        self.assertEqual(res.status_code, 200, res.text)
        orders = res.json()
        
        # Farmer A must see the order
        self.assertTrue(len(orders) >= 1)
        target_order = next((o for o in orders if o["id"] == self.order_id), None)
        self.assertIsNotNone(target_order, "Farmer A should see the order containing their product")

        # Order total amount visible to Farmer A must be ONLY their item total (Rs. 80), NOT the whole order total (Rs. 470)
        self.assertEqual(target_order["total_amount"], 80.0)
        self.assertEqual(target_order["customer_name"], "Priya Customer")

        # Items list for Farmer A must contain Country Tomatoes and NOT Samba Rice
        item_names = [it["name"] for it in target_order["items"]]
        self.assertIn("Country Tomatoes (நாட்டு தக்காளி)", item_names)
        self.assertNotIn("Samba Rice (மாப்பிள்ளை சம்பா)", item_names)

    def test_03_farmer_b_orders_view_isolation(self):
        """Step 4: Farmer B logs in — confirms mirror image of step 3 (only Farmer B's item)."""
        res = self.client.get(
            "/api/orders/farmer-orders",
            headers={"Authorization": f"Bearer {self.token_farmer_b}"}
        )
        self.assertEqual(res.status_code, 200, res.text)
        orders = res.json()

        target_order = next((o for o in orders if o["id"] == self.order_id), None)
        self.assertIsNotNone(target_order, "Farmer B should see the order containing their product")

        # Order total amount visible to Farmer B must be ONLY their item total (Rs. 360)
        self.assertEqual(target_order["total_amount"], 360.0)
        self.assertEqual(target_order["customer_name"], "Priya Customer")

        # Items list for Farmer B must contain Samba Rice and NOT Country Tomatoes
        item_names = [it["name"] for it in target_order["items"]]
        self.assertIn("Samba Rice (மாப்பிள்ளை சம்பா)", item_names)
        self.assertNotIn("Country Tomatoes (நாட்டு தக்காளி)", item_names)

    def test_04_farmer_a_analytics_and_earnings_attribution(self):
        """Step 5: Farmer A Analytics & Earnings reflect ONLY Farmer A's item value (Rs. 80)."""
        # Analytics
        analytics_res = self.client.get(
            "/api/analytics/farmer",
            headers={"Authorization": f"Bearer {self.token_farmer_a}"}
        )
        self.assertEqual(analytics_res.status_code, 200, analytics_res.text)
        analytics = analytics_res.json()
        self.assertEqual(analytics["summary"]["total_revenue"], 80.0)
        self.assertEqual(analytics["summary"]["total_orders"], 1)
        self.assertEqual(analytics["summary"]["total_units_sold"], 2.0)

        # Earnings
        earnings_res = self.client.get(
            "/api/payments/farmer-earnings",
            headers={"Authorization": f"Bearer {self.token_farmer_a}"}
        )
        self.assertEqual(earnings_res.status_code, 200, earnings_res.text)
        earnings = earnings_res.json()
        self.assertEqual(earnings["summary"]["total_earnings"], 80.0)
        self.assertEqual(len(earnings["transactions"]), 1)
        self.assertEqual(earnings["transactions"][0]["gross_amount"], 80.0)
        self.assertEqual(earnings["transactions"][0]["net_amount"], 80.0)

    def test_05_farmer_c_complete_isolation(self):
        """Step 6: Unrelated Farmer C logs in — must see 0 orders, 0 earnings, 0 analytics revenue."""
        # Farmer C Orders
        orders_res = self.client.get(
            "/api/orders/farmer-orders",
            headers={"Authorization": f"Bearer {self.token_farmer_c}"}
        )
        self.assertEqual(orders_res.status_code, 200)
        self.assertEqual(len(orders_res.json()), 0, "Farmer C must have zero orders")

        # Farmer C Analytics
        analytics_res = self.client.get(
            "/api/analytics/farmer",
            headers={"Authorization": f"Bearer {self.token_farmer_c}"}
        )
        self.assertEqual(analytics_res.status_code, 200)
        self.assertEqual(analytics_res.json()["summary"]["total_revenue"], 0.0)
        self.assertEqual(analytics_res.json()["summary"]["total_orders"], 0)

        # Farmer C Earnings
        earnings_res = self.client.get(
            "/api/payments/farmer-earnings",
            headers={"Authorization": f"Bearer {self.token_farmer_c}"}
        )
        self.assertEqual(earnings_res.status_code, 200)
        self.assertEqual(earnings_res.json()["summary"]["total_earnings"], 0.0)
        self.assertEqual(len(earnings_res.json()["transactions"]), 0)

        # Farmer C Stats
        stats_res = self.client.get(
            "/api/orders/farmer-stats",
            headers={"Authorization": f"Bearer {self.token_farmer_c}"}
        )
        self.assertEqual(stats_res.status_code, 200)
        self.assertEqual(stats_res.json()["active_orders"], 0)
        self.assertEqual(stats_res.json()["monthly_earnings"], 0.0)

    def test_06_security_cross_tenant_parameter_tampering(self):
        """Step 7: Farmer A attempts to request Farmer B's id via params — backend only uses JWT."""
        # Querying analytics with a query param of someone else's id
        res = self.client.get(
            f"/api/analytics/farmer?farmer_id={self.profile_farmer_b.id}",
            headers={"Authorization": f"Bearer {self.token_farmer_a}"}
        )
        self.assertEqual(res.status_code, 200)
        # Revenue must still be Farmer A's (80.0), NOT Farmer B's (360.0)
        self.assertEqual(res.json()["summary"]["total_revenue"], 80.0)

        # Direct order access: Farmer C attempts to view order they have no items in
        order_access_res = self.client.get(
            f"/api/orders/{self.order_id}",
            headers={"Authorization": f"Bearer {self.token_farmer_c}"}
        )
        self.assertEqual(order_access_res.status_code, 403, "Farmer C must be forbidden from accessing order with no items of theirs")

    def test_07_historical_accuracy_on_product_deletion(self):
        """Step 8: Transfer product ownership / deactivate product after order exists — historical order still links to real original farmer."""
        # Transfer Product A to Farmer C and deactivate stock
        self.prod_a.farmer_id = self.profile_farmer_c.id
        self.prod_a.stock_quantity = 0.0
        self.db.commit()

        # Query Order Item directly from DB
        order_item = self.db.query(OrderItem).filter(
            OrderItem.order_id == self.order_id,
            OrderItem.product_id == self.prod_a.id
        ).first()
        self.assertIsNotNone(order_item)
        # Proves order_items.farmer_id was captured at order time as Farmer A, NOT derived live as Farmer C
        self.assertEqual(order_item.farmer_id, self.profile_farmer_a.id)

        # Farmer A still sees the order item in farmer-orders
        res_a = self.client.get(
            "/api/orders/farmer-orders",
            headers={"Authorization": f"Bearer {self.token_farmer_a}"}
        )
        self.assertEqual(res_a.status_code, 200)
        orders_a = res_a.json()
        target_order_a = next((o for o in orders_a if o["id"] == self.order_id), None)
        self.assertIsNotNone(target_order_a)
        self.assertEqual(target_order_a["total_amount"], 80.0)

        # Farmer C must STILL NOT see this historical order, even though Product A now points to Farmer C
        res_c = self.client.get(
            "/api/orders/farmer-orders",
            headers={"Authorization": f"Bearer {self.token_farmer_c}"}
        )
        self.assertEqual(res_c.status_code, 200)
        orders_c = res_c.json()
        target_order_c = next((o for o in orders_c if o["id"] == self.order_id), None)
        self.assertIsNone(target_order_c, "Farmer C must NOT inherit historical orders when product is transferred")

    def test_08_farmer_order_status_update(self):
        """Farmer updates processing status through real backend endpoint."""
        res = self.client.patch(
            f"/api/orders/{self.order_id}/farmer-status",
            headers={"Authorization": f"Bearer {self.token_farmer_b}"},
            json={"status": "processing"}
        )
        self.assertEqual(res.status_code, 200, res.text)
        self.assertEqual(res.json()["new_status"], "processing")

        # Confirm in DB
        refreshed_order = self.db.query(Order).filter(Order.id == self.order_id).first()
        self.assertEqual(refreshed_order.status, "processing")

if __name__ == "__main__":
    unittest.main()
