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
from services.notifications import send_email, send_telegram_message, TELEGRAM_BOT_NAME

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])

# Config from env vars
JWT_SECRET = os.getenv("JWT_SECRET", "default-secret-change-in-production")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE = int(os.getenv("JWT_ACCESS_EXPIRE", "60"))  # minutes
REFRESH_TOKEN_EXPIRE = int(os.getenv("JWT_REFRESH_EXPIRE", "7"))  # days
FRONTEND_URL = os.getenv("FRONTEND_URL", "https://mirkaso.com")

# OAuth credentials from env
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")
TWITTER_CLIENT_ID = os.getenv("TWITTER_CLIENT_ID", "")
TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET", "")
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID", "")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET", "")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")

# OAuth Config
OAUTH_CONFIG = {
    "google": {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
        "token_url": "https://oauth2.googleapis.com/token",
        "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
        "scopes": ["openid", "email", "profile"]
    },
    "telegram": {
        "bot_token": TELEGRAM_BOT_TOKEN,
        # Telegram uses widget auth, not OAuth2
    },
    "twitter": {
        "client_id": TWITTER_CLIENT_ID,
        "client_secret": TWITTER_CLIENT_SECRET,
        "auth_url": "https://twitter.com/i/oauth2/authorize",
        "token_url": "https://api.twitter.com/2/oauth2/token",
        "userinfo_url": "https://api.twitter.com/2/users/me",
    },
    "discord": {
        "client_id": DISCORD_CLIENT_ID,
        "client_secret": DISCORD_CLIENT_SECRET,
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

class RefreshRequest(BaseModel):
    refresh_token: str

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
        "SELECT id, email, username, avatar_url, is_email_verified, subscription_tier FROM users WHERE id = $1 AND is_active = TRUE",
        [user_id]
    )
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    return dict(user[0])


async def get_current_user_optional(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[dict]:
    """Optional dependency — returns user dict or None without raising 401."""
    if not credentials:
        return None
    try:
        user_id = verify_token(credentials.credentials)
        if not user_id:
            return None
        db = get_db()
        user = await db.query(
            "SELECT id, email, username, avatar_url, is_email_verified, subscription_tier FROM users WHERE id = $1 AND is_active = TRUE",
            [user_id]
        )
        return dict(user[0]) if user else None
    except Exception:
        return None

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
        """INSERT INTO users (email, password_hash, username, subscription_tier)
           VALUES ($1, $2, $3, 'free') RETURNING id, email, username, subscription_tier""",
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
async def refresh_token(body: RefreshRequest):
    """Refresh access token using refresh token"""
    db = get_db()
    refresh_token = body.refresh_token

    # Find valid refresh tokens
    tokens = await db.query(
        "SELECT id, user_id, expires_at, is_revoked, token_hash FROM refresh_tokens WHERE is_revoked = FALSE AND expires_at > NOW()",
        []
    )

    for t in tokens:
        if bcrypt.checkpw(refresh_token.encode(), t["token_hash"].encode()):
            # Revoke old token for security
            await db.execute("UPDATE refresh_tokens SET is_revoked = TRUE WHERE id = $1", [t["id"]])

            access_token = create_access_token(t["user_id"])
            new_refresh = create_refresh_token(t["user_id"])

            return {
                "access_token": access_token,
                "refresh_token": new_refresh,
                "token_type": "bearer",
                "expires_in": ACCESS_TOKEN_EXPIRE * 60
            }

    raise HTTPException(status_code=401, detail="Invalid refresh token")

@router.post("/logout")
async def logout(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Logout - revoke refresh tokens"""
    if not credentials:
        return {"message": "Logged out"}
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
        bot_name = TELEGRAM_BOT_NAME or ""
        # Validate bot username: must end with 'bot' and contain no @
        if not bot_name or "@" in bot_name or not bot_name.lower().endswith("bot"):
            raise HTTPException(status_code=400, detail="Telegram bot is not configured")
        return {
            "bot_username": bot_name,
            "auth_url": f"https://t.me/{bot_name}?start=auth"
        }
    
    if not config.get("client_id"):
        raise HTTPException(status_code=400, detail=f"{provider.capitalize()} OAuth is not configured")
    
    # Build OAuth URL
    import urllib.parse
    params = {
        "client_id": config["client_id"],
        "redirect_uri": f"{FRONTEND_URL}/auth/callback",
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
                "redirect_uri": f"{FRONTEND_URL}/auth/callback"
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
                """INSERT INTO users (email, username, avatar_url, is_email_verified, subscription_tier)
                   VALUES ($1, $2, $3, $4, 'free') RETURNING id""",
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
            """INSERT INTO users (username, avatar_url, is_email_verified, subscription_tier)
               VALUES ($1, $2, TRUE, 'free') RETURNING id""",
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
        "SELECT theme, language, timezone, notifications_enabled, daily_report, weekly_report, telegram_alerts, telegram_chat_id FROM user_preferences WHERE user_id = $1",
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

class PasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str

@router.patch("/me/password")
async def change_password(
    req: PasswordChangeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Change password with old password verification"""
    db = get_db()
    
    user = await db.query(
        "SELECT password_hash FROM users WHERE id = $1",
        [current_user["id"]]
    )
    
    if not user or not user[0].get("password_hash"):
        raise HTTPException(status_code=400, detail="Password change not available for OAuth-only accounts")
    
    if not bcrypt.checkpw(req.old_password.encode(), user[0]["password_hash"].encode()):
        raise HTTPException(status_code=401, detail="Incorrect old password")
    
    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    new_hash = bcrypt.hashpw(req.new_password.encode(), bcrypt.gensalt()).decode()
    await db.execute(
        "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2",
        [new_hash, current_user["id"]]
    )
    
    return {"message": "Password updated successfully"}

@router.patch("/me")
async def update_me(
    updates: dict,
    current_user: dict = Depends(get_current_user)
):
    """Update user profile and preferences"""
    db = get_db()
    
    user_fields = ["username", "avatar_url", "subscription_tier"]
    pref_fields = ["theme", "language", "timezone", "notifications_enabled", "daily_report", "weekly_report", "telegram_alerts", "telegram_chat_id"]
    
    user_updates = {k: v for k, v in updates.items() if k in user_fields}
    pref_updates = {k: v for k, v in updates.items() if k in pref_fields}
    
    # Prevent self-promotion to admin
    if user_updates.get("subscription_tier") == "admin" and current_user.get("subscription_tier") != "admin":
        raise HTTPException(status_code=403, detail="Cannot self-promote to admin")
    
    if not user_updates and not pref_updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")
    
    if user_updates:
        set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(user_updates.keys()))
        await db.execute(
            f"UPDATE users SET {set_clause}, updated_at = NOW() WHERE id = $1",
            [current_user["id"]] + list(user_updates.values())
        )
    
    if pref_updates:
        set_clause = ", ".join(f"{k} = ${i+2}" for i, k in enumerate(pref_updates.keys()))
        await db.execute(
            f"""INSERT INTO user_preferences (user_id, {', '.join(pref_updates.keys())}, updated_at)
                VALUES ($1, {', '.join([f'${i+2}' for i in range(len(pref_updates))])}, NOW())
                ON CONFLICT (user_id) DO UPDATE SET {set_clause}, updated_at = NOW()""",
            [current_user["id"]] + list(pref_updates.values())
        )
    
    return {"message": "Profile updated"}


@router.get("/me/telegram-link")
async def get_telegram_link(current_user: dict = Depends(get_current_user)):
    """Get Telegram bot deep link for connecting account"""
    return {
        "bot_name": TELEGRAM_BOT_NAME,
        "deep_link": f"https://t.me/{TELEGRAM_BOT_NAME}?start={current_user['id']}"
    }


@router.post("/me/test-email")
async def test_email(current_user: dict = Depends(get_current_user)):
    """Send a test email to the current user"""
    if not current_user.get("email"):
        raise HTTPException(status_code=400, detail="No email address on file")
    
    html = f"""
    <html>
      <body style="font-family:Arial,sans-serif;padding:24px;">
        <h2>Test Email from Mirkaso</h2>
        <p>This is a test email sent to {current_user['email']}.</p>
        <p>If you received this, your email notifications are working correctly.</p>
      </body>
    </html>
    """
    result = await send_email(current_user["email"], "Mirkaso Test Email", html)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send email"))
    return {"message": "Test email sent", "id": result.get("id")}


@router.post("/me/test-telegram")
async def test_telegram(current_user: dict = Depends(get_current_user)):
    """Send a test Telegram message to the current user"""
    db = get_db()
    row = await db.query(
        "SELECT telegram_chat_id FROM user_preferences WHERE user_id = $1",
        [current_user["id"]]
    )
    chat_id = row[0]["telegram_chat_id"] if row else None
    if not chat_id:
        raise HTTPException(status_code=400, detail="Telegram not connected")
    
    result = await send_telegram_message(
        chat_id,
        f"<b>Mirkaso Test</b>\nYour Telegram alerts are working, {current_user.get('username', 'trader')}!"
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send Telegram message"))
    return {"message": "Test Telegram message sent", "message_id": result.get("message_id")}


# ============= EMAIL VERIFICATION =============

class VerifyEmailRequest(BaseModel):
    code: str


@router.post("/me/send-verification")
async def send_verification_email(current_user: dict = Depends(get_current_user)):
    """Send a 6-digit email verification code"""
    if not current_user.get("email"):
        raise HTTPException(status_code=400, detail="No email address on file")
    if current_user.get("is_email_verified"):
        raise HTTPException(status_code=400, detail="Email already verified")
    
    db = get_db()
    # Clean up old codes for this user
    await db.execute(
        "DELETE FROM email_verification_codes WHERE user_id = $1",
        [current_user["id"]]
    )
    
    # Generate 6-digit code with leading zeros
    code = f"{secrets.randbelow(1000000):06d}"
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    await db.execute(
        """INSERT INTO email_verification_codes (user_id, code, expires_at)
           VALUES ($1, $2, $3)""",
        [current_user["id"], code, expires_at]
    )
    
    html = f"""
    <html>
      <body style="font-family:Arial,sans-serif;padding:24px;">
        <h2>Verify your email</h2>
        <p>Your verification code is:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:4px;margin:16px 0;">{code}</p>
        <p>This code expires in 15 minutes.</p>
      </body>
    </html>
    """
    result = await send_email(current_user["email"], "Mirkaso Email Verification", html)
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Failed to send email"))
    return {"message": "Verification code sent"}


@router.post("/me/verify-email")
async def verify_email(req: VerifyEmailRequest, current_user: dict = Depends(get_current_user)):
    """Verify email with a 6-digit code"""
    db = get_db()
    row = await db.query(
        """SELECT id FROM email_verification_codes
           WHERE user_id = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()""",
        [current_user["id"], req.code]
    )
    if not row:
        raise HTTPException(status_code=400, detail="Invalid or expired verification code")
    
    await db.execute(
        "UPDATE users SET is_email_verified = TRUE WHERE id = $1",
        [current_user["id"]]
    )
    await db.execute(
        "UPDATE email_verification_codes SET used = TRUE WHERE id = $1",
        [row[0]["id"]]
    )
    return {"message": "Email verified successfully"}
