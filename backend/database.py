import os
from typing import List, Dict, Any
from libsql_client import create_client

class TursoDB:
    def __init__(self):
        self.url = os.getenv('TURSO_DATABASE_URL')
        self.token = os.getenv('TURSO_AUTH_TOKEN')
        self._client = None
    
    async def connect(self):
        if not self.url: raise ValueError("TURSO_DATABASE_URL not set")
        self._client = create_client(url=self.url, auth_token=self.token)
    
    async def query(self, sql: str, args: List[Any] = None) -> List[Dict]:
        if not self._client: await self.connect()
        result = await self._client.execute(sql, args or [])
        return [{col: row[i] for i, col in enumerate(result.columns)} for row in result.rows]

_db = None
def get_db():
    global _db
    if _db is None: _db = TursoDB()
    return _db

async def get_active_signals(): return await get_db().query("SELECT * FROM signals WHERE status='active'")
async def create_paper_account(user_id, symbol, balance): 
    r = await get_db().query("INSERT INTO paper_accounts (user_id, symbol, balance, initial_balance) VALUES (?, ?, ?, ?) RETURNING id", [user_id, symbol, balance, balance])
    return r[0]['id'] if r else None
async def get_account_balance(account_id):
    r = await get_db().query("SELECT balance FROM paper_accounts WHERE id=?", [account_id])
    return r[0]['balance'] if r else 0
async def get_account_stats(account_id):
    return await get_db().query("SELECT COUNT(*) as total_trades FROM paper_trades WHERE account_id=? AND status='closed'", [account_id]) or [{'total_trades': 0}]
