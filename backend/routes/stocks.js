const express = require('express')
const axios = require('axios')
const { query, validationResult } = require('express-validator')
const rateLimit = require('express-rate-limit')

const router = express.Router()

// Rate limiting for stock API endpoints
const stockLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // limit each IP to 30 requests per minute for stock data
  message: {
    error: 'Too many stock data requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// ML Service URL
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001'

// Helper function to make ML service requests
const callMLService = async (endpoint, params = {}) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}${endpoint}`, {
      params,
      timeout: 30000, // 30 second timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Stock-Dashboard-Backend/1.0'
      }
    })
    return response.data
  } catch (error) {
    console.error(`ML Service error for ${endpoint}:`, error.message)
    
    if (error.code === 'ECONNREFUSED') {
      throw new Error('ML service is unavailable. Please try again later.')
    }
    
    if (error.response) {
      // ML service returned an error response
      throw new Error(error.response.data?.detail || error.response.data?.message || 'ML service error')
    }
    
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timeout. The ML service is taking too long to respond.')
    }
    
    throw new Error('Failed to connect to ML service')
  }
}

// Validation rules
const tickerValidation = [
  query('ticker')
    .isString()
    .trim()
    .toUpperCase()
    .isLength({ min: 1, max: 5 })
    .matches(/^[A-Z]+$/)
    .withMessage('Ticker must be 1-5 uppercase letters')
]

const dateValidation = [
  query('from')
    .optional()
    .isISO8601()
    .withMessage('From date must be in YYYY-MM-DD format'),
  query('to')
    .optional()
    .isISO8601()
    .withMessage('To date must be in YYYY-MM-DD format')
]

// @route   GET /api/stocks/history
// @desc    Get historical stock data (proxied to ML service)
// @access  Private
router.get('/history', stockLimiter, [...tickerValidation, ...dateValidation], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { ticker, from, to } = req.query

    // Validate date range
    if (from && to && new Date(from) > new Date(to)) {
      return res.status(400).json({
        success: false,
        message: 'From date cannot be after to date'
      })
    }

    // Call ML service
    const data = await callMLService('/history', { ticker, from, to })

    res.json({
      success: true,
      data,
      ticker: ticker.toUpperCase(),
      dateRange: { from, to },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Stock history error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stock history',
      ticker: req.query.ticker?.toUpperCase()
    })
  }
})

// @route   GET /api/stocks/predict
// @desc    Get stock price predictions (proxied to ML service)
// @access  Private
router.get('/predict', stockLimiter, tickerValidation, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { ticker } = req.query

    // Call ML service
    const data = await callMLService('/predict', { ticker })

    res.json({
      success: true,
      data,
      ticker: ticker.toUpperCase(),
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Stock prediction error:', error)
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch stock predictions',
      ticker: req.query.ticker?.toUpperCase()
    })
  }
})

// @route   POST /api/stocks/batch-history
// @desc    Get historical data for multiple stocks
// @access  Private
router.post('/batch-history', stockLimiter, async (req, res) => {
  try {
    const { tickers, from, to } = req.body

    // Validate input
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Tickers must be a non-empty array'
      })
    }

    if (tickers.length > 10) {
      return res.status(400).json({
        success: false,
        message: 'Maximum 10 tickers allowed per batch request'
      })
    }

    // Validate each ticker
    const invalidTickers = tickers.filter(ticker => 
      !ticker || typeof ticker !== 'string' || !/^[A-Z]{1,5}$/.test(ticker.toUpperCase())
    )

    if (invalidTickers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid ticker format',
        invalidTickers
      })
    }

    // Fetch data for each ticker
    const results = await Promise.allSettled(
      tickers.map(ticker => 
        callMLService('/history', { ticker: ticker.toUpperCase(), from, to })
      )
    )

    // Process results
    const stockData = {}
    const errors = {}

    results.forEach((result, index) => {
      const ticker = tickers[index].toUpperCase()
      
      if (result.status === 'fulfilled') {
        stockData[ticker] = result.value
      } else {
        errors[ticker] = result.reason.message || 'Failed to fetch data'
      }
    })

    res.json({
      success: true,
      data: stockData,
      errors: Object.keys(errors).length > 0 ? errors : undefined,
      dateRange: { from, to },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Batch stock history error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch stock history'
    })
  }
})

// @route   GET /api/stocks/search
// @desc    Search for stock symbols (mock implementation)
// @access  Private
router.get('/search', [
  query('q')
    .isString()
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Search query must be 1-20 characters')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { q } = req.query
    const searchTerm = q.toUpperCase()

    // Mock stock search results (in production, this would call a real stock API)
    const mockStocks = [
      { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', exchange: 'NASDAQ' },
      { symbol: 'AMZN', name: 'Amazon.com, Inc.', exchange: 'NASDAQ' },
      { symbol: 'META', name: 'Meta Platforms, Inc.', exchange: 'NASDAQ' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ' },
      { symbol: 'NFLX', name: 'Netflix, Inc.', exchange: 'NASDAQ' },
      { symbol: 'AMD', name: 'Advanced Micro Devices, Inc.', exchange: 'NASDAQ' },
      { symbol: 'INTC', name: 'Intel Corporation', exchange: 'NASDAQ' }
    ]

    const results = mockStocks.filter(stock => 
      stock.symbol.includes(searchTerm) || 
      stock.name.toUpperCase().includes(searchTerm)
    ).slice(0, 10) // Limit to 10 results

    res.json({
      success: true,
      data: results,
      query: searchTerm,
      count: results.length,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Stock search error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to search stocks'
    })
  }
})

// @route   GET /api/stocks/popular
// @desc    Get popular/trending stocks
// @access  Private
router.get('/popular', async (req, res) => {
  try {
    // Mock popular stocks data (in production, this would come from a real API)
    const popularStocks = [
      { 
        symbol: 'AAPL', 
        name: 'Apple Inc.', 
        price: 175.43, 
        change: 2.15, 
        changePercent: 1.24,
        volume: 45234567
      },
      { 
        symbol: 'GOOGL', 
        name: 'Alphabet Inc.', 
        price: 2847.32, 
        change: -12.45, 
        changePercent: -0.44,
        volume: 1234567
      },
      { 
        symbol: 'MSFT', 
        name: 'Microsoft Corporation', 
        price: 378.91, 
        change: 5.67, 
        changePercent: 1.52,
        volume: 23456789
      },
      { 
        symbol: 'TSLA', 
        name: 'Tesla, Inc.', 
        price: 248.73, 
        change: -8.92, 
        changePercent: -3.46,
        volume: 67890123
      },
      { 
        symbol: 'AMZN', 
        name: 'Amazon.com, Inc.', 
        price: 3456.78, 
        change: 23.45, 
        changePercent: 0.68,
        volume: 12345678
      }
    ]

    res.json({
      success: true,
      data: popularStocks,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Popular stocks error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular stocks'
    })
  }
})

// @route   GET /api/stocks/market-summary
// @desc    Get market summary/indices
// @access  Private
router.get('/market-summary', async (req, res) => {
  try {
    // Mock market summary data
    const marketSummary = {
      indices: [
        {
          name: 'S&P 500',
          symbol: '^GSPC',
          value: 4567.89,
          change: 23.45,
          changePercent: 0.52
        },
        {
          name: 'Dow Jones',
          symbol: '^DJI',
          value: 34567.12,
          change: -123.45,
          changePercent: -0.36
        },
        {
          name: 'NASDAQ',
          symbol: '^IXIC',
          value: 14567.34,
          change: 67.89,
          changePercent: 0.47
        }
      ],
      marketStatus: 'OPEN', // OPEN, CLOSED, PRE_MARKET, AFTER_HOURS
      lastUpdated: new Date().toISOString()
    }

    res.json({
      success: true,
      data: marketSummary,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Market summary error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market summary'
    })
  }
})

// @route   GET /api/stocks/health
// @desc    Check ML service health
// @access  Private
router.get('/health', async (req, res) => {
  try {
    const response = await axios.get(`${ML_SERVICE_URL}/health`, {
      timeout: 5000
    })

    res.json({
      success: true,
      mlService: {
        status: 'healthy',
        url: ML_SERVICE_URL,
        response: response.data
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('ML service health check error:', error)
    res.status(503).json({
      success: false,
      mlService: {
        status: 'unhealthy',
        url: ML_SERVICE_URL,
        error: error.message
      },
      timestamp: new Date().toISOString()
    })
  }
})

module.exports = router

