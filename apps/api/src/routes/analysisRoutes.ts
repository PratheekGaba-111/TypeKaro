import { Router } from "express";
import { z } from "zod";
import { asyncHandler } from "../utils/asyncHandler";
import { analyzeTyping } from "../controllers/analysisController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

const analyzeSchema = z.object({
  targetText: z.string().min(1),
  typedText: z.string(),
  timeTakenMs: z.number().nonnegative()
});

router.post(
  "/",
  authMiddleware,
  asyncHandler(async (req, res) => {
    analyzeSchema.parse(req.body);
    await analyzeTyping(req, res);
  })
);

export default router;
