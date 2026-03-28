import { describe, it, beforeAll, afterAll, expect, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";
import { createApp } from "../src/app";

vi.mock("../src/services/handwritingService", () => ({
  generateHandwriting: vi.fn().mockResolvedValue({
    imageUrl: "http://localhost:5001/images/test.png",
    generationTimeMs: 500
  })
}));

let mongoServer: MongoMemoryServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe("API flow", () => {
  it("registers, analyzes, and fetches history", async () => {
    const app = createApp();
    const agent = request.agent(app);

    await agent
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "password123" })
      .expect(201);

    const analyzeRes = await agent
      .post("/api/analyze")
      .send({ targetText: "hello", typedText: "hello", timeTakenMs: 30000 })
      .expect(201);

    expect(analyzeRes.body.metrics.wpm).toBeGreaterThan(0);

    const historyRes = await agent.get("/api/history").expect(200);
    expect(historyRes.body.sessions.length).toBe(1);
  });
});
