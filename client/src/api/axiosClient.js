// One Axios instance used for every API call.
//   * adds the JWT to each request
//   * notices an expired / invalid session (HTTP 401) and logs the user out

import axios from 'axios';

const TOKEN_KEY = 'evms_token';

// The token is kept in localStorage so the user stays logged in after a page refresh.
export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
});

// Before every request: attach "Authorization: Bearer <token>".
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// AuthContext registers a function here; it runs when the server says the session is no longer valid.
let handleSessionExpired = null;
export function onSessionExpired(callback) {
  handleSessionExpired = callback;
}

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest && handleSessionExpired) {
      handleSessionExpired();
    }
    return Promise.reject(error);
  }
);

// The message to show the user for a failed request.
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (error.response?.data?.message) {
    const { message, errors } = error.response.data;
    // "Validation failed" alone is not helpful - show the first field message instead.
    if (errors && message === 'Validation failed') {
      return Object.values(errors)[0];
    }
    return message;
  }
  if (error.code === 'ERR_NETWORK') {
    return 'Cannot reach the server. Please check that the backend is running.';
  }
  if (error.code === 'ECONNABORTED') {
    return 'The server took too long to respond. Please try again.';
  }
  return fallback;
}

// The { field: message } object from a 400 validation response (or an empty object).
export function getFieldErrors(error) {
  return error.response?.data?.errors || {};
}

export default api;
