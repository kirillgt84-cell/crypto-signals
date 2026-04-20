-- Схема базы данных Yield Curve Intelligence
-- TimescaleDB для time-series данных

-- 1. Основные таблицы yield curve
CREATE TABLE treasury_yields (
    time TIMESTAMPTZ NOT NULL,
    tenor VARCHAR(10) NOT NULL,
    yield_pct DECIMAL(6,3) NOT NULL,
    source VARCHAR(50) DEFAULT 'FRED',
    PRIMARY KEY (time, tenor)
);

-- Конвертация в hypertable для TimescaleDB
SELECT create_hypertable('treasury_yields', 'time', if_not_exists => TRUE);

-- Индексы
CREATE INDEX idx_treasury_yields_tenor ON treasury_yields (tenor, time DESC);

-- 2. Спреды (рассчитанные)
CREATE TABLE yield_spreads (
    time TIMESTAMPTZ NOT NULL PRIMARY KEY,
    spread_10y_2y DECIMAL(6,3),
    spread_10y_3m DECIMAL(6,3),
    spread_5y_2y DECIMAL(6,3),
    spread_30y_10y DECIMAL(6,3),
    curve_shape VARCHAR(20),
    is_inverted BOOLEAN DEFAULT FALSE,
    inversion_start_date DATE,
    inversion_duration_days INTEGER
);

SELECT create_hypertable('yield_spreads', 'time', if_not_exists => TRUE);

-- 3. Вероятность рецессии
CREATE TABLE recession_probability (
    time TIMESTAMPTZ NOT NULL PRIMARY KEY,
    probability_12m DECIMAL(5,2),
    spread_used DECIMAL(6,3),
    model VARCHAR(100),
    confidence VARCHAR(20)
);

SELECT create_hypertable('recession_probability', 'time', if_not_exists => TRUE);

-- 4. Даты рецессий (NBER)
CREATE TABLE recession_periods (
    id SERIAL PRIMARY KEY,
    start_date DATE NOT NULL,
    end_date DATE,
    name VARCHAR(100),
    description TEXT,
    peak_to_trough_sp500 DECIMAL(5,2)
);

-- 5. Рыночные данные для cross-market анализа
CREATE TABLE market_data (
    time TIMESTAMPTZ NOT NULL,
    asset VARCHAR(50) NOT NULL,  -- SP500, NASDAQ, BTC, DXY, GOLD, OIL
    price DECIMAL(12,4),
    change_pct DECIMAL(8,4),
    volume BIGINT,
    PRIMARY KEY (time, asset)
);

SELECT create_hypertable('market_data', 'time', if_not_exists => TRUE);

-- 6. Исторические кейсы для pattern matching
CREATE TABLE historical_cases (
    id SERIAL PRIMARY KEY,
    period_name VARCHAR(50),  -- "2006-2007", "2000", "1978-1980"
    start_date DATE NOT NULL,
    end_date DATE,
    recession_followed BOOLEAN,
    recession_start_date DATE,
    lead_time_months INTEGER,
    max_10y2y_spread DECIMAL(6,3),
    min_10y2y_spread DECIMAL(6,3),
    max_10y3m_spread DECIMAL(6,3),
    min_10y3m_spread DECIMAL(6,3),
    sp500_change_pct DECIMAL(6,2),
    nasdaq_change_pct DECIMAL(6,2),
    gold_change_pct DECIMAL(6,2),
    dxy_change_pct DECIMAL(6,2),
    context_description TEXT,
    key_events TEXT[],
    similarity_vector JSONB  -- для быстрого сравнения
);

