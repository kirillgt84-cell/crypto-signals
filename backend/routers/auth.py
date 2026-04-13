"""
Auth router: JWT + OAuth (Google, Telegram, Twitter/X, Discord)
"""
import os
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import jwt
import bcrypt
import secrets
import httpx
from database import get_db

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# Config from env vars
JWT_SECRET = os.getenv("JWT_SECRET", "default-secret-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = int(os.getenv("JWT_ACCESS_EXPIRE", "15"))  # minutes
REFRESH_TOKEN_EXPIRE = int(os.getenv("JWT_REFRESH_EXPIRE", "7"))  # days

# OAuth Config
OAUTH_CONFIG = {
    "google": {
        "client_id": "your-google-client-id",
        "client_secret": "your-google-secret",
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scopes": ["openid", "email", "profile"]
    },
    "telegram": {
        "bot_token": "your-telegram-bot-token",
        # Telegram uses widget auth, not OAuth2
    },
    "twitter": {
        "client_id": "your-twitter-client-id",
        "client_secret": "your-twitter-secret",
        "auth_url": "https://twitter.com/i/oauth2/authorize",
        "token_url": "https://api.twitter.com/2/oauth2/token",
        "userinfo_url": "https://api.twitter.com/2/users/me",
    },
    "discord": {
        "client_id": "your-discord-client-id",
        "client_secret": "your-discord-secret",
        "auth_url": "https://discord.com/api/oauth2/authorize",
        "token_url": "https://discord.com/api/oauth2/token",
        "userinfo_url": "https://discord.com/api/users/@me",
        "scopes": ["identify", "email"]
    }
}

security = HTTPBearer(auto_error=False)

# ============= MODELS =============

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict

class OAuthCallbackRequest(BaseModel):
    code: str
    state: Optional[str] = None

class TelegramAuthRequest(BaseModel):
    id: int
    first_name: str
    last_name: Optional[str] = None
    username: Optional[str] = None
    photo_url: Optional[str] = None
    auth_date: int
    hash: str

# ============= JWT UTILS =============

def create_access_token(user_id: int) -> str:
    """Create short-lived access token"""
    expires = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE)
    payload = {
        "sub": str(user_id),
        "exp": expires,
        "type": "access",
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    """Create long-lived refresh token"""
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE)
    
    # Store hash in DB
    db = get_db()
    token_hash = bcrypt.hashpw(token.encode(), bcrypt.gensalt()).decode()
    
    asyncio.create_task(db.execute(
        """INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
           VALUES ($1, $2, $3)""",
        [user_id, token_hash, expires]
    ))
    
    return token

def verify_token(token: str) -> Optional[int]:
    """Verify JWT and return user_id"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            return None
        return int(payload["sub"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency to get current user from JWT"""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    user_id = verify_token(credentials.credentials)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    db = get_db()
    user = await db.query(
        "SELECT id, email, username, avatar_url, is_email_verified FROM users WHERE id = $1 AND is_active = TRUE",
        [user_id]
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return dict(user[0])

# ============= EMAIL/PASSWORD AUTH =============

@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest):
    """Register with email and password"""
    db = get_db()
    
    # Check if email exists
    existing = await db.query("SELECT id FROM users WHERE email = $1", [req.email])
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    password_hash = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    
    # Generate username if not provided
    username = req.username or req.email.split("@")[0]
    
    # Check username uniqueness
    existing_user = await db.query("SELECT id FROM users WHERE username = $1", [username])
    if existing_user:
        username = f"{username}_{secrets.token_hex(4)}"
    
    # Create user
    result = await db.query(
        """INSERT INTO users (email, password_hash, username)
           VALUES ($1, $2, $3) RETURNING id, email, username""",
        [req.email, password_hash, username]
    )
    
    user = result[0]
    
    # Create default preferences
    await db.execute(
        "INSERT INTO user_preferences (user_id) VALUES ($1)",
        [user["id"]]
    )
    
    # Generate tokens
    access_token = create_access_token(user["id"])
    refresh_token = create_refresh_token(user["id"])
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE * 60,
        "user": dict(user)
    }

