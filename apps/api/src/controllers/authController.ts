import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { env } from "../config/env";
import type { UserDTO } from "@app/shared";

const createUserDto = (user: { _id: unknown; email: string; createdAt: Date }): UserDTO => ({
  id: String(user._id),
  email: user.email,
  createdAt: user.createdAt.toISOString()
});

const issueToken = (res: Response, payload: { id: string; email: string }) => {
  const token = jwt.sign(payload, env.jwtSecret, { expiresIn: "1h" });
  res.cookie("token", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production",
    maxAge: 60 * 60 * 1000
  });
  return new Date().toISOString();
};

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(409).json({ message: "Email already registered" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ email, passwordHash });
  const tokenIssuedAt = issueToken(res, { id: String(user._id), email: user.email });

  return res.status(201).json({
    user: createUserDto(user),
    tokenIssuedAt
  });
};

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body as { email: string; password: string };
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const tokenIssuedAt = issueToken(res, { id: String(user._id), email: user.email });

  return res.json({
    user: createUserDto(user),
    tokenIssuedAt
  });
};

export const logout = async (_req: Request, res: Response) => {
  res.clearCookie("token", {
    httpOnly: true,
    sameSite: "lax",
    secure: env.nodeEnv === "production"
  });
  return res.json({ message: "Logged out" });
};
