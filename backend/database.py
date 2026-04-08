import os
from typing import List, Dict, Any, Optional
from libsql_client import create_client
import logging

logger = logging.getLogger(__name__)

class TursoDB:
    def __init__(self):
        self.url = os.getenv('TURSO_DATABASE_URL')
        self.token = os.getenv('TURSO_AUTH_TOKEN')
        self._client = None
        
        # Fix URL format if needed
        if self.url:
            # Convert libsql:// to https:// for HRANA protocol
            if self.url.startswith('libsql://'):
                self.url = self.url.replace('libsql://', 'https://')
            elif self.url.startswith('wss://'):
                self.url = self.url.replace('wss://', 'https://')
        
        logger.info(f"TursoDB initialized with URL: {self.url[:30] if self.url else 'NOT SET'}...")
    
    async def connect(self):
        if not self.url: 
            raise ValueError("TURSO_DATABASE_URL not set")
        if not self.token:
            raise ValueError("TURSO_AUTH_TOKEN not set")
        
        try:
            self._client = create_client(url=self.url, auth_token=self.token)
            logger.info("Connected to Turso successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Turso: {e}")
            raise
    
    async def close(self):
        if self._client:
            await self._client.close()
            self._client = None
            logger.info("Turso connection closed")
    
    async def query(self, sql: str, args: List[Any] = None) -> List[Dict]:
        if not self._client: 
            await self.connect()
        
        try:
            result = await self._client.execute(sql, args or [])
            return [{col: row[i] for i, col in enumerate(result.columns)} for row in result.rows]
        except Exception as e:
            logger.error(f"Query failed: {sql[:50]}... Error: {e}")
            raise

_db = None
def get_db():
    global _db
    if _db is None: 
        _db = TursoDB()
    return _db

# Signals
async def get_active_signals() -> List[Dict]:
    """Get all active trading signals"""
    return await get_db().query(
        "SELECT * FROM signals WHERE status='active' ORDER BY created_at DESC"
    )

async def create_signal(symbol: str, direction: str, entry_price: float, 
                       target_price: float, stop_price: float, confidence: int) -> Optional[int]:
    """Create a new trading signal"""
    r = await get_db().query(
        """INSERT INTO signals (symbol, direction, entry_price, target_price, stop_price, confidence) 
           VALUES (?, ?, ?, ?, ?, ?) RETURNING id""",
        [symbol, direction, entry_price, target_price, stop_price, confidence]
    )
    return r[0]['id'] if r else None

async def update_signal_status(signal_id: int, status: str):
    """Update signal status (active/closed/cancelled)"""
    await get_db().query(
        "UPDATE signals SET status = ? WHERE id = ?",
        [status, signal_id]
    )

# Paper Trading Accounts
async def create_paper_account(user_id: int, symbol: str, balance: float = 10000.0) -> Optional[int]:
    """Create a new paper trading account"""
    r = await get_db().query(
        "INSERT INTO paper_accounts (user_id, symbol, balance, initial_balance) VALUES (?, ?, ?, ?) RETURNING id",
        [user_id, symbol, balance, balance]
    )
    return r[0]['id'] if r else None

async def get_account(account_id: int) -> Optional[Dict]:
    """Get account details"""
    r = await get_db().query(
        "SELECT * FROM paper_accounts WHERE id = ?",
        [account_id]
    )
    return r[0] if r else None

async def get_account_balance(account_id: int) -> float:
    """Get account current balance"""
    r = await get_db().query(
        "SELECT balance FROM paper_accounts WHERE id = ?",
        [account_id]
    )
    return r[0]['balance'] if r else 0.0

async def update_account_balance(account_id: int, new_balance: float):
    """Update account balance"""
    await get_db().query(
        "UPDATE paper_accounts SET balance = ? WHERE id = ?",
        [new_balance, account_id]
    )

# Paper Trades
async def create_paper_trade(account_id: int, signal_id: int, symbol: str, 
                            direction: str, entry_price: float, quantity: float) -> Optional[int]:
    """Open a new paper trade"""
    r = await get_db().query(
        """INSERT INTO paper_trades (account_id, signal_id, symbol, direction, entry_price, quantity, status) 
           VALUES (?, ?, ?, ?, ?, ?, 'open') RETURNING id""",
        [account_id, signal_id, symbol, direction, entry_price, quantity]
    )
    return r[0]['id'] if r else None

