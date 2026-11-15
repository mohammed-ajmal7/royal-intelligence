# Royal Intelligence

Personal Clash Royale analytics built with Next.js, React and TypeScript. This release offers a complete navigable workspace with an explicitly synthetic demo and a server-side live API integration.

## Mobile-first Royal Arena interface

On phones and tablets, use the fixed **Home · Cards · Build · Battles · More** bottom navigation. **More** opens all remaining workspace sections. Player tag lookup is the first content on the page. Cards and decks use responsive 4-column battle-deck grids, touch-friendly inputs and an accessible card-detail bottom sheet. The interface uses an original, Clash Royale-inspired royal-blue / crown-gold / elixir-purple design, with game card artwork supplied by the official API.

The main deck panel now shows **Average Elixir** (sum of eight known costs / eight) and **4-Card Cycle** (sum of the four cheapest known card costs) separately. Both come from the card-cost data actually returned by the game API. Four-card cycle is an optimistic rotation benchmark, not a guarantee for a particular card; it does not model active Champion abilities, variable-cost cards or live hand state. Fast Cycle mode weights four-card efficiency more strongly than standard modes. The scoring now prioritizes detailed combat mechanics **where a separate, sourced reference exists**; the official public player API alone still does not provide a complete validated HP/damage/range dataset. Missing values are never inferred.


## Deck Item — numeric attack and defense rankings

The **Deck Item** sidebar section (also linked from **My Collection**) ranks a player's card collection **in descending numerical order**. On mobile, open **More → Deck Item**, or use the prominent collection shortcut.

