import PropTypes from 'prop-types'

const ProgressBar = ({ 
  current, 
  total, 
  showLabel = true,
  className = '' 
}) => {
  const percentage = Math.round((current / total) * 100)
  
  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Step {current} of {total}
          </span>
          <span className="text-sm font-medium text-gray-700">
            {percentage}%
          </span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="bg-primary-600 h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

ProgressBar.propTypes = {
  current: PropTypes.number.isRequired,
  total: PropTypes.number.isRequired,
  showLabel: PropTypes.bool,
  className: PropTypes.string,
}

export default ProgressBar
