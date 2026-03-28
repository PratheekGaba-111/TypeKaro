import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { clearHistory, getHistory, getHistoryItem } from "../controllers/historyController";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.get(
  "/",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await getHistory(req, res);
  })
);

router.get(
  "/:id",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await getHistoryItem(req, res);
  })
);

router.delete(
  "/",
  authMiddleware,
  asyncHandler(async (req, res) => {
    await clearHistory(req, res);
  })
);

export default router;
