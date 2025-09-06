# API Documentation

This document describes the REST API endpoints for the Stock Prediction Dashboard.

## Base URLs

- **Backend API**: `http://localhost:3000/api`
- **ML Service**: `http://localhost:8001`

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Backend API Endpoints

### Authentication

#### POST /api/auth/register

Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "favorites": [],
    "profile": {},
    "createdAt": "2023-01-01T00:00:00.000Z"
  }
}
```

#### POST /api/auth/login

Login with existing credentials.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "favorites": ["AAPL", "GOOGL"],
    "profile": {},
    "lastLogin": "2023-01-01T00:00:00.000Z",
    "loginCount": 5
  }
}
```

#### GET /api/auth/profile

Get current user profile. **Requires authentication.**

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "favorites": ["AAPL", "GOOGL"],
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "preferences": {
        "defaultDateRange": "1y",
        "defaultChartType": "line",
        "showPredictions": true,
        "theme": "light"
      }
    },
    "favoriteCount": 2
  }
}
```

#### POST /api/auth/favorites

Add a stock to favorites. **Requires authentication.**

**Request Body:**
```json
{
  "ticker": "AAPL"
}
```

**Response:**
```json
{
  "success": true,
  "message": "AAPL added to favorites",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "favorites": ["AAPL", "GOOGL", "MSFT"]
  }
}
```

#### DELETE /api/auth/favorites/:ticker

Remove a stock from favorites. **Requires authentication.**

**Response:**
```json
{
  "success": true,
  "message": "AAPL removed from favorites",
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "favorites": ["GOOGL", "MSFT"]
  }
}
```

### Stock Data

#### GET /api/stocks/history

Get historical stock data (proxied to ML service). **Requires authentication.**

**Query Parameters:**
- `ticker` (required): Stock ticker symbol (e.g., AAPL)
- `from` (optional): Start date in YYYY-MM-DD format
- `to` (optional): End date in YYYY-MM-DD format

**Example:**
```
GET /api/stocks/history?ticker=AAPL&from=2023-01-01&to=2023-12-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ticker": "AAPL",
    "history": [
      {
        "date": "2023-01-01",
        "open": 150.00,
        "high": 155.00,
        "low": 149.00,
        "close": 154.00,
        "volume": 50000000,
        "adj_close": 154.00
      }
    ],
    "metadata": {
      "data_points": 252,
      "date_range": {
        "from": "2023-01-01",
        "to": "2023-12-31"
      },
      "last_updated": "2023-12-31T23:59:59.000Z",
      "source": "Yahoo Finance"
    }
  },
  "ticker": "AAPL",
  "dateRange": {
    "from": "2023-01-01",
    "to": "2023-12-31"
  },
  "timestamp": "2023-12-31T23:59:59.000Z"
}
```

#### GET /api/stocks/predict

Get stock price predictions (proxied to ML service). **Requires authentication.**

**Query Parameters:**
- `ticker` (required): Stock ticker symbol

**Example:**
```
GET /api/stocks/predict?ticker=AAPL
```

**Response:**
```json
{
  "success": true,
  "data": {
    "ticker": "AAPL",
    "predictions": [
      {
        "date": "2024-01-01",
        "predicted_price": 156.50,
        "confidence_upper": 162.00,
        "confidence_lower": 151.00,
        "confidence_score": 0.85
      }
    ],
    "model_info": {
      "model_type": "RNN-LSTM",
      "training_data_points": 1000,
      "features_used": ["Open", "High", "Low", "Close", "Volume"],
      "prediction_horizon": "30 days",
      "last_trained": "2023-12-31T12:00:00.000Z"
    },
    "confidence_score": 0.82
  },
  "ticker": "AAPL",
  "timestamp": "2023-12-31T23:59:59.000Z"
}
```

#### GET /api/stocks/popular

Get popular/trending stocks. **Requires authentication.**

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "price": 175.43,
      "change": 2.15,
      "changePercent": 1.24,
      "volume": 45234567
    }
  ],
  "timestamp": "2023-12-31T23:59:59.000Z"
}
```

#### GET /api/stocks/search

Search for stock symbols. **Requires authentication.**

**Query Parameters:**
- `q` (required): Search query

