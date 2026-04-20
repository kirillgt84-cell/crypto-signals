"""
Notification service: Email (Resend) + Telegram Bot API
"""
import os
import logging
from typing import List, Dict
import httpx
from database import get_db

logger = logging.getLogger(__name__)

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM = os.getenv("RESEND_FROM_EMAIL", "Mirkaso <reports@mirkaso.com>")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_BOT_NAME = os.getenv("TELEGRAM_BOT_NAME", "mirkaso_bot")


async def send_email(to: str, subject: str, html: str) -> dict:
    """Send email via Resend API"""
    if not RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping email")
        return {"success": False, "error": "RESEND_API_KEY not configured"}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            "https://api.resend.com/emails",
            headers={"Authorization": f"Bearer {RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": RESEND_FROM, "to": to, "subject": subject, "html": html},
            timeout=30.0
        )
        data = resp.json() if resp.status_code < 500 else {}
        if resp.status_code in (200, 202):
            return {"success": True, "id": data.get("id")}
        logger.error(f"Resend error {resp.status_code}: {data}")
        return {"success": False, "error": data.get("message", f"HTTP {resp.status_code}")}


async def send_telegram_message(chat_id: str, text: str) -> dict:
    """Send Telegram message via Bot API"""
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not set, skipping telegram")
        return {"success": False, "error": "TELEGRAM_BOT_TOKEN not configured"}

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage",
            json={"chat_id": chat_id, "text": text, "parse_mode": "HTML"},
            timeout=30.0
        )
        data = resp.json() if resp.status_code < 500 else {}
        if resp.status_code == 200 and data.get("ok"):
            return {"success": True, "message_id": data["result"].get("message_id")}
        logger.error(f"Telegram error {resp.status_code}: {data}")
        return {"success": False, "error": data.get("description", f"HTTP {resp.status_code}")}


def _pct_color(v: float) -> str:
    return "#10b981" if v >= 0 else "#ef4444"


def _build_report_html(title: str, content_blocks: List[str]) -> str:
    blocks = "\n".join(content_blocks)
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0b0f19;font-family:Arial,Helvetica,sans-serif;color:#e2e8f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0b0f19;padding:24px 12px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#111827;border-radius:12px;overflow:hidden;border:1px solid #1e293b;">
          <tr>
            <td style="background:#0f172a;padding:24px 20px;border-bottom:1px solid #1e293b;">
              <p style="margin:0;font-size:12px;color:#94a3b8;letter-spacing:0.1em;text-transform:uppercase;">Mirkaso · Precision in Investment Management</p>
              <h1 style="margin:6px 0 0;font-size:22px;font-weight:700;color:#f8fafc;">{title}</h1>
            </td>
          </tr>
          <tr><td style="padding:20px;">{blocks}</td></tr>
          <tr>
            <td style="padding:16px 20px;border-top:1px solid #1e293b;text-align:center;">
              <p style="margin:0;font-size:12px;color:#64748b;">
                Sent by Mirkaso ·
                <a href="https://crypto-signals-chi.vercel.app" style="color:#94a3b8;text-decoration:none;">Open Dashboard</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


def _html_section(heading: str, body: str) -> str:
    return f"""
    <h2 style="margin:0 0 10px;font-size:14px;font-weight:700;color:#f8fafc;text-transform:uppercase;letter-spacing:0.05em;">{heading}</h2>
    <div style="margin-bottom:24px;">{body}</div>
    """


def _html_two_col(label1: str, val1: str, label2: str, val2: str) -> str:
    return f"""
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:4px;">
      <tr>
        <td width="50%" style="padding:8px 0;font-size:13px;color:#94a3b8;">{label1}</td>
        <td width="50%" align="right" style="padding:8px 0;font-size:14px;font-weight:600;color:#f8fafc;">{val1}</td>
      </tr>
      <tr>
        <td width="50%" style="padding:8px 0;font-size:13px;color:#94a3b8;">{label2}</td>
        <td width="50%" align="right" style="padding:8px 0;font-size:14px;font-weight:600;color:#f8fafc;">{val2}</td>
      </tr>
    </table>
    """


def _html_table(headers: List[str], rows: List[List[str]]) -> str:
    ths = "".join(f'<th style="padding:8px 10px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;text-align:left;border-bottom:1px solid #1e293b;">{h}</th>' for h in headers)
    trs = ""
    for r in rows:
        tds = "".join(f'<td style="padding:8px 10px;font-size:13px;color:#e2e8f0;border-bottom:1px solid #1e293b;">{c}</td>' for c in r)
        trs += f"<tr>{tds}</tr>"
    return f'<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;"><thead><tr>{ths}</tr></thead><tbody>{trs}</tbody></table>'


