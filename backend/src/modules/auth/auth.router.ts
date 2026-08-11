import { Router } from 'express';
import { authController } from './auth.controller';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { UserRole } from '../../constants/enums';

const authRouter = Router();

// POST /auth/login (Public)
authRouter.post('/login', (req, res, next) => authController.login(req, res, next));

// GET /auth/me (Protected: All roles)
authRouter.get(
  '/me',
  authenticate,
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS),
  (req, res, next) => authController.getMe(req, res, next)
);

export default authRouter;
