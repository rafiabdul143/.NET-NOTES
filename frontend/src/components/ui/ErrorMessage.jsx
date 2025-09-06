import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'

const ErrorMessage = ({ message, onRetry, className = '' }) => {
  return (
    <div className={`text-center p-6 ${className}`}>
      <div className="flex flex-col items-center space-y-4">
        <AlertCircle className="w-12 h-12 text-danger-500" />
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Something went wrong
          </h3>
          <p className="text-gray-600 max-w-md">
            {message || 'An unexpected error occurred. Please try again.'}
          </p>
        </div>
        {onRetry && (
          <button
            onClick={onRetry}
            className="btn btn-primary flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}

export default ErrorMessage

