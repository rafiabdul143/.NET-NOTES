const express = require('express')
const jwt = require('jsonwebtoken')
const { body, validationResult } = require('express-validator')
const User = require('../models/User')
const { authenticateToken } = require('../middleware/auth')
const rateLimit = require('express-rate-limit')

const router = express.Router()

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth
  message: {
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Validation rules
const registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number')
]

const loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
]

// Helper function to generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )
}

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', authLimiter, registerValidation, async (req, res) => {
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

    const { email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findByEmail(email)
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User with this email already exists'
      })
    }

    // Create new user
    const user = new User({
      email,
      passwordHash: password // Will be hashed by pre-save middleware
    })

    await user.save()

    // Generate JWT token
    const token = generateToken(user._id)

    // Update login stats
    await user.updateLastLogin()

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        favorites: user.favorites,
        profile: user.profile,
        createdAt: user.createdAt
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error during registration'
    })
  }
})

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authLimiter, loginValidation, async (req, res) => {
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

    const { email, password } = req.body

    // Find user by email
    const user = await User.findByEmail(email)
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact support.'
      })
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password)
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      })
    }

    // Generate JWT token
    const token = generateToken(user._id)

    // Update login stats
    await user.updateLastLogin()

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        favorites: user.favorites,
        profile: user.profile,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error during login'
    })
  }
})

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        favorites: user.favorites,
        profile: user.profile,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount,
        createdAt: user.createdAt,
        favoriteCount: user.favoriteCount
      }
    })

  } catch (error) {
    console.error('Profile fetch error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', authenticateToken, [
  body('profile.firstName').optional().trim().isLength({ max: 50 }),
  body('profile.lastName').optional().trim().isLength({ max: 50 }),
  body('profile.timezone').optional().isString(),
  body('profile.preferences.defaultDateRange').optional().isIn(['7d', '1m', '3m', '6m', '1y', '2y']),
  body('profile.preferences.defaultChartType').optional().isIn(['line', 'candlestick']),
  body('profile.preferences.showPredictions').optional().isBoolean(),
  body('profile.preferences.theme').optional().isIn(['light', 'dark', 'auto'])
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

    const user = await User.findById(req.user.userId)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Update profile fields
    if (req.body.profile) {
      Object.assign(user.profile, req.body.profile)
    }

    await user.save()

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        email: user.email,
        favorites: user.favorites,
        profile: user.profile,
        lastLogin: user.lastLogin,
        loginCount: user.loginCount
      }
    })

  } catch (error) {
    console.error('Profile update error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// @route   POST /api/auth/favorites
// @desc    Add stock to favorites
// @access  Private
router.post('/favorites', authenticateToken, [
  body('ticker')
    .isString()
    .trim()
    .toUpperCase()
    .isLength({ min: 1, max: 5 })
    .matches(/^[A-Z]+$/)
    .withMessage('Ticker must be 1-5 uppercase letters')
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

    const { ticker } = req.body
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Check if already in favorites
    if (user.favorites.includes(ticker)) {
      return res.status(409).json({
        success: false,
        message: 'Stock is already in favorites'
      })
    }

    // Add to favorites
    await user.addFavorite(ticker)

    res.json({
      success: true,
      message: `${ticker} added to favorites`,
      user: {
        id: user._id,
        email: user.email,
        favorites: user.favorites,
        profile: user.profile
      }
    })

  } catch (error) {
    console.error('Add favorite error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// @route   DELETE /api/auth/favorites/:ticker
// @desc    Remove stock from favorites
// @access  Private
router.delete('/favorites/:ticker', authenticateToken, async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase()
    const user = await User.findById(req.user.userId)
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      })
    }

    // Check if ticker is in favorites
    if (!user.favorites.includes(ticker)) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found in favorites'
      })
    }

    // Remove from favorites
    await user.removeFavorite(ticker)

    res.json({
      success: true,
      message: `${ticker} removed from favorites`,
      user: {
        id: user._id,
        email: user.email,
        favorites: user.favorites,
        profile: user.profile
      }
    })

  } catch (error) {
    console.error('Remove favorite error:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', authenticateToken, (req, res) => {
  // Since we're using stateless JWT, logout is handled client-side
  // This endpoint exists for consistency and potential future token blacklisting
  res.json({
    success: true,
    message: 'Logout successful'
  })
})

module.exports = router

