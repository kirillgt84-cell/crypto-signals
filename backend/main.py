"""
SignalStream OI Dashboard API
Аналитика Open Interest и рыночных данных
"""
import logging
import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from contextlib import asynccontextmanager
import re as re_module

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
    
    yield
    
    # Shutdown
    logger.info("Shutting down...")
    stop_scheduler(scheduler)

app = FastAPI(
    title="SignalStream OI Dashboard",
    description="Аналитика Open Interest и рыночных данных для трейдинга",
    version="2.0.0",
    lifespan=lifespan
)

# CORS configuration
_default_origins = {
    "http://localhost:3000",
    "https://crypto-signals.vercel.app",
}

_additional = os.getenv("ADDITIONAL_CORS_ORIGINS", "")
if _additional:
    for o in _additional.split(","):
        o = o.strip()
        if o:
            _default_origins.add(o)

_cors_patterns = [
    re_module.compile(r"https://crypto-signals[-\w]+\.vercel\.app"),
    re_module.compile(r"https://[\w-]+-chi\.vercel\.app"),
    re_module.compile(r"https://[\w-]+\.vercel\.app"),
]

logger.info(f"CORS configured: origins={list(_default_origins)}")


class CustomCORSMiddleware:
    """Reliable CORS middleware that always mirrors the origin when matched"""
    def __init__(self, app, allow_origins: set, allow_patterns: list):
        self.app = app
        self.allow_origins = allow_origins
        self.allow_patterns = allow_patterns

    def _is_allowed(self, origin: str) -> bool:
        if origin in self.allow_origins:
            return True
        for pat in self.allow_patterns:
            if pat.match(origin):
                return True
        return False

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        headers = dict(scope.get("headers", []))
        origin_bytes = headers.get(b"origin")
        origin = origin_bytes.decode("utf-8") if origin_bytes else None
        method = scope.get("method", "GET")

        if origin and self._is_allowed(origin):
            if method == "OPTIONS":
                # Preflight response
                await send({
                    "type": "http.response.start",
                    "status": 200,
                    "headers": [
                        [b"access-control-allow-origin", origin.encode("utf-8")],
                        [b"access-control-allow-credentials", b"true"],
                        [b"access-control-allow-methods", b"GET, POST, PUT, DELETE, OPTIONS, PATCH"],
                        [b"access-control-allow-headers", b"*"],
                        [b"access-control-max-age", b"86400"],
                        [b"vary", b"Origin"],
                    ],
                })
                await send({"type": "http.response.body", "body": b""})
                return

            # Normal request: wrap send to inject headers
            async def wrapped_send(message):
                if message["type"] == "http.response.start":
                    orig_headers = list(message.get("headers", []))
                    new_headers = [
                        [b"access-control-allow-origin", origin.encode("utf-8")],
                        [b"access-control-allow-credentials", b"true"],
                        [b"access-control-expose-headers", b"*"],
                        [b"vary", b"Origin"],
                    ]
                    message["headers"] = orig_headers + new_headers
                await send(message)

            await self.app(scope, receive, wrapped_send)
            return

        await self.app(scope, receive, send)


app.add_middleware(CustomCORSMiddleware, allow_origins=_default_origins, allow_patterns=_cors_patterns)

# Подключаем роутеры
app.include_router(market.router)
app.include_router(auth_router)
app.include_router(fundamentals_router)
app.include_router(telegram_router)
app.include_router(admin_router)
app.include_router(etf_router)

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
        "name": "SignalStream OI Dashboard",
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