**Example:**
```
GET /api/stocks/search?q=apple
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "exchange": "NASDAQ"
    }
  ],
  "query": "APPLE",
  "count": 1,
  "timestamp": "2023-12-31T23:59:59.000Z"
}
```

## ML Service Endpoints

### Health Check

#### GET /health

Check ML service health.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2023-12-31T23:59:59.000Z",
  "version": "1.0.0",
  "components": {
    "stock_fetcher": "ready",
    "data_processor": "ready",
    "stock_predictor": "ready"
  }
}
```

### Stock Data

#### GET /history

Get historical stock data directly from ML service.

**Query Parameters:**
- `ticker` (required): Stock ticker symbol
- `from` (optional): Start date in YYYY-MM-DD format
- `to` (optional): End date in YYYY-MM-DD format

**Response:** Same as backend `/api/stocks/history`

#### GET /predict

Get stock predictions directly from ML service.

**Query Parameters:**
- `ticker` (required): Stock ticker symbol
- `days` (optional): Number of days to predict (1-90, default: 30)

**Response:** Same as backend `/api/stocks/predict`

### Model Management

#### POST /retrain/{ticker}

Trigger model retraining for a specific ticker.

**Response:**
```json
{
  "message": "Model retraining initiated for AAPL",
  "status": "queued",
  "ticker": "AAPL"
}
```

#### GET /models/status

Get status of all trained models.

**Response:**
```json
{
  "models": {
    "AAPL": {
      "model_loaded": true,
      "scaler_loaded": true,
      "last_trained": "2023-12-31T12:00:00.000Z",
      "train_loss": 0.001234,
      "val_loss": 0.001456,
      "training_samples": 800
    }
  },
  "total_models": 1,
  "timestamp": "2023-12-31T23:59:59.000Z"
}
```

## Error Responses

All endpoints return errors in a consistent format:

```json
{
  "success": false,
  "message": "Error description",
  "status_code": 400,
  "timestamp": "2023-12-31T23:59:59.000Z"
}
```

### Common Error Codes

- **400 Bad Request**: Invalid request parameters
- **401 Unauthorized**: Missing or invalid authentication token
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists (e.g., duplicate email)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- **Authentication endpoints**: 5 requests per 15 minutes per IP
- **Stock data endpoints**: 30 requests per minute per IP
- **General API endpoints**: 100 requests per 15 minutes per IP

Rate limit headers are included in responses:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time

## Data Formats

### Date Format

All dates use ISO 8601 format: `YYYY-MM-DDTHH:mm:ss.sssZ`

Query parameters use simplified format: `YYYY-MM-DD`

### Stock Ticker Format

- Must be 1-5 uppercase letters
- Examples: `AAPL`, `GOOGL`, `MSFT`

### Price Format

All prices are in USD with 2 decimal places.

### Volume Format

Volume is represented as integer (number of shares).

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

const api = axios.create({
  baseURL: 'http://localhost:3000/api',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// Get stock history
const history = await api.get('/stocks/history', {
  params: {
    ticker: 'AAPL',
    from: '2023-01-01',
    to: '2023-12-31'
  }
});

// Get predictions
const predictions = await api.get('/stocks/predict', {
  params: { ticker: 'AAPL' }
});
```

### Python

```python
import requests

headers = {'Authorization': f'Bearer {token}'}
base_url = 'http://localhost:3000/api'

# Get stock history
response = requests.get(f'{base_url}/stocks/history', 
                       headers=headers,
                       params={
                           'ticker': 'AAPL',
                           'from': '2023-01-01',
                           'to': '2023-12-31'
                       })

# Get predictions
response = requests.get(f'{base_url}/stocks/predict',
                       headers=headers,
                       params={'ticker': 'AAPL'})
```

### cURL

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'

# Get stock history (with token)
curl -X GET "http://localhost:3000/api/stocks/history?ticker=AAPL&from=2023-01-01&to=2023-12-31" \
  -H "Authorization: Bearer your-jwt-token"

# Get predictions
curl -X GET "http://localhost:3000/api/stocks/predict?ticker=AAPL" \
  -H "Authorization: Bearer your-jwt-token"
```

## Interactive Documentation

The ML service provides interactive API documentation:

- **Swagger UI**: http://localhost:8001/docs
- **ReDoc**: http://localhost:8001/redoc

These interfaces allow you to test endpoints directly from your browser.

