-- PostgreSQL schema for OI Dashboard
-- Таблица для истории Open Interest (time-series)
CREATE TABLE IF NOT EXISTS oi_history (
    time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    open_interest DOUBLE PRECISION,
    price DOUBLE PRECISION,
    volume DOUBLE PRECISION,
    funding_rate DOUBLE PRECISION,
    PRIMARY KEY (time, symbol, timeframe)
);

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
