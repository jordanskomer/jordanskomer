import type {
  ActivityType,
  FoodType,
  StatsDelta,
  Tamagitchi,
  TamagitchiState,
} from "@/app/@types/tamagitchi";
import {
  ACTIVITY_EFFECTS,
  EXPERIENCE_PER_LEVEL,
  FOOD_EFFECTS,
  STATE_THRESHOLDS,
} from "@/lib/constants";

interface DegradationRates {
  health: number;
  happiness: number;
  energy: number;
  hunger: number; // Note: hunger increases (gets hungrier)
}

/**
 * Base degradation rates per hour when not fed/played with
 */
const BASE_DEGRADATION: DegradationRates = {
  health: -2, // Loses 2 health per hour
  happiness: -3, // Loses 3 happiness per hour
  energy: -1, // Loses 1 energy per hour
  hunger: +4, // Gets 4 points hungrier per hour
};

/**
 * Accelerated degradation when tamagitchi is in poor state
 */
const POOR_STATE_MULTIPLIER = 1.5;

/**
 * Time thresholds in milliseconds
 */
const HOUR_MS = 60 * 60 * 1000;
const CRITICAL_NEGLECT_HOURS = 24; // 24 hours without interaction = critical

export const tamagitchi = (
  type: string,
  subtype: string,
  tamagitchi: Tamagitchi,
) => {
  const delta = calculateStatChanges();
  const newStats = calculateNewStats();
  const level = calculateLevel();
  const state = calculateState();
  const newLevel = level > tamagitchi.level;

  return {
    delta,
    newStats,
    level,
    state,
    newLevel,
    getMessage: (achievements?: string[]) =>
      getInteractionMessage(achievements),
  };

  function calculateStatChanges(): StatsDelta {
    const baseChanges = {
      healthChange: 0,
      happinessChange: 0,
      energyChange: 0,
      hungerChange: 0,
      experienceGained: 0,
      pointsEarned: 0,
    };

    if (type === "feed") {
      const effect = FOOD_EFFECTS[subtype as FoodType];
      if (effect) {
        return {
          healthChange: effect.health,
          happinessChange: effect.happiness,
          energyChange: effect.energy,
          hungerChange: effect.hunger,
          experienceGained: effect.exp,
          pointsEarned: effect.points,
        };
      }
    }

    if (type === "play") {
      const effect = ACTIVITY_EFFECTS[subtype as ActivityType];
      if (effect) {
        return {
          healthChange: effect.health,
          happinessChange: effect.happiness,
          energyChange: effect.energy,
          hungerChange: effect.hunger,
          experienceGained: effect.exp,
          pointsEarned: effect.points,
        };
      }
    }

    return baseChanges;
  }

  function calculateNewStats() {
    return {
      health: Math.max(
        0,
        Math.min(100, tamagitchi.health + delta.healthChange),
      ),
      happiness: Math.max(
        0,
        Math.min(100, tamagitchi.happiness + delta.happinessChange),
      ),
      energy: Math.max(
        0,
        Math.min(100, tamagitchi.energy + delta.energyChange),
      ),
      hunger: Math.max(
        0,
        Math.min(100, tamagitchi.hunger + delta.hungerChange),
      ),
      experience: tamagitchi.experience + delta.experienceGained,
      totalInteractions: tamagitchi.totalInteractions + 1,
    };
  }

  function calculateLevel(): number {
    return Math.floor(newStats.experience / EXPERIENCE_PER_LEVEL) + 1;
  }

  function calculateState(): TamagitchiState {
    if (newStats.health <= STATE_THRESHOLDS.SICK_HEALTH) return "sick";
    if (newStats.hunger >= STATE_THRESHOLDS.HUNGRY_LEVEL) return "hungry";
    if (newStats.energy <= STATE_THRESHOLDS.SLEEPY_ENERGY) return "sleepy";
    if (newStats.happiness <= STATE_THRESHOLDS.BORED_HAPPINESS) return "bored";
    return "happy";
  }

  function getInteractionMessage(achievements?: string[]): string {
    let message = `## 🎉 Interaction Successful!\n\n`;

    if (type === "feed") {
      message += `**${tamagitchi.name} enjoyed the ${subtype}! 🍽️**\n\n`;
    } else if (type === "play") {
      message += `**${tamagitchi.name} had fun with ${subtype}! 🎮**\n\n`;
    } else {
      message += `**${tamagitchi.name} appreciated the interaction!**\n\n`;
    }

    message += `### Tamagitchi Stats (Colo: ${tamagitchi.colo})\n`;
    message += `- 💖 Health: ${newStats.health}/100`;
    if (delta.healthChange !== 0)
      message += ` (${delta.healthChange > 0 ? "+" : ""}${delta.healthChange})`;
    message += `\n- 😊 Happiness: ${newStats.happiness}/100`;
    if (delta.happinessChange !== 0)
      message += ` (${delta.happinessChange > 0 ? "+" : ""}${delta.happinessChange})`;
    message += `\n- ⚡ Energy: ${newStats.energy}/100`;
    if (delta.energyChange !== 0)
      message += ` (${delta.energyChange > 0 ? "+" : ""}${delta.energyChange})`;
    message += `\n- 🍽️ Hunger: ${newStats.hunger}/100`;
    if (delta.hungerChange !== 0)
      message += ` (${delta.hungerChange > 0 ? "+" : ""}${delta.hungerChange})`;
    message += `\n- 🏆 Level: ${level}`;
    message += `\n- ✨ Experience: ${newStats.experience}`;
    if (delta.experienceGained > 0) message += ` (+${delta.experienceGained})`;
    message += `\n- 🎯 Points Earned: ${delta.pointsEarned}\n`;

    if (newLevel) {
      message += `\n🎊 **LEVEL UP!** ${tamagitchi.name} reached level ${level}!\n`;
    }

    if (achievements && achievements.length > 0) {
      message += `\n🏅 **New Achievements:** ${achievements.join(", ")}\n`;
    }

    message += `\n---\n*State: ${state.toUpperCase()}* | *Total Interactions: ${newStats.totalInteractions}*`;

    return message;
  }
};