async def get_open_trades(account_id: int) -> List[Dict]:
    """Get all open trades for an account"""
    return await get_db().query(
        "SELECT * FROM paper_trades WHERE account_id = ? AND status = 'open'",
        [account_id]
    )

async def close_paper_trade(trade_id: int, exit_price: float) -> Optional[float]:
    """Close a paper trade and calculate PnL"""
    # Get trade details
    trade = await get_db().query(
        "SELECT * FROM paper_trades WHERE id = ? AND status = 'open'",
        [trade_id]
    )
    if not trade:
        return None
    
    trade = trade[0]
    entry_price = trade['entry_price']
    quantity = trade['quantity']
    direction = trade['direction']
    account_id = trade['account_id']
    
    # Calculate PnL
    if direction == 'long':
        pnl = (exit_price - entry_price) * quantity
    else:  # short
        pnl = (entry_price - exit_price) * quantity
    
    # Update trade record
    await get_db().query(
        """UPDATE paper_trades 
           SET status = 'closed', exit_price = ?, pnl = ?, closed_at = datetime('now') 
           WHERE id = ?""",
        [exit_price, pnl, trade_id]
    )
    
    # Update account balance
    current_balance = await get_account_balance(account_id)
    new_balance = current_balance + pnl
    await update_account_balance(account_id, new_balance)
    
    return pnl

async def get_account_stats(account_id: int) -> Dict:
    """Get comprehensive account statistics"""
    # Total trades
    total_result = await get_db().query(
        "SELECT COUNT(*) as count FROM paper_trades WHERE account_id = ? AND status = 'closed'",
        [account_id]
    )
    total_trades = total_result[0]['count'] if total_result else 0
    
    # Winning trades
    win_result = await get_db().query(
        "SELECT COUNT(*) as count FROM paper_trades WHERE account_id = ? AND status = 'closed' AND pnl > 0",
        [account_id]
    )
    winning_trades = win_result[0]['count'] if win_result else 0
    
    # Total PnL
    pnl_result = await get_db().query(
        "SELECT SUM(pnl) as total FROM paper_trades WHERE account_id = ? AND status = 'closed'",
        [account_id]
    )
    total_pnl = pnl_result[0]['total'] or 0.0
    
    # Gross profit and loss for profit factor
    gross_profit_result = await get_db().query(
        "SELECT SUM(pnl) as total FROM paper_trades WHERE account_id = ? AND status = 'closed' AND pnl > 0",
        [account_id]
    )
    gross_profit = gross_profit_result[0]['total'] or 0.0
    
    gross_loss_result = await get_db().query(
        "SELECT ABS(SUM(pnl)) as total FROM paper_trades WHERE account_id = ? AND status = 'closed' AND pnl < 0",
        [account_id]
    )
    gross_loss = gross_loss_result[0]['total'] or 0.0
    
    # Average profit/loss
    avg_profit_result = await get_db().query(
        "SELECT AVG(pnl) as avg FROM paper_trades WHERE account_id = ? AND status = 'closed' AND pnl > 0",
        [account_id]
    )
    avg_profit = avg_profit_result[0]['avg'] or 0.0
    
    avg_loss_result = await get_db().query(
        "SELECT AVG(pnl) as avg FROM paper_trades WHERE account_id = ? AND status = 'closed' AND pnl < 0",
        [account_id]
    )
    avg_loss = avg_loss_result[0]['avg'] or 0.0
    
    winrate = (winning_trades / total_trades * 100) if total_trades > 0 else 0.0
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else 0.0
    
    return {
        'total_trades': total_trades,
        'winning_trades': winning_trades,
        'losing_trades': total_trades - winning_trades,
        'winrate': round(winrate, 2),
        'total_pnl': round(total_pnl, 2),
        'profit_factor': round(profit_factor, 2),
        'gross_profit': round(gross_profit, 2),
        'gross_loss': round(gross_loss, 2),
        'avg_profit': round(avg_profit, 2),
        'avg_loss': round(avg_loss, 2),
    }

async def get_recent_trades(account_id: int, limit: int = 10) -> List[Dict]:
    """Get recent closed trades"""
    return await get_db().query(
        """SELECT * FROM paper_trades 
           WHERE account_id = ? AND status = 'closed' 
           ORDER BY closed_at DESC LIMIT ?""",
        [account_id, limit]
    )
