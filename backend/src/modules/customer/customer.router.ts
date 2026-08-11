import { Router } from 'express';
import { customerController } from './customer.controller';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { UserRole } from '../../constants/enums';

const customerRouter = Router();

// All customer endpoints require authentication
customerRouter.use(authenticate);

// GET /customers (Read: All roles)
customerRouter.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS),
  (req, res, next) => customerController.getCustomers(req, res, next)
);

// POST /customers (Write: ADMIN, SALES)
customerRouter.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES),
  (req, res, next) => customerController.createCustomer(req, res, next)
);

// GET /customers/:id (Read: All roles)
customerRouter.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS),
  (req, res, next) => customerController.getCustomerById(req, res, next)
);

// PATCH /customers/:id (Write: ADMIN, SALES)
customerRouter.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.SALES),
  (req, res, next) => customerController.updateCustomer(req, res, next)
);

// POST /customers/:id/follow-up-notes (Write: ADMIN, SALES)
customerRouter.post(
  '/:id/follow-up-notes',
  authorize(UserRole.ADMIN, UserRole.SALES),
  (req, res, next) => customerController.addFollowUpNote(req, res, next)
);

// GET /customers/:id/follow-up-notes (Read: All roles)
customerRouter.get(
  '/:id/follow-up-notes',
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS),
  (req, res, next) => customerController.getFollowUpNotes(req, res, next)
);

export default customerRouter;
