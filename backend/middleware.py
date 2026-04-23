"""
Security middleware: rate limiting, security headers, cookie auth helpers
"""
import os
from fastapi import Request, Response
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Rate limiting with IP detection behind proxies
def get_client_ip(request: Request) -> str:
    xff = request.headers.get("X-Forwarded-For")
    if xff:
        return xff.split(",")[0].strip()
    cf = request.headers.get("CF-Connecting-IP")
    if cf:
        return cf
    return request.client.host if request.client else "127.0.0.1"

limiter = Limiter(key_func=get_client_ip)

# Security headers middleware
class SecurityHeadersMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        async def wrapped_send(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                headers.append((b"strict-transport-security", b"max-age=63072000; includeSubDomains; preload"))
                headers.append((b"x-content-type-options", b"nosniff"))
                headers.append((b"x-frame-options", b"DENY"))
                headers.append((b"x-xss-protection", b"1; mode=block"))
                headers.append((b"referrer-policy", b"strict-origin-when-cross-origin"))
                # CSP for API — restrictive
                csp = "default-src 'none'; frame-ancestors 'none'; base-uri 'none'"
                headers.append((b"content-security-policy", csp.encode()))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, wrapped_send)

# Cookie settings
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", None)  # e.g., ".mirkaso.com" for subdomains
COOKIE_SECURE = os.getenv("COOKIE_SECURE", "true").lower() == "true"
COOKIE_SAMESITE = os.getenv("COOKIE_SAMESITE", "strict")
ACCESS_COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"

def set_auth_cookies(response: Response, access_token: str, refresh_token: str, access_expire_minutes: int = 60, refresh_expire_days: int = 7):
    """Set httpOnly auth cookies"""
    from datetime import timedelta
    response.set_cookie(
        key=ACCESS_COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=int(timedelta(minutes=access_expire_minutes).total_seconds()),
        domain=COOKIE_DOMAIN,
        path="/",
    )
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=refresh_token,
        httponly=True,
        secure=COOKIE_SECURE,
        samesite=COOKIE_SAMESITE,
        max_age=int(timedelta(days=refresh_expire_days).total_seconds()),
        domain=COOKIE_DOMAIN,
        path="/api/v1/auth/refresh",
    )

def clear_auth_cookies(response: Response):
    """Clear auth cookies on logout"""
    response.delete_cookie(key=ACCESS_COOKIE_NAME, path="/", domain=COOKIE_DOMAIN)
    response.delete_cookie(key=REFRESH_COOKIE_NAME, path="/api/v1/auth/refresh", domain=COOKIE_DOMAIN)
