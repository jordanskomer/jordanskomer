export type FoodType = "pizza" | "ramen" | "sushi" | "coffee" | "apple";

export type ActivityType =
  | "code-challenge"
  | "music"
  | "exercise"
  | "puzzle"
  | "creative";

export type InteractionType = "feed" | "play";

export type TamagitchiState =
  | "happy"
  | "hungry"
  | "sleepy"
  | "sick"
  | "dead"
  | "bored";

export interface User {
  id: string;
  githubUsername: string;
  displayName?: string;
  avatarUrl?: string;
  createdAt: Date;
  lastActivity: Date;
  lastSeen: Date;
}

export interface Tamagitchi {
  id: string;
  colo: string; // Cloudflare colo (e.g. 'SJC', 'LAX', 'DFW', etc.)
  name: string;
  health: number; // 0-100
  happiness: number; // 0-100
  energy: number; // 0-100
  hunger: number; // 0-100 (higher = more hungry)
  level: number;
  experience: number;
  totalInteractions: number;
  lastFed: Date;
  lastPlayed: Date;
  state: TamagitchiState;
  createdAt: Date;
  updatedAt: Date;
}

export interface Activity {
  id: string;
  userId: string;
  tamagitchiId: string;
  type: InteractionType;
  subtype: FoodType | ActivityType;
  points: number;
  experienceGained: number;
  happinessChange: number;
  energyChange: number;
  hungerChange: number;
  timestamp: Date;
  issueNumber?: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  githubUsername: string;
  displayName?: string;
  avatarUrl?: string;
  tamagitchiId: string;
  colo: string;
  level: number;
  totalPoints: number;
  totalInteractions: number;
  currentState: TamagitchiState;
  lastActivity: Date;
}

export interface FeedEntry {
  id: string;
  userId: string;
  githubUsername: string;
  displayName?: string;
  avatarUrl?: string;
  tamagitchiId: string;
  colo: string;
  activityType: InteractionType;
  activitySubtype: FoodType | ActivityType;
  points: number;
  message: string;
  timestamp: Date;
}

export interface TamagitchiInteraction {
  type: InteractionType;
  subtype: FoodType | ActivityType;
  userId: string;
  githubUsername: string;
  tamagitchiId: string;
  issueNumber: number;
}

export interface StatsDelta {
  healthChange: number;
  happinessChange: number;
  energyChange: number;
  hungerChange: number;
  experienceGained: number;
  pointsEarned: number;
}

export interface TamagitchiResponse {
  success: boolean;
  message: string;
  tamagitchi: Tamagitchi;
  delta: StatsDelta;
  newLevel?: boolean;
  achievements?: string[];
}

export interface CurrentInfo {
  // Personal info (flat structure only)
  location: string;
  location_time: string;
  weather_condition: string;
  weather_emoji?: string; // Optional, can be generated from condition
  temperature: string;
  bio_description: string;
  email: string;

  // Crypto prices
  crypto_btc: string;
  crypto_eth: string;

  // Optional user location section
  user_location?: string;
  user_weather?: string;
  distance_from_me?: string;
}
