import axios from 'axios';
import { notification } from 'antd';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000',
  timeout: 90_000,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach Bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: handle global auth errors, pass module errors through
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response) {
      const status = error.response.status;
      const data = error.response.data as { error?: { code?: string; message?: string } };

      if (status === 401) {
        const code = data?.error?.code;
        // INVALID_CREDENTIALS is a login-specific error — let the login page handle it
        if (code !== 'INVALID_CREDENTIALS') {
          localStorage.removeItem('access_token');
          notification.error({
            message: 'Session Expired',
            description: 'Please log in again.',
            duration: 4,
          });
          window.location.href = '/login';
        }
      }

      if (status === 403) {
        notification.error({
          message: 'Forbidden',
          description: 'You do not have permission to perform this action.',
          duration: 4,
        });
      }
    }

    // Always reject so calling code can handle module-specific errors
    return Promise.reject(error);
  }
);

export default apiClient;
