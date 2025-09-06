const express = require('express')
const User = require('../models/User')

const router = express.Router()

// @route   GET /api/users/stats
// @desc    Get user statistics (admin only in production)
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const stats = await User.getUserStats()
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('User stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics'
    })
  }
})

module.exports = router

