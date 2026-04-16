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
RESEND_FROM = os.getenv("RESEND_FROM_EMAIL", "Fast Lane <reports@fastlane.trade>")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_BOT_NAME = os.getenv("TELEGRAM_BOT_NAME", "fastlane_signals_bot")


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


def _build_report_html(title: str, sections: List[Dict]) -> str:
    rows = ""
    for s in sections:
        rows += f"""
        <tr>
          <td style="padding:12px;border-bottom:1px solid #e5e7eb;">
            <p style="margin:0;font-size:14px;color:#6b7280;">{s.get('label','')}</p>
            <p style="margin:4px 0 0;font-size:18px;font-weight:600;color:#111827;">{s.get('value','')}</p>
            <p style="margin:4px 0 0;font-size:13px;color:#374151;">{s.get('detail','')}</p>
          </td>
        </tr>
        """
    return f"""
    <html>
      <body style="font-family:Arial,Helvetica,sans-serif;background:#f3f4f6;padding:24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;">
          <tr><td style="background:#111827;padding:20px;color:#ffffff;font-size:20px;font-weight:bold;">{title}</td></tr>
          {rows}
          <tr><td style="padding:16px;font-size:12px;color:#9ca3af;">Sent by Fast Lane · <a href="https://crypto-signals-ff4c.vercel.app" style="color:#6b7280;">Open Dashboard</a></td></tr>
        </table>
      </body>
    </html>
    """


async def generate_daily_report() -> dict:
    """Generate daily market report from latest DB data"""
    db = get_db()
    try:
        rows = await db.query(
            """SELECT DISTINCT ON (symbol)
               symbol, open_interest, price, volume, funding_rate
               FROM oi_history
               WHERE time > NOW() - INTERVAL '6 hours'
               ORDER BY symbol, time DESC""",
            []
        )
        sections = []
        for r in rows:
            sections.append({
                "label": r["symbol"],
                "value": f"${r['price']:,.2f}",
                "detail": f"OI: ${(r['open_interest']*r['price']/1e9):.2f}B · Funding: {r['funding_rate']*100:.4f}%"
            })

        if not sections:
            sections.append({"label": "Market", "value": "No fresh data", "detail": "Check back later."})

        html = _build_report_html("Daily Market Report", sections)
        text = "Daily Market Report\n\n" + "\n".join(f"{s['label']}: {s['value']} ({s['detail']})" for s in sections)
        return {"html": html, "text": text, "sections": sections}
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
            result = await send_email(u["email"], "Fast Lane Daily Report", report["html"])
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
            result = await send_email(u["email"], "Fast Lane Weekly Report", report["html"])
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
        msg = f"<b>Fast Lane Alert</b>\n<code>{sym}</code> at ${a['price']:,.2f}\nFunding: {a['funding_rate']*100:.4f}%"
        messages.append(msg)

    for u in users:
        for msg in messages[:3]:
            try:
                await send_telegram_message(u["telegram_chat_id"], msg)
            except Exception as e:
                logger.error(f"Telegram alert failed for user {u['id']}: {e}")

    logger.info(f"Telegram alerts sent to {len(users)} users")
