import {
  getCurrentTimeOfDay,
  TIME_CONFIGS,
  type TimeOfDay,
} from "@/lib/time-of-day";
import { weatherService } from "./weather";

interface AiArtOptions {
  request: Request;
  env: Env;
}

interface GeneratedArt {
  tamagotchi: string; // base64 image
  background: string; // base64 image
  combinedSvg: string; // SVG with tamagotchi layered on background
  metadata: {
    colo: string;
    weather: string;
    timeOfDay: string;
    timestamp: number;
  };
}

export const aiArt = (options: AiArtOptions) => {
  return {
    async generateTamagotchiArt(): Promise<string> {
      const art = await generateAiArt();
      return art.tamagotchi;
    },

    async generateBackgroundArt(): Promise<string> {
      const art = await generateAiArt();
      return art.background;
    },

    async generateCombinedSvg(): Promise<string> {
      const art = await generateAiArt();
      return art.combinedSvg;
    },

    async generateTamagotchiImageElement(
      width = 360,
      height = 200,
    ): Promise<string> {
      const art = await generateAiArt();
      // Return an SVG image element that can be embedded in other SVGs
      return `<image href="data:image/png;base64,${art.tamagotchi}" width="${width}" height="${height}" x="0" y="0" preserveAspectRatio="xMidYMid meet"/>`;
    },

    async generateBackgroundImageElement(
      width = 360,
      height = 200,
    ): Promise<string> {
      const art = await generateAiArt();
      // Return an SVG image element that can be embedded in other SVGs
      return `<image href="data:image/png;base64,${art.background}" width="${width}" height="${height}" x="0" y="0" preserveAspectRatio="xMidYMid meet"/>`;
    },

    async generateLayeredImageElements(
      width = 360,
      height = 200,
    ): Promise<string> {
      const art = await generateAiArt();
      // Return both images as layered SVG elements
      return `<image href="data:image/png;base64,${art.background}" width="${width}" height="${height}" x="0" y="0" preserveAspectRatio="xMidYMid meet"/>
      <image href="data:image/png;base64,${art.tamagotchi}" width="${Math.floor(width * 0.6)}" height="${Math.floor(height * 0.8)}" x="${Math.floor(width * 0.2)}" y="${Math.floor(height * 0.1)}" preserveAspectRatio="xMidYMid meet" opacity="0.95"/>`;
    },

    async generateFullArt(): Promise<GeneratedArt> {
      return generateAiArt();
    },
  };

  async function generateAiArt(): Promise<GeneratedArt> {
    const { AI, R2_ART } = options.env;

    // Get colo and weather data
    const colo = (options.request.cf.colo as string) || "DFW";
    const timeOfDay = getCurrentTimeOfDay();
    const weatherData = await weatherService(options).getFromRequest(
      options.request,
    );
    const cacheKey = generateCacheKey(colo, weatherData.condition, timeOfDay);

    // Check if we already have cached art
    const cached = await getCachedArt(R2_ART, cacheKey);
    if (cached) {
      return cached;
    }

    // Generate new art
    const art = await generateNewArt(AI, colo, weatherData.emoji, timeOfDay);

    // Cache the result
    await cacheArt(R2_ART, cacheKey, art);

    return art;
  }

  function generateCacheKey(
    colo: string,
    weather: string,
    timeOfDay: string,
  ): string {
    return `art_${colo}_${weather}_${timeOfDay}`;
  }

  async function getCachedArt(
    r2: R2Bucket,
    key: string,
  ): Promise<GeneratedArt | null> {
    try {
      const object = await r2.get(key);
      if (object) {
        const data = (await object.json()) as GeneratedArt;
        return data;
      }
    } catch (error) {
      console.error("Failed to get cached art:", error);
    }
    return null;
  }

  async function cacheArt(
    r2: R2Bucket,
    key: string,
    art: GeneratedArt,
  ): Promise<void> {
    try {
      await r2.put(key, JSON.stringify(art), {
        httpMetadata: {
          contentType: "application/json",
        },
      });
    } catch (error) {
      console.error("Failed to cache art:", error);
    }
  }

  async function generateNewArt(
    ai: Ai,
    colo: string,
    weather: string,
    timeOfDay: TimeOfDay,
  ): Promise<GeneratedArt> {
    // Generate prompts
    const tamagotchiPrompt = generateTamagotchiPrompt(
      colo,
      "happy",
      null,
      null,
      weather,
    );
    const backgroundPrompt = generateBackgroundPrompt(colo, weather, timeOfDay);

    // Run AI generation in parallel for better performance
    const [tamagotchiResponse, backgroundResponse] = await Promise.all([
      ai.run("@cf/black-forest-labs/flux-1-schnell", {
        prompt: tamagotchiPrompt,
        num_steps: 4,
      }) as Promise<{ image: string }>,
      ai.run("@cf/black-forest-labs/flux-1-schnell", {
        prompt: backgroundPrompt,
        num_steps: 4,
      }) as Promise<{ image: string }>,
    ]);

    // Combine images into SVG
    const combinedSvg = createCombinedSvg(
      backgroundResponse.image,
      tamagotchiResponse.image,
      { colo, weather, timeOfDay },
    );

    return {
      tamagotchi: tamagotchiResponse.image,
      background: backgroundResponse.image,
      combinedSvg,
      metadata: {
        colo,
        weather,
        timeOfDay,
        timestamp: Date.now(),
      },
    };
  }

  function createCombinedSvg(
    backgroundBase64: string,
    tamagotchiBase64: string,
    metadata: { colo: string; weather: string; timeOfDay: string },
  ): string {
    // Create SVG that layers tamagotchi over background
    // Background takes full canvas, tamagotchi is positioned in foreground
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="512" height="512" viewBox="0 0 512 512">
  <!-- Background landscape -->
  <image href="data:image/png;base64,${backgroundBase64}" x="0" y="0" width="512" height="512" preserveAspectRatio="xMidYMid slice"/>

  <!-- Tamagotchi character positioned in foreground -->
  <image href="data:image/png;base64,${tamagotchiBase64}" x="128" y="200" width="256" height="256" opacity="0.95" preserveAspectRatio="xMidYMid meet"/>

  <!-- Metadata as hidden comment -->
  <!-- Generated for ${metadata.colo} - ${metadata.weather} - ${metadata.timeOfDay} -->
</svg>`;
  }
};

// Comprehensive Cloudflare Colo Configurations for Tamagotchis
export const COLO_CONFIGS = {
  // North America - West
  LAX: {
    region: "Los Angeles",
    country: "US",
    biome: "desert",
    culture: "californian",
    colors: ["#ff6b35", "#f7931e"],
    accessories: ["🕶️", "🏄‍♂️", "🌮"],
  },
  SFO: {
    region: "San Francisco",
    country: "US",
    biome: "coastal",
    culture: "tech",
    colors: ["#4ecdc4", "#44a08d"],
    accessories: ["💻", "🌁", "☕"],
  },
  SEA: {
    region: "Seattle",
    country: "US",
    biome: "forest",
    culture: "pacific_northwest",
    colors: ["#2d5a27", "#4caf50"],
    accessories: ["🌲", "☔", "☕"],
  },
  PDX: {
    region: "Portland",
    country: "US",
    biome: "urban_forest",
    culture: "hipster",
    colors: ["#8bc34a", "#689f38"],
    accessories: ["🚲", "🍺", "📚"],
  },
  SJC: {
    region: "San Jose",
    country: "US",
    biome: "tech_valley",
    culture: "silicon_valley",
    colors: ["#2196f3", "#1976d2"],
    accessories: ["⚡", "🤖", "💎"],
  },

  // North America - Central
  DEN: {
    region: "Denver",
    country: "US",
    biome: "mountain",
    culture: "outdoor",
    colors: ["#795548", "#5d4037"],
    accessories: ["🏔️", "🎿", "🥾"],
  },
  DFW: {
    region: "Dallas",
    country: "US",
    biome: "plains",
    culture: "texan",
    colors: ["#ff9800", "#f57c00"],
    accessories: ["🤠", "🐴", "🥩"],
  },
  ORD: {
    region: "Chicago",
    country: "US",
    biome: "urban",
    culture: "midwest",
    colors: ["#3f51b5", "#303f9f"],
    accessories: ["🏢", "🌭", "🎷"],
  },
  MSP: {
    region: "Minneapolis",
    country: "US",
    biome: "lakes",
    culture: "northern",
    colors: ["#00bcd4", "#0097a7"],
    accessories: ["🧊", "🎣", "❄️"],
  },

  // North America - East
  ATL: {
    region: "Atlanta",
    country: "US",
    biome: "southern",
    culture: "peach_state",
    colors: ["#ff7043", "#f4511e"],
    accessories: ["🍑", "🎵", "🏛️"],
  },
  MIA: {
    region: "Miami",
    country: "US",
    biome: "tropical",
    culture: "latin",
    colors: ["#e91e63", "#c2185b"],
    accessories: ["🌴", "🏖️", "💃"],
  },
  IAD: {
    region: "Washington DC",
    country: "US",
    biome: "metropolitan",
    culture: "political",
    colors: ["#607d8b", "#455a64"],
    accessories: ["🏛️", "📜", "🎩"],
  },
  JFK: {
    region: "New York",
    country: "US",
    biome: "urban",
    culture: "cosmopolitan",
    colors: ["#424242", "#212121"],
    accessories: ["🗽", "🍕", "🚕"],
  },
  BOS: {
    region: "Boston",
    country: "US",
    biome: "coastal",
    culture: "academic",
    colors: ["#1565c0", "#0d47a1"],
    accessories: ["⚓", "📚", "☕"],
  },

  // Canada
  YYZ: {
    region: "Toronto",
    country: "CA",
    biome: "urban_lakes",
    culture: "canadian",
    colors: ["#d32f2f", "#b71c1c"],
    accessories: ["🍁", "🏒", "🧊"],
  },
  YVR: {
    region: "Vancouver",
    country: "CA",
    biome: "mountain_coast",
    culture: "canadian_west",
    colors: ["#388e3c", "#1b5e20"],
    accessories: ["🏔️", "🌲", "🍁"],
  },

  // Europe - West
  LHR: {
    region: "London",
    country: "GB",
    biome: "urban",
    culture: "british",
    colors: ["#8bc34a", "#689f38"],
    accessories: ["🎩", "☔", "🫖"],
  },
  CDG: {
    region: "Paris",
    country: "FR",
    biome: "urban",
    culture: "french",
    colors: ["#3f51b5", "#303f9f"],
    accessories: ["🗼", "🥐", "🎨"],
  },
  AMS: {
    region: "Amsterdam",
    country: "NL",
    biome: "urban_water",
    culture: "dutch",
    colors: ["#ff9800", "#f57c00"],
    accessories: ["🚲", "🌷", "🧀"],
  },
  FRA: {
    region: "Frankfurt",
    country: "DE",
    biome: "urban",
    culture: "german",
    colors: ["#424242", "#212121"],
    accessories: ["🏦", "🍺", "🥨"],
  },
  ZUR: {
    region: "Zurich",
    country: "CH",
    biome: "alpine",
    culture: "swiss",
    colors: ["#f44336", "#d32f2f"],
    accessories: ["🏔️", "⌚", "🧀"],
  },

  // Europe - South
  MAD: {
    region: "Madrid",
    country: "ES",
    biome: "mediterranean",
    culture: "spanish",
    colors: ["#ff5722", "#d84315"],
    accessories: ["☀️", "🥘", "💃"],
  },
  BCN: {
    region: "Barcelona",
    country: "ES",
    biome: "coastal",
    culture: "catalan",
    colors: ["#2196f3", "#1976d2"],
    accessories: ["🏖️", "🏛️", "🎨"],
  },
  MXP: {
    region: "Milan",
    country: "IT",
    biome: "urban",
    culture: "italian",
    colors: ["#4caf50", "#388e3c"],
    accessories: ["👗", "☕", "🍝"],
  },
  FCO: {
    region: "Rome",
    country: "IT",
    biome: "historic",
    culture: "roman",
    colors: ["#ff9800", "#f57c00"],
    accessories: ["🏛️", "🍕", "🍷"],
  },

  // Europe - North
  ARN: {
    region: "Stockholm",
    country: "SE",
    biome: "nordic",
    culture: "scandinavian",
    colors: ["#00bcd4", "#0097a7"],
    accessories: ["❄️", "🛶", "🐟"],
  },
  CPH: {
    region: "Copenhagen",
    country: "DK",
    biome: "nordic_coast",
    culture: "danish",
    colors: ["#f44336", "#d32f2f"],
    accessories: ["🚲", "🧜‍♀️", "🥯"],
  },
  HEL: {
    region: "Helsinki",
    country: "FI",
    biome: "nordic",
    culture: "finnish",
    colors: ["#2196f3", "#1976d2"],
    accessories: ["🧊", "🌲", "🦌"],
  },

  // Europe - East
  WAW: {
    region: "Warsaw",
    country: "PL",
    biome: "continental",
    culture: "polish",
    colors: ["#d32f2f", "#b71c1c"],
    accessories: ["🏰", "🥟", "📚"],
  },
  PRG: {
    region: "Prague",
    country: "CZ",
    biome: "historic",
    culture: "czech",
    colors: ["#3f51b5", "#303f9f"],
    accessories: ["🏰", "🍺", "🎭"],
  },
  BUD: {
    region: "Budapest",
    country: "HU",
    biome: "riverine",
    culture: "hungarian",
    colors: ["#4caf50", "#388e3c"],
    accessories: ["🏛️", "♨️", "🎻"],
  },

  // Asia - East
  NRT: {
    region: "Tokyo",
    country: "JP",
    biome: "urban_tech",
    culture: "japanese",
    colors: ["#e91e63", "#c2185b"],
    accessories: ["🌸", "🍣", "🎌"],
  },
  KIX: {
    region: "Osaka",
    country: "JP",
    biome: "urban",
    culture: "kansai",
    colors: ["#ff9800", "#f57c00"],
    accessories: ["🍜", "🎪", "🏯"],
  },
  ICN: {
    region: "Seoul",
    country: "KR",
    biome: "urban_mountain",
    culture: "korean",
    colors: ["#9c27b0", "#7b1fa2"],
    accessories: ["🎮", "🌶️", "📱"],
  },
  SHA: {
    region: "Shanghai",
    country: "CN",
    biome: "megacity",
    culture: "chinese",
    colors: ["#f44336", "#d32f2f"],
    accessories: ["🏢", "🥟", "🐉"],
  },
  HKG: {
    region: "Hong Kong",
    country: "HK",
    biome: "urban_island",
    culture: "cantonese",
    colors: ["#ff5722", "#d84315"],
    accessories: ["🏙️", "🥢", "⛵"],
  },
  TPE: {
    region: "Taipei",
    country: "TW",
    biome: "subtropical",
    culture: "taiwanese",
    colors: ["#4caf50", "#388e3c"],
    accessories: ["🌴", "🧋", "🎭"],
  },

  // Asia - Southeast
  SIN: {
    region: "Singapore",
    country: "SG",
    biome: "tropical_city",
    culture: "multicultural",
    colors: ["#00bcd4", "#0097a7"],
    accessories: ["🌺", "🦁", "🏙️"],
  },
  KUL: {
    region: "Kuala Lumpur",
    country: "MY",
    biome: "tropical",
    culture: "malaysian",
    colors: ["#ff9800", "#f57c00"],
    accessories: ["🌴", "🏗️", "🥥"],
  },
  BKK: {
    region: "Bangkok",
    country: "TH",
    biome: "tropical",
    culture: "thai",
    colors: ["#ff5722", "#d84315"],
    accessories: ["🏛️", "🌶️", "🐘"],
  },
  CGK: {
    region: "Jakarta",
    country: "ID",
    biome: "tropical",
    culture: "indonesian",
    colors: ["#f44336", "#d32f2f"],
    accessories: ["🌺", "🌋", "🏖️"],
  },
  MNL: {
    region: "Manila",
    country: "PH",
    biome: "tropical_island",
    culture: "filipino",
    colors: ["#2196f3", "#1976d2"],
    accessories: ["🏝️", "🥥", "🐚"],
  },

  // Asia - South
  BOM: {
    region: "Mumbai",
    country: "IN",
    biome: "urban_coastal",
    culture: "indian",
    colors: ["#ff9800", "#f57c00"],
    accessories: ["🏛️", "🌶️", "🎭"],
  },
  DEL: {
    region: "Delhi",
    country: "IN",
    biome: "urban",
    culture: "north_indian",
    colors: ["#e91e63", "#c2185b"],
    accessories: ["🕌", "🥘", "🐘"],
  },
  BLR: {
    region: "Bangalore",
    country: "IN",
    biome: "tech_city",
    culture: "south_indian",
    colors: ["#4caf50", "#388e3c"],
    accessories: ["💻", "☕", "🌸"],
  },

  // Oceania
  SYD: {
    region: "Sydney",
    country: "AU",
    biome: "coastal",
    culture: "australian",
    colors: ["#2196f3", "#1976d2"],
    accessories: ["🏄‍♂️", "🦘", "🏖️"],
  },
  MEL: {
    region: "Melbourne",
    country: "AU",
    biome: "urban",
    culture: "victorian",
    colors: ["#424242", "#212121"],
    accessories: ["☕", "🎨", "🏏"],
  },
  PER: {
    region: "Perth",
    country: "AU",
    biome: "coastal_desert",
    culture: "western_australian",
    colors: ["#ff5722", "#d84315"],
    accessories: ["🌅", "🦘", "⛵"],
  },
  AKL: {
    region: "Auckland",
    country: "NZ",
    biome: "island",
    culture: "kiwi",
    colors: ["#4caf50", "#388e3c"],
    accessories: ["🐑", "🥝", "⛵"],
  },

  // South America
  GRU: {
    region: "São Paulo",
    country: "BR",
    biome: "urban",
    culture: "brazilian",
    colors: ["#4caf50", "#388e3c"],
    accessories: ["⚽", "☕", "🎭"],
  },
  GIG: {
    region: "Rio de Janeiro",
    country: "BR",
    biome: "coastal_mountain",
    culture: "carioca",
    colors: ["#ffeb3b", "#f57f17"],
    accessories: ["🏖️", "⚽", "💃"],
  },
  SCL: {
    region: "Santiago",
    country: "CL",
    biome: "mountain_valley",
    culture: "chilean",
    colors: ["#795548", "#5d4037"],
    accessories: ["🏔️", "🍷", "🌶️"],
  },
  BOG: {
    region: "Bogotá",
    country: "CO",
    biome: "highland",
    culture: "colombian",
    colors: ["#ffeb3b", "#f57f17"],
    accessories: ["☕", "🌸", "🎵"],
  },

  // Africa
  JNB: {
    region: "Johannesburg",
    country: "ZA",
    biome: "highveld",
    culture: "south_african",
    colors: ["#ff9800", "#f57c00"],
    accessories: ["🦁", "💎", "🌅"],
  },
  CPT: {
    region: "Cape Town",
    country: "ZA",
    biome: "coastal_mountain",
    culture: "cape",
    colors: ["#2196f3", "#1976d2"],
    accessories: ["🏔️", "🐧", "🍷"],
  },
  CAI: {
    region: "Cairo",
    country: "EG",
    biome: "desert",
    culture: "egyptian",
    colors: ["#ff9800", "#f57c00"],
    accessories: ["🏛️", "🐪", "☀️"],
  },

  // Middle East
  DXB: {
    region: "Dubai",
    country: "AE",
    biome: "desert_city",
    culture: "emirati",
    colors: ["#ffeb3b", "#f57f17"],
    accessories: ["🏗️", "🐪", "💎"],
  },
  DOH: {
    region: "Doha",
    country: "QA",
    biome: "desert_coast",
    culture: "qatari",
    colors: ["#795548", "#5d4037"],
    accessories: ["🏙️", "⚽", "🕌"],
  },
};

// State configurations
export const STATE_CONFIGS = {
  happy: {
    expression: "wide smile, bright sparkling eyes",
    posture: "bouncing joyfully, arms raised in celebration",
    effects: "sparkles and hearts floating around",
    colors: "bright, vibrant colors",
  },
  hungry: {
    expression: "sad droopy eyes, small frown",
    posture: "holding stomach, slightly hunched over",
    effects: "empty food bowl, stomach growling symbols",
    colors: "slightly muted colors",
  },
  sleepy: {
    expression: "half-closed drowsy eyes, small yawn",
    posture: "swaying sleepily, rubbing eyes",
    effects: "Z's floating above head, pillow nearby",
    colors: "soft, dreamy colors",
  },
  sick: {
    expression: "watery eyes, thermometer in mouth",
    posture: "weak stance, holding head",
    effects: "medicine bottle, tissue, green sick aura",
    colors: "pale, sickly colors",
  },
  dead: {
    expression: "X eyes, tongue sticking out",
    posture: "lying on back, arms and legs up",
    effects: "angel halo, gravestone in background",
    colors: "grayscale, ghostly pale",
  },
  bored: {
    expression: "half-lidded eyes, neutral mouth",
    posture: "slumped shoulders, one hand on hip",
    effects: "clock, yawn bubble, scattered toys",
    colors: "dull, desaturated colors",
  },
};

// Activity configurations
export const ACTIVITY_CONFIGS = {
  "code-challenge": {
    props: "laptop computer, code symbols, coffee mug",
    background: "tech workspace with monitors",
    effects: "floating code snippets, terminal windows",
    mood: "focused and determined",
  },
  music: {
    props: "headphones, musical notes, instrument",
    background: "sound studio or concert stage",
    effects: "musical notes floating, sound waves",
    mood: "rhythmic and energetic",
  },
  exercise: {
    props: "weights, yoga mat, sweat droplets",
    background: "gym or outdoor exercise area",
    effects: "motion lines, energy bursts",
    mood: "strong and active",
  },
  puzzle: {
    props: "puzzle pieces, brain symbol, thinking bubble",
    background: "quiet study room",
    effects: "lightbulb moments, question marks",
    mood: "contemplative and clever",
  },
  creative: {
    props: "paintbrush, easel, colorful palette",
    background: "art studio with canvases",
    effects: "paint splatters, inspiration sparkles",
    mood: "imaginative and artistic",
  },
};

// Food configurations
export const FOOD_CONFIGS = {
  pizza: {
    visual: "triangular pizza slice with melted cheese",
    effects: "steam rising, delicious aroma lines",
    satisfaction: "high energy boost",
  },
  ramen: {
    visual: "steaming bowl with chopsticks",
    effects: "hot steam, slurping sounds",
    satisfaction: "warm comfort feeling",
  },
  sushi: {
    visual: "elegant sushi roll with wasabi",
    effects: "refined presentation, chopsticks",
    satisfaction: "sophisticated taste",
  },
  coffee: {
    visual: "steaming coffee cup with foam art",
    effects: "energizing steam, caffeine boost",
    satisfaction: "alertness and focus",
  },
  apple: {
    visual: "fresh red apple with shine",
    effects: "healthy glow, vitamin sparkles",
    satisfaction: "natural energy and health",
  },
};

// Weather configurations
export const WEATHER_CONFIGS = {
  "☀️": {
    name: "sunny",
    lighting: "bright golden sunlight",
    atmosphere: "clear and cheerful",
  },
  "☁️": {
    name: "cloudy",
    lighting: "soft diffused light",
    atmosphere: "calm and peaceful",
  },
  "🌧️": {
    name: "rainy",
    lighting: "dim overcast light",
    atmosphere: "cozy and wet",
  },
  "❄️": {
    name: "snowy",
    lighting: "bright white reflection",
    atmosphere: "crisp and cold",
  },
  "⛈️": {
    name: "stormy",
    lighting: "dramatic dark clouds",
    atmosphere: "intense and moody",
  },
  "🌫️": {
    name: "foggy",
    lighting: "mysterious misty light",
    atmosphere: "ethereal and mysterious",
  },
  "🌤️": {
    name: "partly_cloudy",
    lighting: "mixed sun and shade",
    atmosphere: "dynamic and changing",
  },
};

// Main prompt generator function
export function generateTamagotchiPrompt(
  colo: string,
  state: string,
  activity: string | null = null,
  food: string | null = null,
  weather = "☀️",
) {
  const coloConfig =
    COLO_CONFIGS[colo as keyof typeof COLO_CONFIGS] || COLO_CONFIGS["LAX"];
  const stateConfig = STATE_CONFIGS[state as keyof typeof STATE_CONFIGS];
  const weatherConfig =
    WEATHER_CONFIGS[weather as keyof typeof WEATHER_CONFIGS];
  const activityConfig = activity
    ? ACTIVITY_CONFIGS[activity as keyof typeof ACTIVITY_CONFIGS]
    : null;
  const foodConfig = food
    ? FOOD_CONFIGS[food as keyof typeof FOOD_CONFIGS]
    : null;

  // Base style prompt
  const baseStyle =
    "pixel art, 8-bit retro style, cute tamagotchi creature, chibi proportions, simple clean design, limited color palette, sharp pixels, no anti-aliasing";

  // Regional characteristics
  const regionalStyle = `${coloConfig.culture} cultural style, inspired by ${coloConfig.region} ${coloConfig.country}`;
  const regionalColors = `color scheme: ${coloConfig.colors.join(", ")}`;
  const regionalAccessories = `wearing ${coloConfig.accessories.join(" or ")}`;

  // State characteristics
  const stateDescription = `${stateConfig.expression}, ${stateConfig.posture}, ${stateConfig.colors}`;
  const stateEffects = stateConfig.effects;

  // Activity additions
  const activityDescription = activityConfig
    ? `engaging in ${activity?.replace("-", " ")}, ${activityConfig.props}, ${activityConfig.mood} expression, ${activityConfig.effects}`
    : "";

  // Food additions
  const foodDescription = foodConfig
    ? `eating ${food}, ${foodConfig.visual}, ${foodConfig.effects}, showing ${foodConfig.satisfaction}`
    : "";

  // Weather integration
  const weatherDescription = `${weatherConfig.lighting}, ${weatherConfig.atmosphere} weather conditions`;

  // Combine all elements
  const promptParts = [
    baseStyle,
    regionalStyle,
    regionalColors,
    regionalAccessories,
    stateDescription,
    stateEffects,
    activityDescription,
    foodDescription,
    weatherDescription,
    "masterpiece pixel art, game sprite quality, centered composition",
  ].filter((part) => part.length > 0);

  return promptParts.join(", ");
}

// Background landscape configurations for Cloudflare colos
export const COLO_LANDSCAPE_CONFIGS = {
  // North America - West Coast
  LAX: {
    biome: "desert",
    terrain: "arid landscape with rocky hills and sand dunes",
    vegetation: "saguaro cacti, desert shrubs, palm trees",
    landmarks: "Hollywood sign silhouette, urban skyline in distance",
    architecture: "modern glass buildings, Spanish colonial influences",
    natural_features: "red rock formations, dry riverbeds, mountain ranges",
  },
  SFO: {
    biome: "coastal_fog",
    terrain: "rolling hills with steep coastal cliffs",
    vegetation: "eucalyptus trees, cypress groves, coastal shrubs",
    landmarks: "Golden Gate Bridge, cable cars, Victorian houses",
    architecture: "Victorian and modern tech buildings, steep streets",
    natural_features: "fog banks, Pacific Ocean, San Francisco Bay",
  },
  SEA: {
    biome: "temperate_rainforest",
    terrain: "dense forest with snow-capped mountains",
    vegetation: "tall evergreen trees, ferns, moss-covered rocks",
    landmarks: "Space Needle, Pike Place Market sign",
    architecture: "modern glass and steel, rustic wooden buildings",
    natural_features: "Puget Sound, Mount Rainier, waterfalls",
  },
  DFW: {
    biome: "southern_plains",
    terrain: "flat grasslands with gentle rolling hills",
    vegetation: "mesquite trees, bluebonnets, cotton fields",
    landmarks: "oil derricks, cowboy statues, rodeo arenas",
    architecture: "ranch-style buildings, modern glass towers",
    natural_features: "wide open skies, prairie winds, sunset horizons",
  },
};

// Generate background landscape prompt
export function generateBackgroundPrompt(
  colo: string,
  weather = "☀️",
  timeOfDay: TimeOfDay = "afternoon",
) {
  const coloConfig =
    COLO_LANDSCAPE_CONFIGS[colo as keyof typeof COLO_LANDSCAPE_CONFIGS] ||
    COLO_LANDSCAPE_CONFIGS["LAX"];
  const weatherConfig =
    WEATHER_CONFIGS[weather as keyof typeof WEATHER_CONFIGS];
  const timeConfig = TIME_CONFIGS[timeOfDay];

  // Base style
  const baseStyle =
    "pixel art landscape, 8-bit retro game background, isometric perspective, limited color palette, sharp pixels, no anti-aliasing, detailed environment";

  // Regional landscape elements
  const terrain = `${coloConfig.terrain}, ${coloConfig.biome} environment`;
  const vegetation = `featuring ${coloConfig.vegetation}`;
  const landmarks = `with ${coloConfig.landmarks} in the composition`;
  const architecture = `${coloConfig.architecture} architectural style`;
  const naturalFeatures = `showcasing ${coloConfig.natural_features}`;

  // Time of day elements
  const timeElements = `${timeConfig.lighting}, ${timeConfig.colors}, ${timeConfig.atmosphere}, ${timeConfig.sun_position}`;

  // Weather elements
  const weatherElements = weatherConfig
    ? `${weatherConfig.lighting}, ${weatherConfig.atmosphere}`
    : "";

  // Technical specifications
  const technical =
    "512x512 resolution, game background quality, layered composition, environmental storytelling, masterpiece pixel art";

  // Combine all elements
  const promptParts = [
    baseStyle,
    terrain,
    vegetation,
    landmarks,
    architecture,
    naturalFeatures,
    timeElements,
    weatherElements,
    technical,
  ];

  return promptParts.join(", ");
}

// Negative prompt for tamagotchis
export const TAMAGOTCHI_NEGATIVE_PROMPT =
  "blurry, realistic, 3d render, photographic, high resolution, detailed textures, smooth gradients, anti-aliased, modern graphics, complex shading, multiple characters, cluttered composition, dark themes, violent content, inappropriate content";

// Comprehensive negative prompt for backgrounds
export const BACKGROUND_NEGATIVE_PROMPT =
  "blurry, anti-aliased, smooth gradients, photorealistic, 3d render, high resolution textures, modern graphics, detailed shading, complex lighting, realistic materials, photographic, cluttered composition, too many details, overcomplicated, busy background, chaotic layout, people, characters, animals, faces, text, logos, signs with readable text, oversaturated colors, neon colors, dark themes, horror elements, gore, violence, first person view, close-up shots, extreme angles, distorted perspective, inappropriate content, commercial logos, copyrighted characters, real world brands, anime style, cartoon style, vector art, oil painting, watercolor, sketch, line art, compression artifacts, noise, grain, artifacts, distortion, glitches";
