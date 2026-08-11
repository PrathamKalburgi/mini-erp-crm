import { Request, Response, NextFunction } from 'express';
import { challanService } from './challan.service';
import { generateChallanPdf } from './pdf.service';
import { CreateChallanSchema, UpdateChallanSchema } from './challan.dto';
import { BadRequestError } from '../../utils/errors';

function parseChallanId(idParam: string | string[] | undefined): number {
  const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = Number(idStr);
  if (!idStr || isNaN(id) || !Number.isInteger(id) || id <= 0) {
    throw new BadRequestError(`Invalid challan ID '${idStr}'`, 'INVALID_ID', [
      { field: 'id', code: 'INVALID_ID', message: `Invalid challan ID '${idStr}'` },
    ]);
  }
  return id;
}

export class ChallanController {
  public async getChallans(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await challanService.getChallans(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public async createChallan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = CreateChallanSchema.parse(req.body);
      const userId = req.user!.user_id;
      const challan = await challanService.createChallan(validatedInput, userId);
      res.status(201).json({ data: challan });
    } catch (error) {
      next(error);
    }
  }

  public async getChallanById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challanId = parseChallanId(req.params.id);
      const challan = await challanService.getChallanById(challanId);
      res.status(200).json({ data: challan });
    } catch (error) {
      next(error);
    }
  }

  public async exportPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challanId = parseChallanId(req.params.id);
      const pdfBuffer = await generateChallanPdf(challanId);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="challan-${challanId}.pdf"`);
      res.status(200).send(pdfBuffer);
    } catch (error) {
      next(error);
    }
  }

  public async updateChallan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challanId = parseChallanId(req.params.id);
      const validatedInput = UpdateChallanSchema.parse(req.body);
      const userId = req.user!.user_id;
      const challan = await challanService.updateChallan(challanId, validatedInput, userId);
      res.status(200).json({ data: challan });
    } catch (error) {
      next(error);
    }
  }

  public async confirmChallan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challanId = parseChallanId(req.params.id);
      const userId = req.user!.user_id;
      const challan = await challanService.confirmChallan(challanId, userId);
      res.status(200).json({ data: challan });
    } catch (error) {
      next(error);
    }
  }

  public async cancelChallan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challanId = parseChallanId(req.params.id);
      const challan = await challanService.cancelChallan(challanId);
      res.status(200).json({ data: challan });
    } catch (error) {
      next(error);
    }
  }
}

export const challanController = new ChallanController();
