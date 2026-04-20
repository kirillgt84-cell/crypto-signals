"""Unit tests for anomaly scanner scoring logic."""
import pytest
from scanners.anomaly_scanner import (
    _score_volume_ratio,
    _score_oi_spike,
    _score_price_momentum,
    _short_squeeze_bonus,
    _calculate_confidence,
    _determine_direction,
    DEFAULT_MIN_SCORE,
)


class TestAnomalyScannerScoring:
    """Tests for individual scoring functions."""

    def test_volume_ratio_score_zero(self):
        assert _score_volume_ratio(1.0) == 0
        assert _score_volume_ratio(1.4) == 0

    def test_volume_ratio_score_max(self):
        assert _score_volume_ratio(15.0) == 5

    def test_volume_ratio_score_mid(self):
        assert _score_volume_ratio(3.0) == 2
        assert _score_volume_ratio(5.0) == 3

    def test_oi_spike_score_zero(self):
        assert _score_oi_spike(2.0) == 0

    def test_oi_spike_score_max(self):
        assert _score_oi_spike(25.0) == 5

    def test_price_momentum_zero(self):
        assert _score_price_momentum(1.0) == 0

    def test_price_momentum_max(self):
        assert _score_price_momentum(10.0) == 3

    def test_short_squeeze_bonus(self):
        assert _short_squeeze_bonus(15.0, -15.0) == 3
        assert _short_squeeze_bonus(6.0, -6.0) == 2
        assert _short_squeeze_bonus(3.0, -3.0) == 0

    def test_confidence_high(self):
        assert _calculate_confidence(11) == "high"
        assert _calculate_confidence(10) == "high"

    def test_confidence_medium(self):
        assert _calculate_confidence(8) == "medium"
        assert _calculate_confidence(9) == "medium"

    def test_confidence_low(self):
        assert _calculate_confidence(7) == "low"
        assert _calculate_confidence(5) == "low"

    def test_determine_direction_long(self):
        assert _determine_direction(5.0, 3.0) == "LONG"
        assert _determine_direction(0.5, -2.0) == "LONG"

    def test_determine_direction_short(self):
        assert _determine_direction(-2.0, 5.0) == "SHORT"
        assert _determine_direction(-5.0, 0.0) == "SHORT"

    def test_default_min_score(self):
        assert DEFAULT_MIN_SCORE == 5
