import React from 'react'
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from 'lucide-react'

const StockMetrics = ({ data, ticker, predictions }) => {
  if (!data || !data.history || data.history.length === 0) {
    return null
  }

  const history = data.history
  const latest = history[history.length - 1]
  const previous = history.length > 1 ? history[history.length - 2] : latest
  
  // Calculate metrics
  const currentPrice = latest.close
  const previousPrice = previous.close
  const priceChange = currentPrice - previousPrice
  const priceChangePercent = ((priceChange / previousPrice) * 100)
  
  const volume = latest.volume
  const high52Week = Math.max(...history.map(d => d.high))
  const low52Week = Math.min(...history.map(d => d.low))
  
  // Prediction metrics
  const nextDayPrediction = predictions?.predictions?.[0]?.predicted_price
  const predictionChange = nextDayPrediction ? nextDayPrediction - currentPrice : null
  const predictionChangePercent = predictionChange ? ((predictionChange / currentPrice) * 100) : null

  const formatPrice = (price) => `$${price?.toFixed(2) || '0.00'}`
  const formatVolume = (vol) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(1)}B`
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(1)}M`
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`
    return vol?.toLocaleString() || '0'
  }

  const metrics = [
    {
      label: 'Current Price',
      value: formatPrice(currentPrice),
      change: priceChange,
      changePercent: priceChangePercent,
      icon: DollarSign
    },
    {
      label: 'Volume',
      value: formatVolume(volume),
      icon: BarChart3
    },
    {
      label: '52W High',
      value: formatPrice(high52Week),
      icon: TrendingUp
    },
    {
      label: '52W Low',
      value: formatPrice(low52Week),
      icon: TrendingDown
    }
  ]

  if (nextDayPrediction) {
    metrics.push({
      label: 'Next Day Prediction',
      value: formatPrice(nextDayPrediction),
      change: predictionChange,
      changePercent: predictionChangePercent,
      icon: TrendingUp,
      isPrediction: true
    })
  }

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">{ticker}</h2>
        <div className="text-sm text-gray-500">
          Last updated: {new Date(latest.date).toLocaleDateString()}
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {metrics.map((metric, index) => {
          const Icon = metric.icon
          const isPositive = metric.change > 0
          const isNegative = metric.change < 0
          
          return (
            <div key={index} className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <Icon className="w-5 h-5 text-gray-400" />
                {metric.isPrediction && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                    AI
                  </span>
                )}
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-gray-600 font-medium">
                  {metric.label}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {metric.value}
                </p>
                
                {metric.change !== undefined && (
                  <div className="flex items-center space-x-1">
                    {isPositive && <TrendingUp className="w-3 h-3 text-success-500" />}
                    {isNegative && <TrendingDown className="w-3 h-3 text-danger-500" />}
                    <span className={`text-xs font-medium ${
                      isPositive ? 'text-success-600' : 
                      isNegative ? 'text-danger-600' : 
                      'text-gray-600'
                    }`}>
                      {isPositive ? '+' : ''}{formatPrice(Math.abs(metric.change))}
                      {metric.changePercent !== undefined && (
                        <span className="ml-1">
                          ({isPositive ? '+' : ''}{metric.changePercent.toFixed(2)}%)
                        </span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default StockMetrics

