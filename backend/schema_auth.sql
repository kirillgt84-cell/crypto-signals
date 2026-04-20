-- Auth module schema

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255),  -- NULL for OAuth-only users
    username VARCHAR(50) UNIQUE,
    avatar_url TEXT,
    is_email_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all columns exist (migration safety for existing tables)
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier VARCHAR(20) DEFAULT 'free';

-- Add constraints separately (safe for existing columns)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_email_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'users_username_key'
    ) THEN
        ALTER TABLE users ADD CONSTRAINT users_username_key UNIQUE (username);
    END IF;
END $$;

-- OAuth accounts (one user can have multiple OAuth providers)
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,  -- 'google', 'telegram', 'twitter', 'discord'
    provider_user_id VARCHAR(255) NOT NULL,
    provider_data JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(provider, provider_user_id)
);

-- Refresh tokens for JWT
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_revoked BOOLEAN DEFAULT FALSE
);

-- User preferences (timezone, language, etc)
CREATE TABLE IF NOT EXISTS user_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    daily_report BOOLEAN DEFAULT FALSE,
    weekly_report BOOLEAN DEFAULT FALSE,
    telegram_alerts BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS daily_report BOOLEAN DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS weekly_report BOOLEAN DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS telegram_alerts BOOLEAN DEFAULT FALSE;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(50);

-- Sent reports tracking for idempotency
CREATE TABLE IF NOT EXISTS sent_reports (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    report_type VARCHAR(20) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pending',
    content_summary TEXT
);

CREATE INDEX IF NOT EXISTS idx_sent_reports_user ON sent_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_sent_reports_type ON sent_reports(report_type, sent_at);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_oauth_provider ON oauth_accounts(provider, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- User scanner alert settings
CREATE TABLE IF NOT EXISTS user_scanner_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    min_score INTEGER DEFAULT 8,
    email_alerts BOOLEAN DEFAULT FALSE,
    telegram_alerts BOOLEAN DEFAULT FALSE,
    push_alerts BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PayPal Payment Module Schema

-- Plans / Pricing tiers
CREATE TABLE IF NOT EXISTS plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    type VARCHAR(20) NOT NULL CHECK (type IN ('one_time', 'subscription')),
    paypal_plan_id VARCHAR(100),
    tier VARCHAR(20) DEFAULT 'pro',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments (one-time)
CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id),
    paypal_order_id VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'approved', 'captured', 'failed', 'refunded')),
    amount DECIMAL(10, 2),
    currency VARCHAR(3),
    captured_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    plan_id INTEGER REFERENCES plans(id),
    paypal_subscription_id VARCHAR(100) UNIQUE,
    status VARCHAR(20) DEFAULT 'created' CHECK (status IN ('created', 'active', 'cancelled', 'suspended', 'expired', 'payment_failed')),
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    cancelled_at TIMESTAMP,
    trial_ends_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paypal ON subscriptions(paypal_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Webhook events log (idempotency + audit)
CREATE TABLE IF NOT EXISTS paypal_webhook_events (
    id SERIAL PRIMARY KEY,
    event_id VARCHAR(100) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50),
    resource_id VARCHAR(100),
    payload JSONB,
    processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_id ON paypal_webhook_events(event_id);

-- Seed default plans
INSERT INTO plans (name, description, price, currency, type, tier)
VALUES 
    ('Pro Monthly', 'Monthly Pro subscription', 29.00, 'USD', 'subscription', 'pro'),
    ('Pro Yearly', 'Yearly Pro subscription (save 20%)', 279.00, 'USD', 'subscription', 'pro'),
    ('Pro Lifetime', 'One-time lifetime Pro access', 499.00, 'USD', 'one_time', 'pro')
ON CONFLICT DO NOTHING;

-- Portfolio Module Schema

-- Account sources (CEX, WALLET, MANUAL)
CREATE TABLE IF NOT EXISTS account_sources (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('cex', 'wallet', 'manual')),
    provider VARCHAR(50),          -- binance, bybit, okx, metamask, manual
    label VARCHAR(100),
    api_key_encrypted TEXT,        -- for CEX
    api_secret_encrypted TEXT,     -- for CEX
    wallet_address VARCHAR(100),   -- for WALLET
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_sources_user ON account_sources(user_id);

-- System categories (admin-managed)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(7) DEFAULT '#6366f1',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed system categories
INSERT INTO categories (name, description, color) VALUES
    ('Layer-1', 'Base layer blockchains', '#10b981'),
    ('DeFi', 'Decentralized finance', '#6366f1'),
    ('AI', 'Artificial intelligence tokens', '#f59e0b'),
    ('RWA', 'Real world assets', '#ec4899'),
    ('Meme', 'Meme coins', '#8b5cf6'),
    ('Gaming', 'Gaming and metaverse', '#06b6d4'),
    ('Stablecoins', 'Stable value assets', '#22c55e'),
    ('Equities', 'Stock indices and equities', '#3b82f6'),
    ('Commodities', 'Gold, silver, oil', '#eab308'),
    ('Other', 'Uncategorized', '#64748b')
ON CONFLICT (name) DO NOTHING;

-- User-defined categories
CREATE TABLE IF NOT EXISTS user_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6366f1',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, name)
);

