import { createContext, useContext, useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { authAPI, setAuthToken, getAuthToken, isAuthenticated } from '../lib/api'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuthStatus()
  }, [])

  const checkAuthStatus = async () => {
    try {
      if (isAuthenticated()) {
        const response = await authAPI.getMe()
        if (response.success) {
          setUser(response.data)
          setIsLoggedIn(true)
        } else {
          // Token is invalid, clear it
          logout()
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (credentials) => {
    try {
      const response = await authAPI.login(credentials)
      if (response.success) {
        setAuthToken(response.data.token)
        setUser(response.data.user)
        setIsLoggedIn(true)
        return { success: true, user: response.data.user }
      }
    } catch (error) {
      throw error
    }
  }

  const register = async (userData) => {
    try {
      const response = await authAPI.register(userData)
      return response
    } catch (error) {
      throw error
    }
  }

  const logout = () => {
    setAuthToken(null)
    setUser(null)
    setIsLoggedIn(false)
  }

  const updateUser = (userData) => {
    setUser(prev => ({ ...prev, ...userData }))
  }

  const value = {
    user,
    isLoggedIn,
    loading,
    login,
    register,
    logout,
    updateUser,
    checkAuthStatus
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

AuthProvider.propTypes = {
  children: PropTypes.node.isRequired
}