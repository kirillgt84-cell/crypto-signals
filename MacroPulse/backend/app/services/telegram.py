"""
Telegram Alert Service
Отправка сигналов в Telegram
"""

import os
import aiohttp
from typing import Optional, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

TELEGRAM_API_URL = "https://api.telegram.org/bot{token}/sendMessage"


class TelegramService:
    """Сервис для отправки алертов в Telegram"""
    
    def __init__(self, bot_token: Optional[str] = None, chat_id: Optional[str] = None):
        self.bot_token = bot_token or os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = chat_id or os.getenv("TELEGRAM_CHAT_ID")
        
        if not self.bot_token or not self.chat_id:
            logger.warning("Telegram credentials not configured")
    
    async def send_message(self, text: str, parse_mode: str = "HTML") -> bool:
        """Отправить сообщение в Telegram"""
        if not self.bot_token or not self.chat_id:
            logger.error("Cannot send: Telegram not configured")
            return False
        
        url = TELEGRAM_API_URL.format(token=self.bot_token)
        
        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": parse_mode,
            "disable_web_page_preview": True
        }
        
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=payload) as resp:
                    if resp.status == 200:
                        logger.info("Telegram message sent")
                        return True
                    else:
                        text = await resp.text()
                        logger.error(f"Telegram API error: {resp.status} - {text}")
                        return False
        except Exception as e:
            logger.error(f"Error sending Telegram message: {e}")
            return False
    
    def format_yield_curve_alert(self, 
                                  curve_shape: str,
                                  spread_10y2y: float,
                                  spread_10y3m: float,
                                  recession_prob: float,
                                  top_analog: str,
                                  analog_similarity: float) -> str:
        """Форматировать алерт о кривой доходности"""
        
        # Определить эмодзи
        if curve_shape == "INVERTED":
            emoji = "🔴"
            status = "ИНВЕРСИЯ"
        elif curve_shape == "FLAT":
            emoji = "🟡"
            status = "ПЛОСКАЯ"
        else:
            emoji = "🟢"
            status = "НОРМАЛЬНАЯ"
        
        # Цвет для вероятности рецессии
        if recession_prob > 50:
            rec_emoji = "🔴"
        elif recession_prob > 25:
            rec_emoji = "🟠"
        else:
            rec_emoji = "🟢"
        
        message = f"""
{emoji} <b>Yield Curve Alert</b> | {datetime.now().strftime('%Y-%m-%d %H:%M')}

<b>Статус:</b> {status}
<b>10Y-2Y:</b> {spread_10y2y:+.2f}%
<b>10Y-3M:</b> {spread_10y3m:+.2f}%

{rec_emoji} <b>Вероятность рецессии:</b> {recession_prob:.1f}%

<b>Лучший аналог:</b> {top_analog} ({analog_similarity:.0f}% сходства)

<a href='https://yci-dashboard.vercel.app'>Открыть дашборд</a>
"""
        return message.strip()
    
    def format_critical_signal(self, 
                                signal_type: str,
                                title: str,
                                message: str,
                                metrics: dict,
                                recommended_action: str) -> str:
        """Форматировать критический сигнал"""
        
        metrics_text = "\n".join([f"• {k}: {v}" for k, v in metrics.items()])
        
        text = f"""
🚨 <b>CRITICAL SIGNAL</b>

<b>{title}</b>

{message}

<b>Метрики:</b>
{metrics_text}

<b>Рекомендация:</b> {recommended_action}

<a href='https://yci-dashboard.vercel.app'>Дашборд</a>
"""
        return text.strip()


# Singleton
_telegram_service = None

def get_telegram_service() -> TelegramService:
    """Получить singleton instance"""
    global _telegram_service
    if _telegram_service is None:
        _telegram_service = TelegramService()
    return _telegram_service
