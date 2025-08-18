export type TimeOfDay = "morning" | "afternoon" | "evening" | "night";

// Time of day configurations
export const TIME_CONFIGS = {
  morning: {
    lighting: "soft golden hour light, long shadows",
    colors: "warm oranges, pinks, and soft yellows",
    atmosphere: "fresh morning mist, dew drops",
    sun_position: "low on horizon, creating golden rays",
  },
  afternoon: {
    lighting: "bright overhead sunlight, short shadows",
    colors: "vibrant blues, greens, and bright whites",
    atmosphere: "clear and energetic, full visibility",
    sun_position: "high in sky, direct illumination",
  },
  evening: {
    lighting: "warm sunset glow, golden hour",
    colors: "deep oranges, purples, reds, and magentas",
    atmosphere: "peaceful twilight, long dramatic shadows",
    sun_position: "setting on horizon, dramatic backlighting",
  },
  night: {
    lighting: "cool moonlight and artificial lighting",
    colors: "deep blues, blacks, silvers, and city lights",
    atmosphere: "serene darkness, starlit sky",
    sun_position: "moon and stars visible, street lamps glowing",
  },
};

/**
 * Get current time of day based on UTC hour
 */
export function getCurrentTimeOfDay(): TimeOfDay {
  const hour = new Date().getUTCHours();
  
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * Get time of day for a specific timezone
 */
export function getTimeOfDayForTimezone(timezone: string): TimeOfDay {
  const now = new Date();
  const hour = parseInt(now.toLocaleTimeString("en-US", { 
    timeZone: timezone,
    hour12: false,
    hour: "2-digit"
  }));
  
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";  
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}