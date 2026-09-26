import secrets
import hashlib
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.user import User, PasswordResetToken
from app.models.farmer import FarmerProfile
from app.models.customer import CustomerProfile
from app.models.delivery import DeliveryProfile
from app.schemas.auth import (
    RegisterRequest, 
    LoginRequest, 
    OtpLoginRequest, 
    UpdateProfileRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    GoogleLoginRequest
)
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
        "auth_provider": getattr(user, "auth_provider", "local") or "local",
        "needs_profile_completion": False,
    }
    if user.role == "farmer":
        if user.farmer_profile:
            profile_data["farmer"] = {
                "id": user.farmer_profile.id,
                "farm_name": user.farmer_profile.farm_name,
                "location": user.farmer_profile.location,
                "district": user.farmer_profile.district,
                "state": user.farmer_profile.state,
                "farm_size_acres": user.farmer_profile.farm_size_acres,
                "organic_certified": user.farmer_profile.organic_certified,
                "total_earnings": user.farmer_profile.total_earnings,
                "payout_method": getattr(user.farmer_profile, "payout_method", "UPI"),
                "payout_upi_id": getattr(user.farmer_profile, "payout_upi_id", None),
            }
            if not user.farmer_profile.farm_name or not user.farmer_profile.location:
                profile_data["needs_profile_completion"] = True
        else:
            profile_data["needs_profile_completion"] = True

    elif user.role == "customer":
        if user.customer_profile:
            profile_data["customer"] = {
                "id": user.customer_profile.id,
                "delivery_address": user.customer_profile.delivery_address,
                "city": user.customer_profile.city,
                "pincode": user.customer_profile.pincode,
            }
            if not user.customer_profile.delivery_address:
                profile_data["needs_profile_completion"] = True
        else:
            profile_data["needs_profile_completion"] = True

    elif user.role == "delivery":
        if user.delivery_profile:
            profile_data["delivery"] = {
                "id": user.delivery_profile.id,
                "vehicle_type": user.delivery_profile.vehicle_type,
                "vehicle_number": user.delivery_profile.vehicle_number,
                "license_number": user.delivery_profile.license_number,
                "is_on_duty": user.delivery_profile.is_on_duty,
                "total_deliveries": user.delivery_profile.total_deliveries,
                "completed_today": user.delivery_profile.completed_today,
                "total_earnings": user.delivery_profile.total_earnings,
                "kyc_status": user.delivery_profile.kyc_status or "verified",
                "license_status": user.delivery_profile.license_status or "verified",
                "rc_status": user.delivery_profile.rc_status or "verified",
                "payout_method": user.delivery_profile.payout_method or "UPI",
                "payout_upi_id": user.delivery_profile.payout_upi_id or "",
                "payout_account_holder": user.delivery_profile.payout_account_holder or user.full_name,
                "payout_account_last_four": user.delivery_profile.payout_account_last_four or "",
                "payout_bank_name": user.delivery_profile.payout_bank_name or "",
                "payout_bank_ifsc": user.delivery_profile.payout_bank_ifsc or ""
            }
            if not user.delivery_profile.vehicle_number:
                profile_data["needs_profile_completion"] = True
        else:
            profile_data["needs_profile_completion"] = True

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
        auth_provider="local",
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
        user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    elif req.phone:
        user = db.query(User).filter(User.phone == req.phone.strip()).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials. Please check your username and password."
        )

    # Check if user registered via Google and has no local password set
    if getattr(user, "auth_provider", None) == "google" and not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This account was registered using Google. Please click 'Continue with Google' to sign in."
        )

    if not user.hashed_password or not verify_password(req.password, user.hashed_password):
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

def forgot_password_service(db: Session, req: ForgotPasswordRequest):
    email_clean = req.email.strip().lower()
    user = db.query(User).filter(User.email == email_clean).first()
    
    # Generic safe response to prevent email enumeration
    safe_response = {
        "message": "If this email is registered with Farm2Home, password reset instructions have been sent.",
        "success": True
    }

    if not user:
        return safe_response

    # Rate limiting: max 3 active reset requests per 15 minutes
    window_start = datetime.utcnow() - timedelta(minutes=15)
    recent_tokens_count = db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.created_at >= window_start
    ).count()

    if recent_tokens_count >= 3:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many password reset attempts. Please wait 15 minutes before requesting again."
        )

    # Invalidate previous unused tokens for this user
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None)
    ).update({"used_at": datetime.utcnow()})

    # Generate high-entropy secure token
    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = datetime.utcnow() + timedelta(minutes=15)

    reset_token_record = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
        created_at=datetime.utcnow()
    )
    db.add(reset_token_record)
    db.commit()

    # Log in server console for local testing / development
    reset_url = f"http://localhost:5173/reset-password/{raw_token}"
    print(f"\n==========================================")
    print(f"[AUTH DEV] Password Reset Link for {user.email}:")
    print(f"👉 {reset_url}")
    print(f"==========================================\n")

    # Include token in response for smooth development/testing verification
    safe_response["debug_token"] = raw_token
    safe_response["reset_url"] = reset_url
    return safe_response

