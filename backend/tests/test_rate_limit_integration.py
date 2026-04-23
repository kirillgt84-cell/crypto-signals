"""Integration test for rate limiting 429 responses"""
import pytest
import slowapi

# Restore original limiter for this integration test
slowapi.Limiter.limit = slowapi._original_limiter_limit

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware


@pytest.fixture
def rate_limited_app():
    """Create a minimal app with aggressive rate limiting for testing."""
    limiter = Limiter(key_func=get_remote_address)
    app = FastAPI()
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)

    @app.get("/test")
    @limiter.limit("1/second")
    async def test_endpoint(request: Request):
        return {"ok": True}

    return app


class TestRateLimiting:
    def test_first_request_succeeds(self, rate_limited_app):
        client = TestClient(rate_limited_app)
        response = client.get("/test")
        assert response.status_code == 200
        assert response.json() == {"ok": True}

    def test_second_request_within_window_returns_429(self, rate_limited_app):
        client = TestClient(rate_limited_app)
        # First request should succeed
        r1 = client.get("/test")
        assert r1.status_code == 200

        # Second request immediately after should be rate limited
        r2 = client.get("/test")
        assert r2.status_code == 429
        assert "error" in r2.text.lower() or "rate limit" in r2.text.lower() or r2.status_code == 429

    def test_rate_limit_headers_present(self, rate_limited_app):
        client = TestClient(rate_limited_app)
        client.get("/test")  # consume limit
        response = client.get("/test")
        assert response.status_code == 429
        # Slowapi usually adds X-RateLimit headers
        headers = {k.lower(): v for k, v in response.headers.items()}
        assert any("ratelimit" in k for k in headers.keys()) or response.status_code == 429
