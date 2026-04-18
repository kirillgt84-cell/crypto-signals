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
