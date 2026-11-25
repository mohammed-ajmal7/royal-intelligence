# Crown-pilot

A minimal, mobile-first Clash Royale companion app built with Next.js, React and TypeScript.

**Brand:** Crown-pilot · **Package:** `crown-pilot` · **Icon:** original blue crown with gold navigation arrow.

Installable web app metadata, branded browser icons and a responsive mobile launcher experience are included. This remains an unofficial fan tool.

**Live:** https://crown-pilot.vercel.app

**Previous URLs (kept working):** https://crownpilot.vercel.app and https://royal-intelligence.vercel.app

## Five simple sections

| Section | What it does |
|---|---|
| Overview | Load a player tag; view trophies, win rate, and current deck |
| Cards | Search owned and unowned cards; inspect levels, forms and available combat stats |
| Decks | Edit your deck; generate the eight-role owned-only recommendation; read a play guide |
| Battles | Browse official battle summaries, results, opponents and decks |
| Explore | Inspect data from the public official Clash Royale API |

Detailed **Top Global Ranked Top 100/200/300 scanning, Deck Item numeric rankings, AI Coach, matchups, clan analytics, upgrade planning and settings** remain available under **/advanced**. The classic app is intentionally preserved, not silently deleted.

## Simple architecture

- src/app/page.tsx — minimal primary dashboard.
- src/app/globals.css — responsive primary style.
- src/app/advanced/page.tsx — separate optional legacy workspace.
- src/components/LegacyWorkspace.tsx — existing advanced features, unchanged.
- src/lib/apiResources.ts — public API resource list, validation and bounded URL builder.
- server/service.ts — official API access, error handling, rate limits and authentication.
- src/app/api/[...path]/route.ts — Next.js adapter.
- src/lib/model.ts — public player and card model.
- src/lib/selfMadeDeckLab.ts — owned-card numerical deck recommender.
- src/lib/engine.ts — shared deck scoring.
- src/lib/deckPlaybook.ts — role-aware advice.

**Server/API separation:** All official game API calls stay on the server. Users cannot specify arbitrary upstream paths. No Supercell token is embedded in the website. API queries validate tags, names, location IDs, seasons, leaderboard IDs and pagination.

## Official Clash Royale API coverage

The Explore tab exposes 26 public GET resources covering:

- Player profile, recent battle log and upcoming chests.
- Clan search, clan profile, members, current river race and river race history.
- Player-created tournaments and Supercell global tournaments.
- Geographic locations, regional/global player rankings, Ranked/Path of Legend standings, clan and war-clan rankings, tournament ranks and historical seasons.
- Game-mode leaderboards, full cards catalog and published events.

The explorer shows concise rows first and the exact returned JSON when expanded. Pagination is bounded to 100 records per request. Empty results and API failures are shown as such.

**Not included:** restricted player token verification, discontinued classic war endpoints, undocumented challenges and the known broken seasonsV2 endpoint. Historical season Trophy Road results may also return unavailable. The official public API does not expose complete current card combat stats or frame-by-frame match replays. Available independent combat measurements are labeled separately.

RoyaleAPI discontinued its independent developer API in 2020. Its still-available proxy relays the **official Supercell API**, not another feature-rich API.

## Development and tests

From the repository root:

    npm ci
    npm run dev
    npm test
    npm run typecheck
    npm run build:vercel

Copy the example configuration from .env.example into server secrets. Use CLASH_API_TOKEN and optionally CLASH_API_BASE=https://proxy.royaleapi.dev/v1 for their documented proxy. Do not commit credentials.

Private saved snapshots require workspace authorization. Public API data can be read without logging in to the game.

## Limits

Recommendations rank verified eligible **owned** cards and use a bounded combination search. Rankings are heuristics and cannot guarantee a global optimum or every-match win. Missing combat measurements are never invented. The deep Global Player Comparison scan remains under **Advanced → Deck Laboratory**.

## Technical notes

- [Self-made deck methodology](docs/SELF-MADE-DECK-LAB.md)
- [Live global deck scan](docs/LIVE-DECK-LAB.md)
- [Research notes](docs/RESEARCH.md)
- [Official Supercell API](https://developer.clashroyale.com)
- [RoyaleAPI proxy](https://docs.royaleapi.com/proxy)

This is an unofficial fan site, not affiliated with or endorsed by Supercell.

## Brand migration

The visible website, advanced tools, app title, install metadata, logo, and package name are Crown-pilot. The existing `ri-*` local-storage keys remain unchanged for backwards compatibility so player history and settings are not lost. The GitHub repository's legacy URL is retained until its repository slug can be renamed by an administrator; repository renaming is not exposed by the current connected GitHub integration. Existing deployment links should continue to resolve during the rollout.
