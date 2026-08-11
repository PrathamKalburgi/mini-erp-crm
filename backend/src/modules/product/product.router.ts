import { Router } from 'express';
import { productController } from './product.controller';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { UserRole } from '../../constants/enums';

const productRouter = Router();

productRouter.use(authenticate);

// GET /products (Read: All roles)
productRouter.get(
  '/',
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS),
  (req, res, next) => productController.getProducts(req, res, next)
);

// POST /products (Write: ADMIN, WAREHOUSE)
productRouter.post(
  '/',
  authorize(UserRole.ADMIN, UserRole.WAREHOUSE),
  (req, res, next) => productController.createProduct(req, res, next)
);

// GET /products/:id (Read: All roles)
productRouter.get(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.SALES, UserRole.WAREHOUSE, UserRole.ACCOUNTS),
  (req, res, next) => productController.getProductById(req, res, next)
);

// PATCH /products/:id (Write: ADMIN, WAREHOUSE)
productRouter.patch(
  '/:id',
  authorize(UserRole.ADMIN, UserRole.WAREHOUSE),
  (req, res, next) => productController.updateProduct(req, res, next)
);

export default productRouter;