-- 7. Сигналы и алерты
CREATE TABLE signals (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    signal_type VARCHAR(50),  -- YIELD_CURVE, RECESSION, MARKET_REGIME
    level VARCHAR(20),        -- INFO, WATCH, WARNING, CRITICAL
    title VARCHAR(200),
    message TEXT,
    metrics JSONB,
    historical_analog_id INTEGER REFERENCES historical_cases(id),
    is_active BOOLEAN DEFAULT TRUE,
    resolved_at TIMESTAMPTZ,
    notified BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_signals_active ON signals (is_active, created_at DESC);
CREATE INDEX idx_signals_level ON signals (level, is_active);

-- 8. Корреляции (rolling)
CREATE TABLE correlations (
    time TIMESTAMPTZ NOT NULL,
    asset_1 VARCHAR(50) NOT NULL,
    asset_2 VARCHAR(50) NOT NULL,
    window_days INTEGER NOT NULL,
    correlation DECIMAL(5,4),
    p_value DECIMAL(6,5),
    PRIMARY KEY (time, asset_1, asset_2, window_days)
);

SELECT create_hypertable('correlations', 'time', if_not_exists => TRUE);

-- 9. Метаданные обновлений
CREATE TABLE data_refresh_log (
    id SERIAL PRIMARY KEY,
    refresh_time TIMESTAMPTZ DEFAULT NOW(),
    data_source VARCHAR(50),
    records_processed INTEGER,
    status VARCHAR(20),
    error_message TEXT
);

-- Вставка исторических рецессий
INSERT INTO recession_periods (start_date, end_date, name, description, peak_to_trough_sp500) VALUES
('1969-12-01', '1970-11-01', '1969-1970 Recession', 'Monetary tightening, inflation', -36.1),
('1973-11-01', '1975-03-01', '1973-1975 Recession', 'Oil shock, stagflation', -48.2),
('1980-01-01', '1980-07-01', '1980 Recession', 'Double dip part 1', -17.1),
('1981-07-01', '1982-11-01', '1981-1982 Recession', 'Double dip part 2, Volcker', -27.1),
('1990-07-01', '1991-03-01', '1990-1991 Recession', 'S&L Crisis, Gulf War', -20.0),
('2001-03-01', '2001-11-01', '2001 Recession', 'Dot-com bust, 9/11', -49.1),
('2007-12-01', '2009-06-01', 'Great Recession', 'Financial crisis, housing bubble', -56.8),
('2020-02-01', '2020-04-01', 'COVID-19 Recession', 'Pandemic shock', -33.9);

-- Вставка ключевых исторических кейсов для pattern matching
INSERT INTO historical_cases (
    period_name, start_date, end_date, recession_followed, recession_start_date,
    lead_time_months, min_10y2y_spread, min_10y3m_spread, sp500_change_pct,
    context_description, key_events
) VALUES
('2006-2007', '2006-01-31', '2007-06-01', TRUE, '2007-12-01', 23, -0.16, -0.50, -56.8, 
 'Longest inversion in history preceded worst financial crisis since Great Depression',
 ARRAY['Housing bubble peak', 'Subprime mortgage crisis', 'Lehman Brothers collapse']),

('2000', '2000-04-01', '2000-12-31', TRUE, '2001-03-01', 11, -0.47, -0.80, -49.1,
 'Dot-com bubble burst following tech overvaluation',
 ARRAY['NASDAQ peak 5048', 'Dot-com crash', '9/11 attacks']),

('1989', '1989-01-01', '1989-08-31', TRUE, '1990-07-01', 11, -0.34, -0.40, -20.0,
 'S&L crisis and Gulf War buildup',
 ARRAY['Savings and Loan crisis', 'Drexel Burnham collapse', 'Gulf War I']),

('1978-1980', '1978-11-01', '1980-05-31', TRUE, '1980-01-01', 2, -2.00, -3.50, -17.1,
 'Volcker shock - extreme inversion with 20% Fed Funds',
 ARRAY['Oil crisis 1979', 'Volcker hikes to 20%', 'Double dip recession']),

('1998', '1998-05-01', '1998-07-31', FALSE, NULL, NULL, -0.05, -0.08, 35.0,
 'False positive - LTCM crisis but no recession due to Fed intervention',
 ARRAY['LTCM collapse', 'Russian default', 'Fed organized bailout']),

('1966', '1966-08-01', '1966-12-31', FALSE, NULL, NULL, -0.10, -0.15, 12.0,
 'Credit crunch but soft landing achieved',
 ARRAY['Vietnam War spending', 'Credit crunch', 'No Fed pivot']);

-- Функция для определения фазы кривой
CREATE OR REPLACE FUNCTION determine_curve_phase(
    spread_10y2y DECIMAL,
    spread_10y3m DECIMAL
) RETURNS VARCHAR(20) AS $$
BEGIN
    IF spread_10y2y < -0.10 THEN
        RETURN 'INVERTED';
    ELSIF spread_10y2y < 0.25 THEN
        RETURN 'FLAT';
    ELSIF spread_10y3m > 2.0 THEN
        RETURN 'STEEP';
    ELSE
        RETURN 'NORMAL';
    END IF;
END;
$$ LANGUAGE plpgsql;