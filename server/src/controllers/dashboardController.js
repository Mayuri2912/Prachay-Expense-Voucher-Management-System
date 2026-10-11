// One dashboard endpoint per role. Each is protected by authorize() in the routes file.

import * as dashboardService from '../services/dashboardService.js';
import { sendSuccess } from '../utils/response.js';

// GET /api/dashboard/employee - statistics for the logged-in employee's own vouchers
export async function employeeDashboard(req, res) {
  sendSuccess(res, { data: await dashboardService.getEmployeeDashboard(req.user.id) });
}

// GET /api/dashboard/director
export async function directorDashboard(req, res) {
  sendSuccess(res, { data: await dashboardService.getDirectorDashboard() });
}

// GET /api/dashboard/accounts
export async function accountsDashboard(req, res) {
  sendSuccess(res, { data: await dashboardService.getAccountsDashboard() });
}
