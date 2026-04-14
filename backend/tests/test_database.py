"""Tests for database.py"""
import pytest
import os
from unittest.mock import AsyncMock, patch, MagicMock

from database import PostgresDB, get_db, get_active_signals, create_signal, update_signal_status
from database import create_paper_account, get_account, get_account_balance, update_account_balance
from database import create_paper_trade, get_open_trades, close_paper_trade, get_account_stats, get_recent_trades


@pytest.fixture
def mock_pool():
    """Create a mock asyncpg pool."""
    pool = AsyncMock()
    conn = AsyncMock()
    pool.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
    pool.acquire.return_value.__aexit__ = AsyncMock(return_value=None)
    pool.close = AsyncMock()
    return pool, conn


class TestPostgresDB:
    @patch("database.asyncpg.create_pool", new_callable=AsyncMock)
    async def test_connect_success(self, mock_create_pool):
        db = PostgresDB()
        db.database_url = "postgres://user:pass@localhost/db"
        mock_create_pool.return_value = AsyncMock()

        await db.connect()
        mock_create_pool.assert_called_once_with("postgres://user:pass@localhost/db", min_size=1, max_size=10)
        assert db._pool is not None

    async def test_connect_no_url(self):
        db = PostgresDB()
        db.database_url = None
        with pytest.raises(ValueError, match="DATABASE_URL not set"):
            await db.connect()

    async def test_close(self):
        db = PostgresDB()
        db._pool = AsyncMock()
        await db.close()
        db._pool.close.assert_called_once()
        assert db._pool is None

    @patch("database.asyncpg.create_pool", new_callable=AsyncMock)
    async def test_query_with_args(self, mock_create_pool):
        db = PostgresDB()
        db.database_url = "postgres://user:pass@localhost/db"
        conn = AsyncMock()
        mock_create_pool.return_value = conn

        # Mock fetch result as asyncpg Record-like objects
        record = {"id": 1, "name": "test"}
        conn.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
        conn.acquire.return_value.__aexit__ = AsyncMock(return_value=None)
        conn.fetch = AsyncMock(return_value=[record])

        await db.connect()
        result = await db.query("SELECT * FROM test WHERE id = ?", [1])

        assert result == [record]
        conn.fetch.assert_called_once_with("SELECT * FROM test WHERE id = $1", 1)

    @patch("database.asyncpg.create_pool", new_callable=AsyncMock)
    async def test_query_without_args(self, mock_create_pool):
        db = PostgresDB()
        db.database_url = "postgres://user:pass@localhost/db"
        conn = AsyncMock()
        mock_create_pool.return_value = conn

        conn.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
        conn.acquire.return_value.__aexit__ = AsyncMock(return_value=None)
        conn.fetch = AsyncMock(return_value=[])

        await db.connect()
        result = await db.query("SELECT * FROM test")

        assert result == []
        conn.fetch.assert_called_once_with("SELECT * FROM test")

    @patch("database.asyncpg.create_pool", new_callable=AsyncMock)
    async def test_query_auto_connect(self, mock_create_pool):
        db = PostgresDB()
        db.database_url = "postgres://user:pass@localhost/db"
        conn = AsyncMock()
        mock_create_pool.return_value = conn

        conn.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
        conn.acquire.return_value.__aexit__ = AsyncMock(return_value=None)
        conn.fetch = AsyncMock(return_value=[{"id": 1}])

        # No manual connect
        result = await db.query("SELECT 1")
        assert result == [{"id": 1}]

    @patch("database.asyncpg.create_pool", new_callable=AsyncMock)
    async def test_execute_with_args(self, mock_create_pool):
        db = PostgresDB()
        db.database_url = "postgres://user:pass@localhost/db"
        conn = AsyncMock()
        mock_create_pool.return_value = conn

        conn.acquire.return_value.__aenter__ = AsyncMock(return_value=conn)
        conn.acquire.return_value.__aexit__ = AsyncMock(return_value=None)
        conn.execute = AsyncMock(return_value="INSERT 0 1")

        await db.connect()
        result = await db.execute("INSERT INTO test VALUES (?, ?)", [1, "a"])

        assert result == "INSERT 0 1"
        conn.execute.assert_called_once_with("INSERT INTO test VALUES ($1, $2)", 1, "a")

    def test_convert_placeholders(self):
        db = PostgresDB()
        sql = "SELECT * FROM test WHERE a = ? AND b = ? AND c = ?"
        result = db._convert_placeholders(sql)
        assert result == "SELECT * FROM test WHERE a = $1 AND b = $2 AND c = $3"

    def test_get_db_singleton(self):
        # Reset global state
        import database
        database._db = None
        db1 = get_db()
        db2 = get_db()
        assert db1 is db2


