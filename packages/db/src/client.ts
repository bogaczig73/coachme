import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import postgres from "postgres";
import { drizzle as drizzleNode } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL is not set");
}

const isNeon = url.includes("neon.tech");

export const db = isNeon
  ? drizzleNeon(neon(url), { schema })
  : drizzleNode(postgres(url, { prepare: false }), { schema });

export type DB = typeof db;
export { schema };