def reset_password_service(db: Session, req: ResetPasswordRequest):
    if len(req.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long."
        )

    token_hash = hashlib.sha256(req.token.strip().encode("utf-8")).hexdigest()
    
    token_record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.used_at.is_(None),
        PasswordResetToken.expires_at > datetime.utcnow()
    ).first()

    if not token_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This password reset link is invalid or has expired. Please request a new one."
        )

    user = db.query(User).filter(User.id == token_record.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Associated user account was not found."
        )

    # Update password and mark token as used
    user.hashed_password = get_password_hash(req.new_password)
    token_record.used_at = datetime.utcnow()
    db.commit()

    return {
        "success": True,
        "message": "Your password has been reset successfully. You can now log in with your new credentials."
    }

def google_login_service(db: Session, req: GoogleLoginRequest):
    target_role = req.role.lower().strip()
    if target_role not in ["farmer", "customer", "delivery"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role specified for Google Sign-In."
        )

    google_email = None
    google_name = None
    google_sub = None

    # Check for real Google ID token verification
    if req.id_token and not req.id_token.startswith("mock_"):
        try:
            from google.oauth2 import id_token as google_id_token
            from google.auth.transport import requests as google_requests
            
            # Verify the token
            idinfo = google_id_token.verify_oauth2_token(
                req.id_token, 
                google_requests.Request()
            )
            google_email = idinfo.get("email")
            google_name = idinfo.get("name") or google_email.split("@")[0]
            google_sub = idinfo.get("sub")
        except Exception as e:
            # If standard token verification fails in dev or mock test, fallback to provided mocks
            print(f"[GOOGLE AUTH] Token verification notice: {e}")
            if req.mock_email:
                google_email = req.mock_email
                google_name = req.mock_name or req.mock_email.split("@")[0]
                google_sub = req.mock_sub or f"mock_sub_{req.mock_email}"
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid or unverified Google token."
                )
    else:
        # Dev / simulated mock path
        google_email = req.mock_email or f"google_{target_role}@farm2home.com"
        google_name = req.mock_name or f"Google {target_role.capitalize()}"
        google_sub = req.mock_sub or f"mock_sub_{google_email}"

    if not google_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Google account did not return a valid email address."
        )

    google_email = google_email.strip().lower()

    # Find user by email or google_sub
    user = db.query(User).filter(
        (User.email == google_email) | (User.google_sub == google_sub)
    ).first()

    is_new_user = False
    if user:
        # Guardrail: Check role mismatch
        if user.role != target_role and user.role != "admin":
            role_labels = {"farmer": "Farmer", "customer": "Customer", "delivery": "Delivery Partner"}
            user_role_label = role_labels.get(user.role, user.role.capitalize())
            target_role_label = role_labels.get(target_role, target_role.capitalize())
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This Google account is already registered as a {user_role_label}. Please use the {user_role_label} login page."
            )
        
        # Link google credentials if previously local
        if not user.google_sub:
            user.google_sub = google_sub
        if not user.auth_provider or user.auth_provider == "local":
            user.auth_provider = "google"
        db.commit()
    else:
        # Create brand new user
        is_new_user = True
        user = User(
            email=google_email,
            full_name=google_name,
            role=target_role,
            auth_provider="google",
            google_sub=google_sub,
            hashed_password="*google_oauth*",
            language="en"
        )
        db.add(user)
        db.commit()
        db.refresh(user)

        # Create basic profile container
        if target_role == "farmer":
            f_prof = FarmerProfile(
                user_id=user.id,
                farm_name="",
                location="",
                total_earnings=0.0
            )
            db.add(f_prof)
        elif target_role == "customer":
            c_prof = CustomerProfile(
                user_id=user.id,
                delivery_address="",
                city=""
            )
            db.add(c_prof)
        elif target_role == "delivery":
            d_prof = DeliveryProfile(
                user_id=user.id,
                vehicle_type="Motorcycle",
                vehicle_number="",
                is_on_duty=True
            )
            db.add(d_prof)
        db.commit()
        db.refresh(user)

    user_profile = get_user_profile_data(user)
    if is_new_user:
        user_profile["needs_profile_completion"] = True

    token = create_access_token(subject=user.id, role=user.role)
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user_profile,
        "is_new_user": is_new_user
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
        if req.is_on_duty is not None:
            user.delivery_profile.is_on_duty = req.is_on_duty

    db.commit()
    db.refresh(user)
    return get_user_profile_data(user)
