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
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_activated_at TIMESTAMP DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_expires_at TIMESTAMP DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS trial_source VARCHAR(50) DEFAULT NULL;

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

-- Email verification codes
CREATE TABLE IF NOT EXISTS email_verification_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

-- Portfolio model migrations
ALTER TABLE portfolio_models ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT FALSE;
ALTER TABLE portfolio_models ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS portfolio_model_assets (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES portfolio_models(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(20) NOT NULL,
    asset_name VARCHAR(50),
    target_weight DECIMAL(5, 2) NOT NULL,
    UNIQUE(model_id, asset_symbol)
);

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

-- Add testnet flag to account_sources for Binance testnet connections
ALTER TABLE account_sources ADD COLUMN IF NOT EXISTS testnet BOOLEAN DEFAULT FALSE;

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
    risk_level VARCHAR(20) CHECK (risk_level IN ('conservative', 'balanced', 'aggressive', 'custom')),
    is_custom BOOLEAN DEFAULT FALSE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Model target allocations by category (legacy)
CREATE TABLE IF NOT EXISTS portfolio_model_allocations (
    id SERIAL PRIMARY KEY,
    model_id INTEGER REFERENCES portfolio_models(id) ON DELETE CASCADE,
    category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
    target_weight DECIMAL(5, 2) NOT NULL, -- 0-100%
    UNIQUE(model_id, category_id)
);

-- Model target allocations by specific asset
CREATE TABLE IF NOT EXISTS portfolio_model_assets (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES portfolio_models(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(20) NOT NULL,
    asset_name VARCHAR(50),
    target_weight DECIMAL(5, 2) NOT NULL,
    UNIQUE(model_id, asset_symbol)
);

-- Seed portfolio models
INSERT INTO portfolio_models (name, description, risk_level, is_custom) VALUES
    ('Conservative', 'Low risk, stable assets heavy', 'conservative', FALSE),
    ('Balanced', 'Medium risk, diversified', 'balanced', FALSE),
    ('Aggressive', 'High risk, growth assets heavy', 'aggressive', FALSE)
ON CONFLICT DO NOTHING;

-- Seed asset allocations for system models
INSERT INTO portfolio_model_assets (model_id, asset_symbol, asset_name, target_weight)
SELECT m.id, a.asset_symbol, a.asset_name, a.weight
FROM portfolio_models m
JOIN (VALUES
    -- Conservative
    ('Conservative', 'GOLD', 'Gold & Silver', 10.0),
    ('Conservative', 'BONDS', 'US Treasuries / BUIDL', 40.0),
    ('Conservative', 'BTC', 'Bitcoin', 3.0),
    ('Conservative', 'ETH', 'Ethereum', 2.0),
    ('Conservative', 'USDC', 'USDC / USDT', 10.0),
    ('Conservative', 'SPX', 'S&P 500', 20.0),
    ('Conservative', 'KO', 'Coca-Cola, Pepsi, P&G, Nestle', 15.0),
    -- Balanced
    ('Balanced', 'GOLD', 'Gold & Silver', 10.0),
    ('Balanced', 'BONDS', 'US Treasuries / BUIDL', 15.0),
    ('Balanced', 'BTC', 'Bitcoin', 12.0),
    ('Balanced', 'ETH', 'Ethereum', 8.0),
    ('Balanced', 'SOL', 'Solana', 5.0),
    ('Balanced', 'XRP', 'XRP', 5.0),
    ('Balanced', 'BNB', 'BNB', 5.0),
    ('Balanced', 'USDC', 'USDC / USDT', 5.0),
    ('Balanced', 'SPX', 'S&P 500', 10.0),
    ('Balanced', 'NDX', 'Nasdaq', 15.0),
    ('Balanced', 'COIN', 'Coinbase', 5.0),
    ('Balanced', 'MSTR', 'MicroStrategy', 5.0),
    -- Aggressive
    ('Aggressive', 'GOLD', 'Gold & Silver', 5.0),
    ('Aggressive', 'BTC', 'Bitcoin', 18.0),
    ('Aggressive', 'ETH', 'Ethereum', 12.0),
    ('Aggressive', 'SOL', 'Solana', 8.0),
    ('Aggressive', 'XRP', 'XRP', 8.0),
    ('Aggressive', 'BNB', 'BNB', 9.0),
    ('Aggressive', 'SPX', 'S&P 500', 5.0),
    ('Aggressive', 'NDX', 'Nasdaq', 15.0),
    ('Aggressive', 'COIN', 'Coinbase', 10.0),
    ('Aggressive', 'MSTR', 'MicroStrategy', 10.0)
) AS a(model_name, asset_symbol, asset_name, weight)
ON m.name = a.model_name
ON CONFLICT (model_id, asset_symbol) DO UPDATE SET target_weight = EXCLUDED.target_weight, asset_name = EXCLUDED.asset_name;

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

-- ========== PROMO CODE MODULE ==========

CREATE TABLE IF NOT EXISTS promo_codes (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    partner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    partner_name VARCHAR(100),
    max_uses INTEGER DEFAULT NULL,
    current_uses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    valid_until TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    trial_days INTEGER DEFAULT 7,
    trial_tier VARCHAR(20) DEFAULT 'pro',
    discount_percent INTEGER DEFAULT 0,
    discount_applies_to VARCHAR(20) DEFAULT NULL,
    is_referral_linked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_partner ON promo_codes(partner_id);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active, valid_until);

CREATE TABLE IF NOT EXISTS promo_code_activations (
    id SERIAL PRIMARY KEY,
    promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    activated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    converted_to_tier VARCHAR(20) DEFAULT NULL,
    converted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    ip_address INET,
    user_agent TEXT,
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_activations_user ON promo_code_activations(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_activations_code ON promo_code_activations(promo_code_id);
CREATE INDEX IF NOT EXISTS idx_promo_activations_status ON promo_code_activations(status, expires_at);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_hash ON password_reset_tokens(token_hash);
