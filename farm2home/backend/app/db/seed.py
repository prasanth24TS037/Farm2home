from sqlalchemy import text
from sqlalchemy.orm import Session
from app.db.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.farmer import FarmerProfile
from app.models.customer import CustomerProfile
from app.models.delivery import DeliveryProfile, Delivery
from app.models.product import Category, Product
from app.models.order import Order, OrderItem
from app.models.payout import Payout
from app.core.security import get_password_hash

def ensure_schema_columns():
    try:
        with engine.connect() as conn:
            # Users table schema updates
            res_user = conn.execute(text("PRAGMA table_info(users)"))
            user_cols = [row[1] for row in res_user.fetchall()]
            if user_cols and "auth_provider" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN auth_provider VARCHAR(50) DEFAULT 'local'"))
            if user_cols and "google_sub" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN google_sub VARCHAR(255)"))

            # Farmers table schema updates
            res = conn.execute(text("PRAGMA table_info(farmers)"))
            cols = [row[1] for row in res.fetchall()]
            if cols and "payout_method" not in cols:
                conn.execute(text("ALTER TABLE farmers ADD COLUMN payout_method VARCHAR(50) DEFAULT 'UPI'"))
            if cols and "payout_upi_id" not in cols:
                conn.execute(text("ALTER TABLE farmers ADD COLUMN payout_upi_id VARCHAR(100)"))
            if cols and "payout_account_holder" not in cols:
                conn.execute(text("ALTER TABLE farmers ADD COLUMN payout_account_holder VARCHAR(100)"))
            if cols and "payout_account_last_four" not in cols:
                conn.execute(text("ALTER TABLE farmers ADD COLUMN payout_account_last_four VARCHAR(10)"))
            if cols and "payout_bank_name" not in cols:
                conn.execute(text("ALTER TABLE farmers ADD COLUMN payout_bank_name VARCHAR(100)"))
            if cols and "payout_bank_ifsc" not in cols:
                conn.execute(text("ALTER TABLE farmers ADD COLUMN payout_bank_ifsc VARCHAR(20)"))

            # OrderItems table schema updates
            res_items = conn.execute(text("PRAGMA table_info(order_items)"))
            item_cols = [row[1] for row in res_items.fetchall()]
            if item_cols and "farmer_id" not in item_cols:
                conn.execute(text("ALTER TABLE order_items ADD COLUMN farmer_id INTEGER REFERENCES farmers(id)"))

            # Backfill any null farmer_id in order_items from products
            conn.execute(text("""
                UPDATE order_items 
                SET farmer_id = (SELECT farmer_id FROM products WHERE products.id = order_items.product_id)
                WHERE farmer_id IS NULL AND product_id IN (SELECT id FROM products)
            """))

            # Products table schema updates
            res_prod = conn.execute(text("PRAGMA table_info(products)"))
            prod_cols = [row[1] for row in res_prod.fetchall()]
            if prod_cols and "is_active" not in prod_cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN is_active BOOLEAN DEFAULT 1"))
            if prod_cols and "deleted_at" not in prod_cols:
                conn.execute(text("ALTER TABLE products ADD COLUMN deleted_at DATETIME"))

            # Delivery Agents table schema updates
            res_del = conn.execute(text("PRAGMA table_info(delivery_agents)"))
            del_cols = [row[1] for row in res_del.fetchall()]
            if del_cols and "payout_method" not in del_cols:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN payout_method VARCHAR(50) DEFAULT 'UPI'"))
            if del_cols and "payout_upi_id" not in del_cols:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN payout_upi_id VARCHAR(100)"))
            if del_cols and "payout_account_holder" not in del_cols:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN payout_account_holder VARCHAR(100)"))
            if del_cols and "payout_account_last_four" not in del_cols:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN payout_account_last_four VARCHAR(10)"))
            if del_cols and "payout_bank_name" not in del_cols:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN payout_bank_name VARCHAR(100)"))
            if del_cols and "payout_bank_ifsc" not in del_cols:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN payout_bank_ifsc VARCHAR(20)"))
            if del_cols and "kyc_status" not in del_cols:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN kyc_status VARCHAR(50) DEFAULT 'verified'"))
            if del_cols and "license_status" not in del_cols:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN license_status VARCHAR(50) DEFAULT 'verified'"))
            if del_cols and "rc_status" not in del_cols:
                conn.execute(text("ALTER TABLE delivery_agents ADD COLUMN rc_status VARCHAR(50) DEFAULT 'verified'"))

            # Payouts table schema updates (ensure farmer_id is nullable and delivery_agent_id exists)
            res_po = conn.execute(text("PRAGMA table_info(payouts)"))
            po_rows = res_po.fetchall()
            po_cols = [row[1] for row in po_rows]
            farmer_id_not_null = any(row[1] == "farmer_id" and row[3] == 1 for row in po_rows)

            if farmer_id_not_null:
                conn.execute(text("""
                    CREATE TABLE IF NOT EXISTS payouts_migrated (
                        id INTEGER PRIMARY KEY,
                        payout_reference VARCHAR(50) UNIQUE NOT NULL,
                        farmer_id INTEGER REFERENCES farmers(id),
                        delivery_agent_id INTEGER REFERENCES delivery_agents(id),
                        amount FLOAT NOT NULL,
                        status VARCHAR(50) DEFAULT 'pending',
                        payout_method VARCHAR(50) DEFAULT 'UPI',
                        account_reference_masked VARCHAR(100),
                        requested_at DATETIME,
                        settled_at DATETIME,
                        notes TEXT
                    );
                """))
                conn.execute(text("""
                    INSERT OR IGNORE INTO payouts_migrated (id, payout_reference, farmer_id, amount, status, payout_method, account_reference_masked, requested_at, settled_at, notes)
                    SELECT id, payout_reference, farmer_id, amount, status, payout_method, account_reference_masked, requested_at, settled_at, notes FROM payouts;
                """))
                conn.execute(text("DROP TABLE payouts;"))
                conn.execute(text("ALTER TABLE payouts_migrated RENAME TO payouts;"))
            elif po_cols and "delivery_agent_id" not in po_cols:
                conn.execute(text("ALTER TABLE payouts ADD COLUMN delivery_agent_id INTEGER REFERENCES delivery_agents(id)"))

            conn.commit()
    except Exception as e:
        print(f"Schema check notice: {e}")


