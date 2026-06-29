import axios from 'axios';
import { API_CONFIG } from '@/config/api';

// Create axios instance
const axiosInstance = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      if (config.headers) {
        // Use .delete() for AxiosHeaders (Axios 1.x+)
        if (typeof (config.headers as any).delete === 'function') {
          (config.headers as any).delete('Content-Type');
        } else {
          delete (config.headers as any)['Content-Type'];
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Session expiration handling
    if (error.response?.status === 401 && typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    const errorData = error.response?.data;
    let errorMessage = 'An unknown error occurred';

    // 1. Check for Network Errors (Server offline or CORS)
    if (error.code === 'ERR_NETWORK') {
      errorMessage = 'Network Error: Cannot connect to the server. Please check your connection or try again later.';
    } 
    // 2. Check if the server responded with raw HTML (Proxy, Gateway, or default HTTP fallback errors)
    else if (typeof errorData === 'string') {
      if (errorData.includes('<html') || errorData.includes('<!DOCTYPE') || errorData.includes('<pre>')) {
        errorMessage = `Server connection failed (${error.response?.status || 'Unknown'}). The service might be temporarily down or misconfigured.`;
      } else {
        errorMessage = errorData; // It's a plain string error
      }
    } 
    // 3. Backend JSON error format
    else if (errorData && errorData.message) {
      errorMessage = errorData.message;
    } 
    // 4. Default Axios error message
    else if (error.message) {
      errorMessage = error.message;
    }

    return Promise.reject({ message: errorMessage, ...errorData });
  }
);

export default axiosInstance;