import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'
import toast from 'react-hot-toast'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Check if user is logged in on app start
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Verify token and get user profile
      authAPI.getProfile()
        .then(response => {
          setUser(response.data.user)
        })
        .catch(error => {
          console.error('Token verification failed:', error)
          localStorage.removeItem('token')
        })
        .finally(() => {
          setLoading(false)
        })
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    try {
      const response = await authAPI.login({ email, password })
      const { token, user: userData } = response.data
      
      localStorage.setItem('token', token)
      setUser(userData)
      
      toast.success(`Welcome back, ${userData.email}!`)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const register = async (email, password) => {
    try {
      const response = await authAPI.register({ email, password })
      const { token, user: userData } = response.data
      
      localStorage.setItem('token', token)
      setUser(userData)
      
      toast.success(`Welcome to Stock Dashboard, ${userData.email}!`)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    toast.success('Logged out successfully')
  }

  const updateProfile = async (updates) => {
    try {
      const response = await authAPI.updateProfile(updates)
      setUser(response.data.user)
      toast.success('Profile updated successfully')
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const addToFavorites = async (ticker) => {
    try {
      const response = await authAPI.addToFavorites(ticker)
      setUser(response.data.user)
      toast.success(`${ticker} added to favorites`)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add to favorites'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const removeFromFavorites = async (ticker) => {
    try {
      const response = await authAPI.removeFromFavorites(ticker)
      setUser(response.data.user)
      toast.success(`${ticker} removed from favorites`)
      return { success: true }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to remove from favorites'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    addToFavorites,
    removeFromFavorites,
    isAuthenticated: !!user,
    favorites: user?.favorites || []
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

