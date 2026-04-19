-- PostgreSQL schema for OI Dashboard
-- Таблица для истории Open Interest (time-series)
CREATE TABLE IF NOT EXISTS oi_history (
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    open_interest DOUBLE PRECISION,
    price DOUBLE PRECISION,
    volume DOUBLE PRECISION,
    spot_volume DOUBLE PRECISION,
    funding_rate DOUBLE PRECISION,
    PRIMARY KEY (time, symbol, timeframe)
);

-- Добавляем колонку spot_volume если её нет (для обратной совместимости)
ALTER TABLE oi_history ADD COLUMN IF NOT EXISTS spot_volume DOUBLE PRECISION;

-- Индекс для быстрого поиска последних данных
CREATE INDEX IF NOT EXISTS idx_oi_latest ON oi_history(symbol, timeframe, time DESC);

-- Таблица для журнала сделок (ручной ввод)
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20),
    direction VARCHAR(10), -- LONG/SHORT
    entry_price DECIMAL,
    stop_price DECIMAL,
    target_price DECIMAL,
    quantity DECIMAL,
    checklist_score INTEGER, -- 0-7 на момент входа
    entry_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    exit_time TIMESTAMP,
    exit_price DECIMAL,
    pnl DECIMAL,
    notes TEXT,
    status VARCHAR(20) DEFAULT 'open'
);