async def generate_daily_report() -> dict:
    """Generate rich daily market report from latest DB data"""
    db = get_db()
    blocks: List[str] = []
    text_lines: List[str] = ["Daily Market Report"]
    try:
        # 1. BTC / ETH snapshot
        majors = await db.query(
            """SELECT DISTINCT ON (symbol)
               symbol, open_interest, price, volume, funding_rate
               FROM oi_history
               WHERE symbol IN ('BTCUSDT','ETHUSDT') AND time > NOW() - INTERVAL '6 hours'
               ORDER BY symbol, time DESC""",
            []
        )
        major_map = {r["symbol"]: r for r in majors}

        # 24h ago for change calc
        majors_24h = await db.query(
            """SELECT DISTINCT ON (symbol)
               symbol, price
               FROM oi_history
               WHERE symbol IN ('BTCUSDT','ETHUSDT') AND time < NOW() - INTERVAL '23 hours'
               ORDER BY symbol, time DESC""",
            []
        )
        old_price = {r["symbol"]: float(r["price"] or 0) for r in majors_24h}

        major_body = ""
        for sym in ("BTCUSDT", "ETHUSDT"):
            r = major_map.get(sym)
            if not r:
                continue
            price = float(r["price"] or 0)
            prev = old_price.get(sym, price)
            chg = ((price - prev) / prev * 100) if prev else 0
            color = _pct_color(chg)
            oi_usd = float(r["open_interest"] or 0) * price
            major_body += _html_two_col(
                sym.replace("USDT", ""),
                f"${price:,.2f} <span style='color:{color};font-size:12px;'>({chg:+.2f}%)</span>",
                "OI / Funding",
                f"${oi_usd/1e9:.2f}B · {float(r['funding_rate'] or 0)*100:.4f}%"
            )
        if major_body:
            blocks.append(_html_section("BTC & ETH", major_body))
            text_lines.append(f"BTC: ${major_map.get('BTCUSDT',{}).get('price',0):,.2f}")

        # 2. Funding extremes
        funding = await db.query(
            """SELECT DISTINCT ON (symbol)
               symbol, funding_rate
               FROM oi_history
               WHERE time > NOW() - INTERVAL '6 hours' AND funding_rate IS NOT NULL
               ORDER BY symbol, time DESC""",
            []
        )
        funding_sorted = sorted(funding, key=lambda x: float(x["funding_rate"] or 0), reverse=True)
        top_long = funding_sorted[:3]
        top_short = funding_sorted[-3:][::-1]
        if top_long:
            rows = []
            for r in top_long:
                rows.append([r["symbol"].replace("USDT",""), f"{float(r['funding_rate'])*100:.4f}%"])
            for r in top_short:
                rows.append([r["symbol"].replace("USDT",""), f"{float(r['funding_rate'])*100:.4f}%"])
            blocks.append(_html_section("Funding Extremes (Longs vs Shorts)", _html_table(["Symbol", "Funding"], rows)))

        # 3. Gainers / Losers from heatmap
        heatmap = await db.query(
            """SELECT DISTINCT ON (symbol)
               symbol, base_asset, price_change_pct, quote_volume_24h
               FROM heatmap_snapshots
               WHERE snapshot_time > NOW() - INTERVAL '2 hours'
               ORDER BY symbol, snapshot_time DESC""",
            []
        )
        heatmap_sorted = sorted(heatmap, key=lambda x: float(x["price_change_pct"] or 0), reverse=True)
        gainers = heatmap_sorted[:5]
        losers = heatmap_sorted[-5:][::-1]
        if gainers:
            rows = []
            for g in gainers:
                color = _pct_color(float(g["price_change_pct"] or 0))
                rows.append([
                    g.get("base_asset", g["symbol"].replace("USDT","")),
                    f"<span style='color:{color};'>{float(g['price_change_pct']):+.2f}%</span>",
                    f"${float(g['quote_volume_24h'])/1e6:.1f}M"
                ])
            blocks.append(_html_section("Top Gainers", _html_table(["Symbol", "24h", "Volume"], rows)))
        if losers:
            rows = []
            for l in losers:
                color = _pct_color(float(l["price_change_pct"] or 0))
                rows.append([
                    l.get("base_asset", l["symbol"].replace("USDT","")),
                    f"<span style='color:{color};'>{float(l['price_change_pct']):+.2f}%</span>",
                    f"${float(l['quote_volume_24h'])/1e6:.1f}M"
                ])
            blocks.append(_html_section("Top Losers", _html_table(["Symbol", "24h", "Volume"], rows)))

        # 4. Top OI movers
        oi_movers = await db.query(
            """SELECT
               symbol,
               (MAX(open_interest) FILTER (WHERE time > NOW() - INTERVAL '2 hours') -
                MIN(open_interest) FILTER (WHERE time < NOW() - INTERVAL '22 hours')) as oi_change,
                MAX(price) FILTER (WHERE time > NOW() - INTERVAL '2 hours') as latest_price
               FROM oi_history
               WHERE time > NOW() - INTERVAL '24 hours'
               GROUP BY symbol
               HAVING COUNT(*) > 1
               ORDER BY ABS(oi_change) DESC NULLS LAST
               LIMIT 5""",
            []
        )
        if oi_movers:
            rows = []
            for r in oi_movers:
                chg = r["oi_change"] or 0
                color = _pct_color(chg)
                rows.append([
                    r["symbol"].replace("USDT",""),
                    f"<span style='color:{color};'>{chg/1e6:+.1f}M</span>",
                    f"${float(r['latest_price']):,.2f}"
                ])
            blocks.append(_html_section("Top OI Movers (24h)", _html_table(["Symbol", "OI Δ", "Price"], rows)))

        # 5. ETF Flows
        etf = await db.query(
            "SELECT * FROM etf_daily_summary ORDER BY date DESC LIMIT 1",
            []
        )
        if etf:
            e = etf[0]
            flow = e.get("total_flow_usd", 0) or 0
            color = _pct_color(flow)
            etf_body = _html_two_col(
                "Total Flow",
                f"<span style='color:{color};'>${flow/1e6:+.1f}M</span>",
                "Total AUM",
                f"${(e.get('total_aum_usd',0) or 0)/1e9:.2f}B"
            )
            blocks.append(_html_section("Bitcoin ETF Flows", etf_body))
            text_lines.append(f"ETF Flow: ${flow/1e6:+.1f}M")

        # 6. Top anomalies
        anomalies = await db.query(
            """SELECT symbol, direction, score, volume_ratio, oi_change_pct, price_change_24h_pct, confidence
               FROM anomaly_signals
               WHERE triggered_at > NOW() - INTERVAL '24 hours'
               ORDER BY score DESC LIMIT 5""",
            []
        )
        if anomalies:
            rows = []
            for a in anomalies:
                dir_color = "#10b981" if a["direction"] == "LONG" else "#ef4444"
                rows.append([
                    a["symbol"].replace("USDT",""),
                    f"<span style='color:{dir_color};font-size:11px;font-weight:700;'>{a['direction']}</span>",
                    str(a["score"]),
                    f"{a['volume_ratio']}x",
                    f"{a['oi_change_pct']:+.1f}%"
                ])
            blocks.append(_html_section("Top Anomaly Signals (24h)", _html_table(["Symbol", "Dir", "Score", "Vol", "OI"], rows)))

        if not blocks:
            blocks.append(_html_section("Market", "<p style='color:#94a3b8;'>No fresh data available. Check back later.</p>"))

        html = _build_report_html("Daily Market Report", blocks)
        text = "\n".join(text_lines)
        return {"html": html, "text": text, "sections": blocks}
    except Exception as e:
        logger.error(f"Daily report generation failed: {e}")
        return {"html": "", "text": "", "sections": [], "error": str(e)}


