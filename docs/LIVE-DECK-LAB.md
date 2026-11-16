# Strict live top-100 Deck Lab

The Find the best deck action now has a single path:

1. POST `/api/deck-lab` starts fresh requests for the current global Ranked leaderboard, official card catalog and requested player's collection.
2. Fetch the battle logs of all 100 distinct ranked accounts, with six concurrent requests. Select each account's latest available `type=pathOfLegend` battle with one player on each side. Read the eight played cards from that battle, not `currentDeck` on the profile. Preserve played forms and available tower metadata.
3. Read the current leaderboard again. If rank-to-account assignments changed, reject the scan. Count all 800 card slots, including repeated compositions across accounts. Base-card usage is counted per account, with separate form counts. For each editorial role, show both deck coverage (union per deck) and card-slot count. Missing role definitions stop generation.
4. Adapt the observed decks to the fresh owned collection. Consider role-compatible substitutions, levels, live card-pair co-occurrence and usage. Preserve includes/excludes and minimum level / maximum average elixir constraints. There is no hand-written template fallback. Show source account, original eight, overlap, substitutions, form differences, live usage and scoring components for each candidate.

## Freshness contract

No application TTL cache, localStorage result, database snapshot, previous-season leaderboard or selected-profile deck may substitute for required live data. Every accepted click initiates new upstream requests with `cache: no-store`. HTTP responses use `no-store, no-transform`. An incomplete scan never produces a recommendation. A completed scan is used immediately; generation rejects scans older than one minute at entry. Displayed results retain their collection window and do not claim to remain current afterward.

The official API/proxy can have its own refresh lag, and it offers no atomic multi-player snapshot. Matching leaderboard reads bookend the collection window; they cannot prove that ranks stayed constant between reads. The most recent available Ranked battle can be old. Show every battle timestamp, plus a warning for battles older than 24 hours. This is not a promise of an instantaneous global snapshot.

The sample is 100 accounts, not 100 unique humans. Players with multiple ranked accounts contribute multiple observations. Duplicate deck compositions MUST count once for each account. Do not deduplicate compositions before calculating frequency.

## Role and recommendation semantics

The official API supplies card identity, ownership, levels and played-deck observations. Roles come from the versioned editorial definitions in `model.ts`, not from the official API. Roles overlap. Normal, evolution and hero versions are combined in base-card frequency and separated in form counts. Hero Tombstone adds a form-specific win-condition role to its observed deck; this is not silently assigned to the owned base form.

The adapted-deck score is an editorial estimate: live composition similarity / co-occurrence / role retention 35%, tactical coverage and focus 30%, owned-level readiness 25%, observed card frequency 10%. Every candidate is generated from live source decks, not the old hard-coded seeds. A bounded beam search considers every eligible card before retaining the highest-ranked partial adaptations. It does not exhaust all possible eight-card combinations or simulate fights. The selected mode can emphasize defensive scenarios, pressure, or cycle inside the tactical component. Max elixir, minimum level, includes and excludes are hard constraints.

Recommendations currently use owned, non-Champion base cards. A matched source evolution or hero is disclosed as a form difference even when the player owns that form; it is not automatically equipped or credited with unmodeled abilities. Tower synergy is not optimized. The optional existing AI comparison is separate, consumes the generated shortlist, and does not replace the live acquisition contract. Counts and traceability do not establish win probabilities or a universally best deck.

## Failure and lifecycle behavior

- Missing API configuration, denied access, rate limits, invalid ranks/cards, missing Ranked battles, unknown roles, changed rank assignments, disconnects and deadlines produce explicit errors. There is no stale-success fallback.
- Available profile decks and Trophy Road rankings are never substituted for Ranked evidence.
- Stream NDJSON progress after each account; show the successful source list only after all required data passes the completeness checks.
- Cancellation and account/filter/focus changes abort the scan and discard late responses. Clear prior candidates and AI comparison state before starting another run.
- The client yields during bounded candidate search so progress and cancellation remain responsive.
- A valid scan with no legal owned adaptation displays the evidence and explains the constraint failure; it does not invent eight cards.

## Hosting and credentials

Reuse existing server-only `CLASH_API_TOKEN`, `CLASH_API_BASE`, and `DISPLAY_LEVEL_CAP`. Allowed API hosts are the official endpoint or documented RoyaleAPI proxy. Tokens never enter the browser. Existing public request throttling applies, with an additional two-scan / one-per-caller in-flight gate and 15-second caller cooldown **per server instance**. These gates are not distributed quotas. Each successful scan makes at least 104 upstream requests (100 logs, two leaderboard reads, catalog and own profile), plus bounded transient retries. No completed scan is shared to reduce this cost because strict fresh acquisition was requested.

The Next catch-all handler requests a 300-second maximum duration; the scan has a 240-second deadline and the browser a 250-second deadline. Hosting-plan limits may be lower. Configure suitable API access and hosting duration before release. The existing Cloudflare service dispatcher also exposes the streaming endpoint.

`vercel.json` disables automatic deployments only for `codex/strict-live-top-100` so saving this work does not run a Vercel build. Production-branch deployment behavior is not disabled by that rule.

## Validation status

Written without running tests, type checks, lint, builds, browser checks, live endpoint probes or debugging, as requested. Existing tests were not run or rewritten. The behavior is implemented but unverified; no assertion of 100% accuracy or production readiness is made.

Sources: https://developer.clashroyale.com/ ; https://docs.royaleapi.com/proxy ; https://vercel.com/docs/project-configuration/git-configuration
