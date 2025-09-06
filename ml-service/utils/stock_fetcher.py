"""
Stock Data Fetcher
Handles fetching stock data from Yahoo Finance and caching
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import pandas as pd
import yfinance as yf
from pathlib import Path
import pickle
import hashlib

from .logger import setup_logger

logger = setup_logger(__name__)

class StockDataFetcher:
    """Fetches and caches stock data from Yahoo Finance"""
    
    def __init__(self, cache_dir: str = None):
        """
        Initialize the stock data fetcher
        
        Args:
            cache_dir: Directory to store cached data
        """
        self.cache_dir = Path(cache_dir or os.getenv('DATA_STORAGE_PATH', './data'))
        self.csv_dir = self.cache_dir / 'csv'
        self.cache_duration = timedelta(hours=1)  # Cache for 1 hour
        
        # Create directories if they don't exist
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.csv_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info(f"📁 Stock fetcher initialized with cache dir: {self.cache_dir}")
    
    def _get_cache_key(self, ticker: str, start_date: str, end_date: str) -> str:
        """Generate cache key for the request"""
        key_string = f"{ticker}_{start_date}_{end_date}"
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def _get_cache_path(self, cache_key: str) -> Path:
        """Get cache file path"""
        return self.cache_dir / f"cache_{cache_key}.pkl"
    
    def _get_csv_path(self, ticker: str) -> Path:
        """Get CSV file path for ticker"""
        return self.csv_dir / f"{ticker.upper()}_data.csv"
    
    def _is_cache_valid(self, cache_path: Path) -> bool:
        """Check if cache file is still valid"""
        if not cache_path.exists():
            return False
        
        # Check if cache is within the valid duration
        cache_time = datetime.fromtimestamp(cache_path.stat().st_mtime)
        return datetime.now() - cache_time < self.cache_duration
    
    async def fetch_stock_data(
        self, 
        ticker: str, 
        start_date: str, 
        end_date: str,
        use_cache: bool = True
    ) -> Optional[pd.DataFrame]:
        """
        Fetch stock data for a given ticker and date range
        
        Args:
            ticker: Stock ticker symbol
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format
            use_cache: Whether to use cached data
            
        Returns:
            DataFrame with stock data or None if failed
        """
        try:
            ticker = ticker.upper()
            cache_key = self._get_cache_key(ticker, start_date, end_date)
            cache_path = self._get_cache_path(cache_key)
            
            # Try to load from cache first
            if use_cache and self._is_cache_valid(cache_path):
                logger.info(f"📋 Loading {ticker} data from cache")
                try:
                    with open(cache_path, 'rb') as f:
                        cached_data = pickle.load(f)
                    return cached_data['data']
                except Exception as e:
                    logger.warning(f"⚠️ Failed to load cache for {ticker}: {e}")
            
            # Fetch fresh data from Yahoo Finance
            logger.info(f"🌐 Fetching {ticker} data from Yahoo Finance ({start_date} to {end_date})")
            
            # Run yfinance in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            stock_data = await loop.run_in_executor(
                None, 
                self._fetch_yfinance_data, 
                ticker, 
                start_date, 
                end_date
            )
            
            if stock_data is None or stock_data.empty:
                logger.warning(f"⚠️ No data returned for {ticker}")
                return None
            
            # Validate data
            if not self._validate_stock_data(stock_data):
                logger.error(f"❌ Invalid data format for {ticker}")
                return None
            
            # Cache the data
            if use_cache:
                try:
                    cache_data = {
                        'data': stock_data,
                        'ticker': ticker,
                        'start_date': start_date,
                        'end_date': end_date,
                        'fetched_at': datetime.now().isoformat()
                    }
                    
                    with open(cache_path, 'wb') as f:
                        pickle.dump(cache_data, f)
                    
                    logger.info(f"💾 Cached data for {ticker}")
                except Exception as e:
                    logger.warning(f"⚠️ Failed to cache data for {ticker}: {e}")
            
            # Save to CSV (simulating S3 storage)
            await self._save_to_csv(ticker, stock_data, start_date, end_date)
            
            logger.info(f"✅ Successfully fetched {len(stock_data)} data points for {ticker}")
            return stock_data
            
        except Exception as e:
            logger.error(f"❌ Error fetching data for {ticker}: {str(e)}")
            return None
    
    def _fetch_yfinance_data(self, ticker: str, start_date: str, end_date: str) -> Optional[pd.DataFrame]:
        """
        Fetch data using yfinance (synchronous)
        
        Args:
            ticker: Stock ticker symbol
            start_date: Start date string
            end_date: End date string
            
        Returns:
            DataFrame with stock data
        """
        try:
            stock = yf.Ticker(ticker)
            data = stock.history(start=start_date, end=end_date)
            
            if data.empty:
                return None
            
            # Reset index to make Date a column
            data = data.reset_index()
            
            return data
            
        except Exception as e:
            logger.error(f"❌ yfinance error for {ticker}: {str(e)}")
            return None
    
    def _validate_stock_data(self, data: pd.DataFrame) -> bool:
        """
        Validate stock data format
        
        Args:
            data: Stock data DataFrame
            
        Returns:
            True if data is valid
        """
        required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
        
        if data.empty:
            return False
        
        # Check if all required columns exist
        missing_columns = [col for col in required_columns if col not in data.columns]
        if missing_columns:
            logger.error(f"❌ Missing columns: {missing_columns}")
            return False
        
        # Check for null values in critical columns
        critical_nulls = data[required_columns].isnull().sum()
        if critical_nulls.any():
            logger.warning(f"⚠️ Found null values: {critical_nulls[critical_nulls > 0].to_dict()}")
        
        # Check for negative prices (should not happen)
        price_columns = ['Open', 'High', 'Low', 'Close']
        negative_prices = (data[price_columns] < 0).any()
        if negative_prices.any():
            logger.error(f"❌ Found negative prices in columns: {negative_prices[negative_prices].index.tolist()}")
            return False
        
        return True
    
    async def _save_to_csv(self, ticker: str, data: pd.DataFrame, start_date: str, end_date: str):
        """
        Save stock data to CSV file (simulating S3 storage)
        
        Args:
            ticker: Stock ticker symbol
            data: Stock data DataFrame
            start_date: Start date string
            end_date: End date string
        """
        try:
            csv_path = self._get_csv_path(ticker)
            
            # Add metadata columns
            data_copy = data.copy()
            data_copy['ticker'] = ticker
            data_copy['fetched_at'] = datetime.now().isoformat()
            data_copy['date_range'] = f"{start_date}_to_{end_date}"
            
            # Save to CSV
            data_copy.to_csv(csv_path, index=False)
            
            logger.info(f"💾 Saved {ticker} data to CSV: {csv_path}")
            
        except Exception as e:
            logger.error(f"❌ Failed to save CSV for {ticker}: {str(e)}")
    
    async def get_latest_price(self, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get the latest price for a ticker
        
        Args:
            ticker: Stock ticker symbol
            
        Returns:
            Dictionary with latest price info
        """
        try:
            ticker = ticker.upper()
            
            # Fetch last 2 days of data to get latest price
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=2)).strftime('%Y-%m-%d')
            
            data = await self.fetch_stock_data(ticker, start_date, end_date, use_cache=False)
            
            if data is None or data.empty:
                return None
            
            # Get the latest row
            latest = data.iloc[-1]
            
            return {
                'ticker': ticker,
                'price': float(latest['Close']),
                'open': float(latest['Open']),
                'high': float(latest['High']),
                'low': float(latest['Low']),
                'volume': int(latest['Volume']),
                'date': latest['Date'].strftime('%Y-%m-%d') if 'Date' in latest else end_date,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting latest price for {ticker}: {str(e)}")
            return None
    
    def clear_cache(self, ticker: str = None):
        """
        Clear cached data
        
        Args:
            ticker: Specific ticker to clear, or None to clear all
        """
        try:
            if ticker:
                # Clear specific ticker cache
                pattern = f"*{ticker.upper()}*"
                cache_files = list(self.cache_dir.glob(f"cache_*{ticker.upper()}*.pkl"))
            else:
                # Clear all cache
                cache_files = list(self.cache_dir.glob("cache_*.pkl"))
            
            for cache_file in cache_files:
                cache_file.unlink()
            
            logger.info(f"🗑️ Cleared {len(cache_files)} cache files")
            
        except Exception as e:
            logger.error(f"❌ Error clearing cache: {str(e)}")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        try:
            cache_files = list(self.cache_dir.glob("cache_*.pkl"))
            csv_files = list(self.csv_dir.glob("*.csv"))
            
            total_cache_size = sum(f.stat().st_size for f in cache_files)
            total_csv_size = sum(f.stat().st_size for f in csv_files)
            
            return {
                'cache_files': len(cache_files),
                'csv_files': len(csv_files),
                'cache_size_mb': round(total_cache_size / (1024 * 1024), 2),
                'csv_size_mb': round(total_csv_size / (1024 * 1024), 2),
                'cache_dir': str(self.cache_dir),
                'csv_dir': str(self.csv_dir)
            }
            
        except Exception as e:
            logger.error(f"❌ Error getting cache stats: {str(e)}")
            return {}

