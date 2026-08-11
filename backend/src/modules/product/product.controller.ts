import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';
import { CreateProductSchema, UpdateProductSchema } from './product.dto';
import { BadRequestError } from '../../utils/errors';

function parseProductId(idParam: string | string[] | undefined): number {
  const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = Number(idStr);
  if (!idStr || isNaN(id) || !Number.isInteger(id) || id <= 0) {
    throw new BadRequestError(`Invalid product ID '${idStr}'`, 'INVALID_ID', [
      { field: 'id', code: 'INVALID_ID', message: `Invalid product ID '${idStr}'` },
    ]);
  }
  return id;
}

export class ProductController {
  public async getProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.getProducts(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public async createProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = CreateProductSchema.parse(req.body);
      const product = await productService.createProduct(validatedInput);
      res.status(201).json({ data: product });
    } catch (error) {
      next(error);
    }
  }

  public async getProductById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = parseProductId(req.params.id);
      const product = await productService.getProductById(productId);
      res.status(200).json({ data: product });
    } catch (error) {
      next(error);
    }
  }

  public async updateProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = parseProductId(req.params.id);
      const validatedInput = UpdateProductSchema.parse(req.body);
      const userId = req.user!.user_id;
      const updatedProduct = await productService.updateProduct(productId, validatedInput, userId);
      res.status(200).json({ data: updatedProduct });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
