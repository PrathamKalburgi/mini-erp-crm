import { Request, Response, NextFunction } from 'express';
import { customerService } from './customer.service';
import { CreateCustomerSchema, UpdateCustomerSchema, CreateFollowUpNoteSchema } from './customer.dto';
import { BadRequestError } from '../../utils/errors';

function parseCustomerId(idParam: string | string[] | undefined): number {
  const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = Number(idStr);
  if (!idStr || isNaN(id) || !Number.isInteger(id) || id <= 0) {
    throw new BadRequestError(`Invalid customer ID '${idStr}'`, 'INVALID_ID', [
      { field: 'id', code: 'INVALID_ID', message: `Invalid customer ID '${idStr}'` },
    ]);
  }
  return id;
}

export class CustomerController {
  public async getCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await customerService.getCustomers(req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = CreateCustomerSchema.parse(req.body);
      const customer = await customerService.createCustomer(validatedInput);
      res.status(201).json({ data: customer });
    } catch (error) {
      next(error);
    }
  }

  public async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = parseCustomerId(req.params.id);
      const customer = await customerService.getCustomerById(customerId);
      res.status(200).json({ data: customer });
    } catch (error) {
      next(error);
    }
  }

  public async updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = parseCustomerId(req.params.id);
      const validatedInput = UpdateCustomerSchema.parse(req.body);
      const updatedCustomer = await customerService.updateCustomer(customerId, validatedInput);
      res.status(200).json({ data: updatedCustomer });
    } catch (error) {
      next(error);
    }
  }

  public async addFollowUpNote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = parseCustomerId(req.params.id);
      const validatedInput = CreateFollowUpNoteSchema.parse(req.body);
      const createdByUserId = req.user!.user_id;
      const note = await customerService.addFollowUpNote(customerId, validatedInput.note, createdByUserId);
      res.status(201).json({ data: note });
    } catch (error) {
      next(error);
    }
  }

  public async getFollowUpNotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerId = parseCustomerId(req.params.id);
      const result = await customerService.getFollowUpNotes(customerId, req.query);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

export const customerController = new CustomerController();
