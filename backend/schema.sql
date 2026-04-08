CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, email TEXT UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS paper_accounts (id INTEGER PRIMARY KEY, user_id INTEGER, symbol TEXT, balance REAL DEFAULT 10000, initial_balance REAL DEFAULT 10000);
CREATE TABLE IF NOT EXISTS signals (id INTEGER PRIMARY KEY, symbol TEXT, direction TEXT CHECK(direction IN ('long','short')), entry_price REAL, target_price REAL, stop_price REAL, status TEXT DEFAULT 'active', confidence INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS paper_trades (id INTEGER PRIMARY KEY, account_id INTEGER, signal_id INTEGER, symbol TEXT, direction TEXT, entry_price REAL, exit_price REAL, quantity REAL, pnl REAL, status TEXT DEFAULT 'open', opened_at DATETIME DEFAULT CURRENT_TIMESTAMP, closed_at DATETIME);
CREATE INDEX idx_signals_status ON signals(status);
CREATE INDEX idx_trades_account ON paper_trades(account_id);
