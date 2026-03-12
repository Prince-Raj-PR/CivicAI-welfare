import PropTypes from 'prop-types'

export default function Badge({ 
  children, 
  variant = 'primary',
  size = 'md'
}) {
  const variants = {
    primary: 'bg-primary-100 text-primary-700',
    secondary: 'bg-gray-100 text-gray-700',
    success: 'bg-green-100 text-green-700',
    warning: 'bg-yellow-100 text-yellow-700',
    error: 'bg-red-100 text-red-700'
  }
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  }
  
  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold ${variants[variant]} ${sizes[size]}`}
    >
      {children}
    </span>
  )
}
Badge.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['primary', 'secondary', 'success', 'warning', 'error']),
  size: PropTypes.oneOf(['sm', 'md'])
}