- **Defense → Hits needed to defeat** (default): for an input attack of `D` damage per hit and a card unit's recorded level-specific hitpoints `H`, show `ceil(H / D)`. This counts the final lethal hit. The complete hits survived before defeat are `ceil(H / D) − 1`. The reference input is editable (1–100,000 damage). Cards with identical hit counts are ordered by their higher actual HP.
- **Defense → HP**: order directly by hitpoints (damage capacity for one unit).
- **Attack → Damage per hit**: order by recorded per-hit damage (a spell's listed damage is not guaranteed to be equivalent to sustained troop attack power).
- **Attack → DPS**: order by damage per hit divided by attack interval when both are explicitly available.
- Additional selectors: All cards / Troops / Buildings / Spells, Owned-only toggle (default enabled), and name search. A card's official player-record level is used to retrieve the exact indexed community combat reference where available.
- Unknown stats, unowned cards with unknown levels and unsupported mechanics remain **unranked**, clearly marked at the end rather than assigned zero or a fabricated attack/defense score. Clicking a row opens the existing card inspector.

**Limits:** HP and hit counts are per unit, not the combined HP of a swarm. Shields, spell damage reductions, variable attacks, projectile delays, building decay, buffs, activated abilities, arena placements and simultaneous attackers are not simulated. The current community reference source [RoyaleAPI/cr-api-data](https://github.com/RoyaleAPI/cr-api-data) may be old relative to live balance changes; fetch time is not a balance-patch date. The user can use the feature for transparent comparisons of **available** values but should not interpret the results as verified current-patch global strength rankings.

## Mechanics-first deck intelligence

**Actual card statistics come first, never fabricated card values.** The site independently obtains the current player's **owned cards, card levels, deck, and elixir values** from the official Supercell API. A cached server endpoint `GET /api/mechanics` additionally downloads public card game-data tables from the independently maintained [RoyaleAPI/cr-api-data](https://github.com/RoyaleAPI/cr-api-data): card mapping, troop/spawn relationships, characters, buildings, spells and projectiles. These are **community reference files**, not a Supercell-certified live combat API or a guarantee that each entry includes the newest balance changes.

Data are joined by official numeric card ID and reference unit names. For individual owned cards, the evaluator uses the **exact indexed level-specific HP and damage arrays when present**, derives DPS = damage per hit ÷ attack interval when both are available, plus targeting type (air/ground/buildings), range, attack interval, movement speed (raw data units), area damage radius and unit count. It displays deploy and first-attack timing where supplied. No linear scaling, stat extrapolation or filler estimates are used for missing levels. Complex evolution/hero abilities, live targeting, placement, area damage interactions, dynamically increasing damage, charge behavior and match outcomes remain **outside** this static calculation.

When source coverage is sufficient, the final **heuristic** deck rating weights are: **65% combat mechanics, 20% structural/role/level balance, 8% average elixir, and 7% four-cheapest-card cycle**. When community fields are unavailable, mechanics weights are reduced and the structural share increases automatically. Known defensive composition gaps still incur explicit penalties. Per-card values, data coverage, actual effective scoring weights and missing values are visible inside the Deck Laboratory. The result is an **editorial comparison score**, never a measured win probability or proof of defeating any deck.

The community feed is fetched server-side, independently from Supercell credentials, cached for a day, and allowed to fail independently. If the feed cannot be reached, the existing collection-based optimizer still works with a warning and no fabricated combat-stat inputs. The feed's `fetchedAt` is the retrieval timestamp, **not** the source's balance-patch date.

## Run

Use Node 24. Run `npm ci`, `npm run dev`, and open the local URL. Run `npm test` and `npm run typecheck` for validation.

`npm run build` creates a Sites Worker bundle. For a conventional Next.js host such as Vercel, override the build command to `npm run build:vercel`; `npm start` serves that build. The repository contains no secret values or real player records.

## Public, player-tag-driven workspace

Share `https://royal-intelligence.vercel.app/?tag=VUYRP9GQL`. Anyone can enter **their own** valid player tag. The owner must configure the **one** `CLASH_API_TOKEN` on the server; visitors never need Supercell credentials or API keys.

The publicly available official API drives:

- **Overview** — trophies, career record, currently equipped deck, chest cycle, challenge/ranked stats, badges, achievements, favourite card, tower troop and side-mode progress (where present in the API).
- **Card collection** — all owned player cards and the current global catalog; evolution/hero mode is interpreted separately for ownership versus current deck/battle form.
- **Deck Item** — ranked Attack (damage/hit or DPS) and Defense (HP or hits to defeat at user-selected incoming damage) comparisons, with transparent missing-data handling and player-level stat lookup.
- **Deck Lab and Analyzer** — evaluate actual owned cards, current levels and base composition; use a teammate's real selected deck by their public player tag for 2v2 role-complement advice.
- **Matchup Lab** — fetch a real opponent's current deck by tag or import a deck link; also analyze recorded battle decks.
- **Battle History** — show official recent battles, opponents and trophy changes, with mode filters; previously observed battles can be remembered on the same browser.
- **Clan Intelligence** — public clan summary, roster, member profile navigation and current River Race data, only when available.
- **Meta Insights** — publicly returned global Ranked / Trophy Road leaderboard positions and active in-game events. These are *not* global deck win rates.
- **Upgrade Planner and AI Coach** — deterministic, explainable heuristics over actual loaded cards, levels and battles, not fabricated upgrade costs, win probabilities or replay analysis.
- **Privacy and export** — browser-local, per-tag snapshots and tracked deck choices, export and deletion.

Public read-only endpoints: `GET /api/player?tag=...`, `GET /api/scout?tag=...`, `GET /api/clan?tag=...`, `GET /api/rankings` and cached community-data `GET /api/mechanics`. A tag is a public player identifier, **not an authentication credential**. Private `/api/history` and `/api/choices` still require trusted Sites identity or explicit administrator credentials, and never leak records to public visitors. New browser-local tracking works without access to private D1.

Browser-local persistence is scoped to the current device/browser and the player tag, capped at 90 compact trophy snapshots, 200 remembered battles and 100 tracked deck choices. It does not synchronize across devices, run scheduled refreshes, or collect battles while the page is closed. Local-storage clearing deletes it. Only an observed live API response is treated as live data; demo data stays explicitly synthetic.

## Live account setup

Create a key at https://developer.clashroyale.com/ and configure `CLASH_API_TOKEN` as a server secret. The key needs a valid IP allowlist. Supported API bases are `https://api.clashroyale.com/v1` (default) and `https://proxy.royaleapi.dev/v1`. If deliberately using the RoyaleAPI proxy, follow https://docs.royaleapi.com/proxy to configure its allowlisted IP; the proxy receives your API key and requests. Set `CLASH_API_BASE` accordingly. Redeploy after changing hosted environment variables.

The private Sites deployment uses the signed-in visitor identity and a D1 database. Native Next.js routes strip Sites identity headers and use the server's `APP_ACCESS_KEY`; enter its matching value in Settings, held in memory only. Standalone deployments without D1 use browser-local per-tag tracking and keep server-side private D1 endpoints protected. Do not expose the Worker directly outside the trusted Sites dispatch boundary.

## Included

- Account summary, full returned profile inspection, card collection and encyclopedia.
- One-click balanced/defensive/offensive/2v2/fast-cycle searches across all eligible owned cards, seven-point counter-coverage checklist, advanced include/exclude and elixir/level limits, five diverse alternatives, and deck share links.
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

Final score is a coverage-aware combination of actual sourced card mechanics, explicit elixir and four-card-cycle efficiencies, and a smaller structural role/level score. All weights and source gaps are exposed in the interface; the mechanics component reaches 65% only with sufficient field coverage. Deck Laboratory now has a one-click playstyle chooser, a seven-point coverage audit, five diverse suggested teams and optional advanced filters. The search examines **every eligible owned card**, not merely the top 40 by level. It combines role-aware seeds and editorial archetypes with bounded all-card swaps, preserving must-include/exclude selections, card ownership, uniqueness and elixir limits. It remains a heuristic optimizer: the method can miss better combinations and **cannot promise any deck will beat every opponent**. Scores do not represent calibrated win probabilities.

The fixed-damage calculator uses ceil(HP/damage) hits and first-hit delay + (hits−1) × interval. It does not model shields, projectiles, spawned units, targeting or modifiers. Battle outcomes with equal crowns remain unknown; unknown outcomes are excluded from decisive win-rate intervals. Recorded deck choices match later battles by base card IDs, ignoring forms/towers, and establish no causation.

## Storage and deployment

Sites provisions binding `DB` and applies `drizzle/` migrations. Run `node node_modules/drizzle-kit/bin.cjs generate` after schema changes. No runtime schema mutations occur. Static assets are embedded in the Worker; move large media to an asset service before expanding substantially. D1 rate limiting is atomic per owner, while standalone limiting is process-local.

GitHub is the public source repository, and Vercel serves the shareable production site. The original ChatGPT Sites deployment is independent; pushing GitHub changes does not update it. No scheduled jobs or paid custom domain are required for this release.

Unofficial fan content, not endorsed by Supercell. See https://supercell.com/en/fan-content-policy/ and `docs/RESEARCH.md` for research scope and provenance.

### Card details and comparisons

Tap a Deck Item (or collection card) for a shared card-detail sheet. Choose a second card to compare twelve numerical fields with paired bars and signed differences on both sides. Green/red describes favorable/unfavorable values for the metric; attack interval, deployment time and elixir favor lower numbers. Speed and unit count remain neutral. Equal values show `= 0`, and absent values show `Not comparable` rather than fabricated zeros.

Use collection levels or enable the same-level selector (1–16). Unsupported levels remain unavailable. Per-level community arrays are aligned from each **source row's** rarity unlock level (Common 1, Rare 3, Epic 6, Legendary 9, Champion 11), including projectile rows. Raw registry, deployment, unit and projectile records are expandable separately; they retain source units and base-level semantics. The downloaded source includes historical mechanics and is **not a guarantee of current-patch data or complete Evolution/Hero mechanics**. The API now checks the source's combat-file commit date and displays a warning for old data; a fresh HTTP fetch is not a balance update.
