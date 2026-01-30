import axios, { type AxiosInstance } from 'axios';

// Create the axios instance with default configuration
const axiosClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Optional: request timeout (in ms)
});

// Response interceptor — centralized error handling
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // For example, handle unauthorized (401) errors globally
    if (error.response && error.response.status === 401) {
      // You can log out or redirect here
      console.warn('Unauthorized, please check your credentials.');
    }
    return Promise.reject(error);
  },
);

export default axiosClient;
