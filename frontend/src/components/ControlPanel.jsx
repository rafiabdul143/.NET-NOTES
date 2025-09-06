import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { Search, Star, StarOff, TrendingUp, Calendar, Settings, RefreshCw } from 'lucide-react'
import LoadingSpinner from './ui/LoadingSpinner'
import toast from 'react-hot-toast'

const POPULAR_STOCKS = [
  'AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX', 'AMD', 'INTC'
]

const ControlPanel = ({
  selectedTicker,
  onTickerChange,
  dateRange,
  onDateRangeChange,
  chartType,
  onChartTypeChange,
  showPredictions,
  onShowPredictionsChange,
  favorites,
  onRefresh,
  loading
}) => {
  const { addToFavorites, removeFromFavorites } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredStocks, setFilteredStocks] = useState(POPULAR_STOCKS)
  const [customTicker, setCustomTicker] = useState('')

  // Filter stocks based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStocks(POPULAR_STOCKS)
      return
    }

    const query = searchQuery.toLowerCase()
    const filtered = POPULAR_STOCKS.filter(stock =>
      stock.toLowerCase().includes(query)
    )
    setFilteredStocks(filtered)
  }, [searchQuery])

  // Handle ticker selection
  const handleTickerSelect = (ticker) => {
    onTickerChange(ticker)
    setSearchQuery('')
    setCustomTicker('')
  }

  // Handle custom ticker input
  const handleCustomTickerSubmit = (e) => {
    e.preventDefault()
    if (customTicker.trim()) {
      const ticker = customTicker.trim().toUpperCase()
      onTickerChange(ticker)
      setCustomTicker('')
      setSearchQuery('')
    }
  }

  // Handle favorite toggle
  const handleFavoriteToggle = async (ticker) => {
    const isFavorite = favorites.includes(ticker)
    
    if (isFavorite) {
      await removeFromFavorites(ticker)
    } else {
      await addToFavorites(ticker)
    }
  }

  // Handle date range change
  const handleDateChange = (field, value) => {
    onDateRangeChange({
      ...dateRange,
      [field]: value
    })
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Control Panel
        </h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search stocks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>

        {/* Custom Ticker Input */}
        <form onSubmit={handleCustomTickerSubmit} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter ticker (e.g., AAPL)"
              value={customTicker}
              onChange={(e) => setCustomTicker(e.target.value)}
              className="input flex-1"
              maxLength={10}
            />
            <button
              type="submit"
              disabled={!customTicker.trim()}
              className="btn btn-primary btn-sm"
            >
              Go
            </button>
          </div>
        </form>
      </div>

      {/* Stock Selection */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Favorites Section */}
        {favorites.length > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
              <Star className="w-4 h-4 mr-2 text-yellow-500" />
              Favorites
            </h3>
            <div className="space-y-2">
              {favorites.map((ticker) => (
                <button
                  key={ticker}
                  onClick={() => handleTickerSelect(ticker)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedTicker === ticker
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{ticker}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleFavoriteToggle(ticker)
                    }}
                    className="text-yellow-500 hover:text-yellow-600"
                  >
                    <Star className="w-4 h-4 fill-current" />
                  </button>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Stocks */}
        <div className="p-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <TrendingUp className="w-4 h-4 mr-2" />
            {searchQuery ? 'Search Results' : 'Popular Stocks'}
          </h3>
          <div className="space-y-2">
            {filteredStocks.map((ticker) => (
              <button
                key={ticker}
                onClick={() => handleTickerSelect(ticker)}
                className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
                  selectedTicker === ticker
                    ? 'border-primary-500 bg-primary-50 text-primary-700'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{ticker}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFavoriteToggle(ticker)
                  }}
                  className={`transition-colors ${
                    favorites.includes(ticker)
                      ? 'text-yellow-500 hover:text-yellow-600'
                      : 'text-gray-400 hover:text-yellow-500'
                  }`}
                >
                  {favorites.includes(ticker) ? (
                    <Star className="w-4 h-4 fill-current" />
                  ) : (
                    <StarOff className="w-4 h-4" />
                  )}
                </button>
              </button>
            ))}
            
            {filteredStocks.length === 0 && searchQuery && (
              <div className="text-center py-8 text-gray-500">
                <p>No stocks found for "{searchQuery}"</p>
                <p className="text-sm mt-1">Try entering a custom ticker above</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className="border-t border-gray-200 p-6 space-y-6">
        {/* Date Range */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Calendar className="w-4 h-4 mr-2" />
            Date Range
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={dateRange.from}
                onChange={(e) => handleDateChange('from', e.target.value)}
                className="input w-full text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={dateRange.to}
                onChange={(e) => handleDateChange('to', e.target.value)}
                className="input w-full text-sm"
              />
            </div>
          </div>
        </div>

        {/* Chart Settings */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
            <Settings className="w-4 h-4 mr-2" />
            Chart Settings
          </h3>
          <div className="space-y-3">
            {/* Chart Type */}
            <div>
              <label className="block text-xs text-gray-600 mb-2">Chart Type</label>
              <div className="flex gap-2">
                <button
                  onClick={() => onChartTypeChange('line')}
                  className={`flex-1 py-2 px-3 text-sm rounded-md border transition-colors ${
                    chartType === 'line'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Line
                </button>
                <button
                  onClick={() => onChartTypeChange('candlestick')}
                  className={`flex-1 py-2 px-3 text-sm rounded-md border transition-colors ${
                    chartType === 'candlestick'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  Candle
                </button>
              </div>
            </div>

            {/* Show Predictions Toggle */}
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-600">Show Predictions</label>
              <button
                onClick={() => onShowPredictionsChange(!showPredictions)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showPredictions ? 'bg-primary-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showPredictions ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="btn btn-primary w-full flex items-center justify-center"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Data
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ControlPanel

