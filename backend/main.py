"""
Mirkaso API
Precision in Investment Management
"""
import logging
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from contextlib import asynccontextmanager
import re as re_module

from middleware import limiter, _rate_limit_exceeded_handler, RateLimitExceeded, SecurityHeadersMiddleware

# Setup logging
logging.basicConfig(level=logging.INFO)
print("DEBUG: main.py loaded - version with change percentages")
logger = logging.getLogger(__name__)

# Импорт роутеров и scheduler
from routers import market
from routers.auth import router as auth_router
from routers.fundamentals import router as fundamentals_router
from routers.telegram import router as telegram_router
from routers.admin import router as admin_router
from routers.etf import router as etf_router
from routers.scanner import router as scanner_router
from routers.payments import router as payments_router
from routers.portfolio import router as portfolio_router
from routers.macro import router as macro_router
from routers.yield_curve import router as yield_curve_router
from routers.newsletter import router as newsletter_router
from routers.risk_parity import router as risk_parity_router
from routers.crypto_metrics import router as crypto_metrics_router
from routers.position_calc import router as position_calc_router
from scheduler import start_scheduler, stop_scheduler

# Глобальная переменная для scheduler
scheduler = None

async def init_database():
    """Initialize database schema"""
    try:
        from database import get_db
        db = get_db()
        
        await db.connect()
        
        # Read and execute main schema.sql
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        if os.path.exists(schema_path):
            with open(schema_path, 'r') as f:
                schema_sql = f.read()
            await db._pool.execute(schema_sql)
            logger.info("Main database schema initialized")
        
        # Read and execute auth schema
        auth_schema_path = os.path.join(os.path.dirname(__file__), 'schema_auth.sql')
        if os.path.exists(auth_schema_path):
            with open(auth_schema_path, 'r') as f:
                auth_schema_sql = f.read()
            await db._pool.execute(auth_schema_sql)
            logger.info("Auth database schema initialized")
        
        # Read and execute fundamentals schema
        fundamentals_schema_path = os.path.join(os.path.dirname(__file__), 'schema_fundamentals.sql')
        if os.path.exists(fundamentals_schema_path):
            with open(fundamentals_schema_path, 'r') as f:
                fundamentals_schema_sql = f.read()
            await db._pool.execute(fundamentals_schema_sql)
            logger.info("Fundamentals database schema initialized")
        
        await db.close()
        logger.info("Database schema initialized successfully")
    except Exception as e:
        logger.error(f"Failed to init database: {e}")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    global scheduler
    logger.info("Starting OI Dashboard API...")
    
    # Initialize database schema
    await init_database()
    
    # Запускаем scheduler
    scheduler = start_scheduler()
    
    # Первоначальное сохранение OI
    from scheduler import save_oi_snapshot, should_run_fundamentals, save_fundamentals_snapshot
    await save_oi_snapshot()
    
    # Первоначальный сбор фундаменталок
    try:
        logger.info("Triggering initial fundamentals collection on startup...")
        await save_fundamentals_snapshot()
    except Exception as e:
        logger.error(f"Failed to run fundamentals on startup: {e}")
    
    # Первоначальный сбор ETF данных
    try:
        from scheduler import save_etf_snapshot
        logger.info("Triggering initial ETF collection on startup...")
        await save_etf_snapshot()
    except Exception as e:
        logger.error(f"Failed to run ETF snapshot on startup: {e}")
    
    # Первоначальный скан аномалий
    try:
        from scheduler import run_anomaly_scan
        logger.info("Triggering initial anomaly scan on startup...")
        await run_anomaly_scan()
    except Exception as e:
        logger.error(f"Failed to run initial anomaly scan on startup: {e}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    stop_scheduler(scheduler)

app = FastAPI(
    title="Mirkaso API",
    description="Precision in Investment Management",
    version="2.0.0",
    lifespan=lifespan
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Security headers middleware
app.add_middleware(SecurityHeadersMiddleware)

# CORS configuration — allow all Vercel preview deployments + local dev
_default_origins = [
    "http://localhost:3000",
    "https://mirkaso.com",
    "https://www.mirkaso.com",
    "https://crypto-signals.vercel.app",
    "https://crypto-signals-chi.vercel.app",
]

_additional = os.getenv("ADDITIONAL_CORS_ORIGINS", "")
if _additional:
    for o in _additional.split(","):
        o = o.strip()
        if o and o not in _default_origins:
            _default_origins.append(o)

logger.info(f"CORS configured: origins={_default_origins}")

# Custom CORS middleware that guarantees headers on EVERY response (including errors)
class GuaranteedCORS:
    def __init__(self, app, allowed_origins, allowed_regex=None):
        self.app = app
        self.allowed_origins = set(allowed_origins)
        self.allowed_regex = re_module.compile(allowed_regex) if allowed_regex else None

    def _is_allowed(self, origin: str) -> bool:
        if not origin:
            return False
        if origin in self.allowed_origins:
            return True
        if self.allowed_regex and self.allowed_regex.match(origin):
            return True
        return False

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        origin = ""
        for key, value in scope.get("headers", []):
            if key.lower() == b"origin":
                origin = value.decode("latin-1")
                break

        allowed = self._is_allowed(origin)

        async def wrapped_send(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                # Only inject CORS if headers aren't already present (preserve CORSMiddleware output)
                has_cors_origin = any(h[0].lower() == b"access-control-allow-origin" for h in headers)
                if allowed and not has_cors_origin:
                    headers.append((b"access-control-allow-origin", origin.encode("latin-1")))
                    headers.append((b"access-control-allow-credentials", b"true"))
                    headers.append((b"vary", b"Origin"))
                # Ensure OPTIONS preflights always get method/header allowances
                has_cors_methods = any(h[0].lower() == b"access-control-allow-methods" for h in headers)
                if not has_cors_methods:
                    headers.append((b"access-control-allow-methods", b"GET, POST, PUT, DELETE, OPTIONS, PATCH"))
                    headers.append((b"access-control-allow-headers", b"*"))
                    headers.append((b"access-control-max-age", b"86400"))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, wrapped_send)
        except Exception as exc:
            # If the app raised before sending a response, send a 500 with CORS headers
            logger.exception(f"GuaranteedCORS caught unhandled exception: {exc}")
            headers = [
                (b"content-type", b"application/json"),
                (b"access-control-allow-methods", b"GET, POST, PUT, DELETE, OPTIONS, PATCH"),
                (b"access-control-allow-headers", b"*"),
                (b"access-control-max-age", b"86400"),
            ]
            if allowed:
                headers.append((b"access-control-allow-origin", origin.encode("latin-1")))
                headers.append((b"access-control-allow-credentials", b"true"))
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": headers,
            })
            await send({
                "type": "http.response.body",
                "body": b'{"detail":"Internal server error"}',
            })

