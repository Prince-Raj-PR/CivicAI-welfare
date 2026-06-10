import jwt from 'jsonwebtoken'

export const protect = async (req, res, next) => {
  let token

  // SSE streams use EventSource which cannot set custom headers,
  // so we also accept the token as a query param (?token=...)
  if (req.query.token) {
    token = req.query.token
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (token) {
    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Add user info to request (including role)
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role
      }

      return next()
    } catch (error) {
      console.error('Token verification failed:', error)
      return res.status(401).json({
        success: false,
        error: 'Not authorized, token failed'
      })
    }
  }

  return res.status(401).json({
    success: false,
    error: 'Not authorized, no token'
  })
}

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized'
      })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access this resource'
      })
    }

    next()
  }
}