import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ParsedQs } from 'qs';
import { ParamsDictionary } from 'express-serve-static-core';

/**
 * Middleware para validar el body de la request con un schema de Zod
 */
export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validación fallida',
          details: error.issues.map((err) => ({
            path: String(err.path.join('.')),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware para validar query parameters con un schema de Zod
 */
export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.query);
      req.query = parsed as ParsedQs;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validación de parámetros fallida',
          details: error.issues.map((err) => ({
            path: String(err.path.join('.')),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};

/**
 * Middleware para validar params con un schema de Zod
 */
export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = await schema.parseAsync(req.params);
      req.params = parsed as ParamsDictionary;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validación de parámetros de ruta fallida',
          details: error.issues.map((err) => ({
            path: String(err.path.join('.')),
            message: err.message
          }))
        });
      }
      next(error);
    }
  };
};
