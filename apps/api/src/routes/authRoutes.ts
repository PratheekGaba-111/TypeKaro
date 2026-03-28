import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { login, logout, register } from "../controllers/authController";

const router = Router();

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    authSchema.parse(req.body);
    await register(req, res);
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    authSchema.parse(req.body);
    await login(req, res);
  })
);

router.post(
  "/logout",
  asyncHandler(async (_req, res) => {
    await logout(_req, res);
  })
);

export default router;
