import { relations } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";
import type { TamagitchiState } from "@/app/@types";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  githubUsername: text("github_username").notNull().unique(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  lastActivity: integer("last_activity", { mode: "timestamp" }),
  lastSeen: integer("last_seen", { mode: "timestamp" }),
});

export const tamagitchis = sqliteTable("tamagitchis", {
  id: text("id").primaryKey(),
  colo: text("colo").notNull(),
  name: text("name").notNull(),
  health: real("health").notNull().default(100),
  happiness: real("happiness").notNull().default(100),
  energy: real("energy").notNull().default(100),
  hunger: real("hunger").notNull().default(0),
  level: integer("level").notNull().default(1),
  experience: integer("experience").notNull().default(0),
  totalInteractions: integer("total_interactions").notNull().default(0),
  lastFed: integer("last_fed", { mode: "timestamp" }),
  lastPlayed: integer("last_played", { mode: "timestamp" }),
  state: text("state").notNull().$type<TamagitchiState>().default("happy"), // 'happy', 'hungry', 'sleepy', 'sick', 'dead', 'bored'
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const activities = sqliteTable("activities", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  tamagitchiId: text("tamagitchi_id")
    .notNull()
    .references(() => tamagitchis.id),
  type: text("type").notNull(), // 'feed' or 'play'
  subtype: text("subtype").notNull(), // food types or activity types
  points: integer("points").notNull().default(0),
  experienceGained: integer("experience_gained").notNull().default(0),
  happinessChange: real("happiness_change").notNull().default(0),
  energyChange: real("energy_change").notNull().default(0),
  hungerChange: real("hunger_change").notNull().default(0),
  timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
  issueNumber: integer("issue_number"),
});

export const usersRelations = relations(users, ({ many }) => ({
  activities: many(activities),
}));

export const tamagitchisRelations = relations(tamagitchis, ({ many }) => ({
  activities: many(activities),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
  tamagitchi: one(tamagitchis, {
    fields: [activities.tamagitchiId],
    references: [tamagitchis.id],
  }),
}));