app.add_middleware(GuaranteedCORS, allowed_origins=_default_origins, allowed_regex=r"https://.*\.vercel\.app")

# Keep FastAPI CORS for normal request handling
app.add_middleware(
    CORSMiddleware,
    allow_origins=_default_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=86400,
)

# Подключаем роутеры
app.include_router(market.router)
app.include_router(auth_router)
app.include_router(fundamentals_router)
app.include_router(telegram_router)
app.include_router(admin_router)
app.include_router(etf_router)
app.include_router(scanner_router)
app.include_router(payments_router)
app.include_router(portfolio_router)
app.include_router(macro_router)
app.include_router(yield_curve_router)
app.include_router(newsletter_router)
app.include_router(risk_parity_router)
app.include_router(crypto_metrics_router)
app.include_router(position_calc_router)

# ============= Health Check =============
@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "2.0.0",
        "service": "oi-dashboard"
    }

# ============= Root =============
@app.get("/")
async def root():
    """Root endpoint with API info"""
    return {
        "name": "Mirkaso API",
        "version": "2.0.0",
        "endpoints": {
            "market": {
                "oi": "/api/v1/market/oi/{symbol}?timeframe=1h",
                "checklist": "/api/v1/market/checklist/{symbol}?timeframe=1h",
                "cvd": "/api/v1/market/cvd/{symbol}",
                "profile": "/api/v1/market/profile/{symbol}",
                "levels": "/api/v1/market/levels/{symbol}?timeframe=1h"
            }
        }
    }

# Force rebuild - Sun Apr 12 09:40:50 CEST 2026
# Cache bust: Sun Apr 12 10:56:13 CEST 2026