-- Asset category mappings (user override has priority)
CREATE TABLE IF NOT EXISTS asset_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(20) NOT NULL,
    system_category_id INTEGER REFERENCES categories(id),
    user_category_id INTEGER REFERENCES user_categories(id),
    UNIQUE(user_id, asset_symbol)
);

-- Portfolio models (risk profiles)
CREATE TABLE IF NOT EXISTS portfolio_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    risk_level VARCHAR(20) CHECK (risk_level IN ('conservative', 'balanced', 'aggressive')),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model target allocations
CREATE TABLE IF NOT EXISTS portfolio_model_allocations (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES portfolio_models(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    target_weight DECIMAL(5, 2) NOT NULL, -- 0-100%
    UNIQUE(model_id, category_id)
);

-- Seed portfolio models
INSERT INTO portfolio_models (name, description, risk_level) VALUES
    ('Conservative', 'Low risk, stable assets heavy', 'conservative'),
    ('Balanced', 'Medium risk, diversified', 'balanced'),
    ('Aggressive', 'High risk, growth assets heavy', 'aggressive')
ON CONFLICT DO NOTHING;

-- Portfolio snapshots (assets per sync)
CREATE TABLE IF NOT EXISTS portfolio_assets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    source_id INTEGER REFERENCES account_sources(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(20) NOT NULL,
    asset_name VARCHAR(100),
    amount DECIMAL(20, 8) NOT NULL DEFAULT 0,
    avg_entry_price DECIMAL(20, 8),
    current_price DECIMAL(20, 8),
    unrealized_pnl DECIMAL(20, 2),
    unrealized_pnl_pct DECIMAL(10, 4),
    realized_pnl DECIMAL(20, 2),
    margin DECIMAL(20, 2),
    notional DECIMAL(20, 2),
    leverage INTEGER DEFAULT 1,
    side VARCHAR(10), -- LONG / SHORT / SPOT
    category_override INTEGER REFERENCES user_categories(id),
    sync_id UUID,
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolio_assets_user ON portfolio_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_symbol ON portfolio_assets(asset_symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_sync ON portfolio_assets(sync_id);

-- Portfolio history (aggregated per day)
CREATE TABLE IF NOT EXISTS portfolio_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_notional DECIMAL(20, 2),
    total_unrealized_pnl DECIMAL(20, 2),
    total_margin DECIMAL(20, 2),
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_history_user_date ON portfolio_history(user_id, date);

-- User model selection
CREATE TABLE IF NOT EXISTS user_portfolio_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    selected_model_id INTEGER REFERENCES portfolio_models(id),
    manual_portfolio_enabled BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
