import type { SVGOptions, SVGTypes } from "@/app/@types/svg";
import { activityRepo } from "@/app/repositories/activity";
import { settingsRepo } from "@/app/repositories/settings";
import { tamagitchiRepo } from "@/app/repositories/tamagitchi";
import { calculateAndFormatDistance } from "@/lib/distance";
import { isSVGType } from "@/lib/is-svg-type";
import { aiArt } from "./ai-art";
import { cryptoService } from "./crypto";
import { weatherService } from "./weather";

export const svgGen = (options: SVGOptions) => {
  const url = new URL(options.request.url);
  const cf = options.request.cf;
  const svgType = getSVGTypeFromPath(url.pathname);
  const theme = getTheme(url);

  console.info(
    `Generating ${svgType} (${theme}) SVG`,
    cf.colo,
    cf.country,
    cf.city,
    cf.latitude,
    cf.longitude,
  );

  return {
    async generate(): Promise<string> {
      switch (svgType) {
        case "info":
          return generateInfoSVG();
        case "tamagitchi":
          return generateTamagitchiSVG();
        case "leaderboard":
          return generateLeaderboardSVG();
        case "feed":
          return generateFeedSVG();
        case "repo":
          return generateRepoSVG();
        default:
          throw new Error(`Unknown SVG type for path: ${options.request.url}`);
      }
    },
  };

  async function generateInfoSVG(): Promise<string> {
    const template = await loadSVGTemplate("info", theme);
    const settings = settingsRepo(options);
    const weather = weatherService(options);
    const crypto = cryptoService(options);
    const currentInfo = await settings.getPersonalInfo();

    const [cryptoPrices, personalWeather] = await Promise.all([
      crypto.fetch(),
      weather.getFromCoordinates(
        currentInfo.latitude,
        currentInfo.longitude,
        currentInfo.country,
      ),
    ]);

    const cryptoUpdatedInUTC = new Date(
      cryptoPrices.lastUpdated,
    ).toLocaleString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric", 
      hour: "2-digit",
      minute: "2-digit",
    });

    let svgContent = template
      .replace("{location}", currentInfo.location)
      .replace("{country}", currentInfo.country)
      .replace("{weather_emoji}", personalWeather.emoji)
      .replace("{weather_condition}", personalWeather.condition)
      .replace("{weather_temperature}", personalWeather.temperature)
      .replace("{crypto_btc}", `${cryptoPrices.btc.toLocaleString()} USD`)
      .replace("{crypto_eth}", `${cryptoPrices.eth.toLocaleString()} USD`)
      .replace("{crypto_updated}", `Last Updated: ${cryptoUpdatedInUTC} UTC`)
      .replace("{bio_line1}", currentInfo.bio_line1)
      .replace("{bio_line2}", currentInfo.bio_line2)
      .replace("{bio_line3}", currentInfo.bio_line3)
      .replace("{email}", currentInfo.email);

    if (cf.latitude || cf.longitude || cf.country) {
      const userWeather = await weather.getFromRequest(options.request);
      svgContent = svgContent
        .replace(
          "{user_distance}",
          calculateAndFormatDistance(
            currentInfo.latitude,
            currentInfo.longitude,
            Number(cf.latitude),
            Number(cf.longitude),
            String(cf.country),
          ),
        )
        .replace("{user_location}", `${cf.city}, ${cf.country}`)
        .replace("{user_weather_emoji}", userWeather.emoji)
        .replace("{user_weather_condition}", userWeather.condition)
        .replace("{user_weather_temperature}", userWeather.temperature);
    } else {
      // Remove the user location section if no data
      svgContent = svgContent.replace(
        /<g[^>]*class="user-location"[^>]*>[\s\S]*?<\/g>/g,
        "",
      );
    }

    return svgContent;
  }

  async function generateTamagitchiSVG(): Promise<string> {
    const template = await loadSVGTemplate("tamagitchi", theme);
    let colo = options.request.cf?.colo as string;

    if (!colo) {
      console.log("Colo not set, defaulting to DFW (Dallas)");
      colo = "DFW";
    }

    const tamagitchi = await tamagitchiRepo(options.db).findOrCreate({ colo });

    // Generate AI art for this tamagitchi
    let tamagotchiArt = "";
    try {
      const artService = aiArt(options);

      // Get layered images (background + tamagotchi) properly sized for our display area
      tamagotchiArt = await artService.generateLayeredImageElements(360, 200);
    } catch (error) {
      console.error("Failed to generate AI art:", error);
      // Fallback to a simple placeholder
      tamagotchiArt = `<rect width="360" height="200" fill="${theme === "dark" ? "#21262d" : "#f6f8fa"}" rx="8"/>
      <text x="180" y="100" text-anchor="middle" font-family="system-ui" font-size="14" fill="${theme === "dark" ? "#8b949e" : "#656d76"}">🎮 ${tamagitchi.name}</text>
      <text x="180" y="120" text-anchor="middle" font-family="system-ui" font-size="12" fill="${theme === "dark" ? "#8b949e" : "#656d76"}">Level ${tamagitchi.level} • ${tamagitchi.state}</text>`;
    }

    // Format timestamps
    const lastInteraction = tamagitchi.lastFed
      ? new Date(tamagitchi.lastFed).toLocaleDateString()
      : "Never";
    const currentState = `${tamagitchi.state} • Lvl ${tamagitchi.level}`;

    return template
      .replace("{tamagotchi_name}", tamagitchi.name)
      .replace("{mood_state}", getMoodEmoji(tamagitchi.state))
      .replace("{tamagotchi_svg}", tamagotchiArt)
      .replace("{last_interaction}", lastInteraction)
      .replace("{current_state}", currentState);
  }

  function getMoodEmoji(state: string): string {
    switch (state.toLowerCase()) {
      case "happy":
        return "😊";
      case "hungry":
        return "😋";
      case "sleepy":
        return "😴";
      case "sick":
        return "🤒";
      case "dead":
        return "💀";
      case "bored":
        return "😐";
      default:
        return "🎮";
    }
  }

  async function generateLeaderboardSVG(): Promise<string> {
    const template = await loadSVGTemplate("leaderboard", theme);
    const results = await tamagitchiRepo(options.db).getLeaderboard(10);

    const leaderboard = results.map((result, index) => ({
      ...result,
      rank: index + 1,
    }));

    const leaderboardHTML = leaderboard
      .map(
        (entry, index) =>
          `<text y="${100 + index * 30}" x="20">${entry.rank}. ${entry.name} (${entry.colo}) - Lvl ${entry.level}</text>`,
      )
      .join("\n");

    return template.replace("{{LEADERBOARD_ENTRIES}}", leaderboardHTML);
  }

  async function generateFeedSVG(): Promise<string> {
    const template = await loadSVGTemplate("feed", theme);
    console.info("Loading activity...");
    const feed = await activityRepo(options.db).getRecentFeed(5);
    console.info("Activity Loaded", feed);

    // Fill up to 5 activities, with empty placeholders if needed
    const activities = Array.from({ length: 5 }, (_, index) => {
      const activity = feed[index];
      if (!activity) {
        return {
          message: "",
          time_ago: "",
          emoji: "",
          avatar_url: "",
        };
      }

      return {
        message: activity.message || "",
        time_ago: formatTimeAgo(activity.timestamp),
        emoji: getActivityEmoji(activity.activityType || ""),
        avatar_url: `https://github.com/${activity.githubUsername}.png?size=32`,
      };
    });

    let svgContent = template;
    activities.forEach((activity, index) => {
      const activityNum = index + 1;
      svgContent = svgContent
        .replace(`{activity${activityNum}_message}`, activity.message)
        .replace(`{activity${activityNum}_time_ago}`, activity.time_ago)
        .replace(`{activity${activityNum}_emoji}`, activity.emoji)
        .replace(`{activity${activityNum}_avatar_url}`, activity.avatar_url);
    });

    // Add footer with current timestamp
    const lastUpdate = new Date().toLocaleString("en-US", {
      timeZone: "UTC",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    svgContent = svgContent.replace("{last_update}", lastUpdate + " UTC");

    return svgContent;
  }

  async function generateRepoSVG(): Promise<string> {
    const template = await loadSVGTemplate("repo", theme);
    // Repo SVG is static, just return the template
    return template;
  }

  function formatTimeAgo(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  function getActivityEmoji(action: string): string {
    switch (action.toLowerCase()) {
      case "fed":
        return "🍎";
      case "played":
        return "🎮";
      case "petted":
        return "🤗";
      default:
        return "✨";
    }
  }
};

/**
 * Extracts the type from our path name
 * @example /a/leaderboard.svg -> leaderboard
 * @throws Error if the type cannot be determined
 */
const getSVGTypeFromPath = (pathname: string): SVGTypes => {
  // Extract SVG type from paths like /a/leaderboard.svg -> leaderboard
  const maybeSvgType = pathname.replace(/^\/a\/([^.]+)\.svg$/, "$1");

  if (isSVGType(maybeSvgType)) return maybeSvgType;
  throw new Error(`Cannot determine SVG type from pathname: ${pathname}`);
};

const getTheme = (url: URL): "dark" | "light" =>
  url.searchParams.get("t") === "1" ? "dark" : "light";

const loadSVGTemplate = async (
  type: SVGTypes,
  theme: "dark" | "light",
): Promise<string> => {
  const response = await fetch(
    `https://raw.githubusercontent.com/jordanskomer/jordanskomer/main/.github/assets/${type}-${theme}.svg`,
  );
  return response.text();
};
