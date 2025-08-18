import { desc, eq } from "drizzle-orm";
import type { DrizzleSqliteDODatabase } from "drizzle-orm/durable-sqlite";
import type { Tamagitchi, TamagitchiState } from "@/app/@types/tamagitchi";
import type * as schema from "@/db/schema";
import { tamagitchis } from "@/db/schema";

type DbInstance = DrizzleSqliteDODatabase<typeof schema>;

export const tamagitchiRepo = (db: DbInstance) => {
  const insert = async (colo: string): Promise<Tamagitchi> => {
    const id = crypto.randomUUID();
    const now = new Date();

    const newTamagitchi = {
      id,
      colo,
      name: `Tama-${colo}`,
      health: 100,
      happiness: 100,
      energy: 100,
      hunger: 0,
      level: 1,
      experience: 0,
      totalInteractions: 0,
      lastFed: now,
      lastPlayed: now,
      state: "happy",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(tamagitchis).values(newTamagitchi);
    return newTamagitchi;
  };

  return {
    findOrCreate: async (options: { colo: string }): Promise<Tamagitchi> => {
      const existing = await db.query.tamagitchis.findFirst({
        where: eq(tamagitchis.colo, options.colo),
      });

      if (existing) {
        return mapToTamagitchi(existing);
      }

      return await insert(options.colo);
    },
    create: insert,
    updateStats: async (
      id: string,
      updates: Partial<
        Pick<
          Tamagitchi,
          | "health"
          | "happiness"
          | "energy"
          | "hunger"
          | "experience"
          | "level"
          | "totalInteractions"
          | "state"
        >
      >,
    ): Promise<void> => {
      await db
        .update(tamagitchis)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(tamagitchis.id, id));
    },

    getLeaderboard: async (limit: number = 10): Promise<Tamagitchi[]> => {
      const results = await db.query.tamagitchis.findMany({
        orderBy: [desc(tamagitchis.level), desc(tamagitchis.experience)],
        limit,
      });

      return results.map(mapToTamagitchi);
    },
  };

  function mapToTamagitchi(
    result: typeof tamagitchis.$inferSelect & Record<string, unknown>,
  ): Tamagitchi {
    return {
      id: result.id,
      colo: result.colo,
      name: result.name,
      health: result.health,
      happiness: result.happiness,
      energy: result.energy,
      hunger: result.hunger,
      level: result.level,
      experience: result.experience,
      totalInteractions: result.totalInteractions,
      lastFed: result.lastFed || result.createdAt,
      lastPlayed: result.lastPlayed || result.createdAt,
      state: result.state as TamagitchiState,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }
};
