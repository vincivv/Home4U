from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session
from datetime import timedelta

from app.core.database import get_db
from app.models.database import User
from app.schemas.schemas import UserCreate, UserResponse, Token
from app.utils.auth import verify_password, get_password_hash, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES
from app.utils.dependencies import get_current_user
from app.utils.login_rate_limit import get_request_ip, login_rate_limiter

router = APIRouter(tags=["Authentication"])

def _normalize_email(email: str) -> str:
    """Lowercase and strip whitespace to avoid case/space mismatches."""
    return email.strip().lower()


@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    """Register a new user."""
    normalized_email = _normalize_email(user.email)

    # Check if email already exists (case-insensitive)
    existing_user = db.query(User).filter(func.lower(User.email) == normalized_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Hash password and create user
    hashed_password = get_password_hash(user.password)
    db_user = User(email=normalized_email, password_hash=hashed_password)
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@router.post("/login", response_model=Token)
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """Authenticate user and return access token."""
    email = _normalize_email(form_data.username)
    client_ip = get_request_ip(request)

    retry_after = login_rate_limiter.retry_after(client_ip, email)
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Try again in a few minutes.",
            headers={"Retry-After": str(retry_after)},
        )

    # Find user by email (case-insensitive)
    user = db.query(User).filter(func.lower(User.email) == email).first()
    
    if not user or not verify_password(form_data.password, user.password_hash):
        login_rate_limiter.register_failure(client_ip, email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    login_rate_limiter.reset_identity(client_ip, email)

    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id)}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user info."""
    return current_user
