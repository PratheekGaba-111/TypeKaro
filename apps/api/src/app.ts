import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes";
import analysisRoutes from "./routes/analysisRoutes";
import historyRoutes from "./routes/historyRoutes";
import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";

export const createApp = () => {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.clientOrigin,
      credentials: true
    })
  );
  app.use(express.json({ limit: "50kb" }));
  app.use(cookieParser());

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 200
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/auth", authRoutes);
  app.use("/api/analyze", analysisRoutes);
  app.use("/api/history", historyRoutes);

  app.use(errorHandler);

  return app;
};
