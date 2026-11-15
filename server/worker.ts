import assets from "../.sites-runtime/assets.json";
import { api, Env } from "./service";
const files = assets as Record<string, { body: string; type: string }>;
export default {
  async fetch(req: Request, env: Env) {
    const u = new URL(req.url);
    if (u.pathname.startsWith("/api/")) return api(req, env);
    if (!["GET", "HEAD"].includes(req.method))
      return new Response("Method not allowed", { status: 405 });
    let path;
    try {
      path = decodeURIComponent(u.pathname);
    } catch {
      return new Response("Bad request", { status: 400 });
    }
    const f =
      files[path] ??
      files[path.endsWith("/") ? path + "index.html" : path + ".html"];
    if (!f) return new Response("Not found", { status: 404 });
    return new Response(
      req.method === "HEAD"
        ? null
        : Uint8Array.from(atob(f.body), (c) => c.charCodeAt(0)),
      {
        headers: {
          "Content-Type": f.type,
          "Cache-Control": path.startsWith("/_next/")
            ? "public,max-age=31536000,immutable"
            : "no-cache",
          "X-Content-Type-Options": "nosniff",
          "Referrer-Policy": "strict-origin-when-cross-origin",
        },
      },
    );
  },
};