def seed_database(force: bool = False):
    Base.metadata.create_all(bind=engine)
    ensure_schema_columns()
    db = SessionLocal()

    try:
        # Check if already seeded with expanded catalog
        existing_products_count = db.query(Product).count()
        if not force and existing_products_count >= 20:
            print("Database already seeded with full demo catalog.")
            return

        print("Seeding/updating expanded demo catalog for Farm2Home...")

        # If re-seeding to expand data, clean up existing tables cleanly
        if existing_products_count > 0 or force:
            try:
                db.query(Delivery).delete()
                db.query(Payout).delete()
                db.query(OrderItem).delete()
                db.query(Order).delete()
                db.query(Product).delete()
                db.query(Category).delete()
                db.query(FarmerProfile).delete()
                db.query(CustomerProfile).delete()
                db.query(DeliveryProfile).delete()
                db.query(User).delete()
                db.commit()
            except Exception as clean_err:
                db.rollback()
                print(f"Cleanup prior to re-seed warning: {clean_err}")

        # 1. Admin User
        admin_user = User(
            full_name="Platform Admin",
            email="admin@farm2home.com",
            phone="+91 99000 00001",
            hashed_password=get_password_hash("Admin@123"),
            role="admin",
            language="en"
        )
        db.add(admin_user)
        db.flush()

        # 2. Farmer User 1: Ramesh Kumar (Thanjavur Delta)
        farmer_user = User(
            full_name="Ramesh Kumar",
            email="farmer@farm2home.com",
            phone="+91 98765 43210",
            hashed_password=get_password_hash("Farmer@123"),
            role="farmer",
            language="en"
        )
        db.add(farmer_user)
        db.flush()

        farmer_profile = FarmerProfile(
            user_id=farmer_user.id,
            farm_name="Cauvery Natural Greens",
            location="Thanjavur Delta, Tamil Nadu",
            district="Thanjavur",
            state="Tamil Nadu",
            pincode="613001",
            farm_size_acres=5.2,
            organic_certified=True,
            total_earnings=0.0,
            payout_method="UPI",
            payout_upi_id="farmer.ramesh@okhdfcbank",
            payout_account_holder="Ramesh Kumar",
            payout_account_last_four="4417",
            payout_bank_name="HDFC Bank",
            payout_bank_ifsc="HDFC0001234"
        )
        db.add(farmer_profile)
        db.flush()


        # 3. Farmer User 2: Kavitha Shanmugam (Pollachi)
        farmer_user2 = User(
            full_name="Kavitha Shanmugam",
            email="kavitha@farm2home.com",
            phone="+91 98765 43211",
            hashed_password=get_password_hash("Farmer@123"),
            role="farmer",
            language="ta"
        )
        db.add(farmer_user2)
        db.flush()

        farmer_profile2 = FarmerProfile(
            user_id=farmer_user2.id,
            farm_name="Kavitha Eco Farm",
            location="Pollachi, Coimbatore",
            district="Coimbatore",
            state="Tamil Nadu",
            pincode="642001",
            farm_size_acres=4.0,
            organic_certified=True,
            total_earnings=0.0
        )
        db.add(farmer_profile2)
        db.flush()

        # 4. Farmer User 3: Murugan S. (Nilgiri Mountain Organic)
        farmer_user3 = User(
            full_name="Murugan S.",
            email="murugan@farm2home.com",
            phone="+91 98765 43212",
            hashed_password=get_password_hash("Farmer@123"),
            role="farmer",
            language="ta"
        )
        db.add(farmer_user3)
        db.flush()

        farmer_profile3 = FarmerProfile(
            user_id=farmer_user3.id,
            farm_name="Nilgiri Mountain Organics",
            location="Ooty, The Nilgiris",
            district="Nilgiris",
            state="Tamil Nadu",
            pincode="643001",
            farm_size_acres=3.5,
            organic_certified=True,
            total_earnings=0.0
        )
        db.add(farmer_profile3)
        db.flush()

        # 5. Farmer User 4: Lakshmi Ammal (Madurai Bio Harvest)
        farmer_user4 = User(
            full_name="Lakshmi Ammal",
            email="lakshmi@farm2home.com",
            phone="+91 98765 43213",
            hashed_password=get_password_hash("Farmer@123"),
            role="farmer",
            language="ta"
        )
        db.add(farmer_user4)
        db.flush()

        farmer_profile4 = FarmerProfile(
            user_id=farmer_user4.id,
            farm_name="Madurai Bio Harvest",
            location="Madurai, Tamil Nadu",
            district="Madurai",
            state="Tamil Nadu",
            pincode="625001",
            farm_size_acres=4.8,
            organic_certified=True,
            total_earnings=0.0
        )
        db.add(farmer_profile4)
        db.flush()

        # 6. Customer User
        customer_user = User(
            full_name="Priya Sharma",
            email="customer@farm2home.com",
            phone="+91 91234 56789",
            hashed_password=get_password_hash("Customer@123"),
            role="customer",
            language="en"
        )
        db.add(customer_user)
        db.flush()

        customer_profile = CustomerProfile(
            user_id=customer_user.id,
            delivery_address="Flat 4B, Greenwoods Apartments, 1st Cross, Gandhi Road",
            city="Chennai",
            pincode="600042"
        )
        db.add(customer_profile)
        db.flush()

        # 7. Delivery Partner User 1 (Agent D: Murugan Vel)
        delivery_user = User(
            full_name="Murugan Vel",
            email="delivery@farm2home.com",
            phone="+91 97890 12345",
            hashed_password=get_password_hash("Delivery@123"),
            role="delivery",
            language="en"
        )
        db.add(delivery_user)
        db.flush()

        delivery_profile = DeliveryProfile(
            user_id=delivery_user.id,
            vehicle_type="Electric Scooter (EV-Pro)",
            vehicle_number="TN-09-EV-4421",
            license_number="DL-TN-2023-88273",
            is_on_duty=True,
            total_deliveries=18,
            completed_today=9,
            total_earnings=1170.0,
            payout_method="UPI",
            payout_upi_id="murugan.delivery@okaxis",
            payout_account_holder="Murugan Vel",
            payout_account_last_four="4421",
            payout_bank_name="HDFC Bank",
            payout_bank_ifsc="HDFC0001890",
            kyc_status="verified",
            license_status="verified",
            rc_status="verified"
        )
        db.add(delivery_profile)
        db.flush()

        # 8. Delivery Partner User 2 (Agent E: Karthik Raja)
        delivery_user2 = User(
            full_name="Karthik Raja",
            email="delivery2@farm2home.com",
            phone="+91 97890 54321",
            hashed_password=get_password_hash("Delivery@123"),
            role="delivery",
            language="en"
        )
        db.add(delivery_user2)
        db.flush()

        delivery_profile2 = DeliveryProfile(
            user_id=delivery_user2.id,
            vehicle_type="EV Bike (Ather 450X)",
            vehicle_number="TN-09-EV-8842",
            license_number="DL-TN-2023-99104",
            is_on_duty=True,
            total_deliveries=12,
            completed_today=6,
            total_earnings=780.0,
            payout_method="UPI",
            payout_upi_id="karthik.raja@okhdfcbank",
            payout_account_holder="Karthik Raja",
            payout_account_last_four="8842",
            payout_bank_name="SBI",
            payout_bank_ifsc="SBIN0004521",
            kyc_status="verified",
            license_status="verified",
            rc_status="verified"
        )
        db.add(delivery_profile2)
        db.flush()

        # Categories
        cat_veg = Category(name="Fresh Vegetables", icon="Carrot", description="Directly harvested pesticide-free vegetables")
        cat_fruit = Category(name="Organic Fruits", icon="Apple", description="Naturally ripened orchard fruits")
        cat_grains = Category(name="Grains & Millets", icon="Wheat", description="Traditional unpolished grains and pulses")
        cat_greens = Category(name="Greens & Herbs", icon="Salad", description="Farm-fresh leafy greens harvested this morning")
        cat_dairy = Category(name="Farm Dairy", icon="Milk", description="Pure A2 country cow milk and natural butter")

        db.add_all([cat_veg, cat_fruit, cat_grains, cat_greens, cat_dairy])
        db.flush()

        # Expanded Product List (27 Products across all categories & farmers)
        products_data = [
            # --- FRESH VEGETABLES ---
            Product(
                farmer_id=farmer_profile.id,
                category_id=cat_veg.id,
                name="Country Tomatoes (நாட்டு தக்காளி)",
                description="Naturally sun-ripened, juicy country tomatoes with authentic tangy flavor. Zero chemical sprays.",
                price_per_unit=38.0,
                unit="kg",
                stock_quantity=65.0,
                low_stock_threshold=15.0,
                image_url="https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.9,
                review_count=42,
                ai_suggested_price=42.0
            ),
            Product(
                farmer_id=farmer_profile.id,
                category_id=cat_veg.id,
                name="Green Bell Peppers (குடைமிளகாய்)",
                description="Thick-walled crunchy capsicums grown in shade-net greenhouse.",
                price_per_unit=60.0,
                unit="kg",
                stock_quantity=45.0,
                low_stock_threshold=10.0,
                image_url="https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.7,
                review_count=18,
                ai_suggested_price=64.0
            ),
            Product(
                farmer_id=farmer_profile.id,
                category_id=cat_veg.id,
                name="Red Organic Onions (வெங்காயம்)",
                description="Pungent, dry-cured farm onions with excellent keeping quality.",
                price_per_unit=32.0,
                unit="kg",
                stock_quantity=12.0,  # Low stock
                low_stock_threshold=25.0,
                image_url="https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.6,
                review_count=31,
                ai_suggested_price=35.0
            ),
            Product(
                farmer_id=farmer_profile.id,
                category_id=cat_veg.id,
                name="Small Country Brinjal (நாட்டு கத்தரிக்காய்)",
                description="Tender purple-striped Delta brinjal ideal for authentic Ennai Kathirikai gravy.",
                price_per_unit=42.0,
                unit="kg",
                stock_quantity=35.0,
                low_stock_threshold=10.0,
                image_url="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.8,
                review_count=24,
                ai_suggested_price=46.0
            ),
            Product(
                farmer_id=farmer_profile4.id,
                category_id=cat_veg.id,
                name="Farm Fresh Ladies Finger / Okra (வெண்டைக்காய்)",
                description="Crisp, tender green okra pods harvested daily before sunrise.",
                price_per_unit=36.0,
                unit="kg",
                stock_quantity=9.0,  # Low stock
                low_stock_threshold=15.0,
                image_url="https://images.unsplash.com/photo-1425543103986-224137c0a857?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.7,
                review_count=19,
                ai_suggested_price=40.0
            ),
            Product(
                farmer_id=farmer_profile3.id,
                category_id=cat_veg.id,
                name="Nilgiri Mountain Carrots (மலை கேரட்)",
                description="Sweet, crunchy orange carrots grown in rich high-altitude Nilgiri organic soil.",
                price_per_unit=55.0,
                unit="kg",
                stock_quantity=50.0,
                low_stock_threshold=12.0,
                image_url="https://images.unsplash.com/photo-1598170845058-12ef4a457c4f?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.9,
                review_count=37,
                ai_suggested_price=58.0
            ),
            Product(
                farmer_id=farmer_profile.id,
                category_id=cat_veg.id,
                name="Delta Drumsticks / Moringa (முருங்கைக்காய்)",
                description="Fleshy aromatic moringa pods grown along organic Cauvery river basin.",
                price_per_unit=40.0,
                unit="bunch",
                stock_quantity=28.0,
                low_stock_threshold=8.0,
                image_url="https://images.unsplash.com/photo-1540420773420-3366772f4999?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.8,
                review_count=22,
                ai_suggested_price=44.0
            ),
            Product(
                farmer_id=farmer_profile3.id,
                category_id=cat_veg.id,
                name="Ooty Cauliflower (காளிஃபிளவர்)",
                description="Snow-white compact cauliflower heads cultivated in cool mountain mist.",
                price_per_unit=45.0,
                unit="piece",
                stock_quantity=22.0,
                low_stock_threshold=6.0,
                image_url="https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.8,
                review_count=15,
                ai_suggested_price=48.0
            ),

            # --- ORGANIC FRUITS ---
            Product(
                farmer_id=farmer_profile2.id,
                category_id=cat_fruit.id,
                name="Pollachi Tender Coconut (இளநீர்)",
                description="Sweet mineral-rich water coconut directly cut from Pollachi groves.",
                price_per_unit=45.0,
                unit="piece",
                stock_quantity=80.0,
                low_stock_threshold=20.0,
                image_url="https://images.unsplash.com/photo-1525385133512-2f3bdd039054?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=5.0,
                review_count=64,
                ai_suggested_price=48.0
            ),
            Product(
                farmer_id=farmer_profile2.id,
                category_id=cat_fruit.id,
                name="Nendran Bananas (நேந்திரன் பழம்)",
                description="Rich, aromatic golden Nendran bananas directly harvested from Pollachi banana orchards.",
                price_per_unit=65.0,
                unit="kg",
                stock_quantity=40.0,
                low_stock_threshold=10.0,
                image_url="https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.9,
                review_count=38,
                ai_suggested_price=70.0
            ),
            Product(
                farmer_id=farmer_profile2.id,
                category_id=cat_fruit.id,
                name="Salem Alphonso Mangoes (சேலம் மாம்பழம்)",
                description="Naturally tree-ripened Salem Alphonso mangoes with rich sweet nectar pulp.",
                price_per_unit=180.0,
                unit="kg",
                stock_quantity=25.0,
                low_stock_threshold=8.0,
                image_url="https://images.unsplash.com/photo-1553279768-865429fa0078?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=5.0,
                review_count=71,
                ai_suggested_price=190.0
            ),
            Product(
                farmer_id=farmer_profile4.id,
                category_id=cat_fruit.id,
                name="Red Country Pomegranate (மாதுளம்பழம்)",
                description="Deep red juicy pomegranate seeds packed with natural antioxidants.",
                price_per_unit=140.0,
                unit="kg",
                stock_quantity=8.0,  # Low stock
                low_stock_threshold=15.0,
                image_url="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.8,
                review_count=29,
                ai_suggested_price=150.0
            ),
            Product(
                farmer_id=farmer_profile2.id,
                category_id=cat_fruit.id,
                name="Organic Pink Guava (கொய்யாப்பழம்)",
                description="Sweet pink-fleshed organic guava harvested from Salem family orchards.",
                price_per_unit=50.0,
                unit="kg",
                stock_quantity=30.0,
                low_stock_threshold=10.0,
                image_url="https://images.unsplash.com/photo-1536511157201-5222b3a66971?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.7,
                review_count=20,
                ai_suggested_price=54.0
            ),

            # --- GRAINS & MILLETS ---
            Product(
                farmer_id=farmer_profile2.id,
                category_id=cat_grains.id,
                name="Traditional Mappillai Samba Rice (மாப்பிள்ளை சம்பா)",
                description="Ancient heirloom red rice variety known for high fiber, stamina, and low GI.",
                price_per_unit=120.0,
                unit="kg",
                stock_quantity=150.0,
                low_stock_threshold=30.0,
                image_url="https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.9,
                review_count=53,
                ai_suggested_price=125.0
            ),
            Product(
                farmer_id=farmer_profile.id,
                category_id=cat_grains.id,
                name="Organic Ponni Boiled Rice (பொன்னி அரிசி)",
                description="Aromatic aged Delta Ponni rice, unpolished and easy to digest.",
                price_per_unit=65.0,
                unit="kg",
                stock_quantity=200.0,
                low_stock_threshold=40.0,
                image_url="https://images.unsplash.com/photo-1586201375761-83865001e31c?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.8,
                review_count=44,
                ai_suggested_price=70.0
            ),
            Product(
                farmer_id=farmer_profile4.id,
                category_id=cat_grains.id,
                name="Foxtail Millet / Thinai (திணை அரிசி)",
                description="Nutritious gluten-free Thinai millet rich in protein and dietary fiber.",
                price_per_unit=95.0,
                unit="kg",
                stock_quantity=60.0,
                low_stock_threshold=15.0,
                image_url="https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.9,
                review_count=31,
                ai_suggested_price=100.0
            ),
            Product(
                farmer_id=farmer_profile4.id,
                category_id=cat_grains.id,
                name="Organic Ragi / Finger Millet (கேழ்வரகு)",
                description="Calcium-rich unrefined finger millet grain harvested from dryland organic farms.",
                price_per_unit=55.0,
                unit="kg",
                stock_quantity=11.0,  # Low stock
                low_stock_threshold=20.0,
                image_url="https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.8,
                review_count=26,
                ai_suggested_price=58.0
            ),
            Product(
                farmer_id=farmer_profile.id,
                category_id=cat_grains.id,
                name="Unpolished Toor Dal (துவரம் பருப்பு)",
                description="Native yellow split pigeon peas grown without artificial oil polishing.",
                price_per_unit=135.0,
                unit="kg",
                stock_quantity=85.0,
                low_stock_threshold=15.0,
                image_url="https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.9,
                review_count=49,
                ai_suggested_price=142.0
            ),

            # --- GREENS & HERBS ---
            Product(
                farmer_id=farmer_profile.id,
                category_id=cat_greens.id,
                name="Fresh Palak / Spinach (பசலைக்கீரை)",
                description="Harvested before sunrise. Crisp, tender leaves packed with natural iron and minerals.",
                price_per_unit=25.0,
                unit="bunch",
                stock_quantity=8.0,  # Low stock
                low_stock_threshold=15.0,
                image_url="https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.8,
                review_count=29,
                ai_suggested_price=28.0
            ),
            Product(
                farmer_id=farmer_profile4.id,
                category_id=cat_greens.id,
                name="Organic Curry Leaves (கறிவேப்பிலை)",
                description="Deep aromatic dark-green curry leaves grown organically near Madurai.",
                price_per_unit=15.0,
                unit="bunch",
                stock_quantity=45.0,
                low_stock_threshold=10.0,
                image_url="https://images.unsplash.com/photo-1615485290382-441e4d049cb5?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.9,
                review_count=35,
                ai_suggested_price=18.0
            ),
            Product(
                farmer_id=farmer_profile.id,
                category_id=cat_greens.id,
                name="Fresh Coriander Leaves (கொத்தமல்லி)",
                description="Fragrant lush coriander bunches freshly picked with tender roots intact.",
                price_per_unit=20.0,
                unit="bunch",
                stock_quantity=14.0,  # Low stock
                low_stock_threshold=18.0,
                image_url="https://images.unsplash.com/photo-1588879460405-5edd9260a950?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.7,
                review_count=21,
                ai_suggested_price=22.0
            ),
            Product(
                farmer_id=farmer_profile3.id,
                category_id=cat_greens.id,
                name="Organic Mint Leaves / Pudina (புதினா)",
                description="Refreshing, highly aromatic garden mint leaves perfect for herbal tea and chutney.",
                price_per_unit=18.0,
                unit="bunch",
                stock_quantity=30.0,
                low_stock_threshold=8.0,
                image_url="https://images.unsplash.com/photo-1628556270448-4d4e4148e1b1?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.8,
                review_count=18,
                ai_suggested_price=20.0
            ),
            Product(
                farmer_id=farmer_profile.id,
                category_id=cat_greens.id,
                name="Amaranth Greens / Sirukeerai (சிறுகீரை)",
                description="Nutrient-dense native green amaranth leaves harvested from morning farm beds.",
                price_per_unit=22.0,
                unit="bunch",
                stock_quantity=18.0,
                low_stock_threshold=8.0,
                image_url="https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.8,
                review_count=16,
                ai_suggested_price=25.0
            ),

            # --- FARM DAIRY ---
            Product(
                farmer_id=farmer_profile2.id,
                category_id=cat_dairy.id,
                name="Pure Country Cow Milk (நாட்டுப்பால்)",
                description="Chilled raw A2 country cow milk from free-grazing native Kangayam cows.",
                price_per_unit=60.0,
                unit="liter",
                stock_quantity=50.0,
                low_stock_threshold=10.0,
                image_url="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=5.0,
                review_count=82,
                ai_suggested_price=65.0
            ),
            Product(
                farmer_id=farmer_profile2.id,
                category_id=cat_dairy.id,
                name="Traditional A2 Cultured Ghee (பசு நெய்)",
                description="Hand-churned Bilona method A2 cow ghee with golden granular texture and rich aroma.",
                price_per_unit=850.0,
                unit="liter",
                stock_quantity=15.0,
                low_stock_threshold=5.0,
                image_url="https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=5.0,
                review_count=67,
                ai_suggested_price=890.0
            ),
            Product(
                farmer_id=farmer_profile2.id,
                category_id=cat_dairy.id,
                name="Fresh Organic Cottage Cheese / Paneer (பன்னீர்)",
                description="Soft, rich cottage cheese prepared fresh from morning farm milk.",
                price_per_unit=120.0,
                unit="piece",
                stock_quantity=7.0,  # Low stock
                low_stock_threshold=10.0,
                image_url="https://images.unsplash.com/photo-1631451095765-2c91616fc9e6?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.9,
                review_count=33,
                ai_suggested_price=128.0
            ),
            Product(
                farmer_id=farmer_profile2.id,
                category_id=cat_dairy.id,
                name="Natural Farm Curd / Yogurt (தயிர்)",
                description="Thick, naturally fermented clay-pot curd prepared from pure country cow milk.",
                price_per_unit=50.0,
                unit="liter",
                stock_quantity=25.0,
                low_stock_threshold=8.0,
                image_url="https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600&auto=format&fit=crop&q=80",
                is_organic=True,
                rating=4.8,
                review_count=41,
                ai_suggested_price=55.0
            )
        ]

        db.add_all(products_data)
        db.flush()

        # Active Order for delivery agent centerpiece
        order1 = Order(
            order_number="F2H-88204",
            customer_id=customer_profile.id,
            delivery_agent_id=delivery_profile.id,
            total_amount=342.0,
            delivery_fee=30.0,
            status="assigned",
            payment_status="completed",
            payment_method="UPI (GPay)",
            delivery_address="Flat 4B, Greenwoods Apartments, 1st Cross, Gandhi Road, Chennai 600042",
            pickup_address="Cauvery Natural Greens, Plot 12 Delta Road, Thanjavur",
            notes="Please leave at doorstep if bell not answered"
        )
        db.add(order1)
        db.flush()

        item1 = OrderItem(order_id=order1.id, product_id=products_data[0].id, farmer_id=products_data[0].farmer_id, quantity=3.0, unit_price=38.0, subtotal=114.0)
        item2 = OrderItem(order_id=order1.id, product_id=products_data[1].id, farmer_id=products_data[1].farmer_id, quantity=2.0, unit_price=25.0, subtotal=50.0)
        item3 = OrderItem(order_id=order1.id, product_id=products_data[8].id, farmer_id=products_data[8].farmer_id, quantity=3.0, unit_price=45.0, subtotal=135.0)
        db.add_all([item1, item2, item3])

        # Delivery legs for order1 (multi-farmer order: Farmer 1 and Farmer 2)
        leg1 = Delivery(
            order_id=order1.id,
            farmer_id=farmer_profile.id,
            delivery_agent_id=delivery_profile.id,
            pickup_address=f"{farmer_profile.farm_name}, {farmer_profile.location}",
            drop_address=order1.delivery_address,
            pickup_lat=10.79,
            pickup_lng=79.13,
            drop_lat=13.08,
            drop_lng=80.27,
            status="assigned",
            payout_amount=65.0,
            distance_km=4.2
        )
        leg2 = Delivery(
            order_id=order1.id,
            farmer_id=farmer_profile2.id,
            delivery_agent_id=delivery_profile2.id,
            pickup_address=f"{farmer_profile2.farm_name}, {farmer_profile2.location}",
            drop_address=order1.delivery_address,
            pickup_lat=10.66,
            pickup_lng=77.01,
            drop_lat=13.08,
            drop_lng=80.27,
            status="assigned",
            payout_amount=75.0,
            distance_km=6.8
        )
        db.add_all([leg1, leg2])

        # Another confirmed order
        order2 = Order(
            order_number="F2H-88205",
            customer_id=customer_profile.id,
            delivery_agent_id=None,
            total_amount=240.0,
            status="confirmed",
            payment_status="completed",
            delivery_address="18 Anna Nagar West, Chennai 600040",
            pickup_address=f"{farmer_profile.farm_name}, {farmer_profile.location}"
        )
        db.add(order2)
        db.flush()

        item4 = OrderItem(order_id=order2.id, product_id=products_data[3].id, farmer_id=products_data[3].farmer_id, quantity=4.0, unit_price=products_data[3].price_per_unit, subtotal=products_data[3].price_per_unit * 4.0)
        db.add(item4)

        leg3 = Delivery(
            order_id=order2.id,
            farmer_id=farmer_profile.id,
            delivery_agent_id=None,
            pickup_address=f"{farmer_profile.farm_name}, {farmer_profile.location}",
            drop_address=order2.delivery_address,
            pickup_lat=10.79,
            pickup_lng=79.13,
            drop_lat=13.08,
            drop_lng=80.21,
            status="unassigned",
            payout_amount=70.0,
            distance_km=5.4
        )
        db.add(leg3)

        db.commit()
        print(f"Farm2Home expanded seed completed successfully! {len(products_data)} products inserted.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database(force=True)
