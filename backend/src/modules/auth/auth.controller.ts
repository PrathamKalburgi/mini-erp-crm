import { Request, Response, NextFunction } from 'express';
import { LoginSchema } from './auth.dto';
import { authService } from './auth.service';

export class AuthController {
  public async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedInput = LoginSchema.parse(req.body);
      const result = await authService.login(validatedInput.email, validatedInput.password);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  public async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.user_id;
      const userProfile = await authService.getCurrentUser(userId);
      res.status(200).json({ data: userProfile });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
