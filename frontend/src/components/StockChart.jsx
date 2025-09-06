import React, { useRef, useEffect, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import 'chartjs-adapter-date-fns'
import { format, parseISO } from 'date-fns'
import LoadingSpinner from './ui/LoadingSpinner'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale
)

const StockChart = ({ data, predictions, ticker, chartType, loading }) => {
  const chartRef = useRef(null)
  const [chartData, setChartData] = useState(null)
  const [chartOptions, setChartOptions] = useState(null)

  useEffect(() => {
    if (!data || !data.history) return

    const history = data.history
    const predictionData = predictions?.predictions || []

    // Prepare historical data
    const dates = history.map(item => item.date)
    const prices = history.map(item => item.close)
    const volumes = history.map(item => item.volume)

    // Prepare prediction data
    const predictionDates = predictionData.map(item => item.date)
    const predictionPrices = predictionData.map(item => item.predicted_price)
    const confidenceUpper = predictionData.map(item => item.confidence_upper)
    const confidenceLower = predictionData.map(item => item.confidence_lower)

    // Create datasets
    const datasets = [
      {
        label: `${ticker} Price`,
        data: dates.map((date, index) => ({
          x: date,
          y: prices[index]
        })),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      }
    ]

    // Add prediction line if available
    if (predictionData.length > 0) {
      datasets.push({
        label: 'Predictions',
        data: predictionDates.map((date, index) => ({
          x: date,
          y: predictionPrices[index]
        })),
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        tension: 0.1,
        pointRadius: 0,
        pointHoverRadius: 4,
      })

      // Add confidence interval
      if (confidenceUpper.length > 0 && confidenceLower.length > 0) {
        datasets.push({
          label: 'Confidence Upper',
          data: predictionDates.map((date, index) => ({
            x: date,
            y: confidenceUpper[index]
          })),
          borderColor: 'rgba(34, 197, 94, 0.3)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 1,
          fill: '+1',
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 0,
        })

        datasets.push({
          label: 'Confidence Lower',
          data: predictionDates.map((date, index) => ({
            x: date,
            y: confidenceLower[index]
          })),
          borderColor: 'rgba(34, 197, 94, 0.3)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderWidth: 1,
          fill: false,
          tension: 0.1,
          pointRadius: 0,
          pointHoverRadius: 0,
        })
      }
    }

    setChartData({
      datasets
    })

    // Chart options
    setChartOptions({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        title: {
          display: true,
          text: `${ticker} Stock Price ${predictions ? 'with Predictions' : ''}`,
          font: {
            size: 16,
            weight: 'bold'
          },
          color: '#1f2937'
        },
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 20,
            filter: (legendItem) => {
              // Hide confidence interval labels from legend
              return !legendItem.text.includes('Confidence')
            }
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            title: (context) => {
              const date = context[0].parsed.x
              return format(new Date(date), 'MMM dd, yyyy')
            },
            label: (context) => {
              const value = context.parsed.y
              const label = context.dataset.label
              return `${label}: $${value.toFixed(2)}`
            }
          }
        }
      },
      scales: {
        x: {
          type: 'time',
          time: {
            unit: 'day',
            displayFormats: {
              day: 'MMM dd',
              week: 'MMM dd',
              month: 'MMM yyyy'
            }
          },
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            color: '#6b7280',
            maxTicksLimit: 8
          }
        },
        y: {
          beginAtZero: false,
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            color: '#6b7280',
            callback: (value) => `$${value.toFixed(2)}`
          }
        }
      },
      elements: {
        point: {
          hoverBackgroundColor: '#fff',
          hoverBorderWidth: 2
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart'
      }
    })
  }, [data, predictions, ticker, chartType])

  if (!data) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p>No data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full p-6 relative">
      {loading && (
        <div className="absolute top-4 right-4 z-10">
          <LoadingSpinner size="sm" />
        </div>
      )}
      
      {chartData && chartOptions ? (
        <div className="h-full">
          <Line
            ref={chartRef}
            data={chartData}
            options={chartOptions}
          />
        </div>
      ) : (
        <div className="h-full flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      )}
      
      {/* Chart Info */}
      <div className="absolute bottom-4 left-6 text-xs text-gray-500">
        <p>
          Data points: {data.history?.length || 0}
          {predictions && predictions.predictions && (
            <span className="ml-4">
              Predictions: {predictions.predictions.length}
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

export default StockChart

