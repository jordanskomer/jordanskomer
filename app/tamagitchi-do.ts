import { DurableObject } from "cloudflare:workers";
import {
  type DrizzleSqliteDODatabase,
  drizzle,
} from "drizzle-orm/durable-sqlite";
import { migrate } from "drizzle-orm/durable-sqlite/migrator";
import type {
  TamagitchiInteraction,
  TamagitchiResponse,
} from "@/app/@types/tamagitchi";
import { activityRepo } from "@/app/repositories/activity";
import { tamagitchiRepo } from "@/app/repositories/tamagitchi";
import { userRepo } from "@/app/repositories/user";
import { svgGen } from "@/app/services/svg-gen";
import {
  batchTamagitchiDegradation,
  tamagitchi as tamagitchiService,
} from "@/app/services/tamagitchi";
import migrations from "@/db/migrations/migrations";
import * as schema from "@/db/schema";
import { extractColo } from "@/lib/extract-colo";

export class TamagitchiDO extends DurableObject<Env> {
  private storage: DurableObjectStorage;
  private db: DrizzleSqliteDODatabase<typeof schema>;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.storage = ctx.storage;
    this.db = drizzle(this.storage, { schema, logger: false });

    // Make sure all migrations complete before accepting queries
    ctx.blockConcurrencyWhile(async () => {
      await this._migrate();
    });
  }

  async interact(request: Request): Promise<TamagitchiResponse> {
    const interaction: TamagitchiInteraction = await request.json();
    const colo = extractColo(request);
    const now = new Date();

    // Get or create user
    let user = await userRepo(this.db).findByGithubUsername(
      interaction.githubUsername,
    );
    if (!user) {
      user = await userRepo(this.db).create({
        githubUsername: interaction.githubUsername,
        lastActivity: now,
        lastSeen: now,
      });
    }

    // Get or create tamagitchi for this colo
    let tamagitchi = await tamagitchiRepo(this.db).findByColo(colo);
    if (!tamagitchi) {
      tamagitchi = await tamagitchiRepo(this.db).create(colo);
    }

    // Calculate stat changes using service
    const service = tamagitchiService(
      interaction.type,
      interaction.subtype,
      tamagitchi,
    );
    const {
      delta,
      newStats,
      level: newLevel,
      state: newState,
      newLevel: leveledUp,
    } = service;

    await tamagitchiRepo(this.db).updateStats(tamagitchi.id, {
      ...newStats,
      level: newLevel,
      state: newState,
    });

    // Record activity
    await activityRepo(this.db).create({
      userId: user.id,
      tamagitchiId: tamagitchi.id,
      type: interaction.type,
      subtype: interaction.subtype,
      points: delta.pointsEarned,
      experienceGained: delta.experienceGained,
      happinessChange: delta.happinessChange,
      energyChange: delta.energyChange,
      hungerChange: delta.hungerChange,
      issueNumber: interaction.issueNumber,
    });

    // Update user activity
    await userRepo(this.db).updateLastActivity(user.id, now);

    const updatedTamagitchi = {
      ...tamagitchi,
      ...newStats,
      level: newLevel,
      state: newState,
    };

    return {
      success: true,
      message: service.getMessage(),
      tamagitchi: updatedTamagitchi,
      delta,
      newLevel: leveledUp,
    };
  }

  async degrade(): Promise<{
    success: boolean;
    message: string;
    summary: any;
    updates?: any[];
  }> {
    try {
      console.log("Running tamagitchi degradation...");

      const allTamagitchis = await tamagitchiRepo(this.db).getAllTamagitchis();

      if (allTamagitchis.length === 0) {
        return {
          success: true,
          message: "No tamagitchis found to process",
          summary: { processed: 0, updated: 0, skipped: 0 },
        };
      }

      const { updates, summary } = batchTamagitchiDegradation(allTamagitchis);

      for (const update of updates) {
        await tamagitchiRepo(this.db).updateStats(update.id, {
          ...update.stats,
          state: update.state,
        });
      }

      console.log(
        `Degradation completed: ${summary.updated}/${summary.processed} tamagitchis updated`,
      );

      return {
        success: true,
        message: `Processed ${summary.processed} tamagitchis, updated ${summary.updated}`,
        summary,
        updates: updates.map((u) => ({
          id: u.id,
          state: u.state,
          hoursSinceLastInteraction: u.hoursSinceLastInteraction,
        })),
      };
    } catch (error) {
      console.error("Degradation error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Unknown error",
        summary: { processed: 0, updated: 0, skipped: 0 },
      };
    }
  }

  async generateSVG(request: Request): Promise<string> {
    return await svgGen({
      env: this.env,
      request,
      db: this.db,
    }).generate();
  }

  private async _migrate() {
    migrate(this.db, migrations);
  }
}
