"""
Telegram bot connection router
"""
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from database import get_db

router = APIRouter(prefix="/api/v1/telegram", tags=["telegram"])

TELEGRAM_BOT_NAME = os.getenv("TELEGRAM_BOT_NAME", "fastlane_signals_bot")
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")


class TelegramStartRequest(BaseModel):
    user_id: int
    chat_id: str


@router.post("/start")
async def telegram_start(req: TelegramStartRequest):
    """Link a Telegram chat_id to a user account (called by bot or manually)"""
    db = get_db()
    
    # Verify user exists
    user = await db.query("SELECT id FROM users WHERE id = $1", [req.user_id])
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.execute(
        """INSERT INTO user_preferences (user_id, telegram_chat_id, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (user_id) DO UPDATE SET telegram_chat_id = $2, updated_at = NOW()""",
        [req.user_id, req.chat_id]
    )
    
    return {"message": "Telegram connected", "bot_name": TELEGRAM_BOT_NAME}


@router.post("/webhook")
async def telegram_webhook(update: dict):
    """Minimal webhook handler for Telegram bot updates"""
    message = update.get("message", {})
    text = message.get("text", "")
    chat = message.get("chat", {})
    chat_id = chat.get("id")
    
    if text and text.startswith("/start"):
        parts = text.split()
        if len(parts) >= 2:
            try:
                user_id = int(parts[1])
                db = get_db()
                user = await db.query("SELECT id FROM users WHERE id = $1", [user_id])
                if user:
                    await db.execute(
                        """INSERT INTO user_preferences (user_id, telegram_chat_id, updated_at)
                           VALUES ($1, $2, NOW())
                           ON CONFLICT (user_id) DO UPDATE SET telegram_chat_id = $2, updated_at = NOW()""",
                        [user_id, str(chat_id)]
                    )
                    # Optionally send confirmation message via bot API
                    return {"ok": True, "message": "Linked"}
            except ValueError:
                pass
    
    return {"ok": True}
