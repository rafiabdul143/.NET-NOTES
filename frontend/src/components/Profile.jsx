import React from 'react'
import { useAuth } from '../contexts/AuthContext'
import { User, Mail, Calendar, Star } from 'lucide-react'

const Profile = () => {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="mt-2 text-gray-600">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Info */}
          <div className="lg:col-span-2">
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Account Information</h2>
                <p className="card-description">Your basic account details</p>
              </div>
              <div className="card-content space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-primary-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {user.profile?.firstName && user.profile?.lastName 
                        ? `${user.profile.firstName} ${user.profile.lastName}`
                        : user.email
                      }
                    </h3>
                    <p className="text-gray-600">Stock Dashboard User</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Email</p>
                      <p className="text-gray-600">{user.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Member Since</p>
                      <p className="text-gray-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <Star className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Favorite Stocks</p>
                      <p className="text-gray-600">{user.favorites?.length || 0} stocks</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <User className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-700">Login Count</p>
                      <p className="text-gray-600">{user.loginCount || 0} times</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Favorites */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="card-title">Favorite Stocks</h2>
                <p className="card-description">Your watchlist</p>
              </div>
              <div className="card-content">
                {user.favorites && user.favorites.length > 0 ? (
                  <div className="space-y-2">
                    {user.favorites.map((ticker) => (
                      <div
                        key={ticker}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-medium text-gray-900">{ticker}</span>
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No favorite stocks yet</p>
                    <p className="text-sm text-gray-400 mt-1">
                      Add stocks to your favorites from the dashboard
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Stats */}
        <div className="mt-8">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Account Statistics</h2>
              <p className="card-description">Your usage overview</p>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary-600">
                    {user.favorites?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Favorite Stocks</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-success-600">
                    {user.loginCount || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Logins</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-600">
                    {user.lastLogin 
                      ? Math.floor((new Date() - new Date(user.lastLogin)) / (1000 * 60 * 60 * 24))
                      : 'N/A'
                    }
                  </div>
                  <div className="text-sm text-gray-600">Days Since Last Login</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Profile