/**
 * Calculate how many hours have passed since last interaction
 */
const getHoursSinceLastInteraction = (tamagitchi: Tamagitchi): number => {
  const now = Date.now();
  const lastFed = tamagitchi.lastFed?.getTime() || 0;
  const lastPlayed = tamagitchi.lastPlayed?.getTime() || 0;
  const lastInteraction = Math.max(lastFed, lastPlayed);

  return Math.max(0, Math.floor((now - lastInteraction) / HOUR_MS));
};

/**
 * Calculate degradation multiplier based on current state
 */
const getDegradationMultiplier = (tamagitchi: Tamagitchi): number => {
  // Poor states degrade faster
  if (["sick", "hungry", "sleepy", "bored"].includes(tamagitchi.state)) {
    return POOR_STATE_MULTIPLIER;
  }
  return 1.0;
};

/**
 * Apply stat bounds (0-100 for most stats, hunger can go higher)
 */
const applyStatBounds = (
  value: number,
  stat: keyof DegradationRates,
): number => {
  if (stat === "hunger") {
    return Math.max(0, value); // Hunger can exceed 100
  }
  return Math.max(0, Math.min(100, value));
};

/**
 * Calculate new state based on stats
 */
const calculateDegradationState = (
  stats: Pick<Tamagitchi, "health" | "happiness" | "energy" | "hunger">,
): TamagitchiState => {
  if (stats.health <= 0) return "dead";
  if (stats.health <= STATE_THRESHOLDS.SICK_HEALTH) return "sick";
  if (stats.hunger >= STATE_THRESHOLDS.HUNGRY_LEVEL) return "hungry";
  if (stats.energy <= STATE_THRESHOLDS.SLEEPY_ENERGY) return "sleepy";
  if (stats.happiness <= STATE_THRESHOLDS.BORED_HAPPINESS) return "bored";
  return "happy";
};

/**
 * Degradation service for individual tamagitchi
 */
export const tamagitchiDegradation = (tamagitchi: Tamagitchi) => {
  const hoursSinceLastInteraction = getHoursSinceLastInteraction(tamagitchi);

  // If no degradation needed (recent interaction)
  if (hoursSinceLastInteraction === 0) {
    return {
      needsUpdate: false,
      newStats: null,
      newState: tamagitchi.state,
      hoursSinceLastInteraction: 0,
    };
  }

  const degradationMultiplier = getDegradationMultiplier(tamagitchi);
  const effectiveHours = Math.min(
    hoursSinceLastInteraction,
    CRITICAL_NEGLECT_HOURS,
  );

  // Calculate new stats
  const newStats = {
    health: applyStatBounds(
      tamagitchi.health +
        BASE_DEGRADATION.health * effectiveHours * degradationMultiplier,
      "health",
    ),
    happiness: applyStatBounds(
      tamagitchi.happiness +
        BASE_DEGRADATION.happiness * effectiveHours * degradationMultiplier,
      "happiness",
    ),
    energy: applyStatBounds(
      tamagitchi.energy +
        BASE_DEGRADATION.energy * effectiveHours * degradationMultiplier,
      "energy",
    ),
    hunger: applyStatBounds(
      tamagitchi.hunger +
        BASE_DEGRADATION.hunger * effectiveHours * degradationMultiplier,
      "hunger",
    ),
  };

  const newState = calculateDegradationState(newStats);

  return {
    needsUpdate: true,
    newStats: {
      ...newStats,
      // Don't change these during degradation
      experience: tamagitchi.experience,
      level: tamagitchi.level,
      totalInteractions: tamagitchi.totalInteractions,
      updatedAt: new Date(),
    },
    newState,
    hoursSinceLastInteraction,
  };
};

/**
 * Batch degradation for multiple tamagitchis
 */
export const batchTamagitchiDegradation = (tamagitchis: Tamagitchi[]) => {
  const updates: Array<{
    id: string;
    stats: any;
    state: TamagitchiState;
    hoursSinceLastInteraction: number;
  }> = [];

  let processed = 0;
  let updated = 0;

  for (const tamagitchi of tamagitchis) {
    processed++;
    const result = tamagitchiDegradation(tamagitchi);

    if (result.needsUpdate && result.newStats) {
      updates.push({
        id: tamagitchi.id,
        stats: result.newStats,
        state: result.newState,
        hoursSinceLastInteraction: result.hoursSinceLastInteraction,
      });
      updated++;
    }
  }

  return {
    updates,
    summary: {
      processed,
      updated,
      skipped: processed - updated,
    },
  };
};
