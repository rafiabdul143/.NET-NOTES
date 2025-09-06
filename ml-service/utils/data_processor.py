"""
Data Processing Utilities
Handles cleaning and preprocessing of stock data
"""

import pandas as pd
import numpy as np
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import logging

from .logger import setup_logger

logger = setup_logger(__name__)

class DataProcessor:
    """Processes and cleans stock data for ML models"""
    
    def __init__(self):
        """Initialize the data processor"""
        logger.info("📊 Data processor initialized")
    
    def process_historical_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Process historical stock data
        
        Args:
            data: Raw stock data from yfinance
            
        Returns:
            Cleaned and processed DataFrame
        """
        try:
            if data.empty:
                logger.warning("⚠️ Empty data provided to processor")
                return data
            
            # Make a copy to avoid modifying original
            processed_data = data.copy()
            
            # Ensure Date column is datetime and set as index
            if 'Date' in processed_data.columns:
                processed_data['Date'] = pd.to_datetime(processed_data['Date'])
                processed_data.set_index('Date', inplace=True)
            elif not isinstance(processed_data.index, pd.DatetimeIndex):
                # If index is not datetime, try to convert
                processed_data.index = pd.to_datetime(processed_data.index)
            
            # Sort by date
            processed_data.sort_index(inplace=True)
            
            # Handle missing values
            processed_data = self._handle_missing_values(processed_data)
            
            # Add technical indicators
            processed_data = self._add_technical_indicators(processed_data)
            
            # Validate data integrity
            processed_data = self._validate_data_integrity(processed_data)
            
            logger.info(f"✅ Processed {len(processed_data)} data points")
            return processed_data
            
        except Exception as e:
            logger.error(f"❌ Error processing historical data: {str(e)}")
            return data  # Return original data if processing fails
    
    def prepare_for_prediction(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Prepare data specifically for ML prediction
        
        Args:
            data: Historical stock data
            
        Returns:
            Data prepared for ML model
        """
        try:
            # First, process the historical data
            processed_data = self.process_historical_data(data)
            
            # Additional preprocessing for ML
            processed_data = self._normalize_volume(processed_data)
            processed_data = self._handle_outliers(processed_data)
            
            # Ensure we have the required columns
            required_columns = ['Open', 'High', 'Low', 'Close', 'Volume']
            missing_columns = [col for col in required_columns if col not in processed_data.columns]
            
            if missing_columns:
                logger.error(f"❌ Missing required columns for ML: {missing_columns}")
                raise ValueError(f"Missing required columns: {missing_columns}")
            
            logger.info(f"🤖 Prepared {len(processed_data)} data points for ML prediction")
            return processed_data
            
        except Exception as e:
            logger.error(f"❌ Error preparing data for prediction: {str(e)}")
            raise
    
    def _handle_missing_values(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Handle missing values in the dataset
        
        Args:
            data: DataFrame with potential missing values
            
        Returns:
            DataFrame with missing values handled
        """
        try:
            # Check for missing values
            missing_counts = data.isnull().sum()
            if missing_counts.any():
                logger.warning(f"⚠️ Found missing values: {missing_counts[missing_counts > 0].to_dict()}")
            
            # Forward fill for price data (use previous day's price)
            price_columns = ['Open', 'High', 'Low', 'Close', 'Adj Close']
            for col in price_columns:
                if col in data.columns:
                    data[col] = data[col].fillna(method='ffill')
            
            # For volume, use median of recent values
            if 'Volume' in data.columns:
                # Fill with rolling median of last 5 days
                data['Volume'] = data['Volume'].fillna(
                    data['Volume'].rolling(window=5, min_periods=1).median()
                )
                # If still NaN, use overall median
                data['Volume'] = data['Volume'].fillna(data['Volume'].median())
            
            # Drop rows that still have NaN values
            initial_len = len(data)
            data = data.dropna()
            
            if len(data) < initial_len:
                logger.info(f"🧹 Dropped {initial_len - len(data)} rows with missing values")
            
            return data
            
        except Exception as e:
            logger.error(f"❌ Error handling missing values: {str(e)}")
            return data
    
    def _add_technical_indicators(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Add technical indicators to the dataset
        
        Args:
            data: Stock data DataFrame
            
        Returns:
            DataFrame with technical indicators added
        """
        try:
            # Simple Moving Averages
            data['SMA_5'] = data['Close'].rolling(window=5).mean()
            data['SMA_10'] = data['Close'].rolling(window=10).mean()
            data['SMA_20'] = data['Close'].rolling(window=20).mean()
            
            # Exponential Moving Averages
            data['EMA_12'] = data['Close'].ewm(span=12).mean()
            data['EMA_26'] = data['Close'].ewm(span=26).mean()
            
            # MACD
            data['MACD'] = data['EMA_12'] - data['EMA_26']
            data['MACD_Signal'] = data['MACD'].ewm(span=9).mean()
            
            # RSI (Relative Strength Index)
            data['RSI'] = self._calculate_rsi(data['Close'])
            
            # Bollinger Bands
            data['BB_Middle'] = data['Close'].rolling(window=20).mean()
            bb_std = data['Close'].rolling(window=20).std()
            data['BB_Upper'] = data['BB_Middle'] + (bb_std * 2)
            data['BB_Lower'] = data['BB_Middle'] - (bb_std * 2)
            
            # Price change and returns
            data['Price_Change'] = data['Close'].diff()
            data['Price_Change_Pct'] = data['Close'].pct_change()
            
            # Volume indicators
            data['Volume_SMA'] = data['Volume'].rolling(window=10).mean()
            data['Volume_Ratio'] = data['Volume'] / data['Volume_SMA']
            
            # Volatility (rolling standard deviation of returns)
            data['Volatility'] = data['Price_Change_Pct'].rolling(window=20).std()
            
            logger.info("📈 Added technical indicators")
            return data
            
        except Exception as e:
            logger.error(f"❌ Error adding technical indicators: {str(e)}")
            return data
    
    def _calculate_rsi(self, prices: pd.Series, window: int = 14) -> pd.Series:
        """
        Calculate Relative Strength Index (RSI)
        
        Args:
            prices: Price series
            window: RSI calculation window
            
        Returns:
            RSI series
        """
        try:
            delta = prices.diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=window).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=window).mean()
            
            rs = gain / loss
            rsi = 100 - (100 / (1 + rs))
            
            return rsi
            
        except Exception as e:
            logger.error(f"❌ Error calculating RSI: {str(e)}")
            return pd.Series(index=prices.index, dtype=float)
    
    def _validate_data_integrity(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Validate data integrity and fix common issues
        
        Args:
            data: Stock data DataFrame
            
        Returns:
            Validated DataFrame
        """
        try:
            initial_len = len(data)
            
            # Remove rows where High < Low (data error)
            if 'High' in data.columns and 'Low' in data.columns:
                invalid_rows = data['High'] < data['Low']
                if invalid_rows.any():
                    logger.warning(f"⚠️ Found {invalid_rows.sum()} rows where High < Low")
                    data = data[~invalid_rows]
            
            # Remove rows with zero or negative prices
            price_columns = ['Open', 'High', 'Low', 'Close']
            for col in price_columns:
                if col in data.columns:
                    invalid_prices = data[col] <= 0
                    if invalid_prices.any():
                        logger.warning(f"⚠️ Found {invalid_prices.sum()} invalid prices in {col}")
                        data = data[~invalid_prices]
            
            # Remove rows with extremely high volume (potential data errors)
            if 'Volume' in data.columns:
                volume_threshold = data['Volume'].quantile(0.99) * 10  # 10x the 99th percentile
                extreme_volume = data['Volume'] > volume_threshold
                if extreme_volume.any():
                    logger.warning(f"⚠️ Found {extreme_volume.sum()} rows with extreme volume")
                    data = data[~extreme_volume]
            
            # Check for duplicate dates
            if data.index.duplicated().any():
                logger.warning("⚠️ Found duplicate dates, keeping last occurrence")
                data = data[~data.index.duplicated(keep='last')]
            
            if len(data) < initial_len:
                logger.info(f"🧹 Removed {initial_len - len(data)} invalid data points")
            
            return data
            
        except Exception as e:
            logger.error(f"❌ Error validating data integrity: {str(e)}")
            return data
    
    def _normalize_volume(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize volume data to handle extreme values
        
        Args:
            data: Stock data DataFrame
            
        Returns:
            DataFrame with normalized volume
        """
        try:
            if 'Volume' in data.columns:
                # Log transform to reduce skewness
                data['Volume_Log'] = np.log1p(data['Volume'])
                
                # Z-score normalization for volume
                volume_mean = data['Volume'].rolling(window=30).mean()
                volume_std = data['Volume'].rolling(window=30).std()
                data['Volume_Normalized'] = (data['Volume'] - volume_mean) / volume_std
                
                # Fill NaN values from rolling calculations
                data['Volume_Normalized'] = data['Volume_Normalized'].fillna(0)
            
            return data
            
        except Exception as e:
            logger.error(f"❌ Error normalizing volume: {str(e)}")
            return data
    
    def _handle_outliers(self, data: pd.DataFrame, method: str = 'iqr') -> pd.DataFrame:
        """
        Handle outliers in the dataset
        
        Args:
            data: Stock data DataFrame
            method: Method to handle outliers ('iqr' or 'zscore')
            
        Returns:
            DataFrame with outliers handled
        """
        try:
            if method == 'iqr':
                # Use IQR method for price changes
                if 'Price_Change_Pct' in data.columns:
                    Q1 = data['Price_Change_Pct'].quantile(0.25)
                    Q3 = data['Price_Change_Pct'].quantile(0.75)
                    IQR = Q3 - Q1
                    
                    lower_bound = Q1 - 1.5 * IQR
                    upper_bound = Q3 + 1.5 * IQR
                    
                    # Cap outliers instead of removing them
                    data['Price_Change_Pct'] = data['Price_Change_Pct'].clip(
                        lower=lower_bound, 
                        upper=upper_bound
                    )
            
            elif method == 'zscore':
                # Use Z-score method
                if 'Price_Change_Pct' in data.columns:
                    z_scores = np.abs(
                        (data['Price_Change_Pct'] - data['Price_Change_Pct'].mean()) / 
                        data['Price_Change_Pct'].std()
                    )
                    
                    # Cap values with z-score > 3
                    outlier_mask = z_scores > 3
                    if outlier_mask.any():
                        logger.info(f"🎯 Capped {outlier_mask.sum()} outliers using z-score method")
                        
                        # Replace outliers with median
                        median_value = data['Price_Change_Pct'].median()
                        data.loc[outlier_mask, 'Price_Change_Pct'] = median_value
            
            return data
            
        except Exception as e:
            logger.error(f"❌ Error handling outliers: {str(e)}")
            return data
    
    def get_data_summary(self, data: pd.DataFrame) -> Dict[str, Any]:
        """
        Get summary statistics of the processed data
        
        Args:
            data: Processed stock data
            
        Returns:
            Dictionary with summary statistics
        """
        try:
            summary = {
                'total_records': len(data),
                'date_range': {
                    'start': data.index.min().strftime('%Y-%m-%d') if len(data) > 0 else None,
                    'end': data.index.max().strftime('%Y-%m-%d') if len(data) > 0 else None
                },
                'missing_values': data.isnull().sum().to_dict(),
                'price_statistics': {},
                'volume_statistics': {}
            }
            
            # Price statistics
            if 'Close' in data.columns:
                summary['price_statistics'] = {
                    'min': float(data['Close'].min()),
                    'max': float(data['Close'].max()),
                    'mean': float(data['Close'].mean()),
                    'std': float(data['Close'].std())
                }
            
            # Volume statistics
            if 'Volume' in data.columns:
                summary['volume_statistics'] = {
                    'min': int(data['Volume'].min()),
                    'max': int(data['Volume'].max()),
                    'mean': float(data['Volume'].mean()),
                    'std': float(data['Volume'].std())
                }
            
            return summary
            
        except Exception as e:
            logger.error(f"❌ Error generating data summary: {str(e)}")
            return {}

