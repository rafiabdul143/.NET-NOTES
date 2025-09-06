import axios from 'axios'

// Create axios instance with base configuration
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API endpoints
export const authAPI = {
  login: (credentials) => api.post('/api/auth/login', credentials),
  register: (userData) => api.post('/api/auth/register', userData),
  getProfile: () => api.get('/api/auth/profile'),
  updateProfile: (updates) => api.put('/api/auth/profile', updates),
  addToFavorites: (ticker) => api.post('/api/auth/favorites', { ticker }),
  removeFromFavorites: (ticker) => api.delete(`/api/auth/favorites/${ticker}`),
}

// Stock API endpoints
export const stockAPI = {
  getHistory: (ticker, from, to) => 
    api.get(`/api/stocks/history`, {
      params: { ticker, from, to }
    }),
  
  getPrediction: (ticker) => 
    api.get(`/api/stocks/predict`, {
      params: { ticker }
    }),
  
  getMultipleStocks: (tickers, from, to) =>
    api.post('/api/stocks/batch-history', {
      tickers,
      from,
      to
    }),
  
  searchStocks: (query) =>
    api.get(`/api/stocks/search`, {
      params: { q: query }
    }),
  
  getPopularStocks: () =>
    api.get('/api/stocks/popular'),
  
  getMarketSummary: () =>
    api.get('/api/stocks/market-summary'),
}

// Utility functions
export const formatApiError = (error) => {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  if (error.message) {
    return error.message
  }
  return 'An unexpected error occurred'
}

export const isNetworkError = (error) => {
  return !error.response && error.code === 'NETWORK_ERROR'
}

export const isTimeoutError = (error) => {
  return error.code === 'ECONNABORTED'
}

// Cache utility for API responses
class APICache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map()
    this.ttl = ttl
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    return item.data
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    })
  }

  clear() {
    this.cache.clear()
  }

  delete(key) {
    this.cache.delete(key)
  }
}

// Create cache instances
export const stockCache = new APICache(5 * 60 * 1000) // 5 minutes for stock data
export const predictionCache = new APICache(15 * 60 * 1000) // 15 minutes for predictions

// Cached API functions
export const cachedStockAPI = {
  async getHistory(ticker, from, to) {
    const cacheKey = `history-${ticker}-${from}-${to}`
    const cached = stockCache.get(cacheKey)
    
    if (cached) {
      return { data: cached }
    }
    
    const response = await stockAPI.getHistory(ticker, from, to)
    stockCache.set(cacheKey, response.data)
    return response
  },

  async getPrediction(ticker) {
    const cacheKey = `prediction-${ticker}`
    const cached = predictionCache.get(cacheKey)
    
    if (cached) {
      return { data: cached }
    }
    
    const response = await stockAPI.getPrediction(ticker)
    predictionCache.set(cacheKey, response.data)
    return response
  }
}

export default api

