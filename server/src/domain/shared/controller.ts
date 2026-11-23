import { Request, Response } from 'express';
import { UserDocument } from '../user/user.model.js';
import { successResponse } from '../../shared/http/success.js';

export const sendResponse = <T>(res: Response, status: number, data: T): void => {
  res.status(status).json(successResponse(data));
};

export const getAuthUser = (req: Request): UserDocument => {
  const validatedUser = req.user as UserDocument;
  return validatedUser;
};
