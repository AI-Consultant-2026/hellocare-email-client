import { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";

// Validates { body, params, query } together against one schema per route, so a
// malformed request is rejected with a clear 400 before it ever reaches a controller.
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
    if (!result.success) {
      const firstIssue = result.error.issues[0];
      return res.status(400).json({
        error: firstIssue ? `${firstIssue.path.join(".")}: ${firstIssue.message}` : "Invalid request.",
      });
    }
    next();
  };
}
