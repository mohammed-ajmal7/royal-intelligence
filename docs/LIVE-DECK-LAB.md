# Global Ranked Deck Laboratory — Top 100, 200 or 300

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
   Scoring uses observed live combinations (35%), tactical coverage (30%),
   owned-level readiness (25%), and observed card frequency (10%). Source
   player rank, source deck, similarities, substitutions, score breakdown,
   and relevant uncertainty are displayed. If direct observed-deck
   adaptation produces no legal candidate, the engine also attempts a
   bounded owned-card combination search scored by **actual observed usage,
   card pairs, levels and complementary roles**. That last-resort team is
   explicitly labelled "observed-usage fallback" and linked to the closest
   source deck for comparison; it is never represented as a deck actually
   played by that professional account.

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
actual leaderboard ranks obtained, actual verified deck sample, missing
player ranks/tags and reasons, and warnings for leaderboard changes,
role-data gaps, or old Ranked matches.

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
