import { Router } from 'express';
import { inventoryController } from './inventory.controller';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { UserRole } from '../../constants/enums';

const inventoryRouter = Router();

inventoryRouter.use(authenticate);

// GET /stock-movements (Read: All roles)
inventoryRouter.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS),
  (req, res, next) => inventoryController.getStockMovements(req, res, next)
);

export default inventoryRouter;
