"""
Fetcher для Bitcoin Spot ETF данных с Farside Investors
"""
import aiohttp
import re
from datetime import datetime
from typing import List, Dict, Optional


class FarsideETFFetcher:
    URL = "https://farside.co.uk/btc/"
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
    
    async def _get_session(self):
        if not self.session:
            self.session = aiohttp.ClientSession(
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                }
            )
        return self.session
    
    @staticmethod
    def _parse_value(val: str) -> Optional[float]:
        """Парсит числовое значение из ячейки таблицы"""
        val = val.strip()
        if val in ("-", "", "n/a", "N/A"):
            return 0.0
        negative = val.startswith("(") and val.endswith(")")
        # Убираем скобки и запятые
        val = val.replace(",", "").replace("(", "").replace(")", "")
        try:
            num = float(val)
            return -num if negative else num
        except ValueError:
            return None
    
    @staticmethod
    def _parse_date(val: str) -> Optional[str]:
        """Парсит дату в формате ISO"""
        val = val.strip()
        try:
            dt = datetime.strptime(val, "%d %b %Y")
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            return None
    
    async def get_daily_flows(self) -> List[Dict]:
        """
        Скрапит ежедневные притоки/оттоки по Bitcoin spot ETF с Farside
        """
        session = await self._get_session()
        async with session.get(self.URL) as resp:
            text = await resp.text()
        
        # Находим все таблицы
        tables = re.findall(r"<table[^>]*>(.*?)</table>", text, re.DOTALL)
        if len(tables) < 2:
            return []
        
        # Таблица с данными — вторая (индекс 1)
        table_html = tables[1]
        rows = re.findall(r"<tr[^>]*>(.*?)</tr>", table_html, re.DOTALL)
        
        if len(rows) < 4:
            return []
        
        # Ищем заголовки: объединяем row 0 и row 1, чтобы найти Total и тикеры
        row0_cells = [re.sub(r"<.*?>", "", c).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", rows[0], re.DOTALL)]
        row1_cells = [re.sub(r"<.*?>", "", c).strip() for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", rows[1], re.DOTALL)]
        
        total_index = -1
        for cells in (row0_cells, row1_cells):
            for i, h in enumerate(cells):
                if h.lower() == "total":
                    total_index = i
                    break
            if total_index >= 0:
                break
        
        if total_index < 0:
            return []
        
        # Используем row1 как основной источник тикеров
        headers = row1_cells if len(row1_cells) >= total_index else row0_cells
        fund_indices = []
        fund_tickers = []
        for i in range(1, total_index):
            h = headers[i] if i < len(headers) else ""
            if h and h.lower() != "total":
                fund_indices.append(i)
                fund_tickers.append(h)
        
        # Парсим данные (пропускаем Fee row)
        records = []
        for row in rows[3:]:
            cells = re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", row, re.DOTALL)
            cleaned = [re.sub(r"<.*?>", "", c).strip() for c in cells]
            if len(cleaned) <= total_index:
                continue
            
            date_str = self._parse_date(cleaned[0])
            if not date_str:
                continue
            
            total_val = self._parse_value(cleaned[total_index])
            if total_val is None:
                continue
            
            for idx, ticker in zip(fund_indices, fund_tickers):
                flow = self._parse_value(cleaned[idx])
                if flow is None:
                    continue
                records.append({
                    "date": date_str,
                    "fund_ticker": ticker,
                    "fund_name": self._ticker_to_name(ticker),
                    "flow_usd": round(flow * 1_000_000, 2),  # Farside показывает в миллионах
                })
            
            # Добавляем итоговую запись как агрегат
            records.append({
                "date": date_str,
                "fund_ticker": "TOTAL",
                "fund_name": "Total Net Flow",
                "flow_usd": round(total_val * 1_000_000, 2),
            })
        
        return records
    
    @staticmethod
    def _ticker_to_name(ticker: str) -> str:
        mapping = {
            "IBIT": "BlackRock iShares",
            "FBTC": "Fidelity Wise Origin",
            "BITB": "Bitwise Bitcoin ETF",
            "ARKB": "ARK 21Shares",
            "BTCO": "Invesco Galaxy",
            "EZBC": "Franklin Templeton",
            "BRRR": "Valkyrie Bitcoin",
            "HODL": "VanEck Bitcoin Trust",
            "BTCW": "WisdomTree Bitcoin",
            "MSBT": "Morgan Stanley Bitcoin",
            "GBTC": "Grayscale Bitcoin Trust",
            "BTC": "Bitcoin ETF",
        }
        return mapping.get(ticker, ticker)
    
    async def close(self):
        if self.session:
            await self.session.close()
