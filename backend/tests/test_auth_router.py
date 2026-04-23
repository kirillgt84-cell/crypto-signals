"""Tests for routers/auth.py"""
import pytest
import jwt
import bcrypt
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

from fastapi import HTTPException

class MockRequest:
    def __init__(self, cookies=None, body=None):
        self.cookies = cookies or {}
        self._body = body
        self.headers = {}
        self.client = type('Client', (), {'host': '127.0.0.1'})()

    async def json(self):
        return self._body or {}

# Patch get_db before importing router
with patch("routers.auth.get_db") as mock_get_db:
    mock_db = MagicMock()
    mock_get_db.return_value = mock_db
    from routers.auth import (
        create_access_token,
        create_refresh_token,
        verify_token,
        get_current_user,
        register,
        login,
        oauth_login,
        oauth_callback,
        telegram_auth,
        verify_telegram_auth,
        logout,
        update_me,
        get_me,
        change_password,
    )


class TestJWTHelpers:
    def test_create_access_token(self):
        token = create_access_token(42)
        payload = jwt.decode(token, "default-secret-change-in-production", algorithms=["HS256"])
        assert payload["sub"] == "42"
        assert payload["type"] == "access"
        assert "exp" in payload

    @patch("routers.auth.get_db")
    async def test_create_refresh_token(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.execute = AsyncMock()

        token = create_refresh_token(42)
        assert isinstance(token, str)
        assert len(token) > 20

    def test_verify_token_valid(self):
        token = create_access_token(42)
        user_id = verify_token(token)
        assert user_id == 42

    def test_verify_token_expired(self):
        expired_payload = {
            "sub": "42",
            "exp": datetime.utcnow() - timedelta(hours=1),
            "type": "access",
            "iat": datetime.utcnow() - timedelta(hours=2),
        }
        expired_token = jwt.encode(expired_payload, "default-secret-change-in-production", algorithm="HS256")
        with pytest.raises(HTTPException) as exc_info:
            verify_token(expired_token)
        assert exc_info.value.status_code == 401
        assert "expired" in exc_info.value.detail.lower()

    def test_verify_token_invalid(self):
        with pytest.raises(HTTPException) as exc_info:
            verify_token("invalid.token.here")
        assert exc_info.value.status_code == 401

    def test_verify_token_wrong_type(self):
        token = jwt.encode({"sub": "42", "exp": datetime.utcnow() + timedelta(hours=1), "type": "refresh"},
                           "default-secret-change-in-production", algorithm="HS256")
        result = verify_token(token)
        assert result is None


@pytest.mark.asyncio
class TestGetCurrentUser:
    @patch("routers.auth.get_db")
    async def test_get_current_user_success(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"id": 42, "email": "test@test.com", "username": "test"}])

        token = create_access_token(42)
        from fastapi.security import HTTPAuthorizationCredentials
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        result = await get_current_user(credentials=creds)
        assert result["id"] == 42

    async def test_get_current_user_no_credentials(self):
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user()
        assert exc_info.value.status_code == 401

    @patch("routers.auth.get_db")
    async def test_get_current_user_not_found(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[])

        token = create_access_token(42)
        from fastapi.security import HTTPAuthorizationCredentials
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        with pytest.raises(HTTPException) as exc_info:
            await get_current_user(credentials=creds)
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
class TestRegister:
    @patch("routers.auth.get_db")
    async def test_register_success(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=[
            [],  # email check
            [],  # username check
            [{"id": 1, "email": "test@test.com", "username": "testuser"}],
        ])
        mock_db.execute = AsyncMock()

        req = MagicMock()
        req.email = "test@test.com"
        req.password = "password123"
        req.username = "testuser"

        result = await register(req)
        assert result["user"]["email"] == "test@test.com"
        assert "access_token" in result
        assert "refresh_token" in result

    @patch("routers.auth.get_db")
    async def test_register_email_exists(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"id": 99}])

        req = MagicMock()
        req.email = "test@test.com"
        req.password = "password123"
        req.username = None

        with pytest.raises(HTTPException) as exc_info:
            await register(req)
        assert exc_info.value.status_code == 400

    @patch("routers.auth.get_db")
    async def test_register_auto_username(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=[
            [],  # email check
            [{"id": 2}],  # username exists
            [{"id": 1, "email": "test@test.com", "username": "test_abcdef12"}],
        ])
        mock_db.execute = AsyncMock()

        req = MagicMock()
        req.email = "test@test.com"
        req.password = "password123"
        req.username = None

        result = await register(req)
        assert result["user"]["email"] == "test@test.com"


