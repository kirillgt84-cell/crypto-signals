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
logger = logging.getLogger(__name__)

# Импорт роутеров и scheduler
from routers import market
from scheduler import start_scheduler, stop_scheduler

# Глобальная переменная для scheduler
scheduler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown"""
    global scheduler
    logger.info("Starting OI Dashboard API...")
    
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
