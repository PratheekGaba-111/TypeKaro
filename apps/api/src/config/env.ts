import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const resolveEnvPath = () => {
  if (process.env.ENV_PATH) {
    return process.env.ENV_PATH;
  }

  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../.env"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(process.cwd(), "../../../.env"),
    path.resolve(process.cwd(), "../../../../.env")
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), ".env");
};

const loadedEnvPath = resolveEnvPath();
dotenv.config({ path: loadedEnvPath });
console.log(`Loaded env from: ${loadedEnvPath}`);

const toNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const env = {
  port: toNumber(process.env.PORT, 4000),
  mongoUri: process.env.MONGODB_URI || "mongodb://localhost:27017/typing_handwriting",
  jwtSecret: process.env.JWT_SECRET || "dev_secret_change_me",
  handwritingServiceUrl:
    process.env.HANDWRITING_SERVICE_URL || "http://localhost:5001",
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  nodeEnv: process.env.NODE_ENV || "development",
  demoEmail: process.env.DEMO_EMAIL || "demo@typing.local",
  demoPassword: process.env.DEMO_PASSWORD || "demo12345",
  demoSeed: (process.env.DEMO_SEED || "true").toLowerCase() === "true",
  demoForce: (process.env.DEMO_FORCE || "false").toLowerCase() === "true"
};
