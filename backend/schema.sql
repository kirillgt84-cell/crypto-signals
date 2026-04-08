-- PostgreSQL schema for SignalStream

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paper_accounts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER,
    symbol TEXT,
    balance REAL DEFAULT 10000,
    initial_balance REAL DEFAULT 10000
);

CREATE TABLE IF NOT EXISTS signals (
    id SERIAL PRIMARY KEY,
    symbol TEXT,
    direction TEXT CHECK(direction IN ('long','short')),
    entry_price REAL,
    target_price REAL,
    stop_price REAL,
    status TEXT DEFAULT 'active',
    confidence INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS paper_trades (
    id SERIAL PRIMARY KEY,
    account_id INTEGER,
    signal_id INTEGER,
    symbol TEXT,
    direction TEXT,
    entry_price REAL,
    exit_price REAL,
    quantity REAL,
    pnl REAL,
    status TEXT DEFAULT 'open',
    opened_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status);
CREATE INDEX IF NOT EXISTS idx_trades_account ON paper_trades(account_id);
