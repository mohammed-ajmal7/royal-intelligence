# Royal Intelligence

Personal Clash Royale analytics built with Next.js, React and TypeScript. This release offers a complete navigable workspace with an explicitly synthetic demo and a server-side live API integration.

## Run

Use Node 24. Run `npm ci`, `npm run dev`, and open the local URL. Run `npm test` and `npm run typecheck` for validation.

`npm run build` creates a Sites Worker bundle. For a conventional Next.js host such as Vercel, override the build command to `npm run build:vercel`; `npm start` serves that build. The repository contains no secret values or real player records.

## Public, player-tag-driven workspace

Share `https://royal-intelligence.vercel.app/?tag=VUYRP9GQL`. Anyone can enter **their own** valid player tag. The owner must configure the **one** `CLASH_API_TOKEN` on the server; visitors never need Supercell credentials or API keys.

The publicly available official API drives:

- **Overview** — trophies, career record, currently equipped deck, chest cycle, challenge/ranked stats, badges, achievements, favourite card, tower troop and side-mode progress (where present in the API).
- **Card collection** — all owned player cards and the current global catalog; evolution/hero mode is interpreted separately for ownership versus current deck/battle form.
- **Deck Lab and Analyzer** — evaluate actual owned cards, current levels and base composition; use a teammate's real selected deck by their public player tag for 2v2 role-complement advice.
- **Matchup Lab** — fetch a real opponent's current deck by tag or import a deck link; also analyze recorded battle decks.
- **Battle History** — show official recent battles, opponents and trophy changes, with mode filters; previously observed battles can be remembered on the same browser.
- **Clan Intelligence** — public clan summary, roster, member profile navigation and current River Race data, only when available.
- **Meta Insights** — publicly returned global Ranked / Trophy Road leaderboard positions and active in-game events. These are *not* global deck win rates.
- **Upgrade Planner and AI Coach** — deterministic, explainable heuristics over actual loaded cards, levels and battles, not fabricated upgrade costs, win probabilities or replay analysis.
- **Privacy and export** — browser-local, per-tag snapshots and tracked deck choices, export and deletion.

Public read-only endpoints: `GET /api/player?tag=...`, `GET /api/scout?tag=...`, `GET /api/clan?tag=...` and `GET /api/rankings`. A tag is a public player identifier, **not an authentication credential**. Private `/api/history` and `/api/choices` still require trusted Sites identity or explicit administrator credentials, and never leak records to public visitors. New browser-local tracking works without access to private D1.

Browser-local persistence is scoped to the current device/browser and the player tag, capped at 90 compact trophy snapshots, 200 remembered battles and 100 tracked deck choices. It does not synchronize across devices, run scheduled refreshes, or collect battles while the page is closed. Local-storage clearing deletes it. Only an observed live API response is treated as live data; demo data stays explicitly synthetic.

## Live account setup

Create a key at https://developer.clashroyale.com/ and configure `CLASH_API_TOKEN` as a server secret. The key needs a valid IP allowlist. Supported API bases are `https://api.clashroyale.com/v1` (default) and `https://proxy.royaleapi.dev/v1`. If deliberately using the RoyaleAPI proxy, follow https://docs.royaleapi.com/proxy to configure its allowlisted IP; the proxy receives your API key and requests. Set `CLASH_API_BASE` accordingly. Redeploy after changing hosted environment variables.

The private Sites deployment uses the signed-in visitor identity and a D1 database. Native Next.js routes strip Sites identity headers and use the server's `APP_ACCESS_KEY`; enter its matching value in Settings, held in memory only. Standalone deployments without D1 use browser-local per-tag tracking and keep server-side private D1 endpoints protected. Do not expose the Worker directly outside the trusted Sites dispatch boundary.

## Included

- Account summary, full returned profile inspection, card collection and encyclopedia.
- Ten search modes, base-card deck builder, hard include/exclude constraints, elixir and level limits, five diverse candidates and deck share links.
- Explainable role scoring, teammate-role complement in 2v2 and qualitative matchup notes.
- Battle history with both players in 2v2, conservative outcome classification and Wilson confidence intervals.
- Owner-scoped snapshots, deduplicated battles and tracked base-composition choices in D1.
- Heuristic upgrade ordering, manual resource notes and a deterministic coach.
- Patch-scoped reference records, manual fixed-damage calculator, export and explicit history deletion.

## Honest limits

This is version 0.1, not the complete advanced analytics specification. There is no comprehensive combat simulator, automatic special-form/tower optimization, Champion slot validator, representative global meta feed, predictive matchup probability, replay analysis, cost-aware upgrade optimizer, LLM integration or scheduled background refresh. Unknown data remains unknown. Automatic search excludes Champions. Configure special forms and Tower Troop in-game.

Demo ownership and player statistics are synthetic. The 49-card demo catalog is historical and incomplete; live `/cards` replaces it. Live API execution requires a valid, non-revoked token in Vercel environment variables and a matching IP allowlist. A passing mock-based test or successful build does not prove the live API can reach Supercell. Display levels use `raw level + reference cap - raw maxLevel`, with configurable `DISPLAY_LEVEL_CAP=16`; confirm against the current game. Form ownership uses an observed bitmask convention and is separate from active form.

Export includes the current loaded player snapshot and the browser's bounded per-tag tracking (90 compact snapshots, 200 battles, 100 choices). Browser-local history, choice tracking and manual resources can be deleted for that tag. Private D1 records are independently protected by workspace authentication. The public repository and private hosted app have independent access settings.

## Architecture and scoring

`src/lib/model.ts` owns normalization and editorial role annotations. `engine.ts` contains pure scoring, approximate beam search, intervals, links and fixed-hit calculations. `server/service.ts` implements authenticated APIs, bounded upstream cache, retries, rate limits and persistence. `database/schema.ts` and checked-in Drizzle migrations own D1 schema. `scripts/build.mjs` exports the frontend and packages it with the API Worker; API routes are temporarily excluded and restored in a finally block.

Final score is a weighted mean of defense, offense, level readiness, role coverage, cost efficiency, composition balance and overlap with editorial archetype seeds. The interface exposes each feature and weight. Search uses a width-75 beam over the top 40 eligible cards by level plus seed decks, then enforces pairwise differences of at least two cards. It is approximate and can miss better compositions. It does not output win probabilities.

The fixed-damage calculator uses ceil(HP/damage) hits and first-hit delay + (hits−1) × interval. It does not model shields, projectiles, spawned units, targeting or modifiers. Battle outcomes with equal crowns remain unknown; unknown outcomes are excluded from decisive win-rate intervals. Recorded deck choices match later battles by base card IDs, ignoring forms/towers, and establish no causation.

## Storage and deployment

Sites provisions binding `DB` and applies `drizzle/` migrations. Run `node node_modules/drizzle-kit/bin.cjs generate` after schema changes. No runtime schema mutations occur. Static assets are embedded in the Worker; move large media to an asset service before expanding substantially. D1 rate limiting is atomic per owner, while standalone limiting is process-local.

GitHub is the public source repository, and Vercel serves the shareable production site. The original ChatGPT Sites deployment is independent; pushing GitHub changes does not update it. No scheduled jobs or paid custom domain are required for this release.

Unofficial fan content, not endorsed by Supercell. See https://supercell.com/en/fan-content-policy/ and `docs/RESEARCH.md` for research scope and provenance.
