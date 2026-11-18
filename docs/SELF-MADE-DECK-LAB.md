# Self-Made Deck Generator — eight-role owned-collection blueprint

This mode is independent of the Top Global Player Comparison mode.

## Selection contract

Only the active player's owned base cards are eligible; each requires a
recorded level and elixir cost. Tower troops are excluded. Minimum-level,
required-card, excluded-card and maximum-average-elixir filters apply. At most
two eligible Champions may be selected.

Eight separate cards must fill the following mandatory positions:

1. Win condition: repeatable tower-damage pressure.
2. Mini tank: ground absorption.
3. Air defender: sustained anti-air damage.
4. Air + splash: both air targeting and classified group damage.
5. Tank killer or defensive building: high-HP threat counter.
6. Ground defense: efficient ground defender.
7. Small spell: bait/swarm answer.
8. Heavy spell: support removal/pressure.

If any slot is impossible, no deck is invented. These are user-requested
strict slots, not a universal theorem about the best competitive archetypes.

## Numerical analysis

Each role checks every eligible owned card:

- 50% owned-level readiness relative to the 75th-percentile owned-level benchmark.
- 25% role-specific function fit including targeted cost/attack correction.
- Up to 25% known published base mechanics rating, discounted by data completeness.

Unknown statistics have zero evidence weight, not a claimed value of zero.
When available at the exact owned level, the app shows HP, damage, DPS,
hit interval, attack range, targeting, area radius, and ability recording.
Missing data is labeled unknown. Static community data can lag live patches.
Group member DPS must never be interpreted as whole squad DPS.

A bounded 500-width beam combines the eight distinct roles with hard card
locks, bans and average-cost limits. This considers all eligible cards for
each role but does not enumerate every possible eight-card permutation.
Deck ranking combines 48% mean role fit, 29% structural score, 23% tactical
score, and a small feasible special-form bonus, minus redundancy penalties.
Scores are editorial estimates, not measured win probabilities.

## Evolution, Hero and Wild (2026)

A deck has one Evolution, one Hero and one Wild eligible slot, subject
to the player's in-game unlocks and game mode. Evolution can fill Evolution
or Wild, Hero and Champion can fill Hero or Wild, and one card is never
assigned twice.

Published evolved-form stats appear at the exact owned level when the
source labels and provides them. Unrecorded Evolution ability multipliers
are not estimated. Unlocked forms do not prove they are equipped.

## Gameplay and validation

Both generators use the selected deck's own eight cards for the same
phase-by-phase How to Play This Deck guidance (opening, single elixir,
double elixir, overtime, heavy-air, tanks, swarms, ground pressure,
card-specific jobs). No placement prediction or live win-rate claim is made.

Development checks: npm test, npm run typecheck, npm run build:vercel.
The deck-lab CI workflow runs tests and TypeScript checks on pull requests.
Successful compilation does not replace gameplay QA.
