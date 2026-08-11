import { Request, Response, NextFunction } from 'express';
import { inventoryService } from './inventory.service';

export class InventoryController {
  public async getStockMovements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await inventoryService.getStockMovements(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const inventoryController = new InventoryController();
