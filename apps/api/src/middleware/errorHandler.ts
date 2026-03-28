import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ message: "Validation error", issues: err.flatten() });
  }

  console.error("Unhandled error", err);
  return res.status(500).json({ message: "Internal server error" });
};
