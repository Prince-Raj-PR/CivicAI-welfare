import PropTypes from 'prop-types'

export default function Card({ 
  children, 
  className = '', 
  hover = false,
  padding = 'md'
}) {
  const paddingClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }
  
  return (
    <div
      className={`bg-white rounded-lg shadow-md ${paddingClasses[padding]} ${
        hover ? 'hover:shadow-lg transition-shadow duration-200' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  hover: PropTypes.bool,
  padding: PropTypes.oneOf(['sm', 'md', 'lg'])
}