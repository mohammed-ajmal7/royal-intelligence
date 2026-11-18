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

## Role-first numerical selection

The generator first filters to cards the player **actually owns**, with a valid
level and elixir cost, excluding tower cards and applying locks and bans. It
then classifies every eligible card by all applicable roles. A mini tank must
cost at most five elixir; air+splash must have an anti-air role and independently
classified group-control capability.

Each of the eight categories uses a **different mechanical comparison** using
published combat numbers at each card's exact owned level:

- Win condition: DPS, hit damage, survivability, DPS per elixir, cost.
- Mini tank: HP, HP per elixir, DPS, cost.
- Air defender: DPS, DPS per elixir, range, hit damage, HP, cost.
- Air+splash: area radius, DPS, range, hit damage, HP, cost.
- Tank killer/building: DPS, hit damage, HP, range, cost.
- Ground defense: defensive HP/DPS efficiency, durability, damage, deployment count, cost.
- Small spell: hit damage, radius, elixir cost.
- Heavy spell: hit damage, radius, elixir cost.

The observed metrics are individually compared to the **best known value
among the eligible owned cards in the same category**. This avoids directly
adding HP to DPS or declaring the card with the highest single stat a winner.

Numerical metrics have up to 60% weight, subject to the proportion of
relevant published combat fields that are actually available; owned level has
25% and verified functional fit 15%. Unlocked Evolution/Hero availability
can add up to 5 small *flexibility* points, never an invented damage bonus.
Unknown values do not count as zero, and low-coverage ranks must be read with
caution. A base unit's HP/DPS is never multiplied into aggregate group DPS
without a published whole-card measurement. Some community data can lag the
current balance patch.

A bounded 500-width beam searches assignments across eight slots, enforcing
distinct cards, Champion limits, required cards and average-cost cap.
It prioritizes mean role strength before team scoring (85% role strength,
8% structural score, 7% tactical score, a small legal special-slot
eligibility bonus, and redundancy penalties). It **does not** prove a
globally optimal assignment or predict match win rates.

The interface shows the selected eight cards, a full ordered comparison
against **every eligible owned alternative in each role**, observed stats,
coverage, Evolution/Hero availability and the how-to-play guide.

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
