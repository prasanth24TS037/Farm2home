from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

class UserBase(BaseModel):
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    role: str
    language: Optional[str] = "en"
    is_active: bool = True

class UserResponse(UserBase):
    id: int
    created_at: datetime
    profile_details: Optional[dict] = None

    class Config:
        from_attributes = True
