import api from './axiosClient.js';

async function fetchDashboard(role) {
  const response = await api.get(`/dashboard/${role}`);
  return response.data.data;
}

export const getEmployeeDashboard = () => fetchDashboard('employee');
export const getDirectorDashboard = () => fetchDashboard('director');
export const getAccountsDashboard = () => fetchDashboard('accounts');
