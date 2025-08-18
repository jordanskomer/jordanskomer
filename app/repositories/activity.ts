import { desc } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import type {
  Activity,
  FeedEntry,
  FoodType,
  InteractionType,
} from "@/app/@types/tamagitchi";
import type * as schema from "@/db/schema";
import { activities } from "@/db/schema";

type DbInstance = DrizzleSqliteDODatabase<typeof schema>;

export const activityRepo = (db: DbInstance) => {
  return {
    create: async (
      activityData: Omit<Activity, "id" | "timestamp">,
    ): Promise<Activity> => {
      const id = crypto.randomUUID();
      const now = new Date();

      const newActivity = {
        id,
        ...activityData,
        timestamp: now,
      };

      await db.insert(activities).values(newActivity);

      return newActivity;
    },

    getRecentFeed: async (limit: number = 10): Promise<FeedEntry[]> => {
      const results = await db.query.activities.findMany({
        with: {
          user: true,
          tamagitchi: true,
        },
        orderBy: [desc(activities.timestamp)],
        limit,
      });

      return results.map((result) => ({
        id: result.id,
        userId: result.userId,
        githubUsername: result.user.githubUsername,
        displayName: result.user.displayName || undefined,
        avatarUrl: result.user.avatarUrl || undefined,
        tamagitchiId: result.tamagitchiId,
        colo: result.tamagitchi.colo,
        activityType: result.type as InteractionType,
        activitySubtype: result.subtype as FoodType,
        points: result.points,
        message: `${result.type}ed ${result.subtype} to ${result.tamagitchi.name}`,
        timestamp: result.timestamp,
      }));
    },
  };
};