@pytest.mark.asyncio
class TestSignalHelpers:
    @patch("database.get_db")
    async def test_get_active_signals(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"id": 1, "status": "active"}])

        result = await get_active_signals()
        assert result == [{"id": 1, "status": "active"}]

    @patch("database.get_db")
    async def test_get_active_signals_error(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=Exception("DB error"))

        result = await get_active_signals()
        assert result == []

    @patch("database.get_db")
    async def test_create_signal(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"id": 42}])

        result = await create_signal("BTC", "long", 70000, 75000, 68000, 80)
        assert result == 42

    @patch("database.get_db")
    async def test_create_signal_error(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=Exception("DB error"))

        result = await create_signal("BTC", "long", 70000, 75000, 68000, 80)
        assert result is None

    @patch("database.get_db")
    async def test_update_signal_status(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.execute = AsyncMock()

        await update_signal_status(1, "closed")
        mock_db.execute.assert_called_once()


@pytest.mark.asyncio
class TestPaperTradingHelpers:
    @patch("database.get_db")
    async def test_create_paper_account(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"id": 10}])

        result = await create_paper_account(1, "BTC", 5000.0)
        assert result == 10

    @patch("database.get_db")
    async def test_get_account(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"id": 1, "balance": 10000.0}])

        result = await get_account(1)
        assert result["balance"] == 10000.0

    @patch("database.get_db")
    async def test_get_account_balance(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"balance": 8500.0}])

        result = await get_account_balance(1)
        assert result == 8500.0

    @patch("database.get_db")
    async def test_get_account_balance_empty(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[])

        result = await get_account_balance(1)
        assert result == 0.0

    @patch("database.get_db")
    async def test_update_account_balance(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.execute = AsyncMock()

        await update_account_balance(1, 9000.0)
        mock_db.execute.assert_called_once()

    @patch("database.get_db")
    async def test_create_paper_trade(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"id": 99}])

        result = await create_paper_trade(1, 5, "BTC", "long", 70000, 1.5)
        assert result == 99

    @patch("database.get_db")
    async def test_get_open_trades(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"id": 1, "status": "open"}])

        result = await get_open_trades(1)
        assert len(result) == 1

    @patch("database.get_db")
    async def test_close_paper_trade_long(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=[
            [{"id": 1, "entry_price": 70000, "quantity": 1.0, "direction": "long", "account_id": 1}],
            [{"balance": 10000.0}],
        ])
        mock_db.execute = AsyncMock()

        result = await close_paper_trade(1, 75000)
        assert result == 5000.0  # (75000 - 70000) * 1.0

    @patch("database.get_db")
    async def test_close_paper_trade_short(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=[
            [{"id": 1, "entry_price": 70000, "quantity": 1.0, "direction": "short", "account_id": 1}],
            [{"balance": 10000.0}],
        ])
        mock_db.execute = AsyncMock()

        result = await close_paper_trade(1, 65000)
        assert result == 5000.0  # (70000 - 65000) * 1.0

    @patch("database.get_db")
    async def test_close_paper_trade_not_found(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[])

        result = await close_paper_trade(1, 75000)
        assert result is None

    @patch("database.get_db")
    async def test_get_account_stats(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=[
            [{"count": 10}],
            [{"count": 6}],
            [{"total": 1500.0}],
            [{"total": 2000.0}],
            [{"total": 500.0}],
        ])

        result = await get_account_stats(1)
        assert result["total_trades"] == 10
        assert result["winning_trades"] == 6
        assert result["losing_trades"] == 4
        assert result["winrate"] == 60.0
        assert result["total_pnl"] == 1500.0
        assert result["gross_profit"] == 2000.0
        assert result["gross_loss"] == 500.0
        assert result["profit_factor"] == 4.0

    @patch("database.get_db")
    async def test_get_account_stats_error(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(side_effect=Exception("DB error"))

        result = await get_account_stats(1)
        assert result["total_trades"] == 0
        assert result["winrate"] == 0.0

    @patch("database.get_db")
    async def test_get_recent_trades(self, mock_get_db):
        mock_db = mock_get_db.return_value
        mock_db.query = AsyncMock(return_value=[{"id": 1}, {"id": 2}])

        result = await get_recent_trades(1, 5)
        assert len(result) == 2
