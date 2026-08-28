from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User
from app.models.farmer import FarmerProfile
from app.models.customer import CustomerProfile
from app.models.delivery import DeliveryProfile
from app.schemas.auth import RegisterRequest, LoginRequest, OtpLoginRequest, UpdateProfileRequest
from app.core.security import get_password_hash, verify_password
from app.core.jwt_handler import create_access_token

def get_user_profile_data(user: User) -> dict:
    profile_data = {
        "id": user.id,
        "email": user.email,
        "phone": user.phone,
        "full_name": user.full_name,
        "role": user.role,
        "language": user.language,
    }
    if user.role == "farmer" and user.farmer_profile:
        profile_data["farmer"] = {
            "id": user.farmer_profile.id,
            "farm_name": user.farmer_profile.farm_name,
            "location": user.farmer_profile.location,
            "district": user.farmer_profile.district,
            "state": user.farmer_profile.state,
            "farm_size_acres": user.farmer_profile.farm_size_acres,
            "organic_certified": user.farmer_profile.organic_certified,
            "total_earnings": user.farmer_profile.total_earnings,
        }
    elif user.role == "customer" and user.customer_profile:
        profile_data["customer"] = {
            "id": user.customer_profile.id,
            "delivery_address": user.customer_profile.delivery_address,
            "city": user.customer_profile.city,
            "pincode": user.customer_profile.pincode,
        }
    elif user.role == "delivery" and user.delivery_profile:
        profile_data["delivery"] = {
            "id": user.delivery_profile.id,
            "vehicle_type": user.delivery_profile.vehicle_type,
            "vehicle_number": user.delivery_profile.vehicle_number,
            "is_on_duty": user.delivery_profile.is_on_duty,
            "total_deliveries": user.delivery_profile.total_deliveries,
            "completed_today": user.delivery_profile.completed_today,
        }
    return profile_data

def register_user(db: Session, req: RegisterRequest):
    # Check if email exists
    if req.email:
        existing = db.query(User).filter(User.email == req.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )
    # Check if phone exists
    if req.phone:
        existing_phone = db.query(User).filter(User.phone == req.phone).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this phone number already exists."
            )

    new_user = User(
        email=req.email or None,
        phone=req.phone or None,
        full_name=req.full_name,
        hashed_password=get_password_hash(req.password),
        role=req.role.lower(),
        language=req.language or "en",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Attach profile according to role
    if new_user.role == "farmer":
        farmer_prof = FarmerProfile(
            user_id=new_user.id,
            farm_name=req.farm_name or f"{req.full_name}'s Organic Farm",
            location=req.location or "Thanjavur, Tamil Nadu",
            district=req.district or "Thanjavur",
            state=req.state or "Tamil Nadu",
            pincode=req.pincode or "613001",
            farm_size_acres=req.farm_size_acres or 3.5,
            organic_certified=req.organic_certified or True,
            total_earnings=0.0
        )
        db.add(farmer_prof)
    elif new_user.role == "customer":
        customer_prof = CustomerProfile(
            user_id=new_user.id,
            delivery_address=req.delivery_address or "42 Green Valley Layout",
            city=req.city or "Chennai",
            pincode=req.pincode or "600001"
        )
        db.add(customer_prof)
    elif new_user.role == "delivery":
        delivery_prof = DeliveryProfile(
            user_id=new_user.id,
            vehicle_type=req.vehicle_type or "Electric Scooter",
            vehicle_number=req.vehicle_number or "TN-01-AB-7788",
            license_number=req.license_number or "DL-IND-2024-9988",
            is_on_duty=True
        )
        db.add(delivery_prof)

    db.commit()
    db.refresh(new_user)

    token = create_access_token(subject=new_user.id, role=new_user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": get_user_profile_data(new_user)
    }

def login_user(db: Session, req: LoginRequest):
    user = None
    if req.email:
        user = db.query(User).filter(User.email == req.email).first()
    elif req.phone:
        user = db.query(User).filter(User.phone == req.phone).first()

    if not user or not verify_password(req.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username and password."
        )

    if req.role and user.role != req.role and user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is registered as a {user.role.capitalize()}, not {req.role.capitalize()}."
        )

    token = create_access_token(subject=user.id, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": get_user_profile_data(user)
    }

def otp_login_user(db: Session, req: OtpLoginRequest):
    # Simulated OTP verification (any 4-digit code like 1234 works in test/development)
    if req.otp not in ["1234", "123456", "0000", "7777"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OTP. Use test OTP '1234' for instant login."
        )

    user = db.query(User).filter(User.phone == req.phone).first()
    if not user:
        # Auto-create mobile user if not present
        user = User(
            phone=req.phone,
            full_name=f"Farmer {req.phone[-4:]}" if req.role == "farmer" else f"User {req.phone[-4:]}",
            hashed_password=get_password_hash("Farm2Home@123"),
            role=req.role or "farmer",
            language="ta" if req.role == "farmer" else "en"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        if user.role == "farmer":
            f_prof = FarmerProfile(user_id=user.id, farm_name=f"{user.full_name}'s Farm", location="Madurai, Tamil Nadu")
            db.add(f_prof)
            db.commit()

    token = create_access_token(subject=user.id, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": get_user_profile_data(user)
    }

def update_user_profile(db: Session, user: User, req: UpdateProfileRequest) -> dict:
    # Uniqueness check for email
    if req.email and req.email != user.email:
        existing_email = db.query(User).filter(User.email == req.email, User.id != user.id).first()
        if existing_email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this email address already exists."
            )
        user.email = req.email

    # Uniqueness check for phone
    if req.phone and req.phone != user.phone:
        existing_phone = db.query(User).filter(User.phone == req.phone, User.id != user.id).first()
        if existing_phone:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="An account with this phone number already exists."
            )
        user.phone = req.phone

    if req.full_name is not None:
        user.full_name = req.full_name

    if req.language is not None:
        user.language = req.language

    # Role-specific updates
    if user.role == "farmer":
        if not user.farmer_profile:
            user.farmer_profile = FarmerProfile(user_id=user.id)
            db.add(user.farmer_profile)
        if req.farm_name is not None:
            user.farmer_profile.farm_name = req.farm_name
        if req.location is not None:
            user.farmer_profile.location = req.location
        if req.district is not None:
            user.farmer_profile.district = req.district
        if req.state is not None:
            user.farmer_profile.state = req.state
        if req.pincode is not None:
            user.farmer_profile.pincode = req.pincode
        if req.farm_size_acres is not None:
            user.farmer_profile.farm_size_acres = req.farm_size_acres
        if req.organic_certified is not None:
            user.farmer_profile.organic_certified = req.organic_certified

    elif user.role == "customer":
        if not user.customer_profile:
            user.customer_profile = CustomerProfile(user_id=user.id)
            db.add(user.customer_profile)
        if req.delivery_address is not None:
            user.customer_profile.delivery_address = req.delivery_address
        if req.city is not None:
            user.customer_profile.city = req.city
        if req.pincode is not None:
            user.customer_profile.pincode = req.pincode

    elif user.role == "delivery":
        if not user.delivery_profile:
            user.delivery_profile = DeliveryProfile(user_id=user.id)
            db.add(user.delivery_profile)
        if req.vehicle_type is not None:
            user.delivery_profile.vehicle_type = req.vehicle_type
        if req.vehicle_number is not None:
            user.delivery_profile.vehicle_number = req.vehicle_number
        if req.license_number is not None:
            user.delivery_profile.license_number = req.license_number

    db.commit()
    db.refresh(user)
    return get_user_profile_data(user)
