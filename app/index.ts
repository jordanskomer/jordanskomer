import { cacheService } from "@/app/services/cache";

export { TamagitchiDO } from "./tamagitchi-do";

export default {
  async fetch(req, env, _ctx): Promise<Response> {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      // Handle SVG generation using RPC with caching
      if (path.startsWith("/a/")) {
        const cache = cacheService({ env, request: req });

        const svgContent = await cache.retrieveAsset(async () => {
          const id: DurableObjectId =
            env.TAMAGITCHI_DO.idFromName("tamagitchi-manager");
          const stub = env.TAMAGITCHI_DO.get(id);
          return await stub.generateSVG(req);
        });

        return new Response(svgContent, {
          headers: {
            "Content-Type": "image/svg+xml",
          },
        });
      }

      // Handle interactions using RPC
      // if (method === "POST" && path === "/interaction") {
      //   const id: DurableObjectId =
      //     env.TAMAGITCHI_DO.idFromName("tamagitchi-manager");
      //   const stub = env.TAMAGITCHI_DO.get(id);
      //   const result = await stub.interact(req);
      //   return Response.json(result);
      // }

      return new Response("Not found", { status: 404 });
    } catch (error) {
      console.error("Worker error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },

  async scheduled(_event, env, _ctx): Promise<void> {
    // CRON trigger for tamagitchi degradation using RPC
    const id: DurableObjectId =
      env.TAMAGITCHI_DO.idFromName("tamagitchi-manager");
    const stub = env.TAMAGITCHI_DO.get(id);

    const result = await stub.degrade();
    console.log("CRON degradation completed:", result);
  },
} satisfies ExportedHandler<Env>;