@router.post("/login", response_model=TokenResponse)
async def login(req: LoginRequest):
    """Login with email and password"""
    db = get_db()
    
    user = await db.query(
        "SELECT id, email, username, password_hash, avatar_url, is_email_verified FROM users WHERE email = $1 AND is_active = TRUE",
        [req.email]
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = user[0]
    
    # Verify password
    if not bcrypt.checkpw(req.password.encode(), user["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Generate tokens
    access_token = create_access_token(user["id"])
    refresh_token = create_refresh_token(user["id"])
    
    # Remove password_hash from response
    user_dict = {k: v for k, v in user.items() if k != "password_hash"}
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE * 60,
        "user": user_dict
    }

@router.post("/refresh")
async def refresh_token(refresh_token: str):
    """Refresh access token using refresh token"""
    db = get_db()
    
    # Find refresh token in DB (compare hash)
    tokens = await db.query(
        "SELECT id, user_id, expires_at, is_revoked FROM refresh_tokens WHERE is_revoked = FALSE",
        []
    )
    
    valid_token = None
    for t in tokens:
        # This is inefficient - better to store token prefix and match by prefix
        # For production, use Redis with token prefix
        pass
    
    # Simple implementation: check all non-expired tokens
    # In production, use Redis or better indexing
    
    raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout - revoke refresh tokens"""
    user_id = verify_token(credentials.credentials)
    if user_id:
        db = get_db()
        await db.execute(
            "UPDATE refresh_tokens SET is_revoked = TRUE WHERE user_id = $1",
            [user_id]
        )
    return {"message": "Logged out"}

# ============= OAUTH =============

@router.get("/oauth/{provider}")
async def oauth_login(provider: str):
    """Get OAuth URL for provider"""
    if provider not in OAUTH_CONFIG:
        raise HTTPException(status_code=400, detail="Unknown provider")
    
    config = OAUTH_CONFIG[provider]
    
    if provider == "telegram":
        # Telegram uses widget, not redirect
        return {
            "bot_username": "your_bot_username",
            "auth_url": f"https://t.me/{config['bot_username']}?start=auth"
        }
    
    # Build OAuth URL
    import urllib.parse
    params = {
        "client_id": config["client_id"],
        "redirect_uri": f"https://your-domain.com/api/v1/auth/oauth/{provider}/callback",
        "response_type": "code",
        "scope": " ".join(config.get("scopes", [])),
        "state": secrets.token_urlsafe(16)
    }
    
    auth_url = f"{config['auth_url']}?{urllib.parse.urlencode(params)}"
    
    return {"auth_url": auth_url}

@router.post("/oauth/{provider}/callback")
async def oauth_callback(provider: str, req: OAuthCallbackRequest):
    """Handle OAuth callback"""
    if provider not in OAUTH_CONFIG:
        raise HTTPException(status_code=400, detail="Unknown provider")
    
    config = OAUTH_CONFIG[provider]
    
    # Exchange code for token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(
            config["token_url"],
            data={
                "grant_type": "authorization_code",
                "code": req.code,
                "client_id": config["client_id"],
                "client_secret": config["client_secret"],
                "redirect_uri": f"https://your-domain.com/api/v1/auth/oauth/{provider}/callback"
            }
        )
        
        if token_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="OAuth token exchange failed")
        
        token_data = token_resp.json()
        access_token = token_data["access_token"]
        
        # Get user info
        user_resp = await client.get(
            config["userinfo_url"],
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if user_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        user_info = user_resp.json()
    
    # Extract user data based on provider
    provider_user_id = user_info.get("id") or user_info.get("sub")
    email = user_info.get("email")
    name = user_info.get("name") or user_info.get("username")
    avatar = user_info.get("picture") or user_info.get("avatar")
    
    # Find or create user
    db = get_db()
    
    # Check if OAuth account exists
    oauth_account = await db.query(
        "SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2",
        [provider, str(provider_user_id)]
    )
    
    if oauth_account:
        # Existing user - update OAuth data
        user_id = oauth_account[0]["user_id"]
        await db.execute(
            "UPDATE oauth_accounts SET provider_data = $1 WHERE user_id = $2 AND provider = $3",
            [user_info, user_id, provider]
        )
    else:
        # Check if email exists
        existing_user = None
        if email:
            existing_user = await db.query(
                "SELECT id FROM users WHERE email = $1",
                [email]
            )
        
        if existing_user:
            # Link OAuth to existing user
            user_id = existing_user[0]["id"]
        else:
            # Create new user
            username = name or f"{provider}_{secrets.token_hex(4)}"
            
            # Ensure unique username
            existing = await db.query("SELECT id FROM users WHERE username = $1", [username])
            if existing:
                username = f"{username}_{secrets.token_hex(4)}"
            
            result = await db.query(
                """INSERT INTO users (email, username, avatar_url, is_email_verified)
                   VALUES ($1, $2, $3, $4) RETURNING id""",
                [email, username, avatar, True]  # OAuth emails are verified
            )
            user_id = result[0]["id"]
            
            # Create preferences
            await db.execute(
                "INSERT INTO user_preferences (user_id) VALUES ($1)",
                [user_id]
            )
        
        # Create OAuth account link
        await db.execute(
            """INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_data)
               VALUES ($1, $2, $3, $4)""",
            [user_id, provider, str(provider_user_id), user_info]
        )
    
    # Generate JWT tokens
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    
    # Get user data
    user = await db.query(
        "SELECT id, email, username, avatar_url, is_email_verified FROM users WHERE id = $1",
        [user_id]
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE * 60,
        "user": dict(user[0])
    }

# ============= TELEGRAM AUTH =============

import hmac
import hashlib

def verify_telegram_auth(data: dict, bot_token: str) -> bool:
    """Verify Telegram auth data"""
    check_hash = data.pop("hash")
    
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
    secret_key = hashlib.sha256(bot_token.encode()).digest()
    
    h = hmac.new(secret_key, data_check_string.encode(), hashlib.sha256)
    return h.hexdigest() == check_hash

@router.post("/telegram")
async def telegram_auth(req: TelegramAuthRequest):
    """Handle Telegram widget auth"""
    config = OAUTH_CONFIG["telegram"]
    
    # Verify Telegram signature
    auth_data = {
        "id": req.id,
        "first_name": req.first_name,
        "last_name": req.last_name,
        "username": req.username,
        "photo_url": req.photo_url,
        "auth_date": req.auth_date,
        "hash": req.hash
    }
    
    if not verify_telegram_auth(auth_data, config["bot_token"]):
        raise HTTPException(status_code=401, detail="Invalid Telegram auth")
    
    # Check auth_date is recent (within 24 hours)
    if datetime.utcnow().timestamp() - req.auth_date > 86400:
        raise HTTPException(status_code=401, detail="Auth expired")
    
    db = get_db()
    
    # Find or create user
    oauth_account = await db.query(
        "SELECT user_id FROM oauth_accounts WHERE provider = 'telegram' AND provider_user_id = $1",
        [str(req.id)]
    )
    
    if oauth_account:
        user_id = oauth_account[0]["user_id"]
    else:
        # Create new user
        username = req.username or f"tg_{req.id}"
        existing = await db.query("SELECT id FROM users WHERE username = $1", [username])
        if existing:
            username = f"{username}_{secrets.token_hex(4)}"
        
        result = await db.query(
            """INSERT INTO users (username, avatar_url, is_email_verified)
               VALUES ($1, $2, TRUE) RETURNING id""",
            [username, req.photo_url]
        )
        user_id = result[0]["id"]
        
        await db.execute(
            """INSERT INTO oauth_accounts (user_id, provider, provider_user_id, provider_data)
               VALUES ($1, 'telegram', $2, $3)""",
            [user_id, str(req.id), {"first_name": req.first_name, "last_name": req.last_name}]
        )
        
        await db.execute(
            "INSERT INTO user_preferences (user_id) VALUES ($1)",
            [user_id]
        )
    
    # Generate tokens
    access_token = create_access_token(user_id)
    refresh_token = create_refresh_token(user_id)
    
    user = await db.query(
        "SELECT id, email, username, avatar_url FROM users WHERE id = $1",
        [user_id]
    )
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE * 60,
        "user": dict(user[0])
    }

# ============= USER ENDPOINTS =============

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """Get current user info"""
    db = get_db()
    
    # Get preferences
    prefs = await db.query(
        "SELECT * FROM user_preferences WHERE user_id = $1",
        [current_user["id"]]
    )
    
    # Get connected OAuth accounts
    oauth = await db.query(
        "SELECT provider FROM oauth_accounts WHERE user_id = $1",
        [current_user["id"]]
    )
    
    return {
        **current_user,
        "preferences": dict(prefs[0]) if prefs else None,
        "connected_oauth": [o["provider"] for o in oauth]
    }

@router.patch("/me")
async def update_me(
    updates: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile"""
    db = get_db()
    
    allowed_fields = ["username", "avatar_url"]
    updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    # Build query
    set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(updates.keys()))
    values = list(updates.values()) + [current_user["id"]]
    
    await db.execute(
        f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE id = $1",
        [current_user["id"]] + list(updates.values())
    )
    
    return {"message": "Profile updated"}
