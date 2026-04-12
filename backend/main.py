"""
SignalStream OI Dashboard API
Аналитика Open Interest и рыночных данных
"""
import logging
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from contextlib import asynccontextmanager

# Setup logging
logging.basicConfig(level=logging.INFO)
print("DEBUG: main.py loaded - version with change percentages")
logger = logging.getLogger(__name__)

# Импорт роутеров и scheduler
from routers import market
from scheduler import start_scheduler, stop_scheduler

# Глобальная переменная для scheduler
scheduler = None

async def init_database():
    """Initialize database schema"""
    try:
        from database import get_db
        db = get_db()
        
        # Read schema.sql
        schema_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        if os.path.exists(schema_path):
            with open(schema_path, 'r') as f:
                schema_sql = f.read()
            
            # Execute schema
            await db.connect()
            await db._pool.execute(schema_sql)
            await db.close()
            logger.info("Database schema initialized successfully")
        else:
            logger.warning("schema.sql not found, skipping DB init")
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
    from scheduler import save_oi_snapshot
    await save_oi_snapshot()
    
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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Подключаем роутеры
app.include_router(market.router)

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
