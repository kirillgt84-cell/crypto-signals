"""
Router для Bitcoin Spot ETF данных
"""
from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Query
from database import get_db

router = APIRouter(prefix="/api/v1/etf", tags=["etf"])


@router.get("/flows")
async def get_etf_flows(
    days: int = Query(30, ge=1, le=365),
    ticker: Optional[str] = Query(None)
):
    """Исторические ежедневные притоки ETF"""
    db = get_db()
    params = []
    where_clauses = ["date > NOW() - INTERVAL '%s days'" % days]
    
    if ticker:
        where_clauses.append("fund_ticker = $1")
        params.append(ticker.upper())
    
    query = f"""
        SELECT date, fund_ticker, fund_name, flow_usd, btc_price
        FROM etf_flows
        WHERE {' AND '.join(where_clauses)}
        ORDER BY date ASC, fund_ticker
    """
    rows = await db.query(query, params)
    return {"flows": [dict(r) for r in rows]}


@router.get("/flows/latest")
async def get_latest_flows():
    """Последний доступный день с детализацией по фондам + их stats"""
    db = get_db()
    latest = await db.query(
        "SELECT MAX(date) as max_date FROM etf_flows WHERE fund_ticker != 'TOTAL'",
        []
    )
    if not latest or not latest[0]["max_date"]:
        return {"date": None, "flows": []}
    
    max_date = latest[0]["max_date"]
    rows = await db.query(
        """SELECT 
            f.fund_ticker,
            f.fund_name,
            f.flow_usd,
            f.btc_price,
            s.total_btc_held,
            s.avg_btc_price,
            s.latest_aum_usd,
            s.unrealized_pnl_usd,
            s.unrealized_pnl_pct
        FROM etf_flows f
        LEFT JOIN etf_fund_stats s ON s.fund_ticker = f.fund_ticker
        WHERE f.date = $1
        ORDER BY ABS(f.flow_usd) DESC""",
        [max_date]
    )
    return {"date": max_date, "flows": [dict(r) for r in rows]}


@router.get("/summary")
async def get_etf_summary():
    """Сводка: общие притоки, AUM, статистика по фондам"""
    db = get_db()
    
    # Последние 30 дней тоталов для графика
    total_rows = await db.query(
        """SELECT date, flow_usd, btc_price
           FROM etf_flows
           WHERE fund_ticker = 'TOTAL' AND date > NOW() - INTERVAL '90 days'
           ORDER BY date ASC""",
        []
    )
    
    # Кумулятивный приток
    cumulative = []
    running = 0
    for r in total_rows:
        running += r["flow_usd"]
        cumulative.append({
            "date": r["date"],
            "daily_flow": r["flow_usd"],
            "cumulative_flow": round(running, 2),
            "btc_price": r["btc_price"]
        })
    
    # Статистика по фондам
    stats_rows = await db.query(
        """SELECT fund_ticker, fund_name, total_invested_usd, total_btc_held,
                  avg_btc_price, latest_aum_usd, unrealized_pnl_usd, unrealized_pnl_pct, updated_at
           FROM etf_fund_stats
           ORDER BY latest_aum_usd DESC NULLS LAST""",
        []
    )
    
    # Агрегаты
    total_aum = sum(s["latest_aum_usd"] or 0 for s in stats_rows)
    total_pnl = sum(s["unrealized_pnl_usd"] or 0 for s in stats_rows)
    total_invested = sum(s["total_invested_usd"] or 0 for s in stats_rows)
    total_btc = sum(s["total_btc_held"] or 0 for s in stats_rows)
    
    # История AUM (90 дней)
    aum_rows = await db.query(
        """SELECT date, total_flow_usd, total_aum_usd, total_btc_held, btc_price
           FROM etf_daily_summary
           WHERE date > NOW() - INTERVAL '90 days'
           ORDER BY date ASC""",
        []
    )
    
    return {
        "cumulative": cumulative,
        "aum_history": [dict(r) for r in aum_rows],
        "funds": [dict(r) for r in stats_rows],
        "totals": {
            "aum_usd": round(total_aum, 2),
            "pnl_usd": round(total_pnl, 2),
            "invested_usd": round(total_invested, 2),
            "btc_held": round(total_btc, 4),
            "avg_btc_price": round(total_invested / total_btc, 2) if total_btc > 0 else 0,
            "pnl_pct": round((total_aum / total_invested - 1) * 100, 2) if total_invested > 0 else 0,
        }
    }
