"""Shared pytest fixtures and configuration."""
import pytest
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def mock_db():
    """Mock database with async execute/query methods."""
    class MockDB:
        def __init__(self):
            self.executed = []
            self.queried = []

        async def execute(self, sql, args=None):
            self.executed.append((sql, args))
            return "INSERT 0 1"

        async def query(self, sql, args=None):
            self.queried.append((sql, args))
            return []

        async def connect(self):
            pass

        async def close(self):
            pass

    return MockDB()
