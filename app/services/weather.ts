import { settingsRepo } from "@/app/repositories/settings";
import {
  convertTemperatureForUser,
  getTemperatureUnit,
} from "@/lib/temperature";

interface WttrResponse {
  current_condition: Array<{
    temp_C: string;
    temp_F: string;
    weatherCode: string;
    weatherDesc: Array<{ value: string }>;
  }>;
}

interface WeatherResponse {
  condition: string;
  emoji: string;
  temperature: string;
  updatedAt: number;
}

export type WeatherService = ReturnType<typeof weatherService>;

export type WeatherOptions = {
  env: Env;
};

export function weatherService({ env }: WeatherOptions) {
  const settings = settingsRepo({ env });
  const fetchData = async (
    lat: number,
    lng: number,
    country: string,
  ): Promise<WeatherResponse> => {
    const cacheKey = `weather_${lat}_${lng}`;

    try {
      const cached = await settings.getSetting(cacheKey, isWeatherResponse);
      if (cached) {
        console.log("Using cached weather data", cacheKey);
        // Check if cache is still fresh (within 1 hour)
        const now = Date.now();
        const cacheAge = now - (cached.updatedAt || 0);
        if (cacheAge < 60 * 60 * 1000) {
          // 1 hour
          return cached;
        }
      }
    } catch (error) {
      console.log("Failed to get cached weather:", error);
    }

    try {
      // Try wttr.in first as it's more CF-friendly
      const wttrUrl = `https://wttr.in/${lat},${lng}?format=j1`;

      const response = await fetch(wttrUrl, {
        headers: {
          "User-Agent":
            "JordanSkomer-GitHub-Profile/1.0 (https://github.com/jordanskomer)",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Weather API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      if (!isWttrResponse(data)) {
        throw new Error("Invalid weather API response");
      }

      const current = data.current_condition[0];
      const weatherData: WeatherResponse = {
        emoji: getWeatherEmojiFromCondition(current.weatherDesc[0].value),
        condition: current.weatherDesc[0].value,
        temperature: getTemperatureFromWttr(current, country),
        updatedAt: Date.now(),
      };

      try {
        await settings.setSetting(cacheKey, weatherData);
      } catch (error) {
        console.log("Failed to cache weather data:", error);
      }

      return weatherData;
    } catch (error) {
      throw new Error(
        `Failed to fetch weather data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  return {
    getFromRequest: (request: Request) => {
      if (
        !request.cf ||
        !request.cf.latitude ||
        !request.cf.longitude ||
        !request.cf.country
      ) {
        throw new Error(
          "Location data not available. Latitude, longitude, and country required from Cloudflare request object.",
        );
      }
      return fetchData(
        Number(request.cf.latitude),
        Number(request.cf.longitude),
        String(request.cf.country),
      );
    },
    getFromCoordinates: (
      latitude: number,
      longitude: number,
      country: string,
    ) => fetchData(latitude, longitude, country),
  };
}

const isWeatherResponse = (data: unknown): data is WeatherResponse => {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;
  return (
    "condition" in obj &&
    "emoji" in obj &&
    "temperature" in obj &&
    typeof obj.condition === "string" &&
    typeof obj.emoji === "string" &&
    typeof obj.temperature === "string"
  );
};

/**
 * Type guard for WttrResponse
 */
const isWttrResponse = (data: unknown): data is WttrResponse => {
  if (typeof data !== "object" || data === null) return false;

  const obj = data as Record<string, unknown>;
  return (
    "current_condition" in obj &&
    Array.isArray(obj.current_condition) &&
    obj.current_condition.length > 0
  );
};

const getWeatherEmojiFromCondition = (condition: string): string => {
  const lower = condition.toLowerCase();
  if (lower.includes("sun") || lower.includes("clear")) return "☀️";
  if (lower.includes("cloud")) return "☁️";
  if (lower.includes("rain")) return "🌧️";
  if (lower.includes("snow")) return "❄️";
  if (lower.includes("storm") || lower.includes("thunder")) return "⛈️";
  if (lower.includes("fog") || lower.includes("mist")) return "🌫️";
  if (lower.includes("overcast")) return "☁️";
  return "🌤️"; // Default partly cloudy
};

const getTemperatureFromWttr = (
  current: WttrResponse["current_condition"][0],
  country: string,
): string => {
  const unit = getTemperatureUnit(country);
  const tempC = parseInt(current.temp_C);
  const temperature = convertTemperatureForUser(tempC, country);
  return `${temperature}${unit}`;
};
