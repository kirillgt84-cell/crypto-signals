# Plan: Email/Telegram Reports (B) + Binance Sentiment Metrics (C)

## Goal
Add free Binance sentiment metrics (Long/Short ratios) to the dashboard, and build a full Email + Telegram notification system for daily/weekly reports and scanner alerts.

## Part C: Binance Sentiment Metrics (Free)

### 1. Backend fetcher enhancements
- **File**: `backend/fetchers/binance_futures.py`
- Add `get_sentiment_metrics(symbol)` using Binance Data Collection API endpoints:
  - `/futures/data/globalLongShortAccountRatio` (all accounts L/S ratio)
  - `/futures/data/topLongShortPositionRatio` (top traders L/S by positions)
  - `/fapi/v1/takerlongshortRatio` (taker buy/sell volume ratio)
- Return normalized dict with `long_short_ratio`, `top_trader_ratio`, `taker_volume_ratio`, and simple `sentiment_signal` interpretation.

### 2. Backend API endpoint
- **File**: `backend/routers/market.py`
- Add `GET /market/sentiment/{symbol}` returning the sentiment data.

### 3. Frontend integration
- **File**: `frontend/app/page.tsx`
- Add `sentiment` fields to `MarketData` interface.
- Fetch `/market/sentiment/{symbol}` alongside other dashboard calls.
- Add a new `SentimentCards` row below `OIAnalysisCards` with 3 small cards:
  - Long/Short Ratio (all accounts)
  - Top Trader L/S (by positions)
  - Taker Buy/Sell Ratio
- Each card shows value + bullish/bearish badge.

### 4. Tests
- Add mocks for new Binance endpoints in backend tests.
- Verify `/market/sentiment/{symbol}` returns correct shape.

## Part B: Email & Telegram Notifications

### 1. Database schema
- **File**: `backend/schema_auth.sql`
- Add `telegram_chat_id VARCHAR(50)` to `user_preferences`.
- Create `sent_reports` table: `id SERIAL, user_id INT, report_type VARCHAR(20), sent_at TIMESTAMP, status VARCHAR(20), content_summary TEXT`.

### 2. Notification service
- **New file**: `backend/services/notifications.py`
- `send_email(to, subject, html)` via **Resend** API (using `httpx`, no new heavy deps; add `resend` to `requirements.txt` if needed, but prefer raw `httpx` POST to keep deps light).
- `send_telegram_message(chat_id, text)` via Telegram Bot API (`httpx`).
- `generate_daily_report()` / `generate_weekly_report()`: aggregate latest OI, checklist scores, funding, and top liquidations for the watched symbols from the DB.
- `send_daily_reports()`, `send_weekly_reports()`, `send_telegram_alerts()`: query users by preference, deduplicate via `sent_reports`, and dispatch.

### 3. Scheduler jobs
- **File**: `backend/scheduler.py`
- Add cron jobs:
  - Daily reports at 08:00 UTC (idempotent via `sent_reports`).
  - Weekly reports on Monday at 08:00 UTC.
  - Telegram scanner alerts every hour (check checklist for `STRONG_BUY` signals, send to users with `telegram_alerts = TRUE`).

### 4. Telegram bot connection (no webhook needed)
- **File**: `backend/routers/auth.py`
- Add `GET /me/telegram-link` returning deep link `https://t.me/{BOT_NAME}?start={user_id}`.
- Add **new router** `backend/routers/telegram.py` with `POST /telegram/start` accepting `{user_id, chat_id}` and updating `user_preferences.telegram_chat_id`.

### 5. Frontend profile updates
- **File**: `frontend/app/profile/page.tsx`
- In the Subscription tab, add a **Telegram Connection** section:
  - Show "Not connected" or connected status.
  - "Connect Telegram" button opening the deep link in a new tab.
  - "Send Test Email" button (Pro only).
  - "Send Test Telegram" button (Pro only, hidden if no chat_id).
- Add test endpoints to backend:
  - `POST /me/test-email`
  - `POST /me/test-telegram`

### 6. Tests
- Add backend tests for notification service (mocked Resend/Telegram APIs).
- Add tests for the telegram link/start endpoints.
- Ensure frontend tests still pass (update mocks if `MarketData` shape changes).

## Execution Order
1. C — Binance sentiment backend + frontend (quick win, isolated).
2. B1 — DB schema + notification service skeleton.
3. B2 — Telegram connection endpoints + profile UI.
4. B3 — Daily/weekly report generation + scheduler jobs.
5. B4 — Test email/telegram buttons + integration tests.
6. Full test run (backend + frontend).

## Estimated Scope
- Backend files modified: `fetchers/binance_futures.py`, `routers/market.py`, `routers/auth.py`, `scheduler.py`, `schema_auth.sql`, `main.py` (mount new router).
- Backend files added: `routers/telegram.py`, `services/notifications.py`.
- Frontend files modified: `app/page.tsx`, `app/profile/page.tsx`.
- No breaking changes to existing auth or dashboard layout.
