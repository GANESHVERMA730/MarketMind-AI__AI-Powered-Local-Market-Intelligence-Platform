import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('marketmind-token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('marketmind-token')) {
      localStorage.removeItem('marketmind-token');
      window.dispatchEvent(new Event('marketmind:unauthorized'));
    }
    return Promise.reject(error);
  }
);

export function getApiError(error) {
  const response = error.response?.data;
  if (response?.errors?.length) {
    return response.errors.map((item) => item.message).join('. ');
  }
  return response?.message || error.message || 'Something went wrong. Please try again.';
}

export default api;
