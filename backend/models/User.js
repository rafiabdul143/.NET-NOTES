const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email address'
    ]
  },
  passwordHash: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  favorites: [{
    type: String,
    uppercase: true,
    trim: true,
    validate: {
      validator: function(ticker) {
        // Basic ticker validation (1-5 uppercase letters)
        return /^[A-Z]{1,5}$/.test(ticker)
      },
      message: 'Invalid ticker symbol format'
    }
  }],
  profile: {
    firstName: {
      type: String,
      trim: true,
      maxlength: [50, 'First name cannot exceed 50 characters']
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: [50, 'Last name cannot exceed 50 characters']
    },
    avatar: {
      type: String,
      trim: true
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    preferences: {
      defaultDateRange: {
        type: String,
        enum: ['7d', '1m', '3m', '6m', '1y', '2y'],
        default: '1y'
      },
      defaultChartType: {
        type: String,
        enum: ['line', 'candlestick'],
        default: 'line'
      },
      showPredictions: {
        type: Boolean,
        default: true
      },
      theme: {
        type: String,
        enum: ['light', 'dark', 'auto'],
        default: 'light'
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  loginCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.passwordHash
      delete ret.__v
      return ret
    }
  }
})

// Indexes for performance
userSchema.index({ email: 1 })
userSchema.index({ favorites: 1 })
userSchema.index({ createdAt: -1 })

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('passwordHash')) return next()
  
  try {
    // Hash password with cost of 12
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12
    this.passwordHash = await bcrypt.hash(this.passwordHash, saltRounds)
    next()
  } catch (error) {
    next(error)
  }
})

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.passwordHash)
  } catch (error) {
    throw new Error('Password comparison failed')
  }
}

// Instance method to add favorite ticker
userSchema.methods.addFavorite = function(ticker) {
  const upperTicker = ticker.toUpperCase()
  if (!this.favorites.includes(upperTicker)) {
    this.favorites.push(upperTicker)
  }
  return this.save()
}

// Instance method to remove favorite ticker
userSchema.methods.removeFavorite = function(ticker) {
  const upperTicker = ticker.toUpperCase()
  this.favorites = this.favorites.filter(fav => fav !== upperTicker)
  return this.save()
}

// Instance method to update last login
userSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date()
  this.loginCount += 1
  return this.save()
}

// Static method to find by email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() })
}

// Static method to get user stats
userSchema.statics.getUserStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        },
        avgFavorites: { $avg: { $size: '$favorites' } },
        totalLogins: { $sum: '$loginCount' }
      }
    }
  ])
  
  return stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    avgFavorites: 0,
    totalLogins: 0
  }
}

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`
  }
  return this.email
})

// Virtual for favorite count
userSchema.virtual('favoriteCount').get(function() {
  return this.favorites.length
})

module.exports = mongoose.model('User', userSchema)

