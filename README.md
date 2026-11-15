# Royal Intelligence

Personal Clash Royale analytics built with Next.js, React and TypeScript. This release offers a complete navigable workspace with an explicitly synthetic demo and a server-side live API integration.

## Run

Use Node 24. Run `npm ci`, `npm run dev`, and open the local URL. Run `npm test` and `npm run typecheck` for validation.

`npm run build` creates a Sites Worker bundle. For a conventional Next.js host such as Vercel, override the build command to `npm run build:vercel`; `npm start` serves that build. The repository contains no secret values or real player records.

## Public player lookup

Open `/?tag=VUYRP9GQL` to load a public profile by player tag. The new read-only `GET /api/player?tag=%23VUYRP9GQL` endpoint accepts any valid player tag without visitor authentication. Live lookup still requires `CLASH_API_TOKEN` configured **on the server**; visitors never enter or receive that key. Private `/api/history` and `/api/choices` still require authenticated workspace access, and anonymous lookups do not read or save another account's private snapshots.

The overview displays lifetime wins, losses, total games, three-crown wins, donations, challenge stats and ranked fields where returned by the official API. These differ from recent battle-log statistics; unavailable fields show no estimate. Sharing a URL does not grant access to private history. This branch can be previewed on Vercel; deployment to Vercel does **not** automatically update the original ChatGPT Sites app.

## Live account setup

Create a key at https://developer.clashroyale.com/ and configure `CLASH_API_TOKEN` as a server secret. The key needs a valid IP allowlist. Supported API bases are `https://api.clashroyale.com/v1` (default) and `https://proxy.royaleapi.dev/v1`. If deliberately using the RoyaleAPI proxy, follow https://docs.royaleapi.com/proxy to configure its allowlisted IP; the proxy receives your API key and requests. Set `CLASH_API_BASE` accordingly. Redeploy after changing hosted environment variables.

The private Sites deployment uses the signed-in visitor identity and a D1 database. Native Next.js routes strip Sites identity headers and use the server's `APP_ACCESS_KEY`; enter its matching value in Settings, held in memory only. Standalone deployments without a D1 binding provide session data but no durable history. Do not expose the Worker directly outside the trusted Sites dispatch boundary.

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

Demo ownership and player statistics are synthetic. The 49-card demo catalog is historical and incomplete; live `/cards` replaces it. Live API execution requires a valid token and was not verified without one. Display levels use `raw level + reference cap - raw maxLevel`, with configurable `DISPLAY_LEVEL_CAP=16`; confirm against the current game. Form ownership uses an observed bitmask convention and is separate from active form.

Export includes only loaded data (up to 200 snapshots, 1,000 battles, 100 choices). Deletion removes all records for the selected owner/tag. Browser localStorage holds only manual resource preferences. The public repository and private hosted app have independent access settings.

## Architecture and scoring

`src/lib/model.ts` owns normalization and editorial role annotations. `engine.ts` contains pure scoring, approximate beam search, intervals, links and fixed-hit calculations. `server/service.ts` implements authenticated APIs, bounded upstream cache, retries, rate limits and persistence. `database/schema.ts` and checked-in Drizzle migrations own D1 schema. `scripts/build.mjs` exports the frontend and packages it with the API Worker; API routes are temporarily excluded and restored in a finally block.

Final score is a weighted mean of defense, offense, level readiness, role coverage, cost efficiency, composition balance and overlap with editorial archetype seeds. The interface exposes each feature and weight. Search uses a width-75 beam over the top 40 eligible cards by level plus seed decks, then enforces pairwise differences of at least two cards. It is approximate and can miss better compositions. It does not output win probabilities.

The fixed-damage calculator uses ceil(HP/damage) hits and first-hit delay + (hits−1) × interval. It does not model shields, projectiles, spawned units, targeting or modifiers. Battle outcomes with equal crowns remain unknown; unknown outcomes are excluded from decisive win-rate intervals. Recorded deck choices match later battles by base card IDs, ignoring forms/towers, and establish no causation.

## Storage and deployment

Sites provisions binding `DB` and applies `drizzle/` migrations. Run `node node_modules/drizzle-kit/bin.cjs generate` after schema changes. No runtime schema mutations occur. Static assets are embedded in the Worker; move large media to an asset service before expanding substantially. D1 rate limiting is atomic per owner, while standalone limiting is process-local.

GitHub is the public source backup. The Sites source repository separately stores the exact deployable commit. Keep both synchronized for future releases. No scheduled jobs or paid custom domain are required for this release.

Unofficial fan content, not endorsed by Supercell. See https://supercell.com/en/fan-content-policy/ and `docs/RESEARCH.md` for research scope and provenance.
