interface PersonalInfo {
  location: string;
  country: string;
  latitude: number;
  longitude: number;
  bio_line1: string;
  bio_line2: string;
  bio_line3: string;
  email: string;
}

interface CachedCryptoPrices {
  btc: number;
  eth: number;
  lastUpdated: number;
}

/**
 * Type guard for personal info structure
 */
const isPersonalInfo = (data: unknown): data is PersonalInfo => {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;
  return (
    typeof obj.location === "string" &&
    typeof obj.latitude === "number" &&
    typeof obj.longitude === "number" &&
    typeof obj.country === "string" &&
    typeof obj.bio_line1 === "string" &&
    typeof obj.bio_line2 === "string" &&
    typeof obj.bio_line3 === "string" &&
    typeof obj.email === "string"
  );
};

/**
 * Type guard for cached crypto prices
 */
const isCachedCryptoPrices = (data: unknown): data is CachedCryptoPrices => {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;
  return (
    typeof obj.btc === "number" &&
    typeof obj.eth === "number" &&
    typeof obj.lastUpdated === "number"
  );
};

export type SettingsOptions = {
  env: Env;
};

/**
 * Settings repository for KV operations with type safety
 */
export const settingsRepo = ({ env }: SettingsOptions) => {
  return {
    /**
     * Get personal info with hourly refresh check
     */
    getPersonalInfo: async (): Promise<PersonalInfo> => {
      const stored = await env.KV_SETTINGS.get("current_info", "json");
      if (!stored) {
        throw new Error("No personal info found");
      }

      if (!isPersonalInfo(stored)) {
        console.warn("Invalid personal info", stored);
        throw new Error("Invalid personal info");
      }
      return stored;
    },

    /**
     * Update personal info in KV
     */
    setPersonalInfo: async (info: PersonalInfo): Promise<void> => {
      await env.KV_SETTINGS.put("current_info", JSON.stringify(info));
    },

    /**
     * Get cached crypto prices
     */
    getCachedCryptoPrices: async (): Promise<CachedCryptoPrices | null> => {
      try {
        const stored = await env.KV_SETTINGS.get("crypto_prices");
        if (stored) {
          const data = JSON.parse(stored);
          if (isCachedCryptoPrices(data)) {
            return data;
          }
        }
      } catch (error) {
        console.error("Failed to parse crypto_prices from KV:", error);
      }
      return null;
    },

    /**
     * Cache crypto prices in KV
     */
    setCachedCryptoPrices: async (
      prices: CachedCryptoPrices,
    ): Promise<void> => {
      await env.KV_SETTINGS.put("crypto_prices", JSON.stringify(prices));
    },

    /**
     * Get any setting by key with type guard validation
     */
    getSetting: async <T>(
      key: string,
      typeGuard: (data: unknown) => data is T,
    ): Promise<T | null> => {
      try {
        const stored = await env.KV_SETTINGS.get(key);
        if (stored) {
          const data = JSON.parse(stored);
          if (typeGuard(data)) {
            return data;
          }
        }
      } catch (error) {
        console.error(`Failed to parse ${key} from KV:`, error);
      }
      return null;
    },

    /**
     * Set any setting by key
     */
    setSetting: async <T>(key: string, value: T): Promise<void> => {
      await env.KV_SETTINGS.put(key, JSON.stringify(value));
    },
  };
};
