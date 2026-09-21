import sys
import os

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000/api"

def run_tests():
    print("=== Testing Farm2Home Phase 4 Flow Directly via Test Client ===")
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db.database import SessionLocal, Base, engine
    from app.models.user import User
    from app.models.farmer import FarmerProfile
    from app.models.product import Product
    from app.models.payment import Payment
    from app.models.order import Order, OrderItem
    from app.models.cart import CartItem
    from app.models.notification import Notification

    client = TestClient(app)

    # 1. Login as Customer
    login_resp = client.post("/api/auth/login", json={
        "email": "customer@farm2home.com",
        "password": "Customer@123",
        "role": "customer"
    })
    assert login_resp.status_code == 200, f"Customer login failed: {login_resp.text}"
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print("[PASS] Customer logged in successfully.")

    # 2. Get Products Catalog - pick a product belonging to farmer@farm2home.com
    prods_resp = client.get("/api/products", headers=headers)
    assert prods_resp.status_code == 200
    products = prods_resp.json()
    assert len(products) >= 2, "Need at least 2 products for testing"

    # Find product by Ramesh Kumar (farmer@farm2home.com)
    db = SessionLocal()
    ramesh_user = db.query(User).filter(User.email == "farmer@farm2home.com").first()
    ramesh_farmer = ramesh_user.farmer_profile if ramesh_user else None
    ramesh_prod = next((p for p in products if p["farmer_id"] == ramesh_farmer.id), products[0]) if ramesh_farmer else products[0]
    other_prod = next((p for p in products if p["id"] != ramesh_prod["id"]), products[1])
    db.close()

    p1 = ramesh_prod
    p2 = other_prod
    print(f"[PASS] Retrieved products: '{p1['name']}' (Stock: {p1['stock_quantity']}) & '{p2['name']}' (Stock: {p2['stock_quantity']})")

    # 3. Clear cart first to have clean state
    client.delete("/api/cart", headers=headers)

    # 4. Add items to cart
    add_resp1 = client.post("/api/cart", json={"product_id": p1["id"], "quantity": 2.0}, headers=headers)
    assert add_resp1.status_code == 200, f"Add to cart 1 failed: {add_resp1.text}"
    add_resp2 = client.post("/api/cart", json={"product_id": p2["id"], "quantity": 1.0}, headers=headers)
    assert add_resp2.status_code == 200, f"Add to cart 2 failed: {add_resp2.text}"
    print("[PASS] Added 2 items to cart.")

    # 5. Fetch cart
    cart_resp = client.get("/api/cart", headers=headers)
    assert cart_resp.status_code == 200
    cart_data = cart_resp.json()
    assert len(cart_data["items"]) == 2, f"Expected 2 cart items, got {len(cart_data['items'])}"
    assert cart_data["total_items"] == 3.0
    expected_subtotal = round(p1["price_per_unit"] * 2.0 + p2["price_per_unit"] * 1.0, 2)
    assert cart_data["subtotal"] == expected_subtotal
    assert cart_data["delivery_fee"] == 30.0
    print(f"[PASS] Cart totals verified: Subtotal ₹{cart_data['subtotal']}, Delivery ₹{cart_data['delivery_fee']}, Grand Total ₹{cart_data['grand_total']}")

    # 6. Test quantity update and stock cap
    p1_cart_item = next(i for i in cart_data["items"] if i["product_id"] == p1["id"])
    patch_resp = client.patch(f"/api/cart/{p1_cart_item['id']}", json={"quantity": 3.0}, headers=headers)
    assert patch_resp.status_code == 200, f"Patch failed: {patch_resp.text}"

    cart_resp2 = client.get("/api/cart", headers=headers)
    assert cart_resp2.json()["total_items"] == 4.0
    print("[PASS] Cart quantity update verified.")

    # 7. Test stock decrement & order creation
    db = SessionLocal()
    initial_p1_stock = db.query(Product).filter(Product.id == p1["id"]).first().stock_quantity
    initial_p2_stock = db.query(Product).filter(Product.id == p2["id"]).first().stock_quantity
    db.close()

    order_payload = {
        "delivery_address": "Flat 4B, Greenwoods Apartments, 1st Cross, Gandhi Road",
        "city": "Chennai",
        "pincode": "600042",
        "phone": "9123456789",
        "full_name": "Priya Sharma",
        "delivery_slot": "Morning (7:00 AM - 10:00 AM)",
        "notes": "Leave at doorstep",
        "payment_method": "UPI"
    }

    order_resp = client.post("/api/orders", json=order_payload, headers=headers)
    assert order_resp.status_code == 200, f"Order creation failed: {order_resp.text}"
    order_data = order_resp.json()["order"]
    order_id = order_data["id"]
    order_num = order_data["order_number"]
    print(f"[PASS] Order created with number: {order_num}, Total: ₹{order_data['total_amount']}, Status: {order_data['status']}")

    # Check stock was decremented
    db = SessionLocal()
    new_p1_stock = db.query(Product).filter(Product.id == p1["id"]).first().stock_quantity
    new_p2_stock = db.query(Product).filter(Product.id == p2["id"]).first().stock_quantity
    assert new_p1_stock == initial_p1_stock - 3.0, f"Stock p1 mismatch: {new_p1_stock} vs {initial_p1_stock - 3.0}"
    assert new_p2_stock == initial_p2_stock - 1.0, f"Stock p2 mismatch: {new_p2_stock} vs {initial_p2_stock - 1.0}"
    print(f"[PASS] Product stock decremented accurately (P1: {initial_p1_stock} -> {new_p1_stock}, P2: {initial_p2_stock} -> {new_p2_stock}).")

    # Check cart was cleared in DB
    cart_after_order = client.get("/api/cart", headers=headers).json()
    assert len(cart_after_order["items"]) == 0, "Cart should be empty after order"
    print("[PASS] Customer cart was cleared automatically after order creation.")

    # 8. Test Payment Processing (Simulated Gateway)
    pay_resp = client.post("/api/payments/process", json={
        "order_id": order_id,
        "payment_method": "UPI",
        "upi_id": "priya@okhdfcbank"
    }, headers=headers)
    assert pay_resp.status_code == 200, f"Payment failed: {pay_resp.text}"
    pay_data = pay_resp.json()
    print(f"[PASS] Payment verified with Payment ID: {pay_data['payment_id']}, Status: {pay_data['payment_status']}")

    # 9. Verify Security: Check payments table in DB
    payment_row = db.query(Payment).filter(Payment.order_id == order_id).first()
    assert payment_row is not None
    assert payment_row.payment_id.startswith("PAY-")
    assert not hasattr(payment_row, 'card_number'), "Raw card number must not exist as column"
    assert not hasattr(payment_row, 'cvv'), "CVV must not exist as column"
    print("[PASS] Security requirement strictly verified: No raw card numbers or CVVs stored in payments table.")

    # 10. Verify Farmer Notification was created
    notifs = db.query(Notification).all()
    assert len(notifs) > 0, "Farmer notification should be recorded"
    print(f"[PASS] Farmer notification verified: '{notifs[-1].title}' - {notifs[-1].message}")

    # 11. Login as the Farmer who owns product 1 & Check Farmer Orders endpoint
    db = SessionLocal()
    farmer_user = db.query(Product).filter(Product.id == p1["id"]).first().farmer.user
    farmer_identifier = farmer_user.email or farmer_user.phone
    login_payload = {
        "password": "Farmer@123",
        "role": "farmer"
    }
    if farmer_user.email:
        login_payload["email"] = farmer_user.email
    else:
        login_payload["phone"] = farmer_user.phone
    db.close()

    farmer_login = client.post("/api/auth/login", json=login_payload)
    assert farmer_login.status_code == 200, f"Farmer login failed ({farmer_identifier}): {farmer_login.status_code} {farmer_login.text}"
    farmer_token = farmer_login.json()["access_token"]
    farmer_headers = {"Authorization": f"Bearer {farmer_token}"}

    farmer_orders_resp = client.get("/api/orders/farmer-orders", headers=farmer_headers)
    assert farmer_orders_resp.status_code == 200
    farmer_orders = farmer_orders_resp.json()
    assert any(o["order_number"] == order_num for o in farmer_orders), f"Order {order_num} not found in farmer orders for {farmer_identifier}"
    print(f"[PASS] Farmer ({farmer_identifier}) orders endpoint reflects newly confirmed order {order_num}.")

    # 12. Fetch order details from order confirmation endpoint
    conf_resp = client.get(f"/api/orders/{order_id}", headers=headers)
    assert conf_resp.status_code == 200
    conf_data = conf_resp.json()
    assert conf_data["order_number"] == order_num
    assert conf_data["status"] == "confirmed"
    assert len(conf_data["items"]) == 2
    assert conf_data["payment"]["payment_status"] == "completed"
    print("[PASS] Order Confirmation endpoint returned full itemized harvest details.")

    db.close()
    print("\n=======================================================")
    print("ALL PHASE 4 ORDER & PAYMENT TESTS PASSED SUCCESSFULLY! ")
    print("=======================================================")

if __name__ == "__main__":
    run_tests()
