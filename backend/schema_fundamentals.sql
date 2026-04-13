-- Fundamental metrics schema

CREATE TABLE IF NOT EXISTS fundamental_metrics (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) NOT NULL,
    metric_name VARCHAR(50) NOT NULL,  -- 'mvrv', 'nupl', 'funding_rate', 'composite'
    value DECIMAL(18, 8) NOT NULL,
    raw_data JSONB DEFAULT '{}',
    computed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(symbol, metric_name, computed_at)
);

CREATE INDEX IF NOT EXISTS idx_fundamentals_symbol_metric ON fundamental_metrics(symbol, metric_name);
CREATE INDEX IF NOT EXISTS idx_fundamentals_computed_at ON fundamental_metrics(computed_at DESC);
