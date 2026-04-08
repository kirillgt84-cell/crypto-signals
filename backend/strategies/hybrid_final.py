"""
HYBRID Final Strategy
Заглушка — замени на свою реализацию стратегии
"""
import pandas as pd
import numpy as np


class HybridFinalStrategy:
    """
    HYBRID стратегия для сканера.
    
    TODO: Замени этот файл на свою реализацию стратегии из бэктестов.
    Необходимые методы:
    - __init__(df): инициализация с DataFrame
    - check_long_signal(idx): проверка Long сигнала на индексе
    - check_short_signal(idx): проверка Short сигнала на индексе
    
    DataFrame должен содержать колонки:
    - open, high, low, close, volume
    - rsi (рассчитанный)
    - atr (рассчитанный)
    """
    
    def __init__(self, df: pd.DataFrame):
        self.df = df.copy()
        self._calculate_indicators()
    
    def _calculate_indicators(self):
        """Расчёт индикаторов. Замени на свою логику."""
        # RSI (заглушка)
        delta = self.df['close'].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        self.df['rsi'] = 100 - (100 / (1 + rs))
        
        # ATR (заглушка)
        high_low = self.df['high'] - self.df['low']
        high_close = np.abs(self.df['high'] - self.df['close'].shift())
        low_close = np.abs(self.df['low'] - self.df['close'].shift())
        ranges = pd.concat([high_low, high_close, low_close], axis=1)
        true_range = np.max(ranges, axis=1)
        self.df['atr'] = true_range.rolling(14).mean()
    
    def check_long_signal(self, idx: int) -> bool:
        """
        Проверка Long сигнала.
        Замени на свою логику.
        """
        # Заглушка: случайный сигнал для теста
        # В реальной стратегии здесь сложная логика
        if idx < 20:
            return False
        
        rsi = self.df['rsi'].iloc[idx]
        close = self.df['close'].iloc[idx]
        prev_close = self.df['close'].iloc[idx - 1]
        
        # Пример простого условия (замени на своё)
        return rsi < 40 and close > prev_close
    
    def check_short_signal(self, idx: int) -> bool:
        """
        Проверка Short сигнала.
        Замени на свою логику.
        """
        if idx < 20:
            return False
        
        rsi = self.df['rsi'].iloc[idx]
        close = self.df['close'].iloc[idx]
        prev_close = self.df['close'].iloc[idx - 1]
        
        # Пример простого условия (замени на своё)
        return rsi > 60 and close < prev_close
