import { settingsRepo } from "@/app/repositories/settings";

export interface CryptoPrices {
  btc: number;
  eth: number;
  lastUpdated: number;
}

interface CoinGeckoResponse {
  bitcoin: {
    usd: number;
  };
  ethereum: {
    usd: number;
  };
}

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

type CryptoOptions = {
  env: Env;
};

export const cryptoService = (options: CryptoOptions) => {
  const settings = settingsRepo(options);

  return {
    fetch: async (): Promise<CryptoPrices> => {
      const cached = await settings.getCachedCryptoPrices();
      if (cached) {
        const now = Date.now();
        if (now - cached.lastUpdated < CACHE_DURATION_MS) {
          return cached;
        }
      }

      // Fetch fresh data from CoinGecko (free tier)
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd",
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: unknown = await response.json();

        if (!isCoinGeckoResponse(data)) {
          throw new Error("Invalid API response structure");
        }

        const prices: CryptoPrices = {
          btc: Math.round(data.bitcoin.usd),
          eth: Math.round(data.ethereum.usd),
          lastUpdated: Date.now(),
        };

        // Cache the data using settings repo
        await settings.setCachedCryptoPrices(prices);

        return prices;
      } catch (error) {
        console.error("Failed to fetch crypto prices:", error);

        // Return cached data if available, even if stale
        if (cached) {
          return cached;
        }

        // Fallback values if no cache available
        return {
          btc: 0,
          eth: 0,
          lastUpdated: Date.now(),
        };
      }
    },
  };
};

/**
 * Type guard to validate CoinGecko API response structure
 */
const isCoinGeckoResponse = (data: unknown): data is CoinGeckoResponse => {
  return (
    typeof data === "object" &&
    data !== null &&
    "bitcoin" in data &&
    "ethereum" in data &&
    typeof data.bitcoin === "object" &&
    typeof data.ethereum === "object" &&
    "usd" in data.bitcoin &&
    "usd" in data.ethereum &&
    typeof data.bitcoin.usd === "number" &&
    typeof data.ethereum.usd === "number"
  );
};
