"""Newsletter subscription router — public endpoint for email collection."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from database import get_db
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/newsletter", tags=["newsletter"])


class SubscribeRequest(BaseModel):
    email: EmailStr


class SubscribeResponse(BaseModel):
    success: bool
    message: str


@router.post("/subscribe", response_model=SubscribeResponse)
async def subscribe(payload: SubscribeRequest):
    """Subscribe an email to the newsletter."""
    db = get_db()
    try:
        # Use INSERT ... ON CONFLICT to silently ignore duplicates
        await db.execute(
            """
            INSERT INTO newsletter_subscribers (email, is_active)
            VALUES ($1, TRUE)
            ON CONFLICT (email) DO NOTHING
            """,
            [payload.email],
        )
        return SubscribeResponse(
            success=True,
            message="Successfully subscribed to the newsletter.",
        )
    except Exception as e:
        logger.error(f"Newsletter subscription failed: {e}")
        raise HTTPException(status_code=500, detail="Subscription failed. Please try again later.")
