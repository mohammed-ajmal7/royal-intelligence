# Global Ranked Deck Laboratory — Top 100, 200 or 300

## How to Play This Deck — deck-specific match guide

Deck Laboratory now displays a dedicated **How to Play This Deck** panel
for the currently selected eight cards. Every alternative from the current
global Ranked scan has its own expandable **How to play alternative #N**
guide. Changing to a different recommendation, changing the selected deck
or the strategic focus updates the active guide; the displayed playbook
never reuses another candidate's card names.

The deterministic generator (src/lib/deckPlaybook.ts) uses only the actual
eight-card selection, categorized strategic functions, current reference
targeting flags when available, and selected strategy focus. It produces:

- Four phases: safe opening (without assuming the starting four-card hand),
  single elixir, double elixir, and overtime/finishing.
- Specific deck archetype priorities for Royal Giant, cycle-pressure, spell
  bait, heavy tank pushes, Miner, Balloon and siege win conditions, with a
  generic fallback for newly introduced win conditions.
- Response plans for heavy air, tanks, swarms/bait and ground pressure,
  naming only cards **present** in the selected deck. It explicitly
  discloses missing defensive answers and distinguishes one-use stun/cycle
  effects from sustained air defense.
- Eight card-by-card assignments with the player's actual card levels and
  elixir, when to spend each card and mistakes to avoid.
- The deck's average elixir, win condition, match reminders and caveats.

No paid AI key is required for this playbook. It is deliberately rule-based,
not a live battle replay, exact card-rotation solver or win-probability
model. It cannot know the match's starting hand, opponent's current elixir,
placement coordinates, tower HP, arena pathing, timing or hidden counters.
Unknown numbers are never invented. Matchup advice is situational guidance
rather than a 100% guaranteed play sequence.

## Per-card replacement accuracy policy (2026-11-16)

The original algorithm considered role overlap, card frequency and the player's
owned level, but did **not** require a per-card elixir limit. It could select
an expensive or functionally unrelated replacement simply because of
popularity or a high player-level advantage. This has been corrected.

For every actual eight-card global Ranked source deck, the adaptation engine
now compares each individual source card to the user's actual **owned** cards.
Each direct replacement must satisfy **all hard criteria**:

1. **Owned and eligible:** The player owns the card. It is not a tower troop
   or an unsupported champion, its normalized level is known and meets the
   selected minimum level, and it is not excluded or already occupying
   another deck slot.
2. **Elixir:** The official cost is known, and the substitute costs no
   more than **1 additional elixir** compared with that observed source
   card. A 2-elixir slot permits replacements costing at most 3; a
   3-elixir slot permits at most 4, including cheaper alternatives. The
   sum of the entire eight-card team must also satisfy the user's
   selected maximum average elixir.
3. **Function:** It preserves the source's identifiable required
   capabilities: targeting air and/or ground, swarm/splash response,
   main win condition, tank-killing function and mini-tank duty. Spells
   remain spells, buildings remain buildings, heavy-spell answers remain
   heavy spells, and recognized flying attackers remain flying attackers.
   When source combat data is missing, editorial role taxonomy is used;
   such uncertainty is explicitly disclosed.
4. **Level strength:** The actual current player level is used, **never
   the top-ranked player's level as if the user owned that level**. The
   upper quartile of eligible owned cards sets a feasible benchmark.
   The optimizer gives substantial preference to cards near that
   benchmark, penalizes cards several levels behind it, and gives an
   extra warning/penalty where the global source was much higher level.
   It never invents HP or damage via guessed level scaling.
5. **Eight-card integrity:** A bounded complete-slot assignment algorithm
   checks all valid combinations of the source's eight slot roles and
   the proposed eight owned cards. Every directly adapted candidate
   has a consistent one-to-one mapping before it can enter the final
   leaderboard; no card is assigned twice. Locked cards, exclusions,
   minimum level, original global role structure and overall max
   average elixir still apply.

The final relative recommendation score prioritizes actual readiness:
**20% observed combination cohesion, 25% tactical coverage, 40% owned
level readiness (including its single weakest card), 5% observed
popularity, and 10% function/elixir replacement fidelity.** This is a
transparent heuristic weighting, **not** a measured prediction of wins.

In addition to direct source-deck adaptations, the engine always
considers independently assembled, owned-level-oriented teams
based on verified current card counts, pairs and roles. Such an
**observed-usage alternative** has no claimed one-for-one pro-deck
substitutions: it is shown separately, preserves the player's
ownership/level/global average-elixir restrictions, and competes on
the same measured deck scoring. These are estimated decks, never
falsely claimed to be the exact composition of a global player.

The recommendation evidence panel now shows, for every direct
replacement, the source's observed card level, the user's actual
owned level, both elixir costs, source role coverage retained,
additional benefits, observed source level, the player's level of
the original card, the replacement's actual level, source-backed combat
values where available, the heuristic slot-equivalence estimate and
data limitations. It also displays the weakest owned-card level
and benchmark. Unknown combat stats or special-form benefits are
disclosed as unknown.

**Limits:** No static role algorithm or game-stat registry can
provide 100% real match win guarantees or prove that its output is
mathematically optimal over all Clash Royale matchups. Balance patches,
Evolution/Hero effects, matchup frequencies, placement, timing, and
conditional mechanics can invalidate heuristic counter assumptions.

