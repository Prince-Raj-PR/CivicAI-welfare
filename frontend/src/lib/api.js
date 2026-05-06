// API configuration and base setup
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Base fetch wrapper with error handling
export async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  }

  // Add auth token if available
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    }
  }

  try {
    const response = await fetch(url, config)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`)
    }

    return data
  } catch (error) {
    console.error('API request failed:', error)
    throw error
  }
}

// Convenience methods
export const api = {
  get: (endpoint) => apiRequest(endpoint),
  
  post: (endpoint, data) =>
    apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  put: (endpoint, data) =>
    apiRequest(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (endpoint) =>
    apiRequest(endpoint, { method: 'DELETE' }),
}
// Authentication API calls
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (email, otp, password) => api.put('/auth/reset-password', { email, otp, password }),
  verifyEmail: (data) => api.post('/auth/verify-email', data), // { email, otp }
  resendVerification: (data) => api.post('/auth/resend-verification', data) // { email }
}

// Programs API calls
export const programsAPI = {
  getAll: (params = {}) => {
    const queryString = new URLSearchParams(params).toString()
    return api.get(`/programs${queryString ? `?${queryString}` : ''}`)
  },
  getById: (id) => api.get(`/programs/${id}`),
  search: (query, filters = {}) => {
    const params = { q: query, ...filters }
    const queryString = new URLSearchParams(params).toString()
    return api.get(`/programs/search?${queryString}`)
  },
  create: (programData) => api.post('/programs', programData),
  update: (id, programData) => api.put(`/programs/${id}`, programData),
  delete: (id) => api.delete(`/programs/${id}`)
}

// Eligibility API calls
export const eligibilityAPI = {
  check: (personalInfo, programIds = null) => 
    api.post('/eligibility/check', { personalInfo, programIds }),
  getHistory: () => api.get('/eligibility/history'),
  saveResult: (resultData) => api.post('/eligibility/save', resultData)
}

// Users API calls
export const usersAPI = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  updateProfile: (profileData) => api.put('/users/profile', profileData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`)
}

// Utility functions
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('authToken', token)
  } else {
    localStorage.removeItem('authToken')
  }
}

export const getAuthToken = () => {
  return localStorage.getItem('authToken')
}

export const isAuthenticated = () => {
  return !!getAuthToken()
}