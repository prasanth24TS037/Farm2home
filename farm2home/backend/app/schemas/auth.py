from typing import Optional
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: Optional[str] = None

class OtpLoginRequest(BaseModel):
    phone: str
    otp: str
    role: Optional[str] = None

class RegisterRequest(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    password: str
    role: str  # farmer, customer, delivery, admin
    language: Optional[str] = "en"
    
    # Farmer specific
    farm_name: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    farm_size_acres: Optional[float] = 0.0
    organic_certified: Optional[bool] = False

    # Customer specific
    delivery_address: Optional[str] = None
    city: Optional[str] = None

    # Delivery specific
    vehicle_type: Optional[str] = "Motorcycle"
    vehicle_number: Optional[str] = None
    license_number: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    language: Optional[str] = None

    # Farmer specific
    farm_name: Optional[str] = None
    location: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    farm_size_acres: Optional[float] = None
    organic_certified: Optional[bool] = None

    # Customer specific
    delivery_address: Optional[str] = None
    city: Optional[str] = None

    # Delivery specific
    vehicle_type: Optional[str] = None
    vehicle_number: Optional[str] = None
    license_number: Optional[str] = None
