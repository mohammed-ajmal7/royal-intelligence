> Deck Lab update (2026-11-16): choose fresh **global Ranked Top 100 / Top 200 / Top 300** from a dropdown. The application fetches official leaderboard pages and recent Ranked 1v1 battle logs, analyzes verified played decks, and adapts the observed meta to eligible owned cards, levels and deck conditions. **Partial samples are allowed** (for example, 99/100 or 275/300) but visibly disclose unavailable accounts, actual sample size and missing evidence. Independently assembled owned-card alternatives based on observed global card usage are also compared, even when direct source-deck adaptations exist. No historical cached deck or unverified profile selection is disguised as top-ranked battle evidence. Direct pro-deck substitutions are now required to preserve key air/ground/splash/tank/win/flight roles and cost at most +1 elixir per source card; the ranker prioritizes the owner's actual levels and weakest defender. Independently assembled owned-card alternatives are clearly labeled, not presented as exact pro replacements. Each swap shows global versus owned levels, costs, preserved functions, and any missing combat data. See [the data acquisition, adaptation and limits](docs/LIVE-DECK-LAB.md). This is a heuristic recommendation, not a guaranteed winning deck.

# Royal Intelligence

Personal Clash Royale analytics built with Next.js, React and TypeScript. This release offers a complete navigable workspace with an explicitly synthetic demo and a server-side live API integration.

## Mobile-first Royal Arena interface

On phones and tablets, use the fixed **Home · Cards · Build · Battles · More** bottom navigation. **More** opens all remaining workspace sections. Player tag lookup is the first content on the page. Cards and decks use responsive 4-column battle-deck grids, touch-friendly inputs and an accessible card-detail bottom sheet. The interface uses an original, Clash Royale-inspired royal-blue / crown-gold / elixir-purple design, with game card artwork supplied by the official API.

The main deck panel now shows **Average Elixir** (sum of eight known costs / eight) and **4-Card Cycle** (sum of the four cheapest known card costs) separately. Both come from the card-cost data actually returned by the game API. Four-card cycle is an optimistic rotation benchmark, not a guarantee for a particular card; it does not model active Champion abilities, variable-cost cards or live hand state. Fast Cycle mode weights four-card efficiency more strongly than standard modes. The scoring now prioritizes detailed combat mechanics **where a separate, sourced reference exists**; the official public player API alone still does not provide a complete validated HP/damage/range dataset. Missing values are never inferred.


## Deck Item — complete catalog and available level-by-level reference data

The **Deck Item** page has a mobile-first attack/defense leaderboard with a separate source-aware **all-level inspector for every card**, including cards the player does not own. Open **More → Deck Item** or the **My Collection** shortcut.

### Ranking options

- **Category:** Attack or Defense. The default leaderboard is **Attack → Damage per hit** (descending).
- **Attack:** Sort by sourced **damage per hit** or steady **DPS = damage per hit / attack interval**.
- **Defense:** Sort by sourced **HP per unit** or **hits needed to defeat** for adjustable incoming fixed hit damage `D`: `ceil(HP / D)`. The lethal hit counts; complete hits survived are one fewer.
- **Comparison mode (default):** All 123+ official catalog entries, **including unowned cards**, compared at **one selected reference level** (default 11). This avoids an owned-only leaderboard incorrectly showing 76 unowned cards as "not ranked" solely because the player hasn't unlocked them.
- **Player-level mode:** Owned cards use levels from the actual Supercell player API; **unowned cards are explicitly labeled reference level** instead of pretending they have an actual unlocked level. Mixed levels are not a fair same-level comparison.
- **Card classification:** Community type when available, otherwise inferred Troop/Building/Spell only from the official card-ID family. ID-based classification is labeled; it never supplies invented numeric stats.
- **Filters:** All types / Troops / Buildings / Spells / Other; owned-only toggle; card-name search.
- **Leaderboard ties:** Same displayed attack or defense value shares one dense rank; identical survival-hit counts use HP as a *sorting* tiebreaker, not as a secretly different score.

### Group cards: independent per-unit HP and attack details

Deck Item now treats troop groups as **separate bodies**, rather than a single
HP pool or an arbitrary "defense count". The **Group cards only** filter
isolates squads. Every group entry shows its composition, and expanding its
stats shows each unit type separately, including:

- Number of troops spawned at base deployment.
- **HP, damage per hit, DPS, shields, hit interval, targets and range per unit**.
- Hits needed to defeat **one** member at the selected incoming damage
  (including the lethal hit), plus complete hits survived.
- A separate level-by-level table **for each distinct member type**.
- An optional sum of separately-held unit HP with a prominent warning that
  the group does **not** have one shared health bar.

When mixed members have different HP/damage, the leaderboard uses the
**strongest individual member for the selected sorting metric**, and explicitly
names that member. It never silently multiplies an individual Skeleton's HP
by 15 to rank Skeleton Army's defense.

**Skeleton Army**, from the November 9, 2026 game-data snapshot: the regular
card deploys **15 independent Skeletons**. At level 11 each Skeleton has
**81 HP**, deals **81 damage per hit**, and attacks every **1.1 seconds**.
The published base-Skeleton level table is included for levels 6–20.
The Evolution's shielded Skeleton General appears in a separate alternate
form table and is *not* counted as one of the regular base Skeletons.

