import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
})

// Inject auth token from sessionStorage
api.interceptors.request.use(cfg => {
  if (typeof window !== 'undefined') {
    const token = sessionStorage.getItem('fg_token')
    if (token) cfg.headers.Authorization = `Bearer ${token}`
  }
  return cfg
})

// Handle 401 — clear session and redirect to login
api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('fg_token')
        sessionStorage.removeItem('fg_user')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
