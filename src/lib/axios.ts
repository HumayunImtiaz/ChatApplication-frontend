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
    // Improved error logging
    // console.error('Axios Error Full Details:', error.toJSON?.() || error);
    
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    const errorData = error.response?.data;
    const errorMessage = typeof errorData === 'string' ? errorData : (errorData?.message || error.message || 'An unknown error occurred');
    return Promise.reject({ message: errorMessage, ...errorData });
  }
);

export default axiosInstance;