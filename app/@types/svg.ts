import type { DbInstance } from "@/db";

export type SVGOptions = {
  request: Request;
  env: Env;
  db: DbInstance;
};
export type SVGTypes = "feed" | "tamagitchi" | "leaderboard" | "info" | "repo";

export type SVGAdapter = (options: SVGOptions) => string | Promise<string>;
