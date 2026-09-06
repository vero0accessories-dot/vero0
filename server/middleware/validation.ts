import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

export function validateSchema(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          error: "Validation failed",
          details: (err as any).errors?.map((e: any) => ({ field: e.path?.join("."), message: e.message })) || [],
        });
      }
      next(err);
    }
  };
}
