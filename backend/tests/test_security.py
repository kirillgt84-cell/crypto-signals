"""Security tests: cookies, headers, rate limiting"""
import pytest
from datetime import timedelta


class TestAuthCookies:
    def test_set_auth_cookies_attributes(self):
        from middleware import set_auth_cookies, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME
        from fastapi import Response

        response = Response()
        set_auth_cookies(response, "access_token_xyz", "refresh_token_abc", 60, 7)

        # Parse set-cookie headers
        raw_cookies = response.raw_headers
        cookie_list = [v.decode() for k, v in raw_cookies if k.lower() == b"set-cookie"]
        assert len(cookie_list) == 2

        access_cookie = next(c for c in cookie_list if c.startswith(ACCESS_COOKIE_NAME))
        refresh_cookie = next(c for c in cookie_list if c.startswith(REFRESH_COOKIE_NAME))

        # access_token cookie checks
        assert "access_token_xyz" in access_cookie
        assert "httponly" in access_cookie.lower()
        assert "secure" in access_cookie.lower()
        assert "samesite=strict" in access_cookie.lower()
        assert "path=/" in access_cookie.lower()
        assert "max-age=" in access_cookie.lower()

        # refresh_token cookie checks
        assert "refresh_token_abc" in refresh_cookie
        assert "httponly" in refresh_cookie.lower()
        assert "secure" in refresh_cookie.lower()
        assert "samesite=strict" in refresh_cookie.lower()
        assert "path=/api/v1/auth/refresh" in refresh_cookie.lower()

    def test_clear_auth_cookies(self):
        from middleware import clear_auth_cookies, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME
        from fastapi import Response

        response = Response()
        clear_auth_cookies(response)

        raw_cookies = response.raw_headers
        cookie_list = [v.decode() for k, v in raw_cookies if k.lower() == b"set-cookie"]
        assert len(cookie_list) == 2

        access_cookie = next(c for c in cookie_list if c.startswith(ACCESS_COOKIE_NAME))
        refresh_cookie = next(c for c in cookie_list if c.startswith(REFRESH_COOKIE_NAME))

        # Cookies should be expired (max-age=0 or expires in past)
        assert "max-age=0" in access_cookie.lower() or "expires=" in access_cookie.lower()

    def test_set_auth_cookies_max_age(self):
        from middleware import set_auth_cookies, ACCESS_COOKIE_NAME
        from fastapi import Response

        response = Response()
        set_auth_cookies(response, "a", "r", 30, 14)

        raw_cookies = response.raw_headers
        cookie_list = [v.decode() for k, v in raw_cookies if k.lower() == b"set-cookie"]
        access_cookie = next(c for c in cookie_list if c.startswith(ACCESS_COOKIE_NAME))

        # 30 minutes = 1800 seconds
        assert "max-age=1800" in access_cookie.lower()


class TestSecurityHeadersMiddleware:
    @pytest.mark.asyncio
    async def test_security_headers_on_response(self):
        from middleware import SecurityHeadersMiddleware

        async def mock_app(scope, receive, send):
            await send({"type": "http.response.start", "status": 200, "headers": []})
            await send({"type": "http.response.body", "body": b"ok"})

        middleware = SecurityHeadersMiddleware(mock_app)
        messages = []

        async def capture_send(message):
            messages.append(message)

        await middleware({"type": "http"}, None, capture_send)

        start_msg = messages[0]
        headers = {k.decode().lower(): v.decode() for k, v in start_msg["headers"]}

        assert headers.get("strict-transport-security") == "max-age=63072000; includeSubDomains; preload"
        assert headers.get("x-content-type-options") == "nosniff"
        assert headers.get("x-frame-options") == "DENY"
        assert headers.get("x-xss-protection") == "1; mode=block"
        assert headers.get("referrer-policy") == "strict-origin-when-cross-origin"
        assert "content-security-policy" in headers
        assert "default-src 'none'" in headers["content-security-policy"]
        assert "frame-ancestors 'none'" in headers["content-security-policy"]

    @pytest.mark.asyncio
    async def test_security_headers_non_http_scope_ignored(self):
        from middleware import SecurityHeadersMiddleware

        async def mock_app(scope, receive, send):
            await send({"type": "websocket.accept"})

        middleware = SecurityHeadersMiddleware(mock_app)
        messages = []

        async def capture_send(message):
            messages.append(message)

        await middleware({"type": "websocket"}, None, capture_send)
        # Should not add security headers to websocket
        assert len(messages) == 1


class TestRateLimiterConfig:
    def test_rate_limiter_has_limiter(self):
        from middleware import limiter
        assert limiter is not None

    def test_get_client_ip_x_forwarded_for(self):
        from middleware import get_client_ip
        from starlette.requests import Request

        request = Request({
            "type": "http",
            "headers": [(b"x-forwarded-for", b"1.2.3.4, 5.6.7.8")],
        })
        assert get_client_ip(request) == "1.2.3.4"

    def test_get_client_ip_cf_connecting_ip(self):
        from middleware import get_client_ip
        from starlette.requests import Request

        request = Request({
            "type": "http",
            "headers": [
                (b"cf-connecting-ip", b"9.8.7.6"),
            ],
        })
        assert get_client_ip(request) == "9.8.7.6"

    def test_get_client_ip_fallback(self):
        from middleware import get_client_ip
        from starlette.requests import Request

        request = Request({
            "type": "http",
            "headers": [],
            "client": ("127.0.0.1", 12345),
        })
        assert get_client_ip(request) == "127.0.0.1"