-- Таблица для кэширования CVD (опционально)
CREATE TABLE IF NOT EXISTS cvd_cache (
    symbol VARCHAR(20) PRIMARY KEY,
    cvd_value DOUBLE PRECISION,
    net_delta DOUBLE PRECISION,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bitcoin Spot ETF flows (from Farside Investors)
CREATE TABLE IF NOT EXISTS etf_flows (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    fund_ticker VARCHAR(20) NOT NULL,
    fund_name VARCHAR(100) NOT NULL,
    flow_usd DOUBLE PRECISION,
    btc_price DOUBLE PRECISION,
    UNIQUE(date, fund_ticker)
);

CREATE INDEX IF NOT EXISTS idx_etf_flows_date ON etf_flows(date DESC);
CREATE INDEX IF NOT EXISTS idx_etf_flows_ticker ON etf_flows(fund_ticker);

-- ETF fund calculated stats
CREATE TABLE IF NOT EXISTS etf_fund_stats (
    fund_ticker VARCHAR(20) PRIMARY KEY,
    fund_name VARCHAR(100) NOT NULL,
    launch_date DATE,
    total_invested_usd DOUBLE PRECISION DEFAULT 0,
    total_btc_held DOUBLE PRECISION DEFAULT 0,
    avg_btc_price DOUBLE PRECISION DEFAULT 0,
    latest_aum_usd DOUBLE PRECISION DEFAULT 0,
    unrealized_pnl_usd DOUBLE PRECISION DEFAULT 0,
    unrealized_pnl_pct DOUBLE PRECISION DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ETF daily aggregated summary (AUM, BTC held, total flow)
CREATE TABLE IF NOT EXISTS etf_daily_summary (
    date DATE PRIMARY KEY,
    total_flow_usd DOUBLE PRECISION,
    total_aum_usd DOUBLE PRECISION,
    total_btc_held DOUBLE PRECISION,
    btc_price DOUBLE PRECISION,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_etf_daily_summary_date ON etf_daily_summary(date DESC);

-- Heatmap snapshots for volume/OI change tracking (Binance Futures)
CREATE TABLE IF NOT EXISTS heatmap_snapshots (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    category VARCHAR(30),
    price DOUBLE PRECISION,
    volume_24h DOUBLE PRECISION,
    quote_volume_24h DOUBLE PRECISION,
    price_change_pct DOUBLE PRECISION,
    oi DOUBLE PRECISION,
    snapshot_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, snapshot_time)
);

CREATE INDEX IF NOT EXISTS idx_heatmap_time ON heatmap_snapshots(snapshot_time);
CREATE INDEX IF NOT EXISTS idx_heatmap_symbol_time ON heatmap_snapshots(symbol, snapshot_time);

-- Anomaly signals table (Volume Spike / OI Anomaly Scanner)
CREATE TABLE IF NOT EXISTS anomaly_signals (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    base_asset VARCHAR(20),
    category VARCHAR(30),
    direction VARCHAR(10) NOT NULL,
    score INTEGER NOT NULL,
    volume_ratio DOUBLE PRECISION,
    oi_change_pct DOUBLE PRECISION,
    price_change_24h_pct DOUBLE PRECISION,
    price DOUBLE PRECISION,
    quote_volume_24h DOUBLE PRECISION,
    confidence VARCHAR(10) NOT NULL,
    details TEXT,
    triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, triggered_at)
);

CREATE INDEX IF NOT EXISTS idx_anomaly_active ON anomaly_signals(expires_at, score DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_symbol ON anomaly_signals(symbol, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomaly_category ON anomaly_signals(category, score DESC);

-- ========== PORTFOLIO MODULE ==========

CREATE TABLE IF NOT EXISTS account_sources (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL, -- 'cex', 'web3', 'manual'
    provider VARCHAR(30) NOT NULL, -- 'binance', 'bybit', 'okx', 'metamask', 'manual', etc.
    label VARCHAR(100),
    api_key_encrypted TEXT,
    api_secret_encrypted TEXT,
    wallet_address VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_account_sources_user ON account_sources(user_id);

CREATE TABLE IF NOT EXISTS portfolio_assets (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_id INTEGER REFERENCES account_sources(id) ON DELETE SET NULL,
    asset_symbol VARCHAR(30) NOT NULL,
    asset_name VARCHAR(100),
    amount DOUBLE PRECISION NOT NULL,
    avg_entry_price DOUBLE PRECISION DEFAULT 0,
    current_price DOUBLE PRECISION DEFAULT 0,
    unrealized_pnl DOUBLE PRECISION DEFAULT 0,
    unrealized_pnl_pct DOUBLE PRECISION DEFAULT 0,
    notional DOUBLE PRECISION DEFAULT 0,
    margin DOUBLE PRECISION DEFAULT 0,
    leverage DOUBLE PRECISION DEFAULT 1,
    side VARCHAR(10) DEFAULT 'LONG',
    sync_id VARCHAR(50),
    synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, source_id, asset_symbol, sync_id)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_assets_user ON portfolio_assets(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_assets_sync ON portfolio_assets(sync_id);

CREATE TABLE IF NOT EXISTS portfolio_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    total_notional DOUBLE PRECISION DEFAULT 0,
    total_unrealized_pnl DOUBLE PRECISION DEFAULT 0,
    total_margin DOUBLE PRECISION DEFAULT 0,
    UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_portfolio_history_user_date ON portfolio_history(user_id, date DESC);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    color VARCHAR(20) DEFAULT '#6366f1',
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO categories (name, description, color) VALUES
    ('L1', 'Layer 1 blockchains', '#ef4444'),
    ('DeFi', 'Decentralized Finance', '#22c55e'),
    ('RWA', 'Real World Assets', '#f59e0b'),
    ('AI', 'Artificial Intelligence tokens', '#3b82f6'),
    ('Gaming', 'Gaming & Metaverse', '#8b5cf6'),
    ('Meme', 'Meme coins', '#ec4899'),
    ('Infrastructure', 'Web3 Infrastructure', '#06b6d4'),
    ('Stablecoins', 'Stablecoins', '#10b981'),
    ('Other', 'Uncategorized', '#9ca3af')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_categories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) DEFAULT '#6366f1',
    UNIQUE(user_id, name)
);

CREATE TABLE IF NOT EXISTS asset_categories (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(30) NOT NULL,
    system_category_id INTEGER REFERENCES categories(id),
    user_category_id INTEGER REFERENCES user_categories(id),
    PRIMARY KEY (user_id, asset_symbol)
);

CREATE TABLE IF NOT EXISTS portfolio_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    risk_level VARCHAR(20) NOT NULL, -- 'conservative', 'balanced', 'aggressive'
    is_active BOOLEAN DEFAULT TRUE
);

INSERT INTO portfolio_models (name, description, risk_level) VALUES
    ('Conservative', 'Focus on stablecoins and blue-chip L1s', 'conservative'),
    ('Balanced', 'Diversified across DeFi, L1, and infrastructure', 'balanced'),
    ('Aggressive', 'High exposure to AI, gaming, and emerging sectors', 'aggressive')
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS portfolio_model_allocations (
    id SERIAL PRIMARY KEY,
    model_id INTEGER NOT NULL REFERENCES portfolio_models(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES categories(id),
    target_weight DOUBLE PRECISION NOT NULL, -- percentage (e.g., 40.0)
    UNIQUE(model_id, category_id)
);

INSERT INTO portfolio_model_allocations (model_id, category_id, target_weight)
SELECT m.id, c.id, w.weight
FROM (VALUES
    ('Conservative', 'Stablecoins', 50.0),
    ('Conservative', 'L1', 30.0),
    ('Conservative', 'DeFi', 10.0),
    ('Conservative', 'Infrastructure', 10.0),
    ('Balanced', 'L1', 30.0),
    ('Balanced', 'DeFi', 25.0),
    ('Balanced', 'Infrastructure', 15.0),
    ('Balanced', 'Stablecoins', 10.0),
    ('Balanced', 'AI', 10.0),
    ('Balanced', 'Gaming', 5.0),
    ('Balanced', 'RWA', 5.0),
    ('Aggressive', 'AI', 25.0),
    ('Aggressive', 'Gaming', 20.0),
    ('Aggressive', 'DeFi', 15.0),
    ('Aggressive', 'L1', 15.0),
    ('Aggressive', 'Meme', 10.0),
    ('Aggressive', 'Infrastructure', 10.0),
    ('Aggressive', 'RWA', 5.0)
) AS w(model, category, weight)
JOIN portfolio_models m ON m.name = w.model
JOIN categories c ON c.name = w.category
ON CONFLICT (model_id, category_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_portfolio_settings (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    selected_model_id INTEGER REFERENCES portfolio_models(id),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_rebalance_suggestions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    model_id INTEGER REFERENCES portfolio_models(id),
    suggestions JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add market_type to account_sources for spot/futures distinction
ALTER TABLE account_sources ADD COLUMN IF NOT EXISTS market_type VARCHAR(20) DEFAULT 'futures';

-- ========== PORTFOLIO ALERTS ==========

CREATE TABLE IF NOT EXISTS portfolio_alert_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    alert_type VARCHAR(30) NOT NULL, -- 'liquidation', 'pnl_up', 'pnl_down'
    threshold DOUBLE PRECISION NOT NULL, -- pct for pnl, distance pct for liquidation
    enabled BOOLEAN DEFAULT TRUE,
    UNIQUE(user_id, alert_type)
);

CREATE TABLE IF NOT EXISTS portfolio_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    asset_symbol VARCHAR(30) NOT NULL,
    alert_type VARCHAR(30) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_portfolio_alerts_user ON portfolio_alerts(user_id, is_read, created_at DESC);
