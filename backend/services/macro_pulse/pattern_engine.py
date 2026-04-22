"""
Historical Pattern Matching Engine
Search for historical analogies of the current market situation"""

import numpy as np
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
from datetime import datetime
import logging

logger = logging.getLogger(__name__)


@dataclass
class MarketState:
    """Current market status for comparison"""
    timestamp: datetime
    yields: Dict[str, float]
    spreads: Dict[str, float]
    curve_shape: str
    fed_funds_rate: Optional[float] = None
    inflation_yoy: Optional[float] = None
    sp500_level: Optional[float] = None
    sp500_ma200: Optional[float] = None
    dxy_level: Optional[float] = None
    gold_price: Optional[float] = None
    btc_price: Optional[float] = None


@dataclass
class HistoricalMatch:
    """Result of comparison with the historical period"""
    period_name: str
    start_date: datetime
    end_date: Optional[datetime]
    similarity_score: float
    recession_followed: bool
    recession_start: Optional[datetime]
    lead_time_months: Optional[int]
    sp500_outcome: Optional[float]
    key_differences: List[str]
    key_similarities: List[str]
    narrative_key: str
    narrative_params: Dict[str, Any] = field(default_factory=dict)


class PatternMatchingEngine:
    """Historical analogy search engine"""
    
    FEATURE_WEIGHTS = {
        '10y2y_spread': 0.35,
        '10y3m_spread': 0.25,
        'curve_steepness': 0.15,
        'rate_level': 0.10,
        'fed_phase': 0.10,
        'market_sentiment': 0.05,
    }
    
    HISTORICAL_CASES = [
        {
            'period_name': '2006-2007',
            'start_date': datetime(2006, 1, 31),
            'end_date': datetime(2007, 6, 1),
            'recession_followed': True,
            'recession_start': datetime(2007, 12, 1),
            'lead_time_months': 23,
            'features': {
                'min_10y2y': -0.16,
                'max_10y2y': 0.20,
                'min_10y3m': -0.50,
                'avg_10y': 4.80,
                'fed_funds_peak': 5.25,
                'inversion_duration_months': 16,
            },
            'outcomes': {
                'sp500_change': -56.8,
                'nasdaq_change': -55.0,
                'gold_change': 25.0,
                'dxy_change': 22.0,
            },
            'context': 'Housing bubble, subprime crisis',
            'narrative': 'Prolonged inversion + housing market bubble'
        },
        {
            'period_name': '2000',
            'start_date': datetime(2000, 4, 1),
            'end_date': datetime(2000, 12, 31),
            'recession_followed': True,
            'recession_start': datetime(2001, 3, 1),
            'lead_time_months': 11,
            'features': {
                'min_10y2y': -0.47,
                'max_10y2y': 0.50,
                'min_10y3m': -0.80,
                'avg_10y': 5.50,
                'fed_funds_peak': 6.50,
                'inversion_duration_months': 9,
            },
            'outcomes': {
                'sp500_change': -49.1,
                'nasdaq_change': -78.0,
                'gold_change': -5.0,
                'dxy_change': 8.0,
            },
            'context': 'Dot-com bubble, tech overvaluation',
            'narrative': 'Rapid inversion + technology sector overvaluation'
        },
        {
            'period_name': '1989',
            'start_date': datetime(1989, 1, 1),
            'end_date': datetime(1989, 8, 31),
            'recession_followed': True,
            'recession_start': datetime(1990, 7, 1),
            'lead_time_months': 11,
            'features': {
                'min_10y2y': -0.34,
                'max_10y2y': 1.00,
                'min_10y3m': -0.40,
                'avg_10y': 8.50,
                'fed_funds_peak': 9.75,
                'inversion_duration_months': 7,
            },
            'outcomes': {
                'sp500_change': -20.0,
                'nasdaq_change': -25.0,
                'gold_change': 10.0,
                'dxy_change': 5.0,
            },
            'context': 'S&L crisis, Gulf War buildup',
            'narrative': 'Banking crisis + geopolitical tension'
        },
        {
            'period_name': '1978-1980',
            'start_date': datetime(1978, 11, 1),
            'end_date': datetime(1980, 5, 31),
            'recession_followed': True,
            'recession_start': datetime(1980, 1, 1),
            'lead_time_months': 2,
            'features': {
                'min_10y2y': -2.00,
                'max_10y2y': 1.50,
                'min_10y3m': -3.50,
                'avg_10y': 10.50,
                'fed_funds_peak': 20.00,
                'inversion_duration_months': 18,
            },
            'outcomes': {
                'sp500_change': -17.1,
                'nasdaq_change': -20.0,
                'gold_change': 150.0,
                'dxy_change': 15.0,
            },
            'context': 'Volcker shock, stagflation',
            'narrative': 'Extreme inversion with 20% rates to fight inflation'
        },
        {
            'period_name': '1998',
            'start_date': datetime(1998, 5, 1),
            'end_date': datetime(1998, 7, 31),
            'recession_followed': False,
            'recession_start': None,
            'lead_time_months': None,
            'features': {
                'min_10y2y': -0.05,
                'max_10y2y': 0.80,
                'min_10y3m': -0.08,
                'avg_10y': 5.30,
                'fed_funds_peak': 5.50,
                'inversion_duration_months': 2,
            },
            'outcomes': {
                'sp500_change': 35.0,
                'nasdaq_change': 85.0,
                'gold_change': -10.0,
                'dxy_change': 5.0,
            },
            'context': 'LTCM crisis, Russian default',
            'narrative': 'Short-term inversion + quick Fed intervention'
        },
        {
            'period_name': '1966',
            'start_date': datetime(1966, 8, 1),
            'end_date': datetime(1966, 12, 31),
            'recession_followed': False,
            'recession_start': None,
            'lead_time_months': None,
            'features': {
                'min_10y2y': -0.10,
                'max_10y2y': 0.40,
                'min_10y3m': -0.15,
                'avg_10y': 5.00,
                'fed_funds_peak': 6.00,
                'inversion_duration_months': 3,
            },
            'outcomes': {
                'sp500_change': 12.0,
                'nasdaq_change': 15.0,
                'gold_change': 0.0,
                'dxy_change': -2.0,
            },
            'context': 'Credit crunch, soft landing',
            'narrative': 'Soft landing without recession'
        },
        {
            'period_name': '2019',
            'start_date': datetime(2019, 8, 1),
            'end_date': datetime(2019, 10, 31),
            'recession_followed': True,
            'recession_start': datetime(2020, 2, 1),
            'lead_time_months': 6,
            'features': {
                'min_10y2y': -0.05,
                'max_10y2y': 0.25,
                'min_10y3m': -0.40,
                'avg_10y': 2.00,
                'fed_funds_peak': 2.50,
                'inversion_duration_months': 5,
            },
            'outcomes': {
                'sp500_change': -33.9,
                'nasdaq_change': -30.0,
                'gold_change': 25.0,
                'dxy_change': 5.0,
            },
            'context': 'Pre-COVID, trade wars',
            'narrative': 'Brief inversion before external shock (pandemic)'
        }
    ]
    
    def __init__(self):
        self.cases = self.HISTORICAL_CASES
    
    def calculate_similarity(self, current: MarketState, historical: Dict) -> Tuple[float, List[str], List[str]]:
        """Calculation of similarity score (0-100)"""
        similarities = []
        differences = []
        scores = {}
        
        current_10y2y = current.spreads.get('10Y_2Y', 0)
        hist_min_10y2y = historical['features']['min_10y2y']
        hist_max_10y2y = historical['features']['max_10y2y']
        hist_avg_10y2y = (hist_min_10y2y + hist_max_10y2y) / 2
        
        diff_10y2y = abs(current_10y2y - hist_avg_10y2y)
        score_10y2y = max(0, 1 - diff_10y2y / 0.5)
        scores['10y2y'] = score_10y2y
        
        if diff_10y2y < 0.2:
            similarities.append(f"10Y-2Y spread is close ({current_10y2y:.2f}% vs {hist_avg_10y2y:.2f}%)")
        else:
            differences.append(f"10Y-2Y spread is different ({current_10y2y:.2f}% vs {hist_avg_10y2y:.2f}%)")
        
        if current.curve_shape.upper() == 'INVERTED' and hist_min_10y2y < 0:
            scores['shape'] = 1.0
            similarities.append("Inverted curve in both cases")
        elif current.curve_shape.upper() =='NORMAL'and hist_min_10y2y > 0:
            scores['shape'] = 1.0
            similarities.append("Normal curve in both cases")
        else:
            scores['shape'] = 0.3
            differences.append(f"Different curve shape: currently {current.curve_shape}")
        
        current_10y = current.yields.get('10Y', 4.0)
        hist_avg_10y = historical['features']['avg_10y']
        rate_diff = abs(current_10y - hist_avg_10y)
        score_rate = max(0, 1 - rate_diff / 5.0)
        scores['rate_level'] = score_rate
        
        if rate_diff < 1.5:
            similarities.append(f"Similar bid level ({current_10y:.2f}% vs {hist_avg_10y:.2f}%)")
        else:
            differences.append(f"Different bet level: now {current_10y:.2f}% vs {hist_avg_10y:.2f}% historically")
        
        total_score = (
            scores.get('10y2y', 0.5) * self.FEATURE_WEIGHTS['10y2y_spread'] +
            scores.get('shape', 0.5) * self.FEATURE_WEIGHTS['curve_steepness'] +
            scores.get('rate_level', 0.5) * self.FEATURE_WEIGHTS['rate_level']
        ) / sum(self.FEATURE_WEIGHTS.values())
        
        final_score = total_score * 100
        
        return final_score, similarities, differences
    
    def find_best_matches(self, current: MarketState, n: int = 3, min_similarity: float = 40.0) -> List[HistoricalMatch]:
        """Search for the N best historical analogies"""
        matches = []
        
        for case in self.cases:
            score, similarities, differences = self.calculate_similarity(current, case)
            
            if score >= min_similarity:
                narrative = self._generate_narrative(current, case, score, similarities)
                
                narrative_key, narrative_params = narrative
                match = HistoricalMatch(
                    period_name=case['period_name'],
                    start_date=case['start_date'],
                    end_date=case['end_date'],
                    similarity_score=round(score, 1),
                    recession_followed=case['recession_followed'],
                    recession_start=case.get('recession_start'),
                    lead_time_months=case.get('lead_time_months'),
                    sp500_outcome=case['outcomes'].get('sp500_change'),
                    key_differences=differences[:3],
                    key_similarities=similarities[:3],
                    narrative_key=narrative_key,
                    narrative_params=narrative_params,
                )
                matches.append(match)
        
        matches.sort(key=lambda x: x.similarity_score, reverse=True)
        return matches[:n]
    
    def _generate_narrative(self, current: MarketState, historical: Dict, score: float, similarities: List[str]) -> tuple:
        """Generation of human-readable analogy descriptions"""
        period = historical['period_name']
        context = historical['context']
        
        if score > 75:
            strength_key = "strong"
        elif score > 60:
            strength_key = "moderate"
        else:
            strength_key = "weak"
        
        key = f"yieldCurve.interpretations.pattern.narrative.{strength_key}"
        params = {
            "period": period,
            "context": context,
            "recession": "1" if historical['recession_followed'] else "0",
            "leadTime": str(historical.get('lead_time_months', '')),
        }
        
        return key, params
    
    def get_aggregated_forecast(self, matches: List[HistoricalMatch]) -> Dict:
        """Aggregation of forecasts based on top-N analogies"""
        if not matches:
            return {'recession_probability': None,
                'confidence': 'LOW',
                'sp500_range': None,
                'narrative': 'Insufficient data for analogy'
            }
        
        total_weight = sum(m.similarity_score for m in matches)
        recession_prob = sum(
            m.similarity_score * (100 if m.recession_followed else 0)
            for m in matches
        ) / total_weight
        
        sp500_outcomes = [m.sp500_outcome for m in matches if m.sp500_outcome is not None]
        if sp500_outcomes:
            avg_sp500 = np.mean(sp500_outcomes)
            min_sp500 = min(sp500_outcomes)
            max_sp500 = max(sp500_outcomes)
        else:
            avg_sp500 = min_sp500 = max_sp500 = None
        
        if matches[0].similarity_score > 70:
            confidence = 'HIGH'
        elif matches[0].similarity_score > 55:
            confidence = 'MODERATE'
        else:
            confidence = 'LOW'
        
        recession_cases = [m for m in matches if m.recession_followed]
        no_recession_cases = [m for m in matches if not m.recession_followed]
        
        if recession_prob > 60:
            narrative_key = "yieldCurve.interpretations.forecast.highRecession"
        elif recession_prob > 40:
            narrative_key = "yieldCurve.interpretations.forecast.uncertainty"
        else:
            narrative_key = "yieldCurve.interpretations.forecast.softLanding"
        
        return {
            'recession_probability': round(recession_prob, 1),
            'confidence': confidence,
            'sp500_avg': round(avg_sp500, 1) if avg_sp500 else None,
            'sp500_range': [round(min_sp500, 1), round(max_sp500, 1)] if min_sp500 else None,
            'top_analogies': [m.period_name for m in matches],
            'recession_scenarios': len(recession_cases),
            'soft_landing_scenarios': len(no_recession_cases),
            'narrative_key': narrative_key,
            'narrative_params': {
                'matches': str(len(matches)),
                'prob': f"{recession_prob:.0f}",
                'scenarios': ', '.join(r.period_name for r in recession_cases[:2]) if recession_cases else '',
                'softScenarios': ', '.join(r.period_name for r in no_recession_cases[:2]) if no_recession_cases else '',
            }
        }


_pattern_engine = None

def get_pattern_engine() -> PatternMatchingEngine:
    """Get singleton instance of the engine"""
    global _pattern_engine
    if _pattern_engine is None:
        _pattern_engine = PatternMatchingEngine()
    return _pattern_engine