## Product behavior

The deck finder has a **Global Ranked player sample** dropdown:
**Top 100**, **Top 200**, **Top 300**. The selection changes the actual
upstream request, collection progress, recommendation source and all displayed
sample denominators. Changing the selection clears prior suggestions.

After pressing **Find best deck**, the system:

1. Fetches a new current Global Ranked leaderboard for the requested number
   of accounts. Pages are retrieved through the API's `paging.cursors.after`
   cursor when required, in up-to-100-account pages. If a later page is
   missing, already verified current ranks remain usable and the exact
   leaderboard shortfall is disclosed. If no valid ranks are returned,
   the scan fails.
2. Fetches each available account's recent battle log with bounded parallel
   workers and retries for transient 429 / 5xx / network problems.
   Only actual `pathOfLegend` 1v1 played decks (eight distinct, recognized
   base card identities) count. Both the player and opponent sides of observed
   Ranked battles are considered; a top-ranked player's deck may be recovered
   when they are observed as an opponent in another selected ranked account's
   fresh log. Records retain battle time, evidence source, and played forms.
3. Counts **only actual verified decks**. The source sample can be, for
   example, 99/100, 193/200 or 287/300. Each observed ranked account
   contributes exactly once. Card counts, paired combinations, form counts,
   and role coverage use the actual observation count as denominator; there
   are exactly `sampleSize * 8` analyzed card slots.
4. At the final step, **adapts the verified observed decks to the user's
   actually owned and available cards**, respecting the chosen strategic
   focus, mode, locked/excluded cards, minimum levels, and max average elixir.
   Scoring uses observed pair/role cohesion (20%), strategic coverage
   (25%), the user's actual owned levels including a weak-card penalty
   (40%), verified observed usage (5%), and per-slot replacement fidelity
   (10%). Source rank, played card levels, the player's owned level of
   each original card, replacement levels, elixir differences, preserved
   combat functions, explicit source-backed HP/DPS when available, and
   caveats are all shown. The optimizer **always** considers a bounded
   independently assembled owned-card alternative using observed usage,
   card pairs, levels and complementary roles, even when direct pro-deck
   adaptation succeeds. Those alternatives are labelled separately and
   never represented as an exact global-player deck or a one-to-one
   substitution that the algorithm did not verify.

## Partial-data and accuracy policy

Missing player logs are **not a reason to discard 99 other valid decks**.
Players whose fresh log has no qualifying Ranked 1v1 battle, and who cannot be
verified as an opponent in the same current Ranked sample, are **skipped from
all sample stats and recommendations**. The public UI reports only how many
were skipped; it no longer displays their names or tags in an alarming
"Unavailable Ranked battle evidence" section. This is a per-scan eligibility
decision, not a permanent blocklist: a player with valid Ranked evidence on
a future scan is included. The requested top group is not silently expanded
to ranks outside the chosen Top 100, 200 or 300.
An incomplete top group produces a recommendation from the decks that were
actually verified; it never silently treats missing accounts as zero card
usage or invents their deck lists. The app displays the requested count,
actual leaderboard ranks obtained, verified deck count and number skipped,
plus warnings for leaderboard changes, role-data gaps or old Ranked matches.
Unavailable account rank/name/tag details are not displayed in the public UI.

A missing next-page cursor, upstream error or time-budget limitation can
reduce the observed sample. If no valid ranked 1v1 played deck is available,
the app cannot make a live-data recommendation and reports the failure. If
the account's collection cannot build any legal eight-card team under
the user's filters, it keeps the current deck visibly labelled and explains
the constraint conflict. These are not misleadingly labelled as successful
recommendations.

The game API offers no atomic global top-300 snapshot. When an end-of-scan
leaderboard check can run, changed ranks are disclosed as a warning rather
than discarding actual earlier observations. Source deck battle times may
predate the scan by days, and the upstream game API may itself refresh slowly.
**Counts are exact for the observed sample, not the missing accounts or
the instantaneous global meta.** Recommendations remain editorial estimates,
not measured win rates or guaranteed best decks.

## Important implementation details

- Only `/locations/global/pathoflegend/players` is queried for ranked
  player selection. Do not substitute Trophy Road, a previous season's
  ranking, profiles' selected decks, or external non-top-player decks.
- Each accepted button press initiates new upstream requests. No completed
  analysis, TTL cache, localStorage, saved snapshot, or previous scan is used
  to fill an absent record. HTTP requests and stream responses use no-store.
- Full samples usually require at least 104, 204 or 304 upstream requests
  (one or more leaderboard pages, player profile, cards, 100/200/300 logs,
  and the optional end-of-scan leaderboard refresh). Real attempts can be
  higher because of bounded retries.
- The server's 240-second deadline and user's 250-second browser deadline
  still apply. The scan stops queuing new account work early enough to
  attempt to complete partial analysis before the deadline.
- Player tag, auth token and profile handling are unchanged.
- The 100/200/300 chooser is validated on both client and server; unsupported
  values are rejected.
- Versioned card roles are editorial. Champion/base/evolution/hero support
  and exact battle simulation are limited; no false win probability is shown.

## Validation policy

Only the deployment platform's pre-existing build pipeline may run
automatically when GitHub commits are pushed or merged. No manual tests,
synthetic game API data, extra background scans or independent debugging
are requested as part of this change.
