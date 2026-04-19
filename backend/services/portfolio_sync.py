"""
Portfolio sync service: pulls data from connected exchanges and updates DB.
"""
import uuid
import logging
from typing import List, Dict, Any
from database import get_db
from services.portfolio_crypto import decrypt
from fetchers.binance_portfolio import BinancePortfolioFetcher

logger = logging.getLogger(__name__)


async def sync_user_portfolio(user_id: int) -> Dict[str, Any]:
    """Sync all connected sources for a user."""
    db = get_db()
    sources = await db.query(
        "SELECT id, type, provider, api_key_encrypted, api_secret_encrypted FROM account_sources WHERE user_id = $1 AND is_active = TRUE",
        [user_id],
    )

    all_assets: List[Dict] = []
    sync_id = str(uuid.uuid4())

    for src in sources:
        try:
            if src["provider"] == "binance" and src["api_key_encrypted"] and src["api_secret_encrypted"]:
                api_key = decrypt(src["api_key_encrypted"])
                api_secret = decrypt(src["api_secret_encrypted"])
                fetcher = BinancePortfolioFetcher(api_key, api_secret)
                try:
                    account = await fetcher.get_account()
                    risks = await fetcher.get_position_risk()
                    assets = fetcher.parse_positions(account, risks)
                    for a in assets:
                        a["source_id"] = src["id"]
                    all_assets.extend(assets)
                    await db.execute(
                        "UPDATE account_sources SET last_sync_at = NOW() WHERE id = $1",
                        [src["id"]],
                    )
                finally:
                    await fetcher.close()
        except Exception as e:
            logger.error(f"[Portfolio] Sync failed for source {src['id']}: {e}")

    # Save to DB
    for asset in all_assets:
        await db.execute(
            """INSERT INTO portfolio_assets
               (user_id, source_id, asset_symbol, asset_name, amount, avg_entry_price, current_price,
                unrealized_pnl, unrealized_pnl_pct, notional, margin, leverage, side, sync_id, synced_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())""",
            [
                user_id,
                asset.get("source_id"),
                asset["symbol"],
                asset.get("asset_name", asset["symbol"]),
                asset["amount"],
                asset.get("avg_entry_price", 0),
                asset.get("current_price", 0),
                asset.get("unrealized_pnl", 0),
                asset.get("unrealized_pnl_pct", 0),
                asset.get("notional", 0),
                asset.get("margin", 0),
                asset.get("leverage", 1),
                asset.get("side", "LONG"),
                sync_id,
            ],
        )

    # Delete old exchange-synced assets not in this sync (preserve manual assets)
    await db.execute(
        "DELETE FROM portfolio_assets WHERE user_id = $1 AND sync_id != $2 AND sync_id != 'manual'",
        [user_id, sync_id],
    )

    # Save history snapshot
    total_notional = sum(a.get("notional", 0) for a in all_assets)
    total_pnl = sum(a.get("unrealized_pnl", 0) for a in all_assets)
    total_margin = sum(a.get("margin", 0) for a in all_assets)
    await db.execute(
        """INSERT INTO portfolio_history (user_id, date, total_notional, total_unrealized_pnl, total_margin)
           VALUES ($1, CURRENT_DATE, $2, $3, $4)
           ON CONFLICT (user_id, date) DO UPDATE SET
             total_notional = EXCLUDED.total_notional,
             total_unrealized_pnl = EXCLUDED.total_unrealized_pnl,
             total_margin = EXCLUDED.total_margin""",
        [user_id, total_notional, total_pnl, total_margin],
    )

    return {
        "sync_id": sync_id,
        "assets_count": len(all_assets),
        "total_notional": total_notional,
        "total_unrealized_pnl": total_pnl,
        "total_margin": total_margin,
    }


async def get_portfolio_summary(user_id: int) -> Dict[str, Any]:
    """Get latest portfolio summary with categories."""
    db = get_db()
    assets = await db.query(
        """SELECT pa.*, c.name as system_category, uc.name as user_category_name
           FROM portfolio_assets pa
           LEFT JOIN asset_categories ac ON ac.user_id = pa.user_id AND ac.asset_symbol = pa.asset_symbol
           LEFT JOIN categories c ON c.id = ac.system_category_id
           LEFT JOIN user_categories uc ON uc.id = ac.user_category_id
           WHERE pa.user_id = $1
           ORDER BY pa.notional DESC""",
        [user_id],
    )

    total_notional = sum(a.get("notional", 0) or 0 for a in assets)
    total_pnl = sum(a.get("unrealized_pnl", 0) or 0 for a in assets)

    # Group by category
    categories = {}
    for a in assets:
        cat = a.get("user_category_name") or a.get("system_category") or "Other"
        if cat not in categories:
            categories[cat] = {"notional": 0, "pnl": 0, "assets": []}
        categories[cat]["notional"] += a.get("notional", 0) or 0
        categories[cat]["pnl"] += a.get("unrealized_pnl", 0) or 0
        categories[cat]["assets"].append(dict(a))

    for cat in categories:
        categories[cat]["weight_pct"] = (categories[cat]["notional"] / total_notional * 100) if total_notional > 0 else 0

    return {
        "assets": [dict(a) for a in assets],
        "total_notional": total_notional,
        "total_unrealized_pnl": total_pnl,
        "total_assets": len(assets),
        "categories": categories,
    }
