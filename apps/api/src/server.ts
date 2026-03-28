import mongoose from "mongoose";
import { createApp } from "./app";
import { env } from "./config/env";
import { ensureDemoUser } from "./services/seed";

export const connectDb = async () => {
  await mongoose.connect(env.mongoUri);
  const dbName = mongoose.connection.name;
  console.log(`MongoDB connected: ${dbName}`);
};

const start = async () => {
  await connectDb();
  await ensureDemoUser();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API listening on ${env.port}`);
  });
};

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});
