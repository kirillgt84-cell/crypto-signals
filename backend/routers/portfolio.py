"""
Portfolio router: Binance API connection, sync, manual assets, models, deviation.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from database import get_db
from routers.auth import get_current_user
from services.portfolio_crypto import encrypt, decrypt
from services.portfolio_sync import sync_user_portfolio, get_portfolio_summary
from fetchers.binance_portfolio import BinancePortfolioFetcher
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/portfolio", tags=["portfolio"])


# ============= MODELS =============

class ConnectBinanceRequest(BaseModel):
    api_key: str
    api_secret: str
    label: Optional[str] = "Binance Futures"


class ManualAssetRequest(BaseModel):
    asset_symbol: str
    amount: float
    avg_entry_price: float
    current_price: Optional[float] = None
    side: str = "LONG"


class UserCategoryRequest(BaseModel):
    name: str
    color: Optional[str] = "#6366f1"


class AssignCategoryRequest(BaseModel):
    asset_symbol: str
    user_category_id: Optional[int] = None
    system_category_id: Optional[int] = None


class SelectModelRequest(BaseModel):
    model_id: int


# ============= HELPERS =============

async def _get_user_source(user_id: int, provider: str = "binance") -> Optional[dict]:
    db = get_db()
    rows = await db.query(
        "SELECT * FROM account_sources WHERE user_id = $1 AND provider = $2 AND is_active = TRUE LIMIT 1",
        [user_id, provider],
    )
    return dict(rows[0]) if rows else None


# ============= CONNECT / DISCONNECT =============

@router.post("/connect/binance")
async def connect_binance(req: ConnectBinanceRequest, current_user: dict = Depends(get_current_user)):
    """Save encrypted Binance API credentials and test connection."""
    # Test connection first
    fetcher = BinancePortfolioFetcher(req.api_key, req.api_secret)
    try:
        await fetcher.get_account()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid API credentials or insufficient permissions: {e}")
    finally:
        await fetcher.close()

    db = get_db()
    # Deactivate old source
    await db.execute(
        "UPDATE account_sources SET is_active = FALSE WHERE user_id = $1 AND provider = 'binance'",
        [current_user["id"]],
    )
    # Insert new
    await db.execute(
        """INSERT INTO account_sources (user_id, type, provider, label, api_key_encrypted, api_secret_encrypted, is_active)
           VALUES ($1, 'cex', 'binance', $2, $3, $4, TRUE)""",
        [current_user["id"], req.label, encrypt(req.api_key), encrypt(req.api_secret)],
    )
    return {"message": "Binance connected successfully"}


@router.delete("/disconnect/binance")
async def disconnect_binance(current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.execute(
        "UPDATE account_sources SET is_active = FALSE WHERE user_id = $1 AND provider = 'binance'",
        [current_user["id"]],
    )
    return {"message": "Binance disconnected"}


# ============= SYNC =============

@router.post("/sync")
async def sync_portfolio(current_user: dict = Depends(get_current_user)):
    """Manually trigger portfolio sync."""
    result = await sync_user_portfolio(current_user["id"])
    return result


# ============= PORTFOLIO DATA =============

@router.get("/summary")
async def portfolio_summary(current_user: dict = Depends(get_current_user)):
    """Get latest portfolio summary."""
    return await get_portfolio_summary(current_user["id"])


@router.get("/history")
async def portfolio_history(current_user: dict = Depends(get_current_user)):
    """Get portfolio value history."""
    db = get_db()
    rows = await db.query(
        "SELECT * FROM portfolio_history WHERE user_id = $1 ORDER BY date DESC LIMIT 90",
        [current_user["id"]],
    )
    return [dict(r) for r in rows]


# ============= MANUAL ASSETS =============

@router.post("/manual/assets")
async def add_manual_asset(req: ManualAssetRequest, current_user: dict = Depends(get_current_user)):
    """Add or update a manual portfolio asset."""
    db = get_db()
    # Get or create manual source
    source = await db.query(
        "SELECT id FROM account_sources WHERE user_id = $1 AND provider = 'manual' LIMIT 1",
        [current_user["id"]],
    )
    if not source:
        src = await db.query(
            """INSERT INTO account_sources (user_id, type, provider, label, is_active)
               VALUES ($1, 'manual', 'manual', 'Manual Portfolio', TRUE) RETURNING id""",
            [current_user["id"]],
        )
        source_id = src[0]["id"]
    else:
        source_id = source[0]["id"]

    price = req.current_price or req.avg_entry_price
    notional = req.amount * price
    pnl = (price - req.avg_entry_price) * req.amount
    pnl_pct = ((price - req.avg_entry_price) / req.avg_entry_price * 100) if req.avg_entry_price > 0 else 0

    await db.execute(
        """INSERT INTO portfolio_assets
           (user_id, source_id, asset_symbol, asset_name, amount, avg_entry_price, current_price,
            unrealized_pnl, unrealized_pnl_pct, notional, side, sync_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'manual')
           ON CONFLICT DO NOTHING""",
        [current_user["id"], source_id, req.asset_symbol.upper(), req.asset_symbol.upper(),
         req.amount, req.avg_entry_price, price, pnl, pnl_pct, notional, req.side],
    )
    return {"message": "Asset added"}


@router.delete("/manual/assets/{symbol}")
async def remove_manual_asset(symbol: str, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.execute(
        "DELETE FROM portfolio_assets WHERE user_id = $1 AND asset_symbol = $2 AND sync_id = 'manual'",
        [current_user["id"], symbol.upper()],
    )
    return {"message": "Asset removed"}


# ============= CATEGORIES =============

@router.get("/categories")
async def list_categories(current_user: dict = Depends(get_current_user)):
    db = get_db()
    system = await db.query("SELECT * FROM categories WHERE is_active = TRUE ORDER BY name", [])
    user_cats = await db.query("SELECT * FROM user_categories WHERE user_id = $1 ORDER BY name", [current_user["id"]])
    return {"system": [dict(r) for r in system], "user": [dict(r) for r in user_cats]}


@router.post("/categories/user")
async def create_user_category(req: UserCategoryRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.execute(
        "INSERT INTO user_categories (user_id, name, color) VALUES ($1, $2, $3) ON CONFLICT (user_id, name) DO NOTHING",
        [current_user["id"], req.name, req.color],
    )
    return {"message": "Category created"}


@router.post("/categories/assign")
async def assign_category(req: AssignCategoryRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.execute(
        """INSERT INTO asset_categories (user_id, asset_symbol, system_category_id, user_category_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id, asset_symbol) DO UPDATE SET
             system_category_id = EXCLUDED.system_category_id,
             user_category_id = EXCLUDED.user_category_id""",
        [current_user["id"], req.asset_symbol.upper(), req.system_category_id, req.user_category_id],
    )
    return {"message": "Category assigned"}


# ============= MODELS =============

@router.get("/models")
async def list_models():
    db = get_db()
    rows = await db.query("SELECT * FROM portfolio_models WHERE is_active = TRUE", [])
    models = []
    for r in rows:
        model = dict(r)
        allocs = await db.query(
            "SELECT m.*, c.name as category_name FROM portfolio_model_allocations m JOIN categories c ON c.id = m.category_id WHERE model_id = $1",
            [r["id"]],
        )
        model["allocations"] = [dict(a) for a in allocs]
        models.append(model)
    return models


@router.post("/models/select")
async def select_model(req: SelectModelRequest, current_user: dict = Depends(get_current_user)):
    db = get_db()
    await db.execute(
        """INSERT INTO user_portfolio_settings (user_id, selected_model_id)
           VALUES ($1, $2)
           ON CONFLICT (user_id) DO UPDATE SET selected_model_id = EXCLUDED.selected_model_id""",
        [current_user["id"], req.model_id],
    )
    return {"message": "Model selected"}


@router.get("/models/deviation")
async def get_deviation(current_user: dict = Depends(get_current_user)):
    """Compare current allocation vs selected model targets."""
    db = get_db()
    settings = await db.query(
        "SELECT selected_model_id FROM user_portfolio_settings WHERE user_id = $1",
        [current_user["id"]],
    )
    if not settings or not settings[0].get("selected_model_id"):
        raise HTTPException(status_code=400, detail="No model selected")

    model_id = settings[0]["selected_model_id"]
    targets = await db.query(
        "SELECT category_id, target_weight FROM portfolio_model_allocations WHERE model_id = $1",
        [model_id],
    )
    target_map = {t["category_id"]: float(t["target_weight"]) for t in targets}

    summary = await get_portfolio_summary(current_user["id"])
    total = summary.get("total_notional", 0)

    deviations = []
    for cat_name, data in summary.get("categories", {}).items():
        current_weight = (data.get("notional", 0) / total * 100) if total > 0 else 0
        # Find category ID from name
        cat_row = await db.query("SELECT id FROM categories WHERE name = $1 LIMIT 1", [cat_name])
        target = 0
        if cat_row:
            target = target_map.get(cat_row[0]["id"], 0)
        delta = current_weight - target
        status = "ok"
        if abs(delta) > 10:
            status = "critical"
        elif abs(delta) > 5:
            status = "warning"
        deviations.append({
            "category": cat_name,
            "current_weight": round(current_weight, 2),
            "target_weight": round(target, 2),
            "delta": round(delta, 2),
            "status": status,
        })

    return {"model_id": model_id, "deviations": deviations}


# ============= ADMIN =============

@router.get("/admin/sources")
async def admin_sources(current_user: dict = Depends(get_current_user)):
    if current_user.get("subscription_tier") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    db = get_db()
    rows = await db.query(
        """SELECT s.*, u.email, u.username FROM account_sources s
           JOIN users u ON u.id = s.user_id ORDER BY s.created_at DESC LIMIT 200""",
        [],
    )
    return [dict(r) for r in rows]


# ============= AI INSIGHT =============

import os
import httpx

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


@router.get("/ai-insight")
async def ai_insight(current_user: dict = Depends(get_current_user)):
    """Get AI interpretation of portfolio allocation. Neutral wording, no investment advice."""
    summary = await get_portfolio_summary(current_user["id"])
    if not summary or not summary.get("assets"):
        raise HTTPException(status_code=400, detail="Portfolio is empty")

    total = summary.get("total_notional", 0)
    categories = summary.get("categories", {})
    lines = []
    for cat_name, data in categories.items():
        weight = data.get("weight_pct", 0)
        pnl = data.get("pnl", 0)
        lines.append(f"- {cat_name}: {weight:.1f}% (${data.get('notional', 0):,.0f}), PnL: ${pnl:,.2f}")

    prompt = (
        "You are a neutral portfolio analytics assistant. "
        "Analyze the following crypto portfolio allocation. "
        "Describe the current distribution, concentration risks, and how it compares to typical diversified portfolios. "
        "Do NOT give investment advice or recommend buying/selling. Keep it under 200 words.\n\n"
        f"Total portfolio value: ${total:,.2f}\n"
        "Allocation by category:\n" + "\n".join(lines)
    )

    if not OPENROUTER_API_KEY:
        return {"insight": "AI insights require OPENROUTER_API_KEY to be configured."}

    async with httpx.AsyncClient(timeout=60) as client:
        try:
            resp = await client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://crypto-signals-chi.vercel.app",
                },
                json={
                    "model": "openai/gpt-4o-mini",
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 400,
                    "temperature": 0.5,
                },
            )
            data = resp.json()
            content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return {"insight": content.strip()}
        except Exception as e:
            logger.error(f"AI insight failed: {e}")
            return {"insight": "AI analysis unavailable at the moment. Please try again later."}
