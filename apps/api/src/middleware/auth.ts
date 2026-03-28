import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as { id: string; email: string };
    (req as AuthRequest).user = { id: payload.id, email: payload.email };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};
