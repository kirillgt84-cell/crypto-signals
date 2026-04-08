from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import database as db
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    await db.get_db().connect()
    yield
    await db.get_db().close()

app = FastAPI(
    title="SignalStream API",
    description="Crypto trading signals and paper trading API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS for all origins (configure for production)
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# ============= Health =============
@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}

# ============= Signals =============
class SignalCreate(BaseModel):
    symbol: str
    direction: str  # 'long' or 'short'
    entry_price: float
    target_price: float
    stop_price: float
    confidence: int

@app.get("/api/v1/signals")
async def get_signals():
    """Get all active trading signals"""
    return await db.get_active_signals()

@app.post("/api/v1/signals")
async def create_signal(signal: SignalCreate):
    """Create a new trading signal"""
    signal_id = await db.create_signal(
        symbol=signal.symbol,
        direction=signal.direction,
        entry_price=signal.entry_price,
        target_price=signal.target_price,
        stop_price=signal.stop_price,
        confidence=signal.confidence
    )
    if not signal_id:
        raise HTTPException(status_code=500, detail="Failed to create signal")
    return {"id": signal_id, "message": "Signal created successfully"}

@app.patch("/api/v1/signals/{signal_id}")
async def update_signal(signal_id: int, status: str):
    """Update signal status (active/closed/cancelled)"""
    await db.update_signal_status(signal_id, status)
    return {"message": f"Signal {signal_id} updated to {status}"}

# ============= Paper Trading Accounts =============
@app.post("/api/v1/paper/accounts")
async def create_account(user_id: int, symbol: str, initial_balance: float = 10000.0):
    """Create a new paper trading account"""
    account_id = await db.create_paper_account(user_id, symbol, initial_balance)
    if not account_id:
        raise HTTPException(status_code=500, detail="Failed to create account")
    return {
        "id": account_id, 
        "user_id": user_id,
        "symbol": symbol,
        "balance": initial_balance,
        "initial_balance": initial_balance
    }

@app.get("/api/v1/paper/accounts/{account_id}")
async def get_account(account_id: int):
    """Get account details"""
    account = await db.get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account

@app.get("/api/v1/paper/accounts/{account_id}/stats")
async def get_stats(account_id: int):
    """Get comprehensive account statistics"""
    # Check if account exists
    account = await db.get_account(account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    stats = await db.get_account_stats(account_id)
    balance = await db.get_account_balance(account_id)
    
    return {
        **stats,
        "balance": balance,
        "initial_balance": account["initial_balance"],
        "total_return_pct": round(((balance - account["initial_balance"]) / account["initial_balance"] * 100), 2) if account["initial_balance"] > 0 else 0
    }

# ============= Paper Trades =============
class TradeCreate(BaseModel):
    account_id: int
    signal_id: int
    symbol: str
    direction: str
    entry_price: float
    quantity: float

class TradeClose(BaseModel):
    exit_price: float

@app.post("/api/v1/paper/trades")
async def create_trade(trade: TradeCreate):
    """Open a new paper trade"""
    # Verify account exists
    account = await db.get_account(trade.account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    
    trade_id = await db.create_paper_trade(
        account_id=trade.account_id,
        signal_id=trade.signal_id,
        symbol=trade.symbol,
        direction=trade.direction,
        entry_price=trade.entry_price,
        quantity=trade.quantity
    )
    if not trade_id:
        raise HTTPException(status_code=500, detail="Failed to create trade")
    
    return {
        "id": trade_id,
        "account_id": trade.account_id,
        "symbol": trade.symbol,
        "direction": trade.direction,
        "status": "open"
    }

@app.get("/api/v1/paper/accounts/{account_id}/trades")
async def get_open_trades(account_id: int):
    """Get all open trades for an account"""
    trades = await db.get_open_trades(account_id)
    return {"trades": trades, "count": len(trades)}

@app.post("/api/v1/paper/trades/{trade_id}/close")
async def close_trade(trade_id: int, close_data: TradeClose):
    """Close a paper trade with PnL calculation"""
    pnl = await db.close_paper_trade(trade_id, close_data.exit_price)
    if pnl is None:
        raise HTTPException(status_code=404, detail="Trade not found or already closed")
    
    return {
        "trade_id": trade_id,
        "exit_price": close_data.exit_price,
        "pnl": round(pnl, 2),
        "status": "closed"
    }

@app.get("/api/v1/paper/accounts/{account_id}/trades/history")
async def get_trade_history(account_id: int, limit: int = 10):
    """Get recent closed trades"""
    trades = await db.get_recent_trades(account_id, limit)
    return {"trades": trades, "count": len(trades)}

# ============= Demo/Data endpoints =============
@app.post("/api/v1/demo/seed")
async def seed_demo_data():
    """Seed demo data for testing"""
    # Create demo account
    account_id = await db.create_paper_account(1, "BTC/USDT", 10000.0)
    
    # Create demo signals
    signals = [
        ("BTC/USDT", "long", 67450, 68950, 66700, 72),
        ("ETH/USDT", "short", 3520, 3400, 3580, 65),
        ("SOL/USDT", "long", 145, 158, 138, 68),
    ]
    
    created_signals = []
    for s in signals:
        sid = await db.create_signal(*s)
        created_signals.append(sid)
    
    return {
        "message": "Demo data created",
        "account_id": account_id,
        "signals_created": len(created_signals)
    }