async def generate_weekly_report() -> dict:
    """Generate weekly market report"""
    db = get_db()
    try:
        rows = await db.query(
            """SELECT symbol,
                (MAX(open_interest) FILTER (WHERE time > NOW() - INTERVAL '6 hours') -
                 MIN(open_interest) FILTER (WHERE time < NOW() - INTERVAL '6 days')) as oi_change,
                MAX(price) FILTER (WHERE time > NOW() - INTERVAL '6 hours') as latest_price
               FROM oi_history
               WHERE time > NOW() - INTERVAL '7 days'
               GROUP BY symbol
               ORDER BY ABS(oi_change) DESC NULLS LAST
               LIMIT 5""",
            []
        )
        sections = []
        for r in rows:
            if r["oi_change"] is None:
                continue
            sign = "+" if r["oi_change"] > 0 else ""
            sections.append({
                "label": r["symbol"],
                "value": f"${r['latest_price']:,.2f}",
                "detail": f"7d OI change: {sign}{(r['oi_change']/1e6):.1f}M contracts"
            })
        if not sections:
            sections.append({"label": "Market", "value": "No 7-day data", "detail": "Check back later."})

        html = _build_report_html("Weekly Market Report", sections)
        text = "Weekly Market Report\n\n" + "\n".join(f"{s['label']}: {s['value']} ({s['detail']})" for s in sections)
        return {"html": html, "text": text, "sections": sections}
    except Exception as e:
        logger.error(f"Weekly report generation failed: {e}")
        return {"html": "", "text": "", "sections": [], "error": str(e)}


