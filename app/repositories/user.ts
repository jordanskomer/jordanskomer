import { eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import type { User } from "@/app/@types/tamagitchi";
import type * as schema from "@/db/schema";
import { users } from "@/db/schema";

type DbInstance = DrizzleSqliteDODatabase<typeof schema>;

export const userRepo = (db: DbInstance) => {
  return {
    findByGithubUsername: async (username: string): Promise<User | null> => {
      const result = await db.query.users.findFirst({
        where: eq(users.githubUsername, username),
      });

      return result ? mapToUser(result) : null;
    },

    create: async (userData: Omit<User, "id" | "createdAt">): Promise<User> => {
      const id = crypto.randomUUID();
      const now = new Date();

      const newUser = {
        id,
        githubUsername: userData.githubUsername,
        displayName: userData.displayName || null,
        avatarUrl: userData.avatarUrl || null,
        createdAt: now,
        lastActivity: userData.lastActivity,
        lastSeen: userData.lastSeen,
      };

      await db.insert(users).values(newUser);
      return mapToUser(newUser);
    },

    updateLastActivity: async (id: string, timestamp: Date): Promise<void> => {
      await db
        .update(users)
        .set({ lastActivity: timestamp })
        .where(eq(users.id, id));
    },
  };

  function mapToUser(result: any): User {
    return {
      id: result.id,
      githubUsername: result.githubUsername,
      displayName: result.displayName || undefined,
      avatarUrl: result.avatarUrl || undefined,
      createdAt: result.createdAt,
      lastActivity: result.lastActivity || result.createdAt,
      lastSeen: result.lastSeen || result.createdAt,
    };
  }
};
