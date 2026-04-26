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


async def _auto_categorize(db, user_id: int, symbol: str, asset_name: str):
    """Auto-assign category from heatmap_snapshots if no manual override exists."""
    # Check if user already assigned a category manually
    existing = await db.query(
        "SELECT 1 FROM asset_categories WHERE user_id = $1 AND asset_symbol = $2",
        [user_id, symbol],
    )
    if existing:
        return
    # Try heatmap category
    heatmap = await db.query(
        "SELECT category FROM heatmap_snapshots WHERE symbol = $1 ORDER BY snapshot_time DESC LIMIT 1",
        [symbol],
    )
    cat_name = None
    if heatmap and heatmap[0].get("category"):
        cat_name = heatmap[0]["category"]
    # Fallback to asset_name-based heuristics if no heatmap data
    if not cat_name:
        # Simple heuristic mapping for well-known assets
        name_upper = asset_name.upper()
        if name_upper in ("BTC", "ETH", "SOL", "AVAX", "NEAR", "APT", "SUI", "TON", "ADA", "DOT", "TRX", "XRP", "BCH", "LTC", "ETC"):
            cat_name = "L1"
        elif name_upper in ("USDT", "USDC", "DAI", "BUSD", "TUSD", "FDUSD"):
            cat_name = "Stablecoins"
    if not cat_name:
        return
    # Find category id
    cat_row = await db.query("SELECT id FROM categories WHERE name = $1 LIMIT 1", [cat_name])
    if cat_row:
        await db.execute(
            "INSERT INTO asset_categories (user_id, asset_symbol, system_category_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
            [user_id, symbol, cat_row[0]["id"]],
        )


async def sync_user_portfolio(user_id: int) -> Dict[str, Any]:
    """Sync all connected sources for a user."""
    db = get_db()
    sources = await db.query(
        "SELECT id, type, provider, market_type, api_key_encrypted, api_secret_encrypted, COALESCE(testnet, FALSE) as testnet FROM account_sources WHERE user_id = $1 AND is_active = TRUE",
        [user_id],
    )

    all_assets: List[Dict] = []

    for src in sources:
        sync_id = str(uuid.uuid4())
        try:
            if src["provider"] in ("binance", "binance-futures", "binance-spot") and src["api_key_encrypted"] and src["api_secret_encrypted"]:
                api_key = decrypt(src["api_key_encrypted"])
                api_secret = decrypt(src["api_secret_encrypted"])
                fetcher = BinancePortfolioFetcher(api_key, api_secret, testnet=src.get("testnet", False))
                market_type = src.get("market_type") or "futures"
                try:
                    if market_type == "spot":
                        account = await fetcher.get_spot_account()
                        # Collect symbols for price lookup
                        balances = account.get("balances", [])
                        symbols = []
                        for bal in balances:
                            asset = bal.get("asset", "")
                            amt = float(bal.get("free", 0)) + float(bal.get("locked", 0))
                            if amt > 0 and asset not in ("USDT", "USD", "BUSD"):
                                symbols.append(f"{asset}USDT")
                            elif amt > 0 and asset in ("USDT", "USD", "BUSD"):
                                pass  # price = 1
                        prices = await fetcher.get_spot_prices(symbols)
                        assets = fetcher.parse_spot_balances(account, prices)
                    else:
                        account = await fetcher.get_futures_account()
                        risks = await fetcher.get_position_risk()
                        assets = fetcher.parse_positions(account, risks)

                    for a in assets:
                        a["source_id"] = src["id"]
                        # Save asset
                        await db.execute(
                            """INSERT INTO portfolio_assets
                               (user_id, source_id, asset_symbol, asset_name, amount, avg_entry_price, current_price,
                                unrealized_pnl, unrealized_pnl_pct, notional, margin, leverage, side, sync_id, synced_at)
                               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
                               ON CONFLICT (user_id, source_id, asset_symbol, sync_id) DO UPDATE SET
                                 amount = EXCLUDED.amount,
                                 avg_entry_price = EXCLUDED.avg_entry_price,
                                 current_price = EXCLUDED.current_price,
                                 unrealized_pnl = EXCLUDED.unrealized_pnl,
                                 unrealized_pnl_pct = EXCLUDED.unrealized_pnl_pct,
                                 notional = EXCLUDED.notional,
                                 margin = EXCLUDED.margin,
                                 leverage = EXCLUDED.leverage,
                                 side = EXCLUDED.side,
                                 synced_at = NOW()""",
                            [
                                user_id,
                                src["id"],
                                a["symbol"],
                                a.get("asset_name", a["symbol"]),
                                a["amount"],
                                a.get("avg_entry_price", 0),
                                a.get("current_price", 0),
                                a.get("unrealized_pnl", 0),
                                a.get("unrealized_pnl_pct", 0),
                                a.get("notional", 0),
                                a.get("margin", 0),
                                a.get("leverage", 1),
                                a.get("side", "LONG"),
                                sync_id,
                            ],
                        )
                        # Auto-categorize
                        await _auto_categorize(db, user_id, a["symbol"], a.get("asset_name", a["symbol"]))

                    # Delete old assets for this source not in current sync
                    await db.execute(
                        "DELETE FROM portfolio_assets WHERE user_id = $1 AND source_id = $2 AND sync_id != $3 AND sync_id != 'manual'",
                        [user_id, src["id"], sync_id],
                    )

                    await db.execute(
                        "UPDATE account_sources SET last_sync_at = NOW() WHERE id = $1",
                        [src["id"]],
                    )
                    all_assets.extend(assets)
                finally:
                    await fetcher.close()
        except Exception as e:
            logger.error(f"[Portfolio] Sync failed for source {src['id']}: {e}")

    # Check alerts
    await check_alerts(db, user_id, all_assets)

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
        "assets_count": len(all_assets),
        "total_notional": total_notional,
        "total_unrealized_pnl": total_pnl,
        "total_margin": total_margin,
    }


