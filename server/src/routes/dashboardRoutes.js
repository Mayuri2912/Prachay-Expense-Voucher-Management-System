import { Router } from 'express';
import { accountsDashboard, directorDashboard, employeeDashboard } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import { ROLES } from '../utils/constants.js';

const router = Router();

router.use(authenticate);

router.get('/employee', authorize(ROLES.EMPLOYEE), employeeDashboard);
router.get('/director', authorize(ROLES.DIRECTOR), directorDashboard);
router.get('/accounts', authorize(ROLES.ACCOUNTS), accountsDashboard);

export default router;
