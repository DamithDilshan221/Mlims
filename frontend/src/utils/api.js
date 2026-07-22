import axios from 'axios';

// Create a singleton instance
const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Send cookies (like the refresh token)
});

// A variable to hold the in-memory access token
let inMemoryToken = null;

export const setToken = (token) => {
  inMemoryToken = token;
};

export const getToken = () => inMemoryToken;

// Request interceptor: attach token
api.interceptors.request.use(
  (config) => {
    if (inMemoryToken) {
      config.headers.Authorization = `Bearer ${inMemoryToken}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle 401 and silent refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // If we hit a 401 and haven't already retried this request
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't intercept refresh or login endpoints to avoid infinite loops
      if (originalRequest.url.includes('/auth/refresh') || originalRequest.url.includes('/auth/login')) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        // Attempt silent refresh
        const res = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        
        // Success: store new token and retry the original request
        const newAccessToken = res.data.accessToken;
        setToken(newAccessToken);
        
        // Notify the AuthContext that token changed (it polls or we dispatch an event)
        window.dispatchEvent(new CustomEvent('token_refreshed', { detail: newAccessToken }));
        
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed (cookie expired or missing) -> trigger hard logout
        setToken(null);
        window.dispatchEvent(new Event('auth_logout'));
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
