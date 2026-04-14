"""Tests for auth router"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
import jwt

from fastapi.testclient import TestClient
from main import app

from routers.auth import (
    create_access_token, create_refresh_token, verify_token,
    get_current_user, OAUTH_CONFIG
)

client = TestClient(app)


@pytest.fixture
def mock_db():
    """Return a mock db whose methods are AsyncMock."""
    db = MagicMock()
    db.query = AsyncMock()
    db.execute = AsyncMock()
    return db


class TestJWTUtils:
    def test_create_access_token(self):
        token = create_access_token(42)
        payload = jwt.decode(token, "default-secret-change-in-production", algorithms=["HS256"])
        assert payload["sub"] == "42"
        assert payload["type"] == "access"

    def test_verify_token_valid(self):
        token = create_access_token(42)
        user_id = verify_token(token)
        assert user_id == 42

    def test_verify_token_invalid_type(self):
        token = jwt.encode({"sub": "42", "type": "refresh"}, "default-secret-change-in-production", algorithm="HS256")
        assert verify_token(token) is None

    def test_verify_token_expired(self):
        expired = datetime.utcnow() - timedelta(hours=1)
        token = jwt.encode({"sub": "42", "exp": expired, "type": "access"}, "default-secret-change-in-production", algorithm="HS256")
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            verify_token(token)
        assert exc.value.status_code == 401


@pytest.mark.asyncio
class TestRegisterLogin:
    @patch("routers.auth.get_db")
    async def test_register_success(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.side_effect = [
            [],  # existing email check
            [],  # existing username check
            [{"id": 1, "email": "a@b.com", "username": "alice"}],  # insert return
        ]

        from routers.auth import register
        req = MagicMock()
        req.email = "a@b.com"
        req.password = "secret123"
        req.username = None

        result = await register(req)
        assert result["user"]["email"] == "a@b.com"
        assert "access_token" in result
        assert "refresh_token" in result

    @patch("routers.auth.get_db")
    async def test_register_email_exists(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.return_value = [{"id": 99}]

        from routers.auth import register, RegisterRequest
        from fastapi import HTTPException
        req = RegisterRequest(email="a@b.com", password="secret123")
        with pytest.raises(HTTPException) as exc:
            await register(req)
        assert exc.value.status_code == 400

    @patch("routers.auth.get_db")
    async def test_login_success(self, mock_get_db, mock_db):
        import bcrypt
        pw_hash = bcrypt.hashpw("secret123".encode(), bcrypt.gensalt()).decode()
        mock_get_db.return_value = mock_db
        mock_db.query.return_value = [
            {"id": 1, "email": "a@b.com", "username": "alice", "password_hash": pw_hash, "avatar_url": None, "is_email_verified": True}
        ]

        from routers.auth import login, LoginRequest
        req = LoginRequest(email="a@b.com", password="secret123")
        result = await login(req)
        assert result["user"]["email"] == "a@b.com"
        assert "access_token" in result

    @patch("routers.auth.get_db")
    async def test_login_invalid_credentials(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.return_value = []

        from routers.auth import login, LoginRequest
        from fastapi import HTTPException
        req = LoginRequest(email="a@b.com", password="wrong")
        with pytest.raises(HTTPException) as exc:
            await login(req)
        assert exc.value.status_code == 401


@pytest.mark.asyncio
class TestOAuth:
    @patch("routers.auth.OAUTH_CONFIG", {
        "google": {
            "client_id": "cid",
            "client_secret": "sec",
            "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "userinfo_url": "https://www.googleapis.com/oauth2/v2/userinfo",
            "scopes": ["openid", "email", "profile"]
        },
        "telegram": {
            "bot_token": "tok",
            "bot_username": "my_bot",
        },
        "twitter": {
            "client_id": "cid",
            "client_secret": "sec",
            "auth_url": "https://twitter.com/i/oauth2/authorize",
            "token_url": "https://api.twitter.com/2/oauth2/token",
            "userinfo_url": "https://api.twitter.com/2/users/me",
        },
        "discord": {
            "client_id": "cid",
            "client_secret": "sec",
            "auth_url": "https://discord.com/api/oauth2/authorize",
            "token_url": "https://discord.com/api/oauth2/token",
            "userinfo_url": "https://discord.com/api/users/@me",
            "scopes": ["identify", "email"]
        }
    })
    async def test_oauth_login_google(self):
        from routers.auth import oauth_login
        result = await oauth_login("google")
        assert "auth_url" in result
        assert "accounts.google.com" in result["auth_url"]

    @patch("routers.auth.OAUTH_CONFIG", {
        "telegram": {
            "bot_token": "tok",
            "bot_username": "my_bot",
        }
    })
    async def test_oauth_login_telegram(self):
        from routers.auth import oauth_login
        result = await oauth_login("telegram")
        # bot_username is hardcoded in the router; URL uses config value
        assert result["bot_username"] == "your_bot_username"
        assert "my_bot" in result["auth_url"]

    async def test_oauth_login_unknown_provider(self):
        from routers.auth import oauth_login
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            await oauth_login("unknown")
        assert exc.value.status_code == 400

    @patch("routers.auth.get_db")
    @patch("routers.auth.httpx.AsyncClient")
    async def test_oauth_callback_google_new_user(self, mock_client_cls, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.side_effect = [
            [],  # no existing oauth_account
            [],  # no existing email
            [],  # username check
            [{"id": 7}],  # insert user RETURNING id
            [{"id": 7, "email": "g@g.com", "username": "google_guy", "avatar_url": None, "is_email_verified": True}],  # select user
        ]

        mock_resp_token = MagicMock()
        mock_resp_token.status_code = 200
        mock_resp_token.json.return_value = {"access_token": "tok123"}

        mock_resp_user = MagicMock()
        mock_resp_user.status_code = 200
        mock_resp_user.json.return_value = {"sub": "g1", "email": "g@g.com", "name": "google_guy", "picture": "pic.jpg"}

        mock_client = MagicMock()
        mock_client.post = AsyncMock(return_value=mock_resp_token)
        mock_client.get = AsyncMock(return_value=mock_resp_user)
        mock_client.__aenter__ = AsyncMock(return_value=mock_client)
        mock_client.__aexit__ = AsyncMock(return_value=None)
        mock_client_cls.return_value = mock_client

        from routers.auth import oauth_callback, OAuthCallbackRequest
        req = OAuthCallbackRequest(code="ccc")
        result = await oauth_callback("google", req)
        assert "access_token" in result
        assert result["user"]["email"] == "g@g.com"


@pytest.mark.asyncio
class TestTelegramAuth:
    @patch("routers.auth.get_db")
    @patch("routers.auth.verify_telegram_auth", return_value=True)
    async def test_telegram_auth_new_user(self, mock_verify, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.side_effect = [
            [],  # no existing oauth
            [],  # username check
            [{"id": 3}],  # insert user RETURNING id
            [{"id": 3, "email": None, "username": "tg_123", "avatar_url": None}],  # select user
        ]

        from routers.auth import telegram_auth, TelegramAuthRequest
        req = TelegramAuthRequest(
            id=123,
            first_name="Bob",
            username="bobby",
            auth_date=int(datetime.utcnow().timestamp()),
            hash="abc"
        )
        result = await telegram_auth(req)
        assert result["user"]["username"] == "tg_123"
        assert "access_token" in result

    @patch("routers.auth.verify_telegram_auth", return_value=False)
    async def test_telegram_auth_invalid(self, mock_verify):
        from routers.auth import telegram_auth, TelegramAuthRequest
        from fastapi import HTTPException
        req = TelegramAuthRequest(
            id=123,
            first_name="Bob",
            auth_date=int(datetime.utcnow().timestamp()),
            hash="abc"
        )
        with pytest.raises(HTTPException) as exc:
            await telegram_auth(req)
        assert exc.value.status_code == 401

    @patch("routers.auth.verify_telegram_auth", return_value=True)
    async def test_telegram_auth_expired(self, mock_verify):
        from routers.auth import telegram_auth, TelegramAuthRequest
        from fastapi import HTTPException
        req = TelegramAuthRequest(
            id=123,
            first_name="Bob",
            auth_date=int((datetime.utcnow() - timedelta(days=2)).timestamp()),
            hash="abc"
        )
        with pytest.raises(HTTPException) as exc:
            await telegram_auth(req)
        assert exc.value.status_code == 401


@pytest.mark.asyncio
class TestUserEndpoints:
    @patch("routers.auth.get_db")
    async def test_get_me(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.side_effect = [
            [{"theme": "dark"}],
            [{"provider": "google"}],
        ]

        from routers.auth import get_me
        current_user = {"id": 1, "email": "a@b.com", "username": "alice"}
        result = await get_me(current_user)
        assert result["preferences"]["theme"] == "dark"
        assert result["connected_oauth"] == ["google"]

    @patch("routers.auth.get_db")
    async def test_update_me(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.execute = AsyncMock()

        from routers.auth import update_me
        current_user = {"id": 1}
        result = await update_me({"username": "newname", "avatar_url": "pic.png"}, current_user)
        assert result["message"] == "Profile updated"

    @patch("routers.auth.get_db")
    async def test_update_me_no_valid_fields(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        from routers.auth import update_me
        from fastapi import HTTPException
        current_user = {"id": 1}
        with pytest.raises(HTTPException) as exc:
            await update_me({"email": "x@y.com"}, current_user)
        assert exc.value.status_code == 400


@pytest.mark.asyncio
class TestRefreshLogout:
    @patch("routers.auth.get_db")
    async def test_refresh_token_unimplemented(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.query.return_value = []
        from routers.auth import refresh_token
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc:
            await refresh_token("some_token")
        assert exc.value.status_code == 401

    @patch("routers.auth.get_db")
    async def test_logout(self, mock_get_db, mock_db):
        mock_get_db.return_value = mock_db
        mock_db.execute = AsyncMock()

        import bcrypt
        pw_hash = bcrypt.hashpw("secret123".encode(), bcrypt.gensalt()).decode()
        mock_db.query.return_value = [
            {"id": 1, "email": "a@b.com", "username": "alice", "password_hash": pw_hash, "avatar_url": None, "is_email_verified": True}
        ]

        # Login to get a token
        from routers.auth import login, LoginRequest
        req = LoginRequest(email="a@b.com", password="secret123")
        result = await login(req)
        token = result["access_token"]

        # Logout
        from routers.auth import logout
        from fastapi.security import HTTPAuthorizationCredentials
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)
        resp = await logout(creds)
        assert resp["message"] == "Logged out"
        # logout also triggers refresh token creation during login, so filter for the logout call
        logout_calls = [c for c in mock_db.execute.call_args_list if "is_revoked = TRUE" in str(c)]
        assert len(logout_calls) == 1
