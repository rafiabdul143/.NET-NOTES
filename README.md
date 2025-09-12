# Stock Prediction Dashboard

A full-stack MERN + Python application for stock market analysis and prediction using machine learning.

## 🏗️ Architecture

- **Frontend**: React + Vite, TailwindCSS, Chart.js
- **Backend**: Node.js/Express with JWT authentication  
- **ML Service**: Python FastAPI with RNN predictions
- **Database**: MongoDB for user data and favorites

## 📁 Project Structure

```
stock-prediction-dashboard/
├── frontend/                 # React + Vite application
├── backend/                  # Node.js/Express API server
├── ml-service/              # Python FastAPI ML service
├── docs/                    # Documentation
├── docker-compose.yml       # Local development setup
├── .env.example            # Environment variables template
└── README.md               # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Python 3.8+
- MongoDB (local or MongoDB Atlas)
- Git

### Installation

1. **Clone and setup the project:**
```bash
git clone <repository-url>
cd stock-prediction-dashboard
cp .env.example .env
# Edit .env with your configuration
```

2. **Install Frontend dependencies:**
```bash
cd frontend
npm install
```

3. **Install Backend dependencies:**
```bash
cd ../backend
npm install
```

4. **Install ML Service dependencies:**
```bash
cd ../ml-service
pip install -r requirements.txt
```

### Running the Application

1. **Start MongoDB** (if running locally)

2. **Start the ML Service:**
```bash
cd ml-service
uvicorn main:app --reload --port 8001
```

3. **Start the Backend:**
```bash
cd backend
npm run dev
```

4. **Start the Frontend:**
```bash
cd frontend
npm run dev
```

5. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - ML Service: http://localhost:8001
   - ML Service Docs: http://localhost:8001/docs

## 🔧 Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/stock-dashboard

# JWT
JWT_SECRET=your-super-secret-jwt-key

# ML Service
ML_SERVICE_URL=http://localhost:8001

# Node Environment
NODE_ENV=development
PORT=3000
```

## 📊 Features

- **Real-time Stock Data**: Fetches live and historical data from Yahoo Finance
- **ML Predictions**: RNN-based next-day price predictions
- **User Authentication**: JWT-based secure authentication
- **Responsive Design**: Mobile-friendly dashboard layout
- **Interactive Charts**: Line and candlestick charts with prediction overlays
- **Favorites System**: Save and manage favorite stock tickers
- **Date Range Filtering**: Analyze stocks over custom time periods

## 🛠️ Development

### Frontend Development
```bash
cd frontend
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

### Backend Development
```bash
cd backend
npm run dev        # Start with nodemon
npm start          # Start production server
npm run seed       # Seed database with sample data
```

### ML Service Development
```bash
cd ml-service
uvicorn main:app --reload --port 8001  # Start with auto-reload
python -m pytest                       # Run tests
```

## 📚 API Documentation

### Backend Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `GET /api/stocks/history` - Get stock history (proxied to ML service)
- `GET /api/stocks/predict` - Get stock predictions (proxied to ML service)
- `POST /api/stocks/favorites` - Add stock to favorites
- `DELETE /api/stocks/favorites/:ticker` - Remove from favorites

### ML Service Endpoints
- `GET /history?ticker=AAPL&from=2023-01-01&to=2023-12-31` - Historical data
- `GET /predict?ticker=AAPL` - Price predictions

## 🧪 Testing

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# ML Service tests
cd ml-service && python -m pytest
```

## 🐳 Docker Development

```bash
# Start all services with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 📈 ML Model Details

The prediction model uses:
- **Architecture**: Simple RNN with LSTM layers
- **Features**: OHLCV data, technical indicators
- **Training**: Rolling window approach with 60-day lookback
- **Output**: Next-day price prediction with confidence intervals

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Ensure MongoDB is running
   - Check connection string in .env

2. **ML Service Import Errors**
   - Verify Python version (3.8+)
   - Install requirements: `pip install -r requirements.txt`

3. **Frontend Build Issues**
   - Clear node_modules: `rm -rf node_modules && npm install`
   - Check Node.js version (18+)

4. **CORS Issues**
   - Ensure backend CORS is configured for frontend URL
   - Check environment variables

For more help, see the [Setup Guide](docs/SETUP.md) or [API Documentation](docs/API.md).