**Goblin Gang** contains three melee Goblins and three Spear Goblins; each
has its own level-dependent HP, damage, attack interval and targeting.
**Rascals** contains one Rascal Boy and two Rascal Girls, displayed as two
distinct types. These two mixed-squad references include explicit levels
1–20, with no invented scaling.

Other base multi-unit cards (e.g. Skeletons, Minions, Minion Horde, Barbarians,
Royal Recruits, Royal Hogs, Archers, Bats, Three Musketeers, Guards and
Zappies) use independently sourced unit counts and their reference's
level-specific **per-unit** statistics. If data for a level, unit type or
squad is absent, it remains unknown rather than copying another unit's stats.
Death spawns, timed spawns and Evolution-only summons are not assumed to
join the initial base-deployment squad.

The expanded group view is available both in **Deck Item → All levels +
full card stats** and in the normal card-detail modal for supported selected
levels.

References: [Skeleton Army](https://crtool.app/en/units/skeleton-army/),
[Goblin Gang](https://crtool.app/en/units/goblin-gang/),
[Rascals](https://crtool.app/en/units/rascals/). Source numbers are
independently maintained and are not direct Supercell API combat fields.
Actual combat depends on troop placement, shields, splash damage, targeting,
abilities and active form.

### All levels and all available source fields

Every card row opens a separate **All levels + full card stats** panel with HP/unit, damage/hit, DPS, hit interval, attack range, movement (raw units), air/ground/building targeting, splash radius, unit count, deploy time, attack preload, special-mechanics flag and configurable hit endurance. A horizontally scrollable table lists every available reference-level HP/damage/DPS/hit-endurance value. Unsupported levels display `—` rather than interpolated values. The collapsible **all available community source fields (JSON)** section exposes the underlying registry/unit/deployment/projectile data when the record exists.

### Expanding every published field and level from newer reference pages

Deck Item now offers **Get all available card stats**, a user-initiated refresh
that requests the current public card reference pages in controlled groups of
three, displays progress and updates the card ranking as sourced data arrives.
The per-card **All levels + full card stats** action also tries to retrieve the
individual current source automatically. Vercel caches public reference
downloads for one day; the route never uses or exposes the player's Supercell
API token.

The newer reference URL is [crtool's individual card pages](https://crtool.app/en/units/).
The server accepts only validated card slugs and official numeric IDs. It
extracts **explicit published level rows**, not extrapolated scaling. The
card inspector additionally shows **all numeric base-card columns** present
in the source: HP, attack/area damage, shields, crown-tower damage, damage/sec,
spawn/death/charge effects and other values *where actually published*.
Text attributes such as movement-speed category and melee-range description
are preserved without converting them to fabricated numbers. Where the newer
source publishes Evolution, Hero or secondary-unit level tables, those fields
appear in separate expandable sections so base attack and base HP are never
silently combined with alternate-form or summoned-unit mechanics.

The default historic dataset remains as a fallback for cards that cannot be
refreshed. A missing web page, unparseable table, complex secondary-unit
layout, or absent level remains visibly unavailable. Evolution, Hero and
secondary spawned-unit tables are **not silently mixed with base stats**.
An independently maintained website is not an official Supercell endpoint:
availability and layout of those pages can change, so complete real-time
coverage of every card is **not guaranteed**.

**Sparky correction:** The dated November 9, 2026 reference reports
**1,451 hitpoints** (not 1,452) and **1,331 area damage** at level 11.
Exact values for levels 9–20 are included directly as a fallback.
Instant spells no longer receive a misleading sustained DPS calculated from
internal cast timing; explicit damage-per-second values are used only when
published.

### Updated 2026 data for Sparky, Minion Giant and Goblin Barrel

These two cards were previously missing numeric leaderboards because the older
community files predate Minion Giant and treat Goblin Barrel primarily as a
summoning spell. A separate, **dated game-data reference** supplies their exact
published level tables (not generic level multipliers):

- **Minion Giant:** sourced HP and damage per hit for levels **3–20**,
  **1.7-second hit interval**, range 4 tiles, medium movement speed,
  building-only targeting. At **level 9**, published values are **1,505 HP**
  and **127 damage per hit**; at level 11, **1,817 HP** and **153 damage/hit**
  after the October 2026 balance change.
- **Goblin Barrel:** the barrel itself deals **0 direct impact damage** and
  summons **three Goblins**. The attack leaderboard displays **damage per
  individual spawned Goblin**, not combined damage or spell-impact damage.
  Each Goblin has a **1.1-second attack interval**. At **level 8**, each
  Goblin has **152 HP** and deals **94 damage per hit**; at **level 11**,
  **202 HP** and **125 damage per hit**. Published per-Goblin HP and damage
  data are included for levels **6–20**. Evolved Decoy Goblins use different
  values and are not mixed into the base-card stats.

Both references are sourced from independently maintained
[Minion Giant game-data tables](https://crtool.app/en/units/minion-giant/)
and [Goblin Barrel / Goblin game-data tables](https://crtool.app/en/units/goblin-barrel/)
(version **16.635.1**, marked updated **November 9, 2026**). Level-11 values
are cross-checked against RoyaleTools' November 2026 card references.
They are **not** returned by the official Supercell player-profile API.
They are matched to the official catalog's card **name and ID** at runtime,
so neither card requires an invented numeric card ID.

The leaderboard and the per-level table show which unit the displayed HP/damage
belongs to and attribute the fresh source separately from the historical
community dataset. Other missing cards still show unknown when current
numeric game-data sources are not available.

### Source accuracy / hard boundary

**The official Supercell API provides current card identity, cost, icons, ownership and the player's recorded card levels; it does not publish a complete live all-level HP/damage table.** The numerical mechanics in this release are from independently maintained [RoyaleAPI/cr-api-data](https://github.com/RoyaleAPI/cr-api-data), which was last maintained in 2023 and is **not an authoritative 2026 balance-patch source**. New cards and mechanics introduced later can have no source stats; those cards remain visible with no numerical rank. No guessed damage, placeholder HP, level extrapolation, one-size-fits-all 10% scaling or external-site scraping is added. The application distinguishes source-update date from download date.

These are comparisons of *available historical reference fields*, not verified current game values, individual one-shot outcomes under all effects, whole-swarm HP, exact live DPS for multi-stage effects, or a full combat simulation. Shields, buffs, abilities, spawn effects, charge damage and building decay require separate verified mechanics.

## ChatGPT-style deck reasoning (grounded strategy + optional real AI)

**Build with Intelligence now reasons about matchups instead of only maximizing a
card-stat score.** The system uses two clearly distinguished layers:

1. **No-cost deterministic tactical reasoning**, available to everyone:
   after the collection-derived search generates candidates, it combines
   the existing statistical/structural evaluation (58%) with a transparent
   matchup/strategy assessment (42%) while searching candidate swaps. Select
   Balanced, Counter heavy air, Stop giant tanks, Punish swarms and bait,
   Low-elixir defense, or Build around Royal Giant. It examines separately
   six situations: air-heavy pushes, ground tanks, swarms/bait, ground defense,
   reliable tower pressure, and average-elixir/four-cheapest-card rotation.
   The new tactic report shows the supporting cards, identified risks,
   composition overlap (especially over-investment in expensive splash
   support), conditional counters (e.g. Inferno Tower reset risk), complementary
   roles, and per-card reasons. It compares the chosen eight with the **actual
   loaded account deck**, explaining improvements and trade-offs. Relative
   values are editorial heuristic points, **not measured matchup win rates**.
   Battle-history counts only reveal how often a threat appeared in recorded
   1v1 wins/losses, *not why a player lost*.
2. **Optional actual language-model second opinion**, requiring a deliberate
   user click and a separately funded OpenAI API account. The server compares
   the **five shortlisted candidate decks against the original loaded deck**
   (which the model may recommend keeping). The model is asked to scrutinize
   target matchups, elixir, redundancy, levels, spell coverage, counters and
   the argument *against* its own choice. It returns a validated structured
   recommendation with risks, reasons, substitutions, and an opening/defense/
   counterpush playbook. The response only points to a known candidate or
   the current deck. It **never automatically applies a deck**.

### Enable owner-only real AI reviews on Vercel (optional)

This needs a **separate paid OpenAI API key**. A ChatGPT subscription does
not give the website API usage. The free, deterministic reasoning works
without any model configuration.

Add the following **server-only encrypted** environment variables in the
Vercel project (Production and Preview), then redeploy:

- `OPENAI_API_KEY` — your OpenAI project key; never use a `NEXT_PUBLIC_`
  prefix or put it in browser code.
- `DECK_AI_ACCESS_TOKEN` — a long, random, private owner access code.
  The user must enter it in Deck Laboratory before requesting a real AI review.
- `DECK_AI_MODEL` — optional, defaults to `gpt-6.1-sol`. Ensure that
  your API project has access to the selected model.

The protected endpoint `POST /api/deck-ai` uses the Responses API with
structured JSON output. It accepts **only anonymous card IDs/names/levels,
role labels, precomputed candidate scores and aggregated matchup counts**,
not your name, account tag, raw profile, clan or full battle log. It does not
store responses in the provider's response history (`store:false`) and
returns `Cache-Control:no-store`. The key remains on the server.

Set an API budget/usage cap in the provider dashboard before enabling
production. A best-effort 12-requests-per-day per IP in-memory limit is
*not* a reliable distributed rate limiter; the private owner access token
is mandatory to avoid public API spend. When either secret is missing, the
endpoint returns an explicit disabled message and costs nothing.

The system is **not ChatGPT itself** and cannot guarantee the exact same
deck or reasoning. The deterministic scorer and the optional paid model
are distinct; missing or outdated combat stats, unequipped Evolutions and
imperfect matchups are disclosed rather than fabricated.

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
- **Deck Item** — full-catalog Attack / Defense rankings with global reference-level selection, actual player-level mode, all available historical stat levels, raw sourced fields and honest missing-data labels.
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

