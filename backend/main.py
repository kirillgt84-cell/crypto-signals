from fastapi import FastAPI
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

app = FastAPI(lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
async def health(): return {"status": "ok"}

@app.get("/api/v1/signals")
async def get_signals(): return await db.get_active_signals()

@app.post("/api/v1/paper/accounts")
async def create_account(user_id: int, symbol: str, initial_balance: float = 10000.0):
    account_id = await db.create_paper_account(user_id, symbol, initial_balance)
    return {"id": account_id, "balance": initial_balance}

@app.get("/api/v1/paper/accounts/{account_id}/stats")
async def get_stats(account_id: int):
    stats = await db.get_account_stats(account_id)
    balance = await db.get_account_balance(account_id)
    return {**stats, "balance": balance}
