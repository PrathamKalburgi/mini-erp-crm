import { Router } from 'express';
import { challanController } from './challan.controller';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { UserRole } from '../../constants/enums';

const challanRouter = Router();

challanRouter.use(authenticate);

// GET /challans (Read: All roles)
challanRouter.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS),
  (req, res, next) => challanController.getChallans(req, res, next)
);

// POST /challans (Write: ADMIN, SALES)
challanRouter.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES),
  (req, res, next) => challanController.createChallan(req, res, next)
);

// GET /challans/:id/pdf (Bonus 2: Read/Download PDF: All roles)
challanRouter.get(
  '/:id/pdf',
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS),
  (req, res, next) => challanController.exportPdf(req, res, next)
);

// GET /challans/:id (Read: All roles)
challanRouter.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS),
  (req, res, next) => challanController.getChallanById(req, res, next)
);

// PATCH /challans/:id (Write: ADMIN, SALES)
challanRouter.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.SALES),
  (req, res, next) => challanController.updateChallan(req, res, next)
);

// POST /challans/:id/confirm (Write: ADMIN, SALES)
challanRouter.post(
  '/:id/confirm',
  authorize(UserRole.ADMIN, UserRole.SALES),
  (req, res, next) => challanController.confirmChallan(req, res, next)
);

// POST /challans/:id/cancel (Write: ADMIN, SALES)
challanRouter.post(
  '/:id/cancel',
  authorize(UserRole.ADMIN, UserRole.SALES),
  (req, res, next) => challanController.cancelChallan(req, res, next)
);

export default challanRouter;
