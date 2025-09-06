"""
FastAPI ML Service for Stock Prediction Dashboard
Provides endpoints for historical stock data and ML-based predictions
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from pydantic import BaseModel, Field, validator

from utils.stock_fetcher import StockDataFetcher
from utils.data_processor import DataProcessor
from models.stock_predictor import StockPredictor
from utils.logger import setup_logger

# Setup logging
logger = setup_logger(__name__)

# Global instances
stock_fetcher = None
data_processor = None
stock_predictor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global stock_fetcher, data_processor, stock_predictor
    
    logger.info("🚀 Starting ML Service...")
    
    # Initialize components
    stock_fetcher = StockDataFetcher()
    data_processor = DataProcessor()
    stock_predictor = StockPredictor()
    
    # Load or initialize ML models
    await stock_predictor.initialize()
    
    logger.info("✅ ML Service initialized successfully")
    
    yield
    
    logger.info("🛑 Shutting down ML Service...")

# Create FastAPI app
app = FastAPI(
    title="Stock Prediction ML Service",
    description="Machine Learning service for stock market analysis and predictions",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models for request/response validation
class HistoryResponse(BaseModel):
    """Response model for historical stock data"""
    ticker: str
    history: List[Dict[str, Any]]
    metadata: Dict[str, Any]
    
class PredictionResponse(BaseModel):
    """Response model for stock predictions"""
    ticker: str
    predictions: List[Dict[str, Any]]
    model_info: Dict[str, Any]
    confidence_score: float
    
class HealthResponse(BaseModel):
    """Response model for health check"""
    status: str
    timestamp: str
    version: str
    components: Dict[str, str]

# Health check endpoint
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        version="1.0.0",
        components={
            "stock_fetcher": "ready" if stock_fetcher else "not_initialized",
            "data_processor": "ready" if data_processor else "not_initialized",
            "stock_predictor": "ready" if stock_predictor else "not_initialized"
        }
    )

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Stock Prediction ML Service",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/history", response_model=HistoryResponse)
async def get_stock_history(
    ticker: str = Query(..., description="Stock ticker symbol", regex="^[A-Z]{1,5}$"),
    from_date: Optional[str] = Query(None, alias="from", description="Start date (YYYY-MM-DD)"),
    to_date: Optional[str] = Query(None, alias="to", description="End date (YYYY-MM-DD)")
):
    """
    Get historical stock data for a given ticker
    
    Args:
        ticker: Stock ticker symbol (e.g., AAPL, GOOGL)
        from_date: Start date in YYYY-MM-DD format
        to_date: End date in YYYY-MM-DD format
    
    Returns:
        Historical stock data with OHLCV information
    """
    try:
        logger.info(f"📊 Fetching history for {ticker} from {from_date} to {to_date}")
        
        # Validate and set default dates
        if not from_date:
            from_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        if not to_date:
            to_date = datetime.now().strftime('%Y-%m-%d')
        
        # Validate date format and range
        try:
            start_date = datetime.strptime(from_date, '%Y-%m-%d')
            end_date = datetime.strptime(to_date, '%Y-%m-%d')
            
            if start_date >= end_date:
                raise HTTPException(
                    status_code=400,
                    detail="Start date must be before end date"
                )
                
            if end_date > datetime.now():
                raise HTTPException(
                    status_code=400,
                    detail="End date cannot be in the future"
                )
                
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Fetch stock data
        raw_data = await stock_fetcher.fetch_stock_data(ticker, from_date, to_date)
        
        if raw_data is None or raw_data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No data found for ticker {ticker}"
            )
        
        # Process the data
        processed_data = data_processor.process_historical_data(raw_data)
        
        # Convert to response format
        history_list = []
        for index, row in processed_data.iterrows():
            history_list.append({
                "date": index.strftime('%Y-%m-%d'),
                "open": round(float(row['Open']), 2),
                "high": round(float(row['High']), 2),
                "low": round(float(row['Low']), 2),
                "close": round(float(row['Close']), 2),
                "volume": int(row['Volume']),
                "adj_close": round(float(row.get('Adj Close', row['Close'])), 2)
            })
        
        # Metadata
        metadata = {
            "data_points": len(history_list),
            "date_range": {
                "from": from_date,
                "to": to_date
            },
            "last_updated": datetime.now().isoformat(),
            "source": "Yahoo Finance"
        }
        
        logger.info(f"✅ Successfully fetched {len(history_list)} data points for {ticker}")
        
        return HistoryResponse(
            ticker=ticker.upper(),
            history=history_list,
            metadata=metadata
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error fetching history for {ticker}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while fetching stock history: {str(e)}"
        )

@app.get("/predict", response_model=PredictionResponse)
async def get_stock_prediction(
    ticker: str = Query(..., description="Stock ticker symbol", regex="^[A-Z]{1,5}$"),
    days: int = Query(30, description="Number of days to predict", ge=1, le=90)
):
    """
    Get stock price predictions for a given ticker
    
    Args:
        ticker: Stock ticker symbol (e.g., AAPL, GOOGL)
        days: Number of days to predict (1-90)
    
    Returns:
        Stock price predictions with confidence intervals
    """
    try:
        logger.info(f"🔮 Generating predictions for {ticker} ({days} days)")
        
        # Fetch recent historical data for training
        end_date = datetime.now().strftime('%Y-%m-%d')
        start_date = (datetime.now() - timedelta(days=365)).strftime('%Y-%m-%d')
        
        raw_data = await stock_fetcher.fetch_stock_data(ticker, start_date, end_date)
        
        if raw_data is None or raw_data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"No historical data found for ticker {ticker}"
            )
        
        if len(raw_data) < 60:  # Need at least 60 days for RNN
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient historical data for {ticker}. Need at least 60 days."
            )
        
        # Process data for ML model
        processed_data = data_processor.prepare_for_prediction(raw_data)
        
        # Generate predictions
        predictions = await stock_predictor.predict(ticker, processed_data, days)
        
        if not predictions:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate predictions"
            )
        
        # Format predictions
        prediction_list = []
        base_date = datetime.now()
        
        for i, pred in enumerate(predictions):
            pred_date = base_date + timedelta(days=i+1)
            prediction_list.append({
                "date": pred_date.strftime('%Y-%m-%d'),
                "predicted_price": round(float(pred['price']), 2),
                "confidence_upper": round(float(pred['confidence_upper']), 2),
                "confidence_lower": round(float(pred['confidence_lower']), 2),
                "confidence_score": round(float(pred['confidence']), 3)
            })
        
        # Model information
        model_info = {
            "model_type": "RNN-LSTM",
            "training_data_points": len(processed_data),
            "features_used": ["Open", "High", "Low", "Close", "Volume"],
            "prediction_horizon": f"{days} days",
            "last_trained": stock_predictor.get_model_info(ticker).get('last_trained', 'Unknown')
        }
        
        # Calculate average confidence
        avg_confidence = sum(pred['confidence'] for pred in predictions) / len(predictions)
        
        logger.info(f"✅ Generated {len(prediction_list)} predictions for {ticker}")
        
        return PredictionResponse(
            ticker=ticker.upper(),
            predictions=prediction_list,
            model_info=model_info,
            confidence_score=round(avg_confidence, 3)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error generating predictions for {ticker}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error while generating predictions: {str(e)}"
        )

@app.post("/retrain/{ticker}")
async def retrain_model(
    ticker: str,
    background_tasks: BackgroundTasks
):
    """
    Trigger model retraining for a specific ticker
    
    Args:
        ticker: Stock ticker symbol
    
    Returns:
        Status of retraining request
    """
    try:
        logger.info(f"🔄 Triggering model retraining for {ticker}")
        
        # Add retraining task to background
        background_tasks.add_task(stock_predictor.retrain_model, ticker)
        
        return {
            "message": f"Model retraining initiated for {ticker}",
            "status": "queued",
            "ticker": ticker.upper()
        }
        
    except Exception as e:
        logger.error(f"❌ Error initiating retraining for {ticker}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initiate model retraining: {str(e)}"
        )

@app.get("/models/status")
async def get_models_status():
    """Get status of all trained models"""
    try:
        status = stock_predictor.get_all_models_status()
        return {
            "models": status,
            "total_models": len(status),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Error getting models status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get models status: {str(e)}"
        )

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Custom HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """General exception handler"""
    logger.error(f"❌ Unhandled exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500,
            "timestamp": datetime.now().isoformat()
        }
    )

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )

