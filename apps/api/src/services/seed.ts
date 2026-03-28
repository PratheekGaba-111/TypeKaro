import bcrypt from "bcrypt";
import { env } from "../config/env";
import { User } from "../models/User";

export const ensureDemoUser = async () => {
  if (!env.demoSeed) {
    return;
  }

  if (!env.demoEmail || !env.demoPassword) {
    console.warn("Demo seed skipped: missing demo credentials");
    return;
  }

  const passwordHash = await bcrypt.hash(env.demoPassword, 10);
  const existing = await User.findOne({ email: env.demoEmail });
  if (existing) {
    if (env.demoForce) {
      existing.passwordHash = passwordHash;
      await existing.save();
      console.log(`Demo user password reset for ${env.demoEmail}`);
    } else {
      console.log(`Demo user exists for ${env.demoEmail}`);
    }
    return;
  }

  await User.create({ email: env.demoEmail, passwordHash });
  console.log(`Demo user created for ${env.demoEmail}`);
};
