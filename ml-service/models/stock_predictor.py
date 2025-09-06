"""
Stock Predictor Model
RNN-based stock price prediction using TensorFlow/Keras
"""

import os
import asyncio
import logging
import pickle
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error
import joblib

from ..utils.logger import setup_logger

logger = setup_logger(__name__)

class StockPredictor:
    """RNN-based stock price predictor"""
    
    def __init__(self, model_dir: str = None):
        """
        Initialize the stock predictor
        
        Args:
            model_dir: Directory to store trained models
        """
        self.model_dir = Path(model_dir or os.getenv('MODEL_STORAGE_PATH', './data/models'))
        self.model_dir.mkdir(parents=True, exist_ok=True)
        
        # Model parameters
        self.sequence_length = 60  # Use 60 days of data to predict next day
        self.features = ['Open', 'High', 'Low', 'Close', 'Volume']
        self.target_feature = 'Close'
        
        # Storage for models and scalers
        self.models = {}
        self.scalers = {}
        self.model_info = {}
        
        # TensorFlow settings
        tf.get_logger().setLevel('ERROR')  # Reduce TF logging
        
        logger.info(f"🤖 Stock predictor initialized with model dir: {self.model_dir}")
    
    async def initialize(self):
        """Initialize the predictor and load existing models"""
        try:
            # Load existing models
            await self._load_existing_models()
            logger.info("✅ Stock predictor initialized successfully")
        except Exception as e:
            logger.error(f"❌ Error initializing stock predictor: {str(e)}")
    
    async def _load_existing_models(self):
        """Load all existing models from disk"""
        try:
            model_files = list(self.model_dir.glob("*.h5"))
            
            for model_file in model_files:
                ticker = model_file.stem.replace('_model', '')
                
                try:
                    # Load model
                    model = keras.models.load_model(str(model_file))
                    self.models[ticker] = model
                    
                    # Load scaler
                    scaler_file = self.model_dir / f"{ticker}_scaler.pkl"
                    if scaler_file.exists():
                        with open(scaler_file, 'rb') as f:
                            self.scalers[ticker] = pickle.load(f)
                    
                    # Load model info
                    info_file = self.model_dir / f"{ticker}_info.pkl"
                    if info_file.exists():
                        with open(info_file, 'rb') as f:
                            self.model_info[ticker] = pickle.load(f)
                    
                    logger.info(f"📥 Loaded model for {ticker}")
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to load model for {ticker}: {str(e)}")
            
            logger.info(f"📊 Loaded {len(self.models)} existing models")
            
        except Exception as e:
            logger.error(f"❌ Error loading existing models: {str(e)}")
    
    def _prepare_data(self, data: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, MinMaxScaler]:
        """
        Prepare data for training/prediction
        
        Args:
            data: Stock data DataFrame
            
        Returns:
            Tuple of (X, y, scaler)
        """
        # Select features
        feature_data = data[self.features].values
        
        # Scale the data
        scaler = MinMaxScaler(feature_range=(0, 1))
        scaled_data = scaler.fit_transform(feature_data)
        
        # Create sequences
        X, y = [], []
        
        for i in range(self.sequence_length, len(scaled_data)):
            X.append(scaled_data[i-self.sequence_length:i])
            # Target is the 'Close' price (index 3 in features)
            close_index = self.features.index(self.target_feature)
            y.append(scaled_data[i, close_index])
        
        return np.array(X), np.array(y), scaler
    
    def _create_model(self, input_shape: Tuple[int, int]) -> keras.Model:
        """
        Create RNN model architecture
        
        Args:
            input_shape: Shape of input data (sequence_length, features)
            
        Returns:
            Compiled Keras model
        """
        model = keras.Sequential([
            # First LSTM layer with dropout
            layers.LSTM(
                units=50,
                return_sequences=True,
                input_shape=input_shape
            ),
            layers.Dropout(0.2),
            
            # Second LSTM layer with dropout
            layers.LSTM(
                units=50,
                return_sequences=True
            ),
            layers.Dropout(0.2),
            
            # Third LSTM layer with dropout
            layers.LSTM(
                units=50,
                return_sequences=False
            ),
            layers.Dropout(0.2),
            
            # Dense layers
            layers.Dense(units=25, activation='relu'),
            layers.Dropout(0.1),
            layers.Dense(units=1)
        ])
        
        # Compile model
        model.compile(
            optimizer='adam',
            loss='mean_squared_error',
            metrics=['mae']
        )
        
        return model
    
    async def train_model(self, ticker: str, data: pd.DataFrame) -> bool:
        """
        Train a model for a specific ticker
        
        Args:
            ticker: Stock ticker symbol
            data: Historical stock data
            
        Returns:
            True if training successful
        """
        try:
            ticker = ticker.upper()
            logger.info(f"🏋️ Training model for {ticker} with {len(data)} data points")
            
            if len(data) < self.sequence_length + 30:  # Need enough data
                logger.error(f"❌ Insufficient data for {ticker}. Need at least {self.sequence_length + 30} points")
                return False
            
            # Prepare data
            X, y, scaler = self._prepare_data(data)
            
            if len(X) == 0:
                logger.error(f"❌ No training sequences created for {ticker}")
                return False
            
            # Split data (80% train, 20% validation)
            split_idx = int(0.8 * len(X))
            X_train, X_val = X[:split_idx], X[split_idx:]
            y_train, y_val = y[:split_idx], y[split_idx:]
            
            logger.info(f"📊 Training data: {len(X_train)}, Validation data: {len(X_val)}")
            
            # Create model
            model = self._create_model((X.shape[1], X.shape[2]))
            
            # Callbacks
            early_stopping = keras.callbacks.EarlyStopping(
                monitor='val_loss',
                patience=10,
                restore_best_weights=True
            )
            
            reduce_lr = keras.callbacks.ReduceLROnPlateau(
                monitor='val_loss',
                factor=0.2,
                patience=5,
                min_lr=0.0001
            )
            
            # Train model
            history = model.fit(
                X_train, y_train,
                batch_size=32,
                epochs=100,
                validation_data=(X_val, y_val),
                callbacks=[early_stopping, reduce_lr],
                verbose=0
            )
            
            # Evaluate model
            train_loss = model.evaluate(X_train, y_train, verbose=0)[0]
            val_loss = model.evaluate(X_val, y_val, verbose=0)[0]
            
            logger.info(f"📈 Training completed for {ticker} - Train Loss: {train_loss:.6f}, Val Loss: {val_loss:.6f}")
            
            # Save model and scaler
            await self._save_model(ticker, model, scaler, {
                'train_loss': train_loss,
                'val_loss': val_loss,
                'training_samples': len(X_train),
                'validation_samples': len(X_val),
                'epochs_trained': len(history.history['loss']),
                'last_trained': datetime.now().isoformat(),
                'data_points_used': len(data)
            })
            
            # Store in memory
            self.models[ticker] = model
            self.scalers[ticker] = scaler
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error training model for {ticker}: {str(e)}")
            return False
    
    async def predict(self, ticker: str, data: pd.DataFrame, days: int = 30) -> List[Dict[str, Any]]:
        """
        Generate predictions for a ticker
        
        Args:
            ticker: Stock ticker symbol
            data: Historical stock data
            days: Number of days to predict
            
        Returns:
            List of prediction dictionaries
        """
        try:
            ticker = ticker.upper()
            logger.info(f"🔮 Generating {days} day predictions for {ticker}")
            
            # Check if model exists, if not train it
            if ticker not in self.models:
                logger.info(f"🏋️ No existing model for {ticker}, training new model...")
                success = await self.train_model(ticker, data)
                if not success:
                    logger.error(f"❌ Failed to train model for {ticker}")
                    return []
            
            model = self.models[ticker]
            scaler = self.scalers[ticker]
            
            # Prepare the last sequence for prediction
            feature_data = data[self.features].values
            scaled_data = scaler.transform(feature_data)
            
            # Get the last sequence
            last_sequence = scaled_data[-self.sequence_length:]
            
            predictions = []
            current_sequence = last_sequence.copy()
            
            for day in range(days):
                # Reshape for prediction
                X_pred = current_sequence.reshape(1, self.sequence_length, len(self.features))
                
                # Make prediction
                pred_scaled = model.predict(X_pred, verbose=0)[0][0]
                
                # Create full feature vector for inverse transform
                # We'll use the last known values for other features and update Close
                last_features = current_sequence[-1].copy()
                close_index = self.features.index(self.target_feature)
                last_features[close_index] = pred_scaled
                
                # Inverse transform to get actual price
                full_pred = np.zeros((1, len(self.features)))
                full_pred[0] = last_features
                pred_actual = scaler.inverse_transform(full_pred)[0][close_index]
                
                # Calculate confidence (simplified approach)
                # In a real implementation, you might use prediction intervals
                confidence = max(0.5, 1.0 - (day * 0.02))  # Decreasing confidence over time
                confidence_range = pred_actual * 0.05 * (1 + day * 0.1)  # Increasing uncertainty
                
                predictions.append({
                    'price': pred_actual,
                    'confidence': confidence,
                    'confidence_upper': pred_actual + confidence_range,
                    'confidence_lower': max(0, pred_actual - confidence_range),
                    'day': day + 1
                })
                
                # Update sequence for next prediction
                current_sequence = np.roll(current_sequence, -1, axis=0)
                current_sequence[-1] = last_features
            
            logger.info(f"✅ Generated {len(predictions)} predictions for {ticker}")
            return predictions
            
        except Exception as e:
            logger.error(f"❌ Error generating predictions for {ticker}: {str(e)}")
            return []
    
    async def _save_model(self, ticker: str, model: keras.Model, scaler: MinMaxScaler, info: Dict[str, Any]):
        """
        Save model, scaler, and info to disk
        
        Args:
            ticker: Stock ticker symbol
            model: Trained Keras model
            scaler: Fitted scaler
            info: Model information dictionary
        """
        try:
            # Save model
            model_path = self.model_dir / f"{ticker}_model.h5"
            model.save(str(model_path))
            
            # Save scaler
            scaler_path = self.model_dir / f"{ticker}_scaler.pkl"
            with open(scaler_path, 'wb') as f:
                pickle.dump(scaler, f)
            
            # Save info
            info_path = self.model_dir / f"{ticker}_info.pkl"
            with open(info_path, 'wb') as f:
                pickle.dump(info, f)
            
            self.model_info[ticker] = info
            
            logger.info(f"💾 Saved model for {ticker}")
            
        except Exception as e:
            logger.error(f"❌ Error saving model for {ticker}: {str(e)}")
    
    async def retrain_model(self, ticker: str):
        """
        Retrain model for a ticker (background task)
        
        Args:
            ticker: Stock ticker symbol
        """
        try:
            ticker = ticker.upper()
            logger.info(f"🔄 Retraining model for {ticker}")
            
            # This would fetch fresh data and retrain
            # For now, we'll just log the action
            logger.info(f"🔄 Model retraining for {ticker} would happen here")
            
        except Exception as e:
            logger.error(f"❌ Error retraining model for {ticker}: {str(e)}")
    
    def get_model_info(self, ticker: str) -> Dict[str, Any]:
        """
        Get information about a model
        
        Args:
            ticker: Stock ticker symbol
            
        Returns:
            Model information dictionary
        """
        ticker = ticker.upper()
        return self.model_info.get(ticker, {})
    
    def get_all_models_status(self) -> Dict[str, Dict[str, Any]]:
        """
        Get status of all models
        
        Returns:
            Dictionary of model statuses
        """
        status = {}
        
        for ticker in self.models.keys():
            info = self.model_info.get(ticker, {})
            status[ticker] = {
                'model_loaded': True,
                'scaler_loaded': ticker in self.scalers,
                'last_trained': info.get('last_trained', 'Unknown'),
                'train_loss': info.get('train_loss', 'Unknown'),
                'val_loss': info.get('val_loss', 'Unknown'),
                'training_samples': info.get('training_samples', 'Unknown')
            }
        
        return status
    
    def cleanup_old_models(self, days_old: int = 30):
        """
        Clean up models older than specified days
        
        Args:
            days_old: Number of days after which to consider models old
        """
        try:
            cutoff_date = datetime.now() - timedelta(days=days_old)
            removed_count = 0
            
            for ticker, info in self.model_info.items():
                last_trained_str = info.get('last_trained')
                if last_trained_str:
                    try:
                        last_trained = datetime.fromisoformat(last_trained_str)
                        if last_trained < cutoff_date:
                            # Remove from memory
                            if ticker in self.models:
                                del self.models[ticker]
                            if ticker in self.scalers:
                                del self.scalers[ticker]
                            
                            # Remove files
                            for suffix in ['_model.h5', '_scaler.pkl', '_info.pkl']:
                                file_path = self.model_dir / f"{ticker}{suffix}"
                                if file_path.exists():
                                    file_path.unlink()
                            
                            removed_count += 1
                            logger.info(f"🗑️ Removed old model for {ticker}")
                    
                    except ValueError:
                        logger.warning(f"⚠️ Invalid date format for {ticker}: {last_trained_str}")
            
            if removed_count > 0:
                # Update model_info
                self.model_info = {k: v for k, v in self.model_info.items() if k in self.models}
                logger.info(f"🧹 Cleaned up {removed_count} old models")
            
        except Exception as e:
            logger.error(f"❌ Error cleaning up old models: {str(e)}")

