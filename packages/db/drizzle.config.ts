import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = fileURLToPath(new URL(".", import.meta.url));
const envPath = resolve(currentDir, "../../apps/server/.env");

const result = config({ path: envPath });

console.log("Loading env from:", envPath);
console.log("dotenv error:", result.error?.message ?? "none");
console.log("DATABASE_URL present:", Boolean(process.env.DATABASE_URL));

if (!process.env.DATABASE_URL) {
  throw new Error(`DATABASE_URL is not set (looked in ${envPath})`);
}

export default defineConfig({
  schema: "./src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
