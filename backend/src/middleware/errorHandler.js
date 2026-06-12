export const errorHandler = (err, req, res, next) => {
  let error = { ...err }
  error.message = err.message

  console.error(err)

  if (err.name === 'CastError') {
    error = { message: 'Resource not found', statusCode: 404 }
  }

  if (err.code === 11000) {
    error = { message: 'Duplicate field value entered', statusCode: 400 }
  }

  if (err.name === 'ValidationError') {
    error = {
      message: Object.values(err.errors)
        .map(val => val.message)
        .join(', '),
      statusCode: 400
    }
  }

  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Invalid token', statusCode: 401 }
  }

  if (err.name === 'TokenExpiredError') {
    error = { message: 'Token expired', statusCode: 401 }
  }

  const statusCode =
    error.statusCode || (res.statusCode !== 200 ? res.statusCode : 500)

  res.status(statusCode).json({
    success: false,
    error: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  })
}