import os
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Use asyncpg for PostgreSQL
try:
    import asyncpg
    ASYNCPG_AVAILABLE = True
except ImportError:
    ASYNCPG_AVAILABLE = False
    logger.error("asyncpg is required")
    raise

class PostgresDB:
    def __init__(self):
        self.database_url = os.getenv('DATABASE_URL')  # Railway provides this
        self._pool = None
        
        logger.info(f"PostgresDB initialized")
    
    async def connect(self):
        if not self.database_url: 
            raise ValueError("DATABASE_URL not set")
        
        # Create connection pool
        self._pool = await asyncpg.create_pool(
            self.database_url,
            min_size=1,
            max_size=10
        )
        logger.info("Connected to PostgreSQL successfully")
    
    async def close(self):
        if self._pool:
            await self._pool.close()
            self._pool = None
            logger.info("PostgreSQL connection closed")
    
    async def query(self, sql: str, args: List[Any] = None) -> List[Dict]:
        """Execute SQL query and return results as list of dicts"""
        if not self._pool: 
            await self.connect()
        
        # Convert ? placeholders to $1, $2, etc. for PostgreSQL
        sql = self._convert_placeholders(sql)
        
        try:
            async with self._pool.acquire() as conn:
                if args:
                    rows = await conn.fetch(sql, *args)
                else:
                    rows = await conn.fetch(sql)
                
                # Convert to list of dicts
                return [dict(row) for row in rows]
                
        except Exception as e:
            logger.error(f"Query failed: {sql[:50]}... Error: {e}")
            raise
    
    async def execute(self, sql: str, args: List[Any] = None) -> str:
        """Execute SQL without returning rows (INSERT, UPDATE, etc.)"""
        if not self._pool: 
            await self.connect()
        
        sql = self._convert_placeholders(sql)
        
        try:
            async with self._pool.acquire() as conn:
                if args:
                    result = await conn.execute(sql, *args)
                else:
                    result = await conn.execute(sql)
                return result
        except Exception as e:
            logger.error(f"Execute failed: {sql[:50]}... Error: {e}")
            raise
    
    def _convert_placeholders(self, sql: str) -> str:
        """Convert SQLite-style ? placeholders to PostgreSQL $1, $2, etc."""
        import re
        counter = [0]
        def replace(match):
            counter[0] += 1
            return f'${counter[0]}'
        return re.sub(r'\?', replace, sql)

_db = None
def get_db():
    global _db
    if _db is None: 
        _db = PostgresDB()
    return _db

# Signals
async def get_active_signals() -> List[Dict]:
    """Get all active trading signals"""
    try:
        return await get_db().query(
            "SELECT * FROM signals WHERE status='active' ORDER BY created_at DESC"
        )
    except Exception as e:
        logger.error(f"get_active_signals failed: {e}")
        return []

async def create_signal(symbol: str, direction: str, entry_price: float, 
                       target_price: float, stop_price: float, confidence: int) -> Optional[int]:
    """Create a new trading signal"""
    try:
        sql = """INSERT INTO signals (symbol, direction, entry_price, target_price, stop_price, confidence) 
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id"""
        rows = await get_db().query(sql, [symbol, direction, entry_price, target_price, stop_price, confidence])
        return rows[0].get('id') if rows else None
    except Exception as e:
        logger.error(f"create_signal failed: {e}")
        return None

async def update_signal_status(signal_id: int, status: str):
    """Update signal status"""
    try:
        await get_db().execute(
            "UPDATE signals SET status = $1 WHERE id = $2",
            [status, signal_id]
        )
    except Exception as e:
        logger.error(f"update_signal_status failed: {e}")

# Paper Trading Accounts
async def create_paper_account(user_id: int, symbol: str, balance: float = 10000.0) -> Optional[int]:
    """Create a new paper trading account"""
    try:
        rows = await get_db().query(
            "INSERT INTO paper_accounts (user_id, symbol, balance, initial_balance) VALUES ($1, $2, $3, $4) RETURNING id",
            [user_id, symbol, balance, balance]
        )
        return rows[0].get('id') if rows else None
    except Exception as e:
        logger.error(f"create_paper_account failed: {e}")
        return None

async def get_account(account_id: int) -> Optional[Dict]:
    """Get account details"""
    try:
        rows = await get_db().query(
            "SELECT * FROM paper_accounts WHERE id = $1",
            [account_id]
        )
        return rows[0] if rows else None
    except Exception as e:
        logger.error(f"get_account failed: {e}")
        return None

async def get_account_balance(account_id: int) -> float:
    """Get account current balance"""
    try:
        rows = await get_db().query(
            "SELECT balance FROM paper_accounts WHERE id = $1",
            [account_id]
        )
        return rows[0].get('balance', 0.0) if rows else 0.0
    except Exception as e:
        logger.error(f"get_account_balance failed: {e}")
        return 0.0

