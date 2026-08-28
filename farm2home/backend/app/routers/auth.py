from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.schemas.auth import LoginRequest, RegisterRequest, OtpLoginRequest, TokenResponse, UpdateProfileRequest
from app.services.auth_service import register_user, login_user, otp_login_user, get_user_profile_data, update_user_profile
from app.core.jwt_handler import get_current_user_token
from app.models.user import User

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=TokenResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    return register_user(db, req)

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    return login_user(db, req)

@router.post("/otp-login", response_model=TokenResponse)
def otp_login(req: OtpLoginRequest, db: Session = Depends(get_db)):
    return otp_login_user(db, req)

@router.get("/me")
def get_me(token_payload: dict = Depends(get_current_user_token), db: Session = Depends(get_db)):
    user_id = int(token_payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return get_user_profile_data(user)

@router.patch("/me")
def update_me(
    req: UpdateProfileRequest,
    token_payload: dict = Depends(get_current_user_token),
    db: Session = Depends(get_db)
):
    user_id = int(token_payload.get("sub"))
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return update_user_profile(db, user, req)
