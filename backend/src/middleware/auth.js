import jwt from 'jsonwebtoken'

export const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1]

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET)

      // Add user info to request
      req.user = {
        id: decoded.id,
        email: decoded.email
      }

      next()
    } catch (error) {
      console.error('Token verification failed:', error)
      return res.status(401).json({
        success: false,
        error: 'Not authorized, token failed'
      })
    }
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Not authorized, no token'
    })
  }
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