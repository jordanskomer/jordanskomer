import { drizzle } from "drizzle-orm/d1";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import * as schema from "./schema";

export function createDb(database: D1Database) {
  return drizzle(database, { schema });
}

export type DbInstance = DrizzleSqliteDODatabase<typeof schema>;

export * from "./schema";
