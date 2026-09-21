import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.core.jwt_handler import create_access_token
from app.db.database import SessionLocal, Base, engine
from app.db.seed import seed_database
from app.models.user import User
from app.models.farmer import FarmerProfile

client = TestClient(app)

def safe_print(msg: str):
    clean = str(msg).encode('ascii', 'ignore').decode('ascii')
    print(clean)

def run_tests():
    safe_print("--- 1. Initializing & Seeding DB ---")
    seed_database(force=False)
    db = SessionLocal()

    # Find Farmer User
    farmer_user = db.query(User).filter(User.role == "farmer", User.email == "farmer@farm2home.com").first()
    assert farmer_user is not None, "Farmer user Ramesh not found"
    
    # Generate token
    token = create_access_token(subject=farmer_user.id, role=farmer_user.role)
    headers = {"Authorization": f"Bearer {token}"}

    safe_print("--- 2. Testing GET /api/analytics/farmer ---")
    for r in ["7d", "30d", "6m"]:
        res = client.get(f"/api/analytics/farmer?range={r}", headers=headers)
        assert res.status_code == 200, f"Analytics failed for range {r}: {res.text}"
        data = res.json()
        assert "summary" in data, "Summary missing in analytics"
        assert "revenue_trend" in data, "Revenue trend missing in analytics"
        assert len(data["revenue_trend"]) > 0, f"Trend empty for range {r}"
        assert "top_products" in data, "Top products missing"
        assert "category_split" in data, "Category split missing"
        assert "inventory_health" in data, "Inventory health missing"
        safe_print(f"[OK] Analytics ({r}): total_revenue=Rs.{data['summary']['total_revenue']}, top_prods={len(data['top_products'])}, inv_health={data['inventory_health']}")

    safe_print("--- 3. Testing POST /api/ai/assistant ---")
    # English Stock Query
    res_en = client.post("/api/ai/assistant", json={"message": "which of my products is running low?", "language": "en"}, headers=headers)
    assert res_en.status_code == 200, f"AI assistant EN failed: {res_en.text}"
    en_data = res_en.json()
    assert len(en_data["reply"]) > 10, "Empty AI reply"
    safe_print(f"[OK] AI Assistant (EN): {en_data['reply'][:50]}... Action: {en_data.get('suggested_action')}")

    # Tamil Stock Query
    res_ta = client.post("/api/ai/assistant", json={"message": "stock status", "language": "ta"}, headers=headers)
    assert res_ta.status_code == 200, f"AI assistant TA failed: {res_ta.text}"
    ta_data = res_ta.json()
    safe_print(f"[OK] AI Assistant (TA): received reply in {ta_data['language']}")

    # Hindi Pricing Query
    res_hi = client.post("/api/ai/assistant", json={"message": "price change", "language": "hi"}, headers=headers)
    assert res_hi.status_code == 200, f"AI assistant HI failed: {res_hi.text}"
    hi_data = res_hi.json()
    safe_print(f"[OK] AI Assistant (HI): received reply in {hi_data['language']}")

    safe_print("--- 4. Testing GET /api/payments/farmer-earnings ---")
    res_earn = client.get("/api/payments/farmer-earnings", headers=headers)
    assert res_earn.status_code == 200, f"Farmer earnings failed: {res_earn.text}"
    earn_data = res_earn.json()
    assert "summary" in earn_data, "Summary missing in earnings"
    assert "transactions" in earn_data, "Transactions missing in earnings"
    assert "payout_account" in earn_data, "Payout account missing"
    safe_print(f"[OK] Earnings: lifetime=Rs.{earn_data['summary']['total_earnings']}, pending=Rs.{earn_data['summary']['pending_balance']}, tx_count={len(earn_data['transactions'])}")

    safe_print("--- 5. Testing PATCH /api/payments/payout-account ---")
    # Test setting Bank Account - ensure last 4 only stored
    acc_payload = {
        "payout_method": "Bank Account",
        "account_holder": "Ramesh Kumar",
        "account_number": "1234567890124417",
        "bank_name": "HDFC Bank",
        "bank_ifsc": "HDFC0001234"
    }
    res_acc = client.patch("/api/payments/payout-account", json=acc_payload, headers=headers)
    assert res_acc.status_code == 200, f"Payout account update failed: {res_acc.text}"
    acc_res_data = res_acc.json()["payout_account"]
    assert acc_res_data["payout_account_last_four"] == "4417", f"Expected last 4 digits 4417, got {acc_res_data['payout_account_last_four']}"
    assert "4417" in acc_res_data["masked_display"]
    safe_print(f"[OK] Payout Account updated securely: {acc_res_data['masked_display']}")

    # Check DB directly to ensure plaintext full bank account was NEVER saved
    db.refresh(farmer_user.farmer_profile)
    assert farmer_user.farmer_profile.payout_account_last_four == "4417"
    assert not hasattr(farmer_user.farmer_profile, "account_number"), "Raw account number column exists in farmer profile!"

    safe_print("--- 6. Testing POST /api/payments/payout-request ---")
    pending_bal = earn_data['summary']['pending_balance']
    payout_amt = min(500.0, pending_bal) if pending_bal >= 500.0 else 500.0
    
    if pending_bal < 500.0:
        res_po_fail = client.post("/api/payments/payout-request", json={"amount": 600.0}, headers=headers)
        assert res_po_fail.status_code == 400
        safe_print("[OK] Payout Request rejected when exceeding available balance (validated)")
    else:
        res_po = client.post("/api/payments/payout-request", json={"amount": payout_amt, "notes": "Test Harvest Payout"}, headers=headers)
        assert res_po.status_code == 200, f"Payout request failed: {res_po.text}"
        po_data = res_po.json()["payout"]
        assert po_data["status"] == "pending"
        assert po_data["amount"] == payout_amt
        safe_print(f"[OK] Payout Request created: Ref={po_data['payout_reference']}, Status={po_data['status']}, Amount=Rs.{po_data['amount']}")

    safe_print("--- 7. Testing Security & Role Isolation ---")
    # Customer token cannot access farmer analytics or earnings
    customer_user = db.query(User).filter(User.role == "customer").first()
    cust_token = create_access_token(subject=customer_user.id, role=customer_user.role)
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    
    res_cust_analytics = client.get("/api/analytics/farmer", headers=cust_headers)
    assert res_cust_analytics.status_code in [401, 403], f"Customer should not access farmer analytics: {res_cust_analytics.status_code}"
    
    res_cust_earnings = client.get("/api/payments/farmer-earnings", headers=cust_headers)
    assert res_cust_earnings.status_code in [401, 403], f"Customer should not access farmer earnings: {res_cust_earnings.status_code}"
    safe_print("[OK] Role guard security verified: customer token properly rejected with 403")

    db.close()
    safe_print("\n==========================================")
    safe_print("ALL BACKEND & API FEATURE TESTS PASSED! [OK]")
    safe_print("==========================================")

if __name__ == "__main__":
    run_tests()
