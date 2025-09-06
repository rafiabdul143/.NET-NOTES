import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import StockChart from './StockChart'
import ControlPanel from './ControlPanel'
import StockMetrics from './StockMetrics'
import LoadingSpinner from './ui/LoadingSpinner'
import ErrorMessage from './ui/ErrorMessage'
import { cachedStockAPI, formatApiError } from '../services/api'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'

const Dashboard = () => {
  const { user, favorites } = useAuth()
  const [selectedTicker, setSelectedTicker] = useState('AAPL')
  const [dateRange, setDateRange] = useState({
    from: format(subDays(new Date(), 365), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd')
  })
  const [chartType, setChartType] = useState('line') // 'line' or 'candlestick'
  const [showPredictions, setShowPredictions] = useState(true)
  
  // Data states
  const [stockData, setStockData] = useState(null)
  const [predictions, setPredictions] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  // Fetch stock data
  const fetchStockData = async (ticker, from, to) => {
    try {
      setLoading(true)
      setError(null)
      
      const [historyResponse, predictionResponse] = await Promise.allSettled([
        cachedStockAPI.getHistory(ticker, from, to),
        showPredictions ? cachedStockAPI.getPrediction(ticker) : Promise.resolve(null)
      ])
      
      if (historyResponse.status === 'fulfilled') {
        setStockData(historyResponse.value.data)
      } else {
        throw new Error(formatApiError(historyResponse.reason))
      }
      
      if (predictionResponse.status === 'fulfilled' && predictionResponse.value) {
        setPredictions(predictionResponse.value.data)
      } else if (showPredictions) {
        console.warn('Predictions failed to load:', predictionResponse.reason)
        setPredictions(null)
      }
      
    } catch (err) {
      const errorMessage = formatApiError(err)
      setError(errorMessage)
      toast.error(`Failed to load data for ${ticker}: ${errorMessage}`)
    } finally {
      setLoading(false)
    }
  }
  
  // Load data when ticker or date range changes
  useEffect(() => {
    if (selectedTicker) {
      fetchStockData(selectedTicker, dateRange.from, dateRange.to)
    }
  }, [selectedTicker, dateRange.from, dateRange.to, showPredictions])
  
  // Handle ticker selection
  const handleTickerChange = (ticker) => {
    setSelectedTicker(ticker)
    setStockData(null)
    setPredictions(null)
  }
  
  // Handle date range change
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange)
  }
  
  // Handle refresh
  const handleRefresh = () => {
    if (selectedTicker) {
      fetchStockData(selectedTicker, dateRange.from, dateRange.to)
    }
  }
  
  // Quick date range presets
  const setQuickRange = (days) => {
    const to = format(new Date(), 'yyyy-MM-dd')
    const from = format(subDays(new Date(), days), 'yyyy-MM-dd')
    setDateRange({ from, to })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex flex-col lg:flex-row h-screen">
        {/* Main Chart Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Stock Dashboard
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Welcome back, {user?.email}
                </p>
              </div>
              
              {/* Quick Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setQuickRange(7)}
                  className="btn btn-sm btn-outline"
                >
                  7D
                </button>
                <button
                  onClick={() => setQuickRange(30)}
                  className="btn btn-sm btn-outline"
                >
                  1M
                </button>
                <button
                  onClick={() => setQuickRange(90)}
                  className="btn btn-sm btn-outline"
                >
                  3M
                </button>
                <button
                  onClick={() => setQuickRange(365)}
                  className="btn btn-sm btn-outline"
                >
                  1Y
                </button>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="btn btn-sm btn-primary"
                >
                  {loading ? <LoadingSpinner size="sm" /> : 'Refresh'}
                </button>
              </div>
            </div>
          </div>
          
          {/* Stock Metrics */}
          {stockData && (
            <StockMetrics 
              data={stockData} 
              ticker={selectedTicker}
              predictions={predictions}
            />
          )}
          
          {/* Chart Container */}
          <div className="flex-1 p-6">
            <div className="bg-white rounded-lg shadow-soft h-full">
              {error ? (
                <div className="h-full flex items-center justify-center">
                  <ErrorMessage 
                    message={error}
                    onRetry={handleRefresh}
                  />
                </div>
              ) : loading && !stockData ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <LoadingSpinner size="lg" />
                    <p className="mt-4 text-gray-600">
                      Loading {selectedTicker} data...
                    </p>
                  </div>
                </div>
              ) : stockData ? (
                <StockChart
                  data={stockData}
                  predictions={predictions}
                  ticker={selectedTicker}
                  chartType={chartType}
                  loading={loading}
                />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <p className="text-lg font-medium">Select a stock to begin</p>
                    <p className="text-sm mt-2">Choose a ticker from the control panel</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Control Panel */}
        <div className="w-full lg:w-80 xl:w-96 bg-white border-l border-gray-200 flex-shrink-0">
          <ControlPanel
            selectedTicker={selectedTicker}
            onTickerChange={handleTickerChange}
            dateRange={dateRange}
            onDateRangeChange={handleDateRangeChange}
            chartType={chartType}
            onChartTypeChange={setChartType}
            showPredictions={showPredictions}
            onShowPredictionsChange={setShowPredictions}
            favorites={favorites}
            onRefresh={handleRefresh}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

export default Dashboard

