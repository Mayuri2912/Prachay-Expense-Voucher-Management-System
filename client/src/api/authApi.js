import api from './axiosClient.js';

// POST /api/auth/login -> { token, expiresIn, user }
export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password });
  return response.data.data;
}

// GET /api/auth/me -> the user the saved token belongs to
export async function getCurrentUser() {
  const response = await api.get('/auth/me');
  return response.data.data.user;
}