async def check_alerts(db, user_id: int, assets: List[Dict]):
    """Check portfolio assets against user alert settings and create alerts."""
    settings = await db.query(
        "SELECT alert_type, threshold FROM portfolio_alert_settings WHERE user_id = $1 AND enabled = TRUE",
        [user_id],
    )
    if not settings:
        return
    setting_map = {s["alert_type"]: float(s["threshold"]) for s in settings}

    for asset in assets:
        # Liquidation alert (futures only)
        liq_price = asset.get("liquidation_price", 0)
        if liq_price and "liquidation" in setting_map:
            mark = asset.get("current_price", 0)
            if mark > 0 and liq_price > 0:
                # For LONG: liquidation < entry. Distance = (mark - liq) / mark
                # For SHORT: liquidation > entry. Distance = (liq - mark) / mark
                if asset.get("side") == "LONG":
                    distance_pct = ((mark - liq_price) / mark) * 100
                else:
                    distance_pct = ((liq_price - mark) / mark) * 100
                threshold = setting_map["liquidation"]
                if distance_pct <= threshold:
                    msg = f"{asset['symbol']} approaching liquidation ({distance_pct:.1f}% away)"
                    await db.execute(
                        "INSERT INTO portfolio_alerts (user_id, asset_symbol, alert_type, message) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
                        [user_id, asset["symbol"], "liquidation", msg],
                    )

        # PnL up alert
        pnl_pct = asset.get("unrealized_pnl_pct", 0)
        if "pnl_up" in setting_map and pnl_pct >= setting_map["pnl_up"]:
            msg = f"{asset['symbol']} reached +{pnl_pct:.1f}% unrealized PnL"
            await db.execute(
                "INSERT INTO portfolio_alerts (user_id, asset_symbol, alert_type, message) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
                [user_id, asset["symbol"], "pnl_up", msg],
            )

        # PnL down alert
        if "pnl_down" in setting_map and pnl_pct <= -setting_map["pnl_down"]:
            msg = f"{asset['symbol']} dropped to {pnl_pct:.1f}% unrealized PnL"
            await db.execute(
                "INSERT INTO portfolio_alerts (user_id, asset_symbol, alert_type, message) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING",
                [user_id, asset["symbol"], "pnl_down", msg],
            )


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
