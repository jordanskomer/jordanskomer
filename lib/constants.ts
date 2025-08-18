import type { ActivityType, FoodType } from "@/app/@types/tamagitchi";

export const FOOD_EFFECTS: Record<
  FoodType,
  {
    health: number;
    happiness: number;
    hunger: number;
    energy: number;
    exp: number;
    points: number;
  }
> = {
  pizza: {
    health: 5,
    happiness: 10,
    hunger: -15,
    energy: 5,
    exp: 10,
    points: 10,
  },
  ramen: { health: 8, happiness: 8, hunger: -20, energy: 3, exp: 8, points: 8 },
  sushi: {
    health: 12,
    happiness: 15,
    hunger: -10,
    energy: 8,
    exp: 15,
    points: 15,
  },
  coffee: {
    health: 2,
    happiness: 5,
    hunger: -5,
    energy: 15,
    exp: 5,
    points: 5,
  },
  apple: { health: 15, happiness: 5, hunger: -8, energy: 2, exp: 5, points: 5 },
};

export const ACTIVITY_EFFECTS: Record<
  ActivityType,
  {
    health: number;
    happiness: number;
    energy: number;
    hunger: number;
    exp: number;
    points: number;
  }
> = {
  "code-challenge": {
    health: -5,
    happiness: 20,
    energy: -10,
    hunger: 5,
    exp: 25,
    points: 25,
  },
  music: {
    health: 2,
    happiness: 15,
    energy: -5,
    hunger: 2,
    exp: 15,
    points: 15,
  },
  exercise: {
    health: 10,
    happiness: 10,
    energy: -15,
    hunger: 8,
    exp: 20,
    points: 20,
  },
  puzzle: {
    health: 0,
    happiness: 12,
    energy: -8,
    hunger: 3,
    exp: 18,
    points: 18,
  },
  creative: {
    health: 3,
    happiness: 18,
    energy: -5,
    hunger: 2,
    exp: 22,
    points: 22,
  },
};

export const EXPERIENCE_PER_LEVEL = 100;

export const STATE_THRESHOLDS = {
  SICK_HEALTH: 20,
  HUNGRY_LEVEL: 80,
  SLEEPY_ENERGY: 20,
  BORED_HAPPINESS: 30,
} as const;
