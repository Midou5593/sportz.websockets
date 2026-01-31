import 'dotenv/config';
import  { Config } from "drizzle-kit";
import * as process from "node:process";


if (!process.env.DATABASE_URL) {
  throw new Error('Database URL is not set in env file');
}

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