async def _mark_sent(user_id: int, report_type: str, status: str, summary: str):
    db = get_db()
    await db.execute(
        "INSERT INTO sent_reports (user_id, report_type, status, content_summary) VALUES ($1, $2, $3, $4)",
        [user_id, report_type, status, summary]
    )


async def _already_sent_today(report_type: str) -> bool:
    db = get_db()
    row = await db.query(
        "SELECT 1 FROM sent_reports WHERE report_type = $1 AND sent_at > NOW() - INTERVAL '20 hours' LIMIT 1",
        [report_type]
    )
    return bool(row)


async def send_daily_reports():
    """Send daily emails to subscribed users (idempotent)"""
    if await _already_sent_today("daily"):
        logger.info("Daily reports already sent today, skipping")
        return

    report = await generate_daily_report()
    if not report.get("html"):
        logger.error("Daily report empty, aborting")
        return

    db = get_db()
    users = await db.query(
        """SELECT u.id, u.email
           FROM users u
           JOIN user_preferences p ON p.user_id = u.id
           WHERE p.daily_report = TRUE AND u.email IS NOT NULL""",
        []
    )

    for u in users:
        try:
            result = await send_email(u["email"], "Mirkaso Daily Report", report["html"])
            await _mark_sent(u["id"], "daily", "sent" if result["success"] else "failed", "")
        except Exception as e:
            logger.error(f"Failed to send daily to {u['email']}: {e}")
            await _mark_sent(u["id"], "daily", "failed", str(e)[:200])

    logger.info(f"Daily reports processed for {len(users)} users")


async def send_weekly_reports():
    """Send weekly emails to subscribed users (idempotent)"""
    if await _already_sent_today("weekly"):
        logger.info("Weekly reports already sent today, skipping")
        return

    report = await generate_weekly_report()
    if not report.get("html"):
        logger.error("Weekly report empty, aborting")
        return

    db = get_db()
    users = await db.query(
        """SELECT u.id, u.email
           FROM users u
           JOIN user_preferences p ON p.user_id = u.id
           WHERE p.weekly_report = TRUE AND u.email IS NOT NULL""",
        []
    )

    for u in users:
        try:
            result = await send_email(u["email"], "Mirkaso Weekly Report", report["html"])
            await _mark_sent(u["id"], "weekly", "sent" if result["success"] else "failed", "")
        except Exception as e:
            logger.error(f"Failed to send weekly to {u['email']}: {e}")
            await _mark_sent(u["id"], "weekly", "failed", str(e)[:200])

    logger.info(f"Weekly reports processed for {len(users)} users")


async def send_telegram_alerts():
    """Send Telegram alerts for STRONG_BUY checklist signals"""
    db = get_db()
    users = await db.query(
        """SELECT u.id, p.telegram_chat_id
           FROM users u
           JOIN user_preferences p ON p.user_id = u.id
           WHERE p.telegram_alerts = TRUE AND p.telegram_chat_id IS NOT NULL""",
        []
    )
    if not users:
        return

    alerts = await db.query(
        """SELECT symbol, price, open_interest, funding_rate
           FROM oi_history
           WHERE time > NOW() - INTERVAL '2 hours'
           ORDER BY time DESC""",
        []
    )

    if not alerts:
        return

    messages = []
    seen = set()
    for a in alerts:
        sym = a["symbol"]
        if sym in seen:
            continue
        seen.add(sym)
        msg = f"<b>Mirkaso Alert</b>\n<code>{sym}</code> at ${a['price']:,.2f}\nFunding: {a['funding_rate']*100:.4f}%"
        messages.append(msg)

    for u in users:
        for msg in messages[:3]:
            try:
                await send_telegram_message(u["telegram_chat_id"], msg)
            except Exception as e:
                logger.error(f"Telegram alert failed for user {u['id']}: {e}")

    logger.info(f"Telegram alerts sent to {len(users)} users")