async def update_account_balance(account_id: int, new_balance: float):
    """Update account balance"""
    try:
        await get_db().execute(
            "UPDATE paper_accounts SET balance = $1 WHERE id = $2",
            [new_balance, account_id]
        )
    except Exception as e:
        logger.error(f"update_account_balance failed: {e}")

# Paper Trades
async def create_paper_trade(account_id: int, signal_id: int, symbol: str, 
                            direction: str, entry_price: float, quantity: float) -> Optional[int]:
    """Open a new paper trade"""
    try:
        rows = await get_db().query(
            """INSERT INTO paper_trades (account_id, signal_id, symbol, direction, entry_price, quantity, status) 
               VALUES ($1, $2, $3, $4, $5, $6, 'open') RETURNING id""",
            [account_id, signal_id, symbol, direction, entry_price, quantity]
        )
        return rows[0].get('id') if rows else None
    except Exception as e:
        logger.error(f"create_paper_trade failed: {e}")
        return None

async def get_open_trades(account_id: int) -> List[Dict]:
    """Get all open trades for an account"""
    try:
        return await get_db().query(
            "SELECT * FROM paper_trades WHERE account_id = $1 AND status = 'open'",
            [account_id]
        )
    except Exception as e:
        logger.error(f"get_open_trades failed: {e}")
        return []

async def close_paper_trade(trade_id: int, exit_price: float) -> Optional[float]:
    """Close a paper trade and calculate PnL"""
    try:
        trades = await get_db().query(
            "SELECT * FROM paper_trades WHERE id = $1 AND status = 'open'",
            [trade_id]
        )
        if not trades:
            return None
        
        trade = trades[0]
        entry_price = trade.get('entry_price', 0)
        quantity = trade.get('quantity', 0)
        direction = trade.get('direction', 'long')
        account_id = trade.get('account_id')
        
        if direction == 'long':
            pnl = (exit_price - entry_price) * quantity
        else:
            pnl = (entry_price - exit_price) * quantity
        
        await get_db().execute(
            """UPDATE paper_trades 
               SET status = 'closed', exit_price = $1, pnl = $2, closed_at = NOW() 
               WHERE id = $3""",
            [exit_price, pnl, trade_id]
        )
        
        current_balance = await get_account_balance(account_id)
        await update_account_balance(account_id, current_balance + pnl)
        
        return pnl
    except Exception as e:
        logger.error(f"close_paper_trade failed: {e}")
        return None

async def get_account_stats(account_id: int) -> Dict:
    """Get comprehensive account statistics"""
    try:
        total_result = await get_db().query(
            "SELECT COUNT(*) as count FROM paper_trades WHERE account_id = $1 AND status = 'closed'",
            [account_id]
        )
        total_trades = total_result[0].get('count', 0) if total_result else 0
        
        win_result = await get_db().query(
            "SELECT COUNT(*) as count FROM paper_trades WHERE account_id = $1 AND status = 'closed' AND pnl > 0",
            [account_id]
        )
        winning_trades = win_result[0].get('count', 0) if win_result else 0
        
        pnl_result = await get_db().query(
            "SELECT SUM(pnl) as total FROM paper_trades WHERE account_id = $1 AND status = 'closed'",
            [account_id]
        )
        total_pnl = (pnl_result[0].get('total') or 0.0) if pnl_result else 0.0
        
        gross_profit_result = await get_db().query(
            "SELECT SUM(pnl) as total FROM paper_trades WHERE account_id = $1 AND status = 'closed' AND pnl > 0",
            [account_id]
        )
        gross_profit = (gross_profit_result[0].get('total') or 0.0) if gross_profit_result else 0.0
        
        gross_loss_result = await get_db().query(
            "SELECT ABS(SUM(pnl)) as total FROM paper_trades WHERE account_id = $1 AND status = 'closed' AND pnl < 0",
            [account_id]
        )
        gross_loss = (gross_loss_result[0].get('total') or 0.0) if gross_loss_result else 0.0
        
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
            'avg_profit': 0.0,
            'avg_loss': 0.0,
        }
    except Exception as e:
        logger.error(f"get_account_stats failed: {e}")
        return {
            'total_trades': 0,
            'winning_trades': 0,
            'losing_trades': 0,
            'winrate': 0.0,
            'total_pnl': 0.0,
            'profit_factor': 0.0,
            'gross_profit': 0.0,
            'gross_loss': 0.0,
            'avg_profit': 0.0,
            'avg_loss': 0.0,
        }

async def get_recent_trades(account_id: int, limit: int = 10) -> List[Dict]:
    """Get recent closed trades"""
    try:
        return await get_db().query(
            """SELECT * FROM paper_trades 
               WHERE account_id = $1 AND status = 'closed' 
               ORDER BY closed_at DESC LIMIT $2""",
            [account_id, limit]
        )
    except Exception as e:
        logger.error(f"get_recent_trades failed: {e}")
        return []
