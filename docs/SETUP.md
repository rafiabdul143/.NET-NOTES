# Setup Guide

This guide will help you set up the Stock Prediction Dashboard for local development.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher) - [Download](https://nodejs.org/)
- **Python** (v3.8 or higher) - [Download](https://python.org/)
- **MongoDB** - [Download](https://www.mongodb.com/try/download/community) or use [MongoDB Atlas](https://www.mongodb.com/atlas)
- **Git** - [Download](https://git-scm.com/)

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd stock-prediction-dashboard
```

### 2. Environment Setup

Copy the environment template and configure your settings:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/stock-dashboard

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this

# ML Service
ML_SERVICE_URL=http://localhost:8001

# Other settings...
```

### 3. Install Dependencies

Install all dependencies at once:

```bash
npm run install:all
```

Or install individually:

```bash
# Frontend
cd frontend && npm install

# Backend
cd ../backend && npm install

# ML Service
cd ../ml-service && pip install -r requirements.txt
```

### 4. Start Services

You can start all services at once:

```bash
npm run dev
```

Or start them individually:

```bash
# Terminal 1: ML Service
cd ml-service
uvicorn main:app --reload --port 8001

# Terminal 2: Backend
cd backend
npm run dev

# Terminal 3: Frontend
cd frontend
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **ML Service**: http://localhost:8001
- **ML Service Docs**: http://localhost:8001/docs

## Detailed Setup

### MongoDB Setup

#### Option 1: Local MongoDB

1. Install MongoDB Community Edition
2. Start MongoDB service:
   ```bash
   # macOS (with Homebrew)
   brew services start mongodb-community
   
   # Linux (systemd)
   sudo systemctl start mongod
   
   # Windows
   net start MongoDB
   ```

#### Option 2: MongoDB Atlas (Cloud)

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get your connection string
4. Update `MONGODB_URI` in `.env`

### Python Environment

It's recommended to use a virtual environment:

```bash
cd ml-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### Frontend Development

The frontend uses Vite for fast development:

```bash
cd frontend
npm run dev
```

Features:
- Hot module replacement
- Fast builds
- Proxy to backend API

### Backend Development

The backend uses Express with nodemon for auto-restart:

```bash
cd backend
npm run dev
```

Features:
- Auto-restart on file changes
- MongoDB connection
- JWT authentication
- API proxying to ML service

### ML Service Development

The ML service uses FastAPI with auto-reload:

```bash
cd ml-service
uvicorn main:app --reload --port 8001
```

Features:
- Auto-reload on file changes
- Interactive API docs at `/docs`
- Stock data fetching from Yahoo Finance
- RNN model training and prediction

## Docker Setup (Alternative)

If you prefer using Docker:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Error

**Error**: `MongoNetworkError: failed to connect to server`

**Solutions**:
- Ensure MongoDB is running
- Check connection string in `.env`
- For Atlas, ensure IP is whitelisted

#### 2. Python Package Installation Errors

**Error**: Package installation fails

**Solutions**:
```bash
# Upgrade pip
pip install --upgrade pip

# Install with verbose output
pip install -r requirements.txt -v

# On macOS, you might need:
pip install --upgrade setuptools wheel
```

#### 3. Node.js Version Issues

**Error**: `engine "node" is incompatible`

**Solutions**:
- Use Node.js v18 or higher
- Use nvm to manage Node versions:
  ```bash
  nvm install 18
  nvm use 18
  ```

#### 4. Port Already in Use

**Error**: `EADDRINUSE: address already in use`

**Solutions**:
```bash
# Find process using port
lsof -i :3000  # or :5173, :8001

# Kill process
kill -9 <PID>

# Or use different ports in .env
```

#### 5. CORS Issues

**Error**: Cross-origin request blocked

**Solutions**:
- Ensure backend CORS is configured for frontend URL
- Check `ALLOWED_ORIGINS` in `.env`
- Verify frontend proxy configuration in `vite.config.js`

#### 6. ML Service Import Errors

**Error**: `ModuleNotFoundError`

**Solutions**:
```bash
# Ensure you're in the right directory
cd ml-service

# Activate virtual environment
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Reinstall requirements
pip install -r requirements.txt

# Check Python path
python -c "import sys; print(sys.path)"
```

### Performance Tips

1. **Use SSD storage** for better database performance
2. **Allocate sufficient RAM** (minimum 8GB recommended)
3. **Close unnecessary applications** during development
4. **Use MongoDB indexes** for better query performance
5. **Enable caching** in the ML service for frequently requested data

### Development Workflow

1. **Start with the ML service** - it takes the longest to initialize
2. **Then start the backend** - it needs to connect to MongoDB
3. **Finally start the frontend** - it's the fastest to start

### Testing

Run tests for each service:

```bash
# Frontend tests
cd frontend && npm test

# Backend tests
cd backend && npm test

# ML Service tests
cd ml-service && python -m pytest
```

### Building for Production

```bash
# Build frontend
cd frontend && npm run build

# The built files will be in frontend/dist/
# The backend serves these files in production mode
```

## Next Steps

1. **Explore the API** - Visit http://localhost:8001/docs for ML service API documentation
2. **Add sample data** - Run `npm run seed` in the backend directory
3. **Customize the UI** - Modify components in `frontend/src/components/`
4. **Train models** - The ML service will automatically train models for requested stocks
5. **Monitor logs** - Check console output for any errors or warnings

## Getting Help

If you encounter issues not covered here:

1. Check the [main README](../README.md) for additional information
2. Look at the [API documentation](API.md)
3. Check the GitHub issues for similar problems
4. Create a new issue with detailed error information

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines on contributing to this project.