@pytest.mark.asyncio
class TestLogin:
    @patch("routers.auth.get_db")
    async def test_login_success(self, mock_get_db):
        password_hash = bcrypt.hashpw("password123".encode(), bcrypt.gensalt()).decode()
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{
            "id": 1,
            "email": "test@test.com",
            "username": "test",
            "password_hash": password_hash,
            "avatar_url": None,
            "is_email_verified": True,
        }])
        mock_db.execute = AsyncMock()

        req = MagicMock()
        req.email = "test@test.com"
        req.password = "password123"

        result = await login(req)
        assert result["user"]["email"] == "test@test.com"
        assert "access_token" in result
        assert "password_hash" not in result["user"]

    @patch("routers.auth.get_db")
    async def test_login_invalid_email(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[])

        req = MagicMock()
        req.email = "bad@test.com"
        req.password = "password123"

        with pytest.raises(HTTPException) as exc_info:
            await login(req)
        assert exc_info.value.status_code == 401

    @patch("routers.auth.get_db")
    async def test_login_invalid_password(self, mock_get_db):
        password_hash = bcrypt.hashpw("password123".encode(), bcrypt.gensalt()).decode()
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{
            "id": 1,
            "email": "test@test.com",
            "username": "test",
            "password_hash": password_hash,
        }])

        req = MagicMock()
        req.email = "test@test.com"
        req.password = "wrongpassword"

        with pytest.raises(HTTPException) as exc_info:
            await login(req)
        assert exc_info.value.status_code == 401


@pytest.mark.asyncio
class TestOAuth:
    @patch("routers.auth.GOOGLE_CLIENT_ID", "test_client_id")
    @patch("routers.auth.GOOGLE_CLIENT_SECRET", "test_secret")
    async def test_oauth_login_google(self):
        result = await oauth_login("google")
        assert "auth_url" in result
        assert "accounts.google.com" in result["auth_url"]

    @patch("routers.auth.OAUTH_CONFIG", {"telegram": {"bot_token": "tok", "bot_username": "my_bot"}})
    async def test_oauth_login_telegram(self):
        result = await oauth_login("telegram")
        assert "bot_username" in result

    async def test_oauth_login_unknown(self):
        with pytest.raises(HTTPException) as exc_info:
            await oauth_login("unknown")
        assert exc_info.value.status_code == 400

    @patch("routers.auth.httpx.AsyncClient")
    @patch("routers.auth.get_db")
    async def test_oauth_callback_new_user(self, mock_get_db, mock_httpx):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=[
            [],  # no oauth account
            [],  # no existing user by email
            [],  # username check
            [{"id": 42}],  # insert user RETURNING id
            [{"id": 42, "email": "oauth@test.com", "username": "oauth_user", "avatar_url": None, "is_email_verified": True}],
        ])
        mock_db.execute = AsyncMock()

        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=MagicMock(status_code=200, json=lambda: {"access_token": "tok"}))
        mock_client.get = AsyncMock(return_value=MagicMock(status_code=200, json=lambda: {"id": "123", "email": "oauth@test.com", "name": "oauth_user"}))
        mock_httpx.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_httpx.return_value.__aexit__ = AsyncMock(return_value=None)

        req = MagicMock()
        req.code = "abc123"
        req.state = None

        result = await oauth_callback("google", req)
        assert result["user"]["email"] == "oauth@test.com"

    @patch("routers.auth.httpx.AsyncClient")
    async def test_oauth_callback_token_exchange_fails(self, mock_httpx):
        mock_client = AsyncMock()
        mock_client.post = AsyncMock(return_value=MagicMock(status_code=400))
        mock_httpx.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_httpx.return_value.__aexit__ = AsyncMock(return_value=None)

        req = MagicMock()
        req.code = "badcode"

        with pytest.raises(HTTPException) as exc_info:
            await oauth_callback("google", req)
        assert exc_info.value.status_code == 400


