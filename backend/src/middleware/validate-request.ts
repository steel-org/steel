import { Request, Response, NextFunction } from 'express';
import { CustomError } from './errorHandler';

const { check, validationResult } = require('express-validator');

interface ValidationError {
  param: string;
  msg: string;
  value?: any;
  location?: string;
  [key: string]: any;
}

export const validateRequest = (validations: any[]) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      await Promise.all(validations.map(validation => validation.run(req)));

      const errors = validationResult(req);
      
      if (errors.isEmpty()) {
        return next();
      }

      const formattedErrors = errors.array().map((err: ValidationError) => ({
        field: err.param,
        message: err.msg,
      }));
      const error = new CustomError('Validation failed', 400);
      (error as any).details = formattedErrors;
      next(error);
    } catch (err) {
      next(err);
    }
  };
};

export const body = check;