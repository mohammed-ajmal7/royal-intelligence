import { z } from "zod";
import { tag, normalize, Snapshot, Battle } from "../src/lib/model";
import { legal, defaults, evaluate, modes } from "../src/lib/engine";
export interface Statement {
  bind(...v: unknown[]): Statement;
  run(): Promise<unknown>;
  all<T>(): Promise<{ results: T[] }>;
  first<T>(): Promise<T | null>;
}
export interface DB {
  prepare(s: string): Statement;
  batch(s: Statement[]): Promise<unknown[]>;
}
export type Env = {
  DB?: DB;
  CLASH_API_TOKEN?: string;
  CLASH_API_BASE?: string;
  APP_ACCESS_KEY?: string;
  DISPLAY_LEVEL_CAP?: string;
};
export class APIError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
const cache = new Map<string, { at: number; value: unknown }>(),
  limits = new Map<string, { at: number; count: number }>();
export function clearCache() {
  cache.clear();
  limits.clear();
}
export async function upstream(
  path: string,
  env: Env,
  fetcher: typeof fetch = fetch,
) {
  if (!env.CLASH_API_TOKEN)
    throw new APIError(
      503,
      "Live API is not configured. Add CLASH_API_TOKEN as a server secret. The demo is separate from your real account.",
    );
  const base = env.CLASH_API_BASE ?? "https://api.clashroyale.com/v1";
  if (
    ![
      "https://api.clashroyale.com/v1",
      "https://proxy.royaleapi.dev/v1",
    ].includes(base)
  )
    throw new APIError(500, "Unsupported API base URL.");
  const url = base + path,
    c = cache.get(url);
  if (c && Date.now() - c.at < (path === "/cards" ? 21600000 : 60000)) return c;
  for (let i = 0; i < 3; i++) {
    let r: Response;
    try {
      r = await fetcher(url, {
        headers: { Authorization: `Bearer ${env.CLASH_API_TOKEN}` },
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      if (i < 2) continue;
      throw new APIError(
        502,
        "Game API unavailable. Your last saved snapshot is preserved.",
      );
    }
    if (r.ok) {
      const result = { at: Date.now(), value: await r.json() };
      if (cache.size >= 150) cache.delete(cache.keys().next().value!);
      cache.set(url, result);
      return result;
    }
    if ((r.status === 429 || r.status >= 500) && i < 2) {
      await new Promise((r) => setTimeout(r, 250 * 2 ** i));
      continue;
    }
    throw new APIError(
      r.status >= 500 ? 502 : r.status,
      r.status === 403
        ? "API access denied. Check the token and IP allowlist."
        : r.status === 404
          ? "Player not found. Check the tag."
          : r.status === 429
            ? "Game API rate limit reached. Try again later."
            : "Game API request failed.",
    );
  }
  throw new APIError(502, "API unavailable.");
}
export async function load(
  tagInput: string,
  env: Env,
  fetcher: typeof fetch = fetch,
) {
  const t = tag(tagInput),
    p = "/players/" + encodeURIComponent(t);
  const result = await Promise.allSettled([
    upstream(p, env, fetcher),
    upstream("/cards", env, fetcher),
    upstream(p + "/battlelog", env, fetcher),
    upstream(p + "/upcomingchests", env, fetcher),
  ]);
  const [a, b, c, d] = result;
  if (a.status === "rejected") throw a.reason;
  if (b.status === "rejected") throw b.reason;
  const cap = Number(env.DISPLAY_LEVEL_CAP ?? 16);
  const s = normalize(
    a.value.value,
    b.value.value,
    c.status === "fulfilled" ? c.value.value : [],
    d.status === "fulfilled" ? d.value.value : {},
    new Date(a.value.at).toISOString(),
    Number.isInteger(cap) && cap > 0 && cap <= 30 ? cap : 16,
  );
  if (c.status === "rejected")
    s.warnings.push("Battle refresh failed. No fresh battles loaded.");
  if (d.status === "rejected")
    s.warnings.push("Upcoming chest refresh failed.");
  return s;
}

/** Fetch a player's public selected deck without requesting their battles or chests. */
export async function scout(
  tagInput: string,
  env: Env,
  fetcher: typeof fetch = fetch,
) {
  const playerTag = tag(tagInput);
  const path = "/players/" + encodeURIComponent(playerTag);
  const [profile, catalog] = await Promise.all([
    upstream(path, env, fetcher),
    upstream("/cards", env, fetcher),
  ]);
  const cap = Number(env.DISPLAY_LEVEL_CAP ?? 16);
  const s = normalize(
    profile.value,
    catalog.value,
    [],
    {},
    new Date(profile.at).toISOString(),
    Number.isInteger(cap) && cap > 0 && cap <= 30 ? cap : 16,
  );
  return { tag: s.tag, name: s.name, trophies: s.trophies, deck: s.deck };
}

/** Public clan and roster information. A roster failure must not hide clan facts. */
export async function clanInfo(
  tagInput: string,
  env: Env,
  fetcher: typeof fetch = fetch,
) {
  const clanTag = tag(tagInput);
  const path = "/clans/" + encodeURIComponent(clanTag);
  const response = await upstream(path, env, fetcher);
  const clan = z.object({
    tag: z.string(),
    name: z.string(),
  }).passthrough().parse(response.value);
  let members: Record<string, unknown>[] = [];
  const warnings: string[] = [];
  try {
    const roster = await upstream(path + "/members", env, fetcher);
    members = z.object({
      items: z.array(z.object({
        tag: z.string(),
        name: z.string(),
      }).passthrough()),
    }).parse(roster.value).items.slice(0, 50);
  } catch {
    warnings.push("Clan roster is temporarily unavailable.");
  }
  return { clan, members, warnings, fetchedAt: new Date(response.at).toISOString() };
}

export async function history(db: DB | undefined, owner: string, t: string) {
  if (!db) return { snapshots: [], battles: [], choices: [] };
  const values = await Promise.all(
    [
      ["ri_snapshots", "observed", 200],
      ["ri_battles", "observed", 1000],
      ["ri_choices", "observed", 100],
    ].map(async ([table, order, n]) =>
      (
        await db
          .prepare(
            `SELECT payload FROM ${table} WHERE owner=? AND tag=? ORDER BY ${order} DESC LIMIT ${n}`,
          )
          .bind(owner, t)
          .all<{ payload: string }>()
      ).results.map((x) => JSON.parse(x.payload)),
    ),
  );
  return {
    snapshots: values[0] as Snapshot[],
    battles: values[1] as Battle[],
    choices: values[2] as {
      id: string;
      observed: string;
      cards: number[];
      mode: string;
      score: number;
    }[],
  };
}
async function ingest(db: DB, owner: string, s: Snapshot) {
  await db.batch([
    db
      .prepare(
        "INSERT OR IGNORE INTO ri_snapshots(owner,tag,id,observed,payload) VALUES(?,?,?,?,?)",
      )
      .bind(owner, s.tag, s.fetchedAt, s.fetchedAt, JSON.stringify(s)),
    ...s.battles.map((b) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO ri_battles(owner,tag,id,observed,payload) VALUES(?,?,?,?,?)",
        )
        .bind(owner, s.tag, b.id, b.time, JSON.stringify(b)),
    ),
  ]);
}
async function throttle(owner: string, env: Env) {
  const at = Math.floor(Date.now() / 60000);
  if (env.DB) {
    const r = await env.DB.prepare(
      "INSERT INTO ri_limits(owner,window,count) VALUES(?,?,1) ON CONFLICT(owner) DO UPDATE SET count=CASE WHEN window=excluded.window THEN count+1 ELSE 1 END,window=excluded.window RETURNING count",
    )
      .bind(owner, at)
      .first<{ count: number }>();
    if (r && r.count > 20)
      throw new APIError(429, "Too many requests. Try again in a minute.");
  } else {
    if (limits.size > 500) limits.clear();
    const l = limits.get(owner);
    if (!l || l.at !== at) limits.set(owner, { at, count: 1 });
    else if (++l.count > 20)
      throw new APIError(429, "Too many requests. Try again in a minute.");
  }
}
export async function api(req: Request, env: Env, fetcher: typeof fetch = fetch) {
  const json = (x: unknown, status = 200) =>
    Response.json(x, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  try {
    const u = new URL(req.url);
    if (u.pathname === "/api/status" && req.method === "GET")
      return json({
        live: !!env.CLASH_API_TOKEN,
        database: !!env.DB,
        version: "0.1.0",
      });
    const owner =
      req.headers.get("oai-authenticated-user-id") ||
      (env.APP_ACCESS_KEY &&
      req.headers.get("x-app-access-key") === env.APP_ACCESS_KEY
        ? "personal"
        : null);
    const forwarded =
      req.headers.get("cf-connecting-ip") ??
      req.headers.get("x-vercel-forwarded-for") ??
      "shared";
    const publicBucket =
      owner ?? "public:" + forwarded.split(",")[0].trim().slice(0, 80);
    if (
      req.method !== "GET" &&
      req.headers.get("origin") &&
      req.headers.get("origin") !== u.origin
    )
      throw new APIError(403, "Cross-origin write denied.");
    if (u.pathname === "/api/player" && req.method === "GET") {
      // Public read-only player lookups; private storage still requires identity.
      await throttle(publicBucket, env);
      const t = tag(u.searchParams.get("tag") ?? "");
      try {
        const s = await load(t, env, fetcher);
        if (owner && env.DB) {
          s.stored = true;
          try {
            await ingest(env.DB, owner, s);
          } catch {
            s.stored = false;
            s.warnings.push(
              "Database save failed; this snapshot is session-only.",
            );
          }
        }
        return json(s);
      } catch (e) {
        if (owner && e instanceof APIError && [429, 502, 503].includes(e.status)) {
          const h = await history(env.DB, owner, t);
          if (h.snapshots[0])
            return json({
              ...h.snapshots[0],
              stale: true,
              warnings: [
                ...h.snapshots[0].warnings,
                e.message,
                "Showing last successful stored snapshot.",
              ],
            });
        }
        throw e;
      }
    }
    if (u.pathname === "/api/scout" && req.method === "GET") {
      await throttle(publicBucket, env);
      return json(await scout(u.searchParams.get("tag") ?? "", env, fetcher));
    }
    if (u.pathname === "/api/clan" && req.method === "GET") {
      await throttle(publicBucket, env);
      return json(await clanInfo(u.searchParams.get("tag") ?? "", env, fetcher));
    }
    if (!owner)
      throw new APIError(
        401,
        "Private history and deck tracking require an authenticated workspace.",
      );
    if (u.pathname === "/api/history") {
      const t = tag(u.searchParams.get("tag") ?? "");
      if (req.method === "GET") return json(await history(env.DB, owner, t));
      if (req.method === "DELETE") {
        if (env.DB)
          await env.DB.batch(
            ["ri_choices", "ri_battles", "ri_snapshots"].map((x) =>
              env
                .DB!.prepare(`DELETE FROM ${x} WHERE owner=? AND tag=?`)
                .bind(owner, t),
            ),
          );
        return json({ deleted: true });
      }
    }
    if (u.pathname === "/api/choices" && req.method === "POST") {
      await throttle(owner, env);
      if (!env.DB) throw new APIError(503, "Persistent storage is required.");
      const body = await req.text();
      if (body.length > 8192) throw new APIError(413, "Request too large.");
      const input = z
          .object({
            tag: z.string(),
            cards: z.array(z.number().int()).length(8),
            mode: z.enum(modes as [string, ...string[]]),
          })
          .parse(JSON.parse(body)),
        t = tag(input.tag),
        h = await history(env.DB, owner, t),
        s = h.snapshots[0];
      if (!s) throw new APIError(409, "Sync this account first.");
      const cs = input.cards.map((id) => s.cards.find((c) => c.id === id));
      if (
        cs.some((c) => !c) ||
        !legal(cs as NonNullable<(typeof cs)[0]>[]) ||
        cs.some((c) => c?.rarity === "champion")
      )
        throw new APIError(
          400,
          "Choose eight distinct owned non-Champion base cards.",
        );
      const choice = {
        id: crypto.randomUUID(),
        observed: new Date().toISOString(),
        cards: input.cards,
        mode: input.mode,
        score: evaluate(cs as NonNullable<(typeof cs)[0]>[], {
          ...defaults,
          mode: input.mode,
          cap: s.cap,
        }).score,
      };
      await env.DB.prepare(
        "INSERT INTO ri_choices(owner,tag,id,observed,payload) VALUES(?,?,?,?,?)",
      )
        .bind(owner, t, choice.id, choice.observed, JSON.stringify(choice))
        .run();
      return json(choice, 201);
    }
    return json({ error: "Not found" }, 404);
  } catch (e) {
    return json(
      {
        error:
          e instanceof APIError
            ? e.message
            : e instanceof z.ZodError
              ? "Unexpected data schema. No fabricated replacement was used."
              : e instanceof SyntaxError
                ? "Invalid JSON."
                : e instanceof Error && e.message.includes("player tag")
                  ? e.message
                  : "Request failed; internal details were not exposed.",
      },
      e instanceof APIError
        ? e.status
        : e instanceof z.ZodError ||
            e instanceof SyntaxError ||
            (e instanceof Error && e.message.includes("player tag"))
          ? 400
          : 500,
    );
  }
}
