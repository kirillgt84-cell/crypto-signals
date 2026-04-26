-- Referral Program Migration

-- Partner referral codes
CREATE TABLE IF NOT EXISTS referral_codes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    total_referrals INTEGER DEFAULT 0,
    active_referrals INTEGER DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    available_balance DECIMAL(10,2) DEFAULT 0.00,
    withdrawn_balance DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user ON referral_codes(user_id);

-- Referral tracking
CREATE TABLE IF NOT EXISTS referrals (
    id SERIAL PRIMARY KEY,
    referrer_code_id INTEGER NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
    referred_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'registered',
    joined_at TIMESTAMP DEFAULT NOW(),
    converted_at TIMESTAMP,
    cancelled_at TIMESTAMP,
    revenue_generated DECIMAL(10,2) DEFAULT 0.00,
    reward_earned DECIMAL(10,2) DEFAULT 0.00,
    UNIQUE(referred_user_id)
);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_code_id);
CREATE INDEX IF NOT EXISTS idx_referrals_user ON referrals(referred_user_id);

-- Referral transactions
CREATE TABLE IF NOT EXISTS referral_transactions (
    id SERIAL PRIMARY KEY,
    referral_code_id INTEGER REFERENCES referral_codes(id) ON DELETE CASCADE,
    referral_id INTEGER REFERENCES referrals(id) ON DELETE SET NULL,
    user_id INTEGER REFERENCES users(id),
    type VARCHAR(20) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    description TEXT,
    paypal_transaction_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ref_tx_code ON referral_transactions(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_ref_tx_user ON referral_transactions(user_id);

-- User columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by_code VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_discount_used BOOLEAN DEFAULT FALSE;
