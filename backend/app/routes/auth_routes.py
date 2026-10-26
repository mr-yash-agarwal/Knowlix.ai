import logging
from fastapi import APIRouter, HTTPException, Depends

from app.models import UserRegisterRequest, UserLoginRequest, AuthTokenResponse, UserProfile
from app.database import create_user, authenticate_user, get_user_by_email
from app.auth import create_access_token, get_current_user

logger = logging.getLogger("knowlix.auth")
router = APIRouter(prefix="/api/auth", tags=["Authentication & User Accounts"])

@router.post("/register", response_model=AuthTokenResponse)
async def register(payload: UserRegisterRequest):
    """
    Registers a new student account. Passwords are encrypted with PBKDF2-HMAC-SHA256.
    """
    if not payload.name or len(payload.name.strip()) < 2:
        raise HTTPException(status_code=400, detail="Name must be at least 2 characters long.")
    if not payload.email or "@" not in payload.email:
        raise HTTPException(status_code=400, detail="Please enter a valid email address.")
    if not payload.password or len(payload.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters long.")

    existing = get_user_by_email(payload.email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email address already exists.")

    user = create_user(
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role="student"
    )

    token = create_access_token(
        user_id=user["id"],
        role=user["role"],
        email=user["email"],
        name=user["name"]
    )

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfile(**user)
    )

@router.post("/login", response_model=AuthTokenResponse)
async def login(payload: UserLoginRequest):
    """
    Authenticates email and password. Returns signed bearer token.
    """
    user = authenticate_user(payload.email, payload.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    token = create_access_token(
        user_id=user["id"],
        role=user["role"],
        email=user["email"],
        name=user["name"]
    )

    return AuthTokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserProfile(**user)
    )

@router.get("/me", response_model=UserProfile)
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Retrieves current authenticated user's profile and role.
    """
    return UserProfile(**current_user)
