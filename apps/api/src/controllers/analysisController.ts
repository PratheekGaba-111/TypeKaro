import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { calculateMetrics } from "../utils/metrics";
import { Session } from "../models/Session";

export const analyzeTyping = async (req: AuthRequest, res: Response) => {
  const { targetText, typedText, timeTakenMs } = req.body as {
    targetText: string;
    typedText: string;
    timeTakenMs: number;
  };

  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const metrics = calculateMetrics(
    targetText,
    typedText,
    timeTakenMs,
    0
  );

  const session = await Session.create({
    userId: req.user.id,
    textLength: targetText.length,
    timeTakenMs,
    wpm: metrics.wpm,
    accuracy: metrics.accuracy,
    netWpm: metrics.netWpm,
    generationTimeMs: 0,
    efficiency: metrics.efficiency,
    imageUrl: "",
    targetText,
    typedText
  });

  return res.status(201).json({
    sessionId: String(session._id),
    metrics,
    imageUrl: "",
    generationTimeMs: 0
  });
};
