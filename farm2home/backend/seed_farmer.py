import sys
import os

# Add the backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.farmer import FarmerProfile
from app.models.product import Category, Product
from app.core.security import get_password_hash

def seed_data():
    db = SessionLocal()
    
    # 1. Create a Category if not exists
    category_name = "Vegetables"
    category = db.query(Category).filter(Category.name == category_name).first()
    if not category:
        category = Category(name=category_name, description="Fresh vegetables from farm")
        db.add(category)
        db.commit()
        db.refresh(category)
        print(f"Created category: {category.name}")
    else:
        print(f"Category already exists: {category.name}")

    # 2. Create Farmer User
    email = "farmer1@example.com"
    password = "password123"
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        user = User(
            email=email,
            phone="9876543210",
            full_name="Test Farmer",
            hashed_password=get_password_hash(password),
            role="farmer"
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created user: {user.email}")
    else:
        print(f"User already exists: {user.email}")

    # 3. Create Farmer Profile
    farmer_profile = db.query(FarmerProfile).filter(FarmerProfile.user_id == user.id).first()
    if not farmer_profile:
        farmer_profile = FarmerProfile(
            user_id=user.id,
            farm_name="Green Acres Farm",
            location="Village XYZ",
            district="Some District",
            state="Some State",
            farm_size_acres=5.5,
            organic_certified=True
        )
        db.add(farmer_profile)
        db.commit()
        db.refresh(farmer_profile)
        print(f"Created farmer profile for user ID: {user.id}")
    else:
        print(f"Farmer profile already exists for user ID: {user.id}")

    # 4. Add Products
    products_to_add = [
        {"name": "Fresh Tomatoes", "description": "Organic tomatoes freshly picked", "price_per_unit": 40.0, "unit": "kg", "stock_quantity": 100},
        {"name": "Potatoes", "description": "Farm fresh potatoes", "price_per_unit": 30.0, "unit": "kg", "stock_quantity": 200},
        {"name": "Carrots", "description": "Crunchy orange carrots", "price_per_unit": 60.0, "unit": "kg", "stock_quantity": 50},
    ]

    for p_data in products_to_add:
        product = db.query(Product).filter(Product.name == p_data["name"], Product.farmer_id == farmer_profile.id).first()
        if not product:
            product = Product(
                farmer_id=farmer_profile.id,
                category_id=category.id,
                name=p_data["name"],
                description=p_data["description"],
                price_per_unit=p_data["price_per_unit"],
                unit=p_data["unit"],
                stock_quantity=p_data["stock_quantity"],
                is_organic=True
            )
            db.add(product)
            db.commit()
            print(f"Created product: {product.name}")
        else:
            print(f"Product already exists: {product.name}")

    db.close()
    print(f"\n--- Seeding Complete ---")
    print(f"Farmer Login Email: {email}")
    print(f"Farmer Login Password: {password}")

if __name__ == "__main__":
    seed_data()
