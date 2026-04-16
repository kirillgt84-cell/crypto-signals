"""
Seed script for generating realistic test Bitcoin ETF flow data.
Run from repo root:  python backend/scripts/seed_etf_data.py
"""
import asyncio
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add backend to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from database import get_db
from scheduler import _recalculate_etf_stats, _save_etf_daily_summary

# Realistic fund configuration (ticker, name, avg flow range in millions USD)
FUNDS = [
    ("IBIT", "BlackRock Bitcoin ETF", (-400, 900)),
    ("FBTC", "Fidelity Bitcoin ETF", (-150, 350)),
    ("ARKB", "ARK 21Shares Bitcoin ETF", (-80, 180)),
    ("BITB", "Bitwise Bitcoin ETF", (-40, 120)),
    ("GBTC", "Grayscale Bitcoin Trust", (-400, 80)),
    ("BTCO", "Invesco Galaxy Bitcoin ETF", (-25, 60)),
    ("EZBC", "Franklin Bitcoin ETF", (-8, 25)),
    ("BRRR", "Valkyrie Bitcoin ETF", (-8, 25)),
    ("HODL", "VanEck Bitcoin ETF", (-15, 45)),
]


def generate_trading_days(start: datetime, days: int):
    """Generate last `days` trading days (Mon-Fri) descending."""
    dates = []
    current = start
    while len(dates) < days:
        if current.weekday() < 5:  # Monday=0 ... Friday=4
            dates.append(current.date())
        current -= timedelta(days=1)
    return list(reversed(dates))


async def main():
    db = get_db()
    await db.connect()

    # Clean old seed data so we can re-run cleanly
    print("Cleaning old ETF seed data...")
    await db.execute("DELETE FROM etf_flows WHERE fund_ticker != 'TOTAL'")
    await db.execute("DELETE FROM etf_flows WHERE fund_ticker = 'TOTAL'")
    await db.execute("DELETE FROM etf_fund_stats")
    await db.execute("DELETE FROM etf_daily_summary")

    trading_days = generate_trading_days(datetime.utcnow(), 90)
    btc_price = 82000.0
    inserted = 0

    for d in trading_days:
        # Random BTC price walk (~70k-95k range)
        btc_price = max(70000.0, min(95000.0, btc_price + random.uniform(-1200, 1400)))

        daily_total = 0.0
        for ticker, name, (lo, hi) in FUNDS:
            # Generate flow with some realistic skew
            flow_millions = random.gauss((lo + hi) / 2, (hi - lo) / 4)
            flow_millions = max(lo * 1.2, min(hi * 1.2, flow_millions))
            flow_usd = round(flow_millions * 1_000_000, 2)
            daily_total += flow_usd

            await db.execute(
                """INSERT INTO etf_flows (date, fund_ticker, fund_name, flow_usd, btc_price)
                   VALUES ($1, $2, $3, $4, $5)
                   ON CONFLICT (date, fund_ticker) DO UPDATE
                   SET flow_usd = EXCLUDED.flow_usd, btc_price = EXCLUDED.btc_price""",
                [d, ticker, name, flow_usd, round(btc_price, 2)],
            )
            inserted += 1

        # Insert TOTAL row
        await db.execute(
            """INSERT INTO etf_flows (date, fund_ticker, fund_name, flow_usd, btc_price)
               VALUES ($1, $2, $3, $4, $5)
               ON CONFLICT (date, fund_ticker) DO UPDATE
               SET flow_usd = EXCLUDED.flow_usd, btc_price = EXCLUDED.btc_price""",
            [d, "TOTAL", "Total Net Flow", round(daily_total, 2), round(btc_price, 2)],
        )
        inserted += 1

    print(f"Inserted {inserted} flow records across {len(trading_days)} days.")

    # Recalculate stats and daily summary using the same logic as the scheduler
    print("Recalculating fund stats...")
    await _recalculate_etf_stats(db, btc_price)

    print("Saving daily summary...")
    await _save_etf_daily_summary(db, btc_price)

    await db.close()
    print("Done! ETF page should now display test data.")


if __name__ == "__main__":
    asyncio.run(main())
