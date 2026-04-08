import os
import json
import asyncio
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Use aiohttp for async HTTP requests
try:
    import aiohttp
    AIOHTTP_AVAILABLE = True
except ImportError:
    AIOHTTP_AVAILABLE = False
    logger.warning("aiohttp not available, falling back to sync requests")
    import requests

class TursoDB:
    def __init__(self):
        self.url = os.getenv('TURSO_DATABASE_URL')
        self.token = os.getenv('TURSO_AUTH_TOKEN')
        self._session = None
        
        # Extract database name from URL
        if self.url:
            # Handle different URL formats
            if self.url.startswith('libsql://'):
                self.db_name = self.url.replace('libsql://', '').split('.')[0]
                self.api_url = f"https://{self.url.replace('libsql://', '')}"
            elif self.url.startswith('https://'):
                self.db_name = self.url.replace('https://', '').split('.')[0]
                self.api_url = self.url
            else:
                self.db_name = self.url
                self.api_url = f"https://{self.url}"
        else:
            self.db_name = None
            self.api_url = None
        
        logger.info(f"TursoDB initialized: db={self.db_name}")
    
    async def connect(self):
        if not self.url or not self.token: 
            raise ValueError("TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set")
        
        if AIOHTTP_AVAILABLE:
            self._session = aiohttp.ClientSession()
        
        logger.info("TursoDB ready (HTTP API)")
    
    async def close(self):
        if self._session:
            await self._session.close()
            self._session = None
    
    async def query(self, sql: str, args: List[Any] = None) -> List[Dict]:
        """Execute SQL query via Turso HTTP API"""
        if not self.token:
            raise ValueError("TURSO_AUTH_TOKEN not set")
        
        # Build the request
        url = f"https://api.turso.tech/v1/databases/{self.db_name}/query"
        
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }
        
        # Prepare statement with args
        if args:
            statement = {
                "sql": sql,
                "args": [{"value": str(arg) if not isinstance(arg, (int, float)) else arg} for arg in args]
            }
        else:
            statement = {"sql": sql}
        
        body = {"statements": [statement]}
        
        try:
            if AIOHTTP_AVAILABLE and self._session:
                async with self._session.post(url, headers=headers, json=body) as resp:
                    if resp.status != 200:
                        text = await resp.text()
                        logger.error(f"Turso API error: {resp.status} - {text}")
                        raise Exception(f"Turso API error: {resp.status}")
                    data = await resp.json()
            else:
                # Fallback to sync requests in async context
                loop = asyncio.get_event_loop()
                response = await loop.run_in_executor(
                    None, 
                    lambda: requests.post(url, headers=headers, json=body)
                )
                if response.status_code != 200:
                    logger.error(f"Turso API error: {response.status_code} - {response.text}")
                    raise Exception(f"Turso API error: {response.status_code}")
                data = response.json()
            
            # Parse result
            results = data.get("results", [])
            if not results:
                return []
            
            result = results[0]
            
            # Check for errors
            if "error" in result:
                logger.error(f"Query error: {result['error']}")
                raise Exception(f"Query error: {result['error']}")
            
            # Extract rows and columns
            response_result = result.get("response", {}).get("result", {})
            cols = response_result.get("cols", [])
            rows = response_result.get("rows", [])
            
            # Convert to dict list
            output = []
            column_names = [col.get("name", f"col_{i}") for i, col in enumerate(cols)]
            
            for row in rows:
                row_dict = {}
                for i, col_name in enumerate(column_names):
                    if i < len(row):
                        cell = row[i]
                        # Turso returns values as {"type": "...", "value": ...}
                        if isinstance(cell, dict):
                            row_dict[col_name] = cell.get("value")
                        else:
                            row_dict[col_name] = cell
                    else:
                        row_dict[col_name] = None
                output.append(row_dict)
            
            return output
            
        except Exception as e:
            logger.error(f"Query failed: {e}")
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
        return r[0].get('id') if r else None
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
        return r[0].get('id') if r else None
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
        return r[0].get('balance', 0.0) if r else 0.0
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
        return r[0].get('id') if r else None
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
        entry_price = trade.get('entry_price', 0)
        quantity = trade.get('quantity', 0)
        direction = trade.get('direction', 'long')
        account_id = trade.get('account_id')
        
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
        total_trades = total_result[0].get('count', 0) if total_result else 0
        
        win_result = await get_db().query(
            "SELECT COUNT(*) as count FROM paper_trades WHERE account_id = ? AND status = 'closed' AND pnl > 0",
            [account_id]
        )
        winning_trades = win_result[0].get('count', 0) if win_result else 0
        
        pnl_result = await get_db().query(
            "SELECT SUM(pnl) as total FROM paper_trades WHERE account_id = ? AND status = 'closed'",
            [account_id]
        )
        total_pnl = (pnl_result[0].get('total') or 0.0) if pnl_result else 0.0
        
        gross_profit_result = await get_db().query(
            "SELECT SUM(pnl) as total FROM paper_trades WHERE account_id = ? AND status = 'closed' AND pnl > 0",
            [account_id]
        )
        gross_profit = (gross_profit_result[0].get('total') or 0.0) if gross_profit_result else 0.0
        
        gross_loss_result = await get_db().query(
            "SELECT ABS(SUM(pnl)) as total FROM paper_trades WHERE account_id = ? AND status = 'closed' AND pnl < 0",
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
               WHERE account_id = ? AND status = 'closed' 
               ORDER BY closed_at DESC LIMIT ?""",
            [account_id, limit]
        )
    except Exception as e:
        logger.error(f"get_recent_trades failed: {e}")
        return []
