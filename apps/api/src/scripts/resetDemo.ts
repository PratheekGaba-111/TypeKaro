import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { env } from "../config/env";
import { User } from "../models/User";

const run = async () => {
  await mongoose.connect(env.mongoUri);
  const passwordHash = await bcrypt.hash(env.demoPassword, 10);
  const result = await User.findOneAndUpdate(
    { email: env.demoEmail },
    { email: env.demoEmail, passwordHash },
    { upsert: true, new: true }
  );
  console.log(`Demo user ready: ${result.email}`);
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Failed to reset demo user", error);
  process.exit(1);
});
