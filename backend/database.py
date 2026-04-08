import os
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

try:
    from libsql_client import create_client
    LIBSQL_AVAILABLE = True
except ImportError:
    LIBSQL_AVAILABLE = False
    logger.warning("libsql_client not available")

class TursoDB:
    def __init__(self):
        self.url = os.getenv('TURSO_DATABASE_URL')
        self.token = os.getenv('TURSO_AUTH_TOKEN')
        self._client = None
        
        if self.url:
            if self.url.startswith('libsql://'):
                self.url = self.url.replace('libsql://', 'https://')
            elif self.url.startswith('wss://'):
                self.url = self.url.replace('wss://', 'https://')
        
        logger.info(f"TursoDB initialized")
    
    async def connect(self):
        if not self.url: 
            raise ValueError("TURSO_DATABASE_URL not set")
        if not self.token:
            raise ValueError("TURSO_AUTH_TOKEN not set")
        
        if not LIBSQL_AVAILABLE:
            raise ImportError("libsql_client is required")
        
        self._client = create_client(url=self.url, auth_token=self.token)
        logger.info("Connected to Turso successfully")
    
    async def close(self):
        if self._client:
            await self._client.close()
            self._client = None
    
    async def query(self, sql: str, args: List[Any] = None) -> List[Dict]:
        if not self._client: 
            await self.connect()
        
        try:
            result = await self._client.execute(sql, args or [])
            
            # Debug logging
            logger.debug(f"Result type: {type(result)}")
            logger.debug(f"Result dir: {[x for x in dir(result) if not x.startswith('_')]}")
            
            # Parse result - handle different structures
            if isinstance(result, tuple):
                # Some versions return tuple (rows, columns)
                rows, columns = result
            elif hasattr(result, 'rows') and hasattr(result, 'columns'):
                rows = result.rows
                columns = result.columns
            elif isinstance(result, dict):
                rows = result.get('rows', [])
                columns = result.get('columns', [])
            else:
                # Try iterating
                try:
                    columns = list(result[0].keys()) if result else []
                    return [dict(row) for row in result]
                except:
                    logger.error(f"Cannot parse result: {type(result)}")
                    return []
            
            # Convert rows to dicts
            output = []
            for row in rows:
                row_dict = {}
                for i, col in enumerate(columns):
                    if i < len(row):
                        row_dict[col] = row[i]
                    else:
                        row_dict[col] = None
                output.append(row_dict)
            
            return output
            
        except Exception as e:
            logger.error(f"Query failed: {e}")
            import traceback
            logger.error(traceback.format_exc())
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
        r = await get_db().query(
            """INSERT INTO signals (symbol, direction, entry_price, target_price, stop_price, confidence) 
               VALUES (?, ?, ?, ?, ?, ?) RETURNING id""",
            [symbol, direction, entry_price, target_price, stop_price, confidence]
        )
        return r[0]['id'] if r else None
    except Exception as e:
        logger.error(f"create_signal failed: {e}")
        return None

async def update_signal_status(signal_id: int, status: str):
    """Update signal status"""
    try:
        await get_db().query(
            "UPDATE signals SET status = ? WHERE id = ?",
            [status, signal_id]
        )
    except Exception as e:
        logger.error(f"update_signal_status failed: {e}")

# Paper Trading Accounts
async def create_paper_account(user_id: int, symbol: str, balance: float = 10000.0) -> Optional[int]:
    """Create a new paper trading account"""
    try:
        r = await get_db().query(
            "INSERT INTO paper_accounts (user_id, symbol, balance, initial_balance) VALUES (?, ?, ?, ?) RETURNING id",
            [user_id, symbol, balance, balance]
        )
        return r[0]['id'] if r else None
    except Exception as e:
        logger.error(f"create_paper_account failed: {e}")
        return None

async def get_account(account_id: int) -> Optional[Dict]:
    """Get account details"""
    try:
        r = await get_db().query(
            "SELECT * FROM paper_accounts WHERE id = ?",
            [account_id]
        )
        return r[0] if r else None
    except Exception as e:
        logger.error(f"get_account failed: {e}")
        return None

async def get_account_balance(account_id: int) -> float:
    """Get account current balance"""
    try:
        r = await get_db().query(
            "SELECT balance FROM paper_accounts WHERE id = ?",
            [account_id]
        )
        return r[0]['balance'] if r else 0.0
    except Exception as e:
        logger.error(f"get_account_balance failed: {e}")
        return 0.0

async def update_account_balance(account_id: int, new_balance: float):
    """Update account balance"""
    try:
        await get_db().query(
            "UPDATE paper_accounts SET balance = ? WHERE id = ?",
            [new_balance, account_id]
        )
    except Exception as e:
        logger.error(f"update_account_balance failed: {e}")

# Paper Trades
async def create_paper_trade(account_id: int, signal_id: int, symbol: str, 
                            direction: str, entry_price: float, quantity: float) -> Optional[int]:
    """Open a new paper trade"""
    try:
        r = await get_db().query(
            """INSERT INTO paper_trades (account_id, signal_id, symbol, direction, entry_price, quantity, status) 
               VALUES (?, ?, ?, ?, ?, ?, 'open') RETURNING id""",
            [account_id, signal_id, symbol, direction, entry_price, quantity]
        )
        return r[0]['id'] if r else None
    except Exception as e:
        logger.error(f"create_paper_trade failed: {e}")
        return None

async def get_open_trades(account_id: int) -> List[Dict]:
    """Get all open trades for an account"""
    try:
        return await get_db().query(
            "SELECT * FROM paper_trades WHERE account_id = ? AND status = 'open'",
            [account_id]
        )
    except Exception as e:
        logger.error(f"get_open_trades failed: {e}")
        return []

async def close_paper_trade(trade_id: int, exit_price: float) -> Optional[float]:
    """Close a paper trade and calculate PnL"""
    try:
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
        
        if direction == 'long':
            pnl = (exit_price - entry_price) * quantity
        else:
            pnl = (entry_price - exit_price) * quantity
        
        await get_db().query(
            """UPDATE paper_trades 
               SET status = 'closed', exit_price = ?, pnl = ?, closed_at = datetime('now') 
               WHERE id = ?""",
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
            "SELECT COUNT(*) as count FROM paper_trades WHERE account_id = ? AND status = 'closed'",
            [account_id]
        )
        total_trades = total_result[0]['count'] if total_result else 0
        
        win_result = await get_db().query(
            "SELECT COUNT(*) as count FROM paper_trades WHERE account_id = ? AND status = 'closed' AND pnl > 0",
            [account_id]
        )
        winning_trades = win_result[0]['count'] if win_result else 0
        
        pnl_result = await get_db().query(
            "SELECT SUM(pnl) as total FROM paper_trades WHERE account_id = ? AND status = 'closed'",
            [account_id]
        )
        total_pnl = pnl_result[0]['total'] or 0.0
        
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
               WHERE account_id = ? AND status = 'closed' 
               ORDER BY closed_at DESC LIMIT ?""",
            [account_id, limit]
        )
    except Exception as e:
        logger.error(f"get_recent_trades failed: {e}")
        return []
