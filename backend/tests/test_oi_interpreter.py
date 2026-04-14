"""Tests for interpreters/oi_interpreter.py"""
import pytest

from interpreters.oi_interpreter import interpret_oi_advanced


class TestInterpretOiAdvanced:
    def test_long_buildup(self):
        result = interpret_oi_advanced(5.0, 2.0, 15.0)
        assert result["status"] == "long_buildup"
        assert result["signal"] == "strong_bullish"
        assert result["strength"] == 5
        assert result["color"] == "#22c55e"

    def test_short_buildup(self):
        result = interpret_oi_advanced(5.0, -2.0, 15.0)
        assert result["status"] == "short_buildup"
        assert result["signal"] == "strong_bearish"
        assert result["strength"] == 5
        assert result["color"] == "#ef4444"

    def test_short_covering_with_volume(self):
        result = interpret_oi_advanced(-5.0, 2.0, 15.0)
        assert result["status"] == "short_covering"
        assert result["signal"] == "caution_bullish"
        assert result["strength"] == 3

    def test_long_distribution_without_volume(self):
        result = interpret_oi_advanced(-5.0, 2.0, 5.0)
        assert result["status"] == "long_distribution"
        assert result["signal"] == "weak_bearish"
        assert result["strength"] == 2

    def test_short_covering_bottom_with_volume(self):
        result = interpret_oi_advanced(-5.0, -2.0, 15.0)
        assert result["status"] == "short_covering_bottom"
        assert result["signal"] == "potential_bottom"
        assert result["strength"] == 3

    def test_long_distribution_cont_without_volume(self):
        result = interpret_oi_advanced(-5.0, -2.0, 5.0)
        assert result["status"] == "long_distribution_cont"
        assert result["signal"] == "caution_bearish"
        assert result["strength"] == 2

    def test_neutral_oi_flat(self):
        result = interpret_oi_advanced(0.5, 2.0, 15.0)
        assert result["status"] == "neutral"
        assert result["signal"] == "neutral"
        assert result["strength"] == 1

    def test_accumulation_phase(self):
        result = interpret_oi_advanced(5.0, 0.2, 5.0)
        assert result["status"] == "accumulation_phase"
        assert result["signal"] == "watchlist"
        assert result["strength"] == 4
        assert result["color"] == "#3b82f6"

    def test_distribution_phase(self):
        result = interpret_oi_advanced(-5.0, 0.2, 5.0)
        assert result["status"] == "distribution_phase"
        assert result["signal"] == "watchlist"
        assert result["strength"] == 4
        assert result["color"] == "#8b5cf6"

    def test_oi_change_pct_included(self):
        result = interpret_oi_advanced(3.5, 1.0, 20.0)
        assert result["oi_change_pct"] == 3.5
        assert result["price_change_pct"] == 1.0
        assert result["volume_change_pct"] == 20.0

    def test_all_signals_have_required_fields(self):
        """Ensure every branch returns consistent structure"""
        test_cases = [
            (5.0, 2.0, 15.0),   # long_buildup
            (5.0, -2.0, 15.0),  # short_buildup
            (-5.0, 2.0, 15.0),  # short_covering
            (-5.0, 2.0, 5.0),   # long_distribution
            (-5.0, -2.0, 15.0), # short_covering_bottom
            (-5.0, -2.0, 5.0),  # long_distribution_cont
            (0.5, 2.0, 15.0),   # neutral
            (5.0, 0.2, 5.0),    # accumulation
            (-5.0, 0.2, 5.0),   # distribution
        ]
        required_fields = ["status", "signal", "strength", "description", "detailed", "action", "tactic", "color"]
        for case in test_cases:
            result = interpret_oi_advanced(*case)
            for field in required_fields:
                assert field in result, f"Missing {field} for case {case}"
