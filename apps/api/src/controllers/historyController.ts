import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import { Session } from "../models/Session";
import type { SessionDTO } from "@app/shared";

const toSessionDto = (session: any): SessionDTO => ({
  id: String(session._id),
  userId: String(session.userId),
  textLength: session.textLength,
  timeTakenMs: session.timeTakenMs,
  wpm: session.wpm,
  accuracy: session.accuracy,
  netWpm: session.netWpm,
  generationTimeMs: session.generationTimeMs,
  efficiency: session.efficiency,
  imageUrl: session.imageUrl,
  targetText: session.targetText ?? "",
  typedText: session.typedText ?? "",
  createdAt: session.createdAt.toISOString()
});

export const getHistory = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const sessions = await Session.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return res.json({
    sessions: sessions.map(toSessionDto)
  });
};

export const getHistoryItem = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const session = await Session.findOne({
    _id: req.params.id,
    userId: req.user.id
  }).lean();

  if (!session) {
    return res.status(404).json({ message: "Session not found" });
  }

  return res.json({ session: toSessionDto(session) });
};

export const clearHistory = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const result = await Session.deleteMany({ userId: req.user.id });
  return res.json({ deletedCount: result.deletedCount ?? 0 });
};
