export type CacheOptions = {
  env: Env;
  request: Request;
};

export type CacheKeyData = Record<string, string>;

const generateCacheKey = (data: CacheKeyData): string => {
  return Object.entries(data)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");
};

const createCacheUrl = (cacheKey: string, originalUrl: string): string => {
  // Cloudflare Workers cache requires a proper URL with the same origin or a custom domain
  const url = new URL(originalUrl);
  // Use a unique pathname that won't conflict with real routes
  url.pathname = `/cache/${encodeURIComponent(cacheKey)}`;
  url.search = "";
  return url.toString();
};

export function cacheService({ env, request }: CacheOptions) {
  const generatePersonalInfoHash = async (): Promise<string> => {
    try {
      const personalInfo = await env.KV_SETTINGS.get("current_info");
      if (!personalInfo) return "default";

      const hash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(personalInfo),
      );

      return Array.from(new Uint8Array(hash))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
        .substring(0, 8);
    } catch (error) {
      console.log("Failed to generate personal info hash:", error);
      return "default";
    }
  };

  return {
    retrieveAsset: async (
      generator: () => Promise<string>,
    ): Promise<string> => {
      const url = new URL(request.url);
      const cf = request.cf;

      // Extract all cache key data from request
      // Handle full URL with query parameters properly
      const fullUrl = url.pathname + url.search;
      const cacheKeyData: CacheKeyData = {
        url: fullUrl,
        userLocation: `${cf?.city || "unknown"}_${cf?.country || "unknown"}_${cf?.colo || "unknown"}`,
        personalInfoHash: await generatePersonalInfoHash(),
      };

      const cacheKey = generateCacheKey(cacheKeyData);
      const cacheUrl = createCacheUrl(cacheKey, request.url);

      // Try to get from cache first
      const cache = caches.default;
      const cachedResponse = await cache.match(cacheUrl);

      if (cachedResponse && env.F_CACHE === "1") {
        console.log("Cache hit");
        return await cachedResponse.text();
      }

      // Cache miss - generate new content
      console.log("Cache miss");
      const content = await generator();

      // Determine cache duration based on SVG type
      const isFeed = url.pathname.includes("/feed");
      const maxAge = isFeed ? 300 : 3600; // 5 minutes for feed, 1 hour for others

      // Store in cache with proper headers for Cloudflare Workers cache
      const response = new Response(content, {
        headers: {
          "Content-Type": "image/svg+xml",
          "Cache-Control": `public, max-age=${maxAge}`,
          Expires: new Date(Date.now() + maxAge * 1000).toUTCString(),
        },
      });

      await cache.put(cacheUrl, response);

      return content;
    },

    generatePersonalInfoHash,
  };
}

export type CacheService = ReturnType<typeof cacheService>;