@pytest.mark.asyncio
class TestTelegramAuth:
    @patch("routers.auth.get_db")
    async def test_telegram_auth_existing_user(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"user_id": 42}])
        mock_db.execute = AsyncMock()

        req = MagicMock()
        req.id = 123456
        req.first_name = "Test"
        req.last_name = "User"
        req.username = "testuser"
        req.photo_url = None
        req.auth_date = int(datetime.utcnow().timestamp())
        # Generate valid hash
        req.hash = "dummy"

        # Patch verify_telegram_auth
        with patch("routers.auth.verify_telegram_auth", return_value=True):
            result = await telegram_auth(req)

        assert "access_token" in result

    @patch("routers.auth.get_db")
    async def test_telegram_auth_new_user(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=[
            [],  # no oauth account
            [],  # username check
            [{"id": 42}],  # insert user RETURNING id
            [{"id": 42, "username": "testuser", "avatar_url": None}],
        ])
        mock_db.execute = AsyncMock()

        req = MagicMock()
        req.id = 123456
        req.first_name = "Test"
        req.last_name = None
        req.username = "testuser"
        req.photo_url = "https://t.me/photo.jpg"
        req.auth_date = int(datetime.utcnow().timestamp())
        req.hash = "dummy"

        with patch("routers.auth.verify_telegram_auth", return_value=True):
            result = await telegram_auth(req)

        assert result["user"]["username"] == "testuser"

    async def test_telegram_auth_invalid(self):
        req = MagicMock()
        req.id = 123456
        req.first_name = "Test"
        req.last_name = None
        req.username = "testuser"
        req.photo_url = None
        req.auth_date = int(datetime.utcnow().timestamp())
        req.hash = "badhash"

        with patch("routers.auth.verify_telegram_auth", return_value=False):
            with pytest.raises(HTTPException) as exc_info:
                await telegram_auth(req)
            assert exc_info.value.status_code == 401

    async def test_telegram_auth_expired(self):
        req = MagicMock()
        req.id = 123456
        req.first_name = "Test"
        req.auth_date = int((datetime.utcnow() - timedelta(days=2)).timestamp())
        req.hash = "dummy"

        with patch("routers.auth.verify_telegram_auth", return_value=True):
            with pytest.raises(HTTPException) as exc_info:
                await telegram_auth(req)
            assert exc_info.value.status_code == 401
            assert "expired" in exc_info.value.detail.lower()
            assert "expired" in exc_info.value.detail.lower()

    def test_verify_telegram_auth(self):
        data = {
            "id": 123,
            "first_name": "Test",
            "auth_date": 1234567890,
            "hash": "abc123"
        }
        # Just ensure it runs without exception structure errors
        result = verify_telegram_auth(data.copy(), "bot_token")
        assert isinstance(result, bool)


@pytest.mark.asyncio
class TestUserEndpoints:
    @patch("routers.auth.get_db")
    async def test_get_me(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=[
            [{"theme": "dark"}],
            [{"provider": "google"}, {"provider": "telegram"}],
        ])

        current_user = {"id": 42, "email": "test@test.com", "username": "test"}
        result = await get_me(current_user)
        assert result["preferences"]["theme"] == "dark"
        assert result["connected_oauth"] == ["google", "telegram"]

    @patch("routers.auth.get_db")
    async def test_update_me(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.execute = AsyncMock()

        current_user = {"id": 42}
        result = await update_me({"username": "newname", "avatar_url": "http://img.com/a.png"}, current_user)
        assert result["message"] == "Profile updated"

    async def test_update_me_no_valid_fields(self):
        current_user = {"id": 42}
        with pytest.raises(HTTPException) as exc_info:
            await update_me({"password": "newpass"}, current_user)
        assert exc_info.value.status_code == 400

    @patch("routers.auth.get_db")
    async def test_logout(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.execute = AsyncMock()

        token = create_access_token(42)
        from fastapi.security import HTTPAuthorizationCredentials
        creds = HTTPAuthorizationCredentials(scheme="Bearer", credentials=token)

        result = await logout(credentials=creds)
        assert result["message"] == "Logged out"

    async def test_logout_no_creds(self):
        result = await logout()
        assert result["message"] == "Logged out"


@pytest.mark.asyncio
class TestChangePassword:
    @patch("routers.auth.get_db")
    async def test_change_password_success(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"password_hash": bcrypt.hashpw("oldpass".encode(), bcrypt.gensalt()).decode()}])
        mock_db.execute = AsyncMock()

        from routers.auth import PasswordChangeRequest
        req = PasswordChangeRequest(old_password="oldpass", new_password="newpass123")
        current_user = {"id": 42}

        result = await change_password(req, current_user)
        assert result["message"] == "Password updated successfully"

    @patch("routers.auth.get_db")
    async def test_change_password_wrong_old(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"password_hash": bcrypt.hashpw("oldpass".encode(), bcrypt.gensalt()).decode()}])

        from routers.auth import PasswordChangeRequest
        req = PasswordChangeRequest(old_password="wrongpass", new_password="newpass123")
        current_user = {"id": 42}

        with pytest.raises(HTTPException) as exc_info:
            await change_password(req, current_user)
        assert exc_info.value.status_code == 401

    @patch("routers.auth.get_db")
    async def test_change_password_oauth_only(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"password_hash": None}])

        from routers.auth import PasswordChangeRequest
        req = PasswordChangeRequest(old_password="oldpass", new_password="newpass123")
        current_user = {"id": 42}

        with pytest.raises(HTTPException) as exc_info:
            await change_password(req, current_user)
        assert exc_info.value.status_code == 400

    @patch("routers.auth.get_db")
    async def test_change_password_too_short(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"password_hash": bcrypt.hashpw("oldpass".encode(), bcrypt.gensalt()).decode()}])

        from routers.auth import PasswordChangeRequest
        req = PasswordChangeRequest(old_password="oldpass", new_password="short")
        current_user = {"id": 42}

        with pytest.raises(HTTPException) as exc_info:
            await change_password(req, current_user)
        assert exc_info.value.status_code == 400
