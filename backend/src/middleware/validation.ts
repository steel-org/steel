import { Request, Response, NextFunction } from "express";
import Joi from "joi";
import { CustomError } from "./errorHandler";

export const validateRegistration = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }

  return next();
};

export const validateLogin = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const schema = Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().required(),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }

  return next();
};

export const validateMessage = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const schema = Joi.object({
    content: Joi.string().required(),
    type: Joi.string().valid("TEXT", "CODE", "FILE", "SYSTEM").default("TEXT"),
    replyToId: Joi.string().optional(),
    language: Joi.string().when("type", {
      is: "CODE",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    filename: Joi.string().when("type", {
      is: "CODE",
      then: Joi.optional(),
      otherwise: Joi.optional(),
    }),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }

  return next();
};

export const validateChat = (
  req: Request,
  res: Response,
  next: NextFunction
): Response | void => {
  const schema = Joi.object({
    name: Joi.string().max(100).optional(),
    type: Joi.string().valid("DIRECT", "GROUP").default("DIRECT"),
    memberIds: Joi.array().items(Joi.string()).min(1).when("type", {
      is: "GROUP",
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
  });

  const { error } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message,
    });
  }

  return next();
};
