# Feasibility and source review — checked 14 November 2026

Restored on 15 November from the prior verified research. The reference dataset is partial and patch-specific. It is not a full live combat database or a complete current catalog.

## Real-data foundation

Official bearer-authenticated endpoints provide profile, collection, current deck, recent battles, chests and catalog data. They do not provide all combat statistics or replay events. Historical tracking begins at ingestion; unseen battles outside the recent window cannot be recovered. No token was available to test this account. No complete licensed combat dataset or representative meta feed was connected.

The developer portal is client-rendered. Implementation also uses the requested [community API observations](https://github.com/jthingelstad/cr-agent-api-docs), which are observations rather than an official schema guarantee.

## Field interpretation

- [`cards.md`](https://github.com/jthingelstad/cr-agent-api-docs/blob/main/cards.md): `/cards` returns `items` and Tower Troop `supportItems`. Artwork comes from `iconUrls`. Never hardcode catalog totals.
- [`normalize-card-levels`](https://github.com/jthingelstad/cr-agent-api-docs/blob/main/recipes/normalize-card-levels.md): observed level-16 normalization is `level + (16 - maxLevel)`. Make cap configurable and reject inconsistent raw levels. This is not independently validated against this user's live sample.
- [`interpret-evolution-level`](https://github.com/jthingelstad/cr-agent-api-docs/blob/main/recipes/interpret-evolution-level.md): collection `evolutionLevel` encodes ownership (1 Evolution, 2 Hero, 3 both). Current-deck/battle arrays describe deployed form (1 Evolution, 2 Hero). Unknown values stay unknown. Capability uses `maxEvolutionLevel` and corroborating icon variants. Ownership does not automatically activate a form.
- [`players.md`](https://github.com/jthingelstad/cr-agent-api-docs/blob/main/players.md): `supportCards` is owned towers; `currentDeckSupportCards` is selected tower. Display optional `kingTowerLevel`, positive `collectionLevel`, or CollectionLevel badge progress; never derive current progression from deprecated XP. Partial/empty decks are valid payloads. Teams can contain multiple participants.
- Resolve results with mode context: crown ties can have tiebreak winners, trophy changes/boat flags can provide additional evidence, and unknown outcomes stay unresolved. No spell timing or placement findings can be inferred from battle summaries.

## Official rules and statistics

[Cards & Decks](https://support.clashroyale.com/hc/en-us/articles/49484924205595-Cards-Decks) defines Evolution slot at Arena 3, Hero slot at Arena 5, Wild slot at Arena 10. Hero accepts Heroes/Champions; Wild accepts any special form or Champion. [Champions](https://support.clashroyale.com/hc/en-us/articles/49484915467291-Champions) explicitly permits two Champions in Hero and Wild slots. Do not retain the historical one-Champion restriction. Arena IDs are opaque, not ordinal arena numbers. Event-specific restrictions require verification.

[October balance notes](https://supercell.com/en/games/clashroyale/blog/release-notes/october-balance-changes-2026/) contains October 6/19 changes and explicitly scales numbers at Level 11. `references.ts` records only a partial subset with source, patch, verification time and form. Do not extrapolate other levels. [November support](https://support.clashroyale.com/hc/en-us/articles/57579150651419-What-s-New-November-2026) confirms Giant Evolution (one cycle) and Mirror Evolution (two cycles; November 9 availability).

## Supported access and data rights

[Proxy documentation](https://docs.royaleapi.com/proxy) documents allowlisting `45.79.218.79` on an official key and using `https://proxy.royaleapi.dev/v1`. This is an official-API proxy, not an unrestricted RoyaleAPI analytics feed. Keep tokens server-side. No guaranteed numeric request quota was verified; handle 429/Retry-After and bounded jittered retry.

[Fan Content Policy](https://supercell.com/en/fan-content-policy/) permits qualifying noncommercial fan guides, requires unofficiality disclosure and prohibits endorsement claims. Display official artwork unmodified. This grants no permission to scrape protected analytics.

`public/catalog-sample.json` embeds provenance for a 49-card historical factual sample with official artwork URLs. It is incomplete, not a fresh API response, and not ownership information. Names are expanded from known card IDs; maxLevel is from the observed level-16 scale. Special-form fields are omitted. Replace it with authenticated `/cards` for live use. The requested documentation repo contained no complete catalog fixture.

## Unverified boundaries

Conventional base-card fallback: `https://link.clashroyale.com/deck/en?deck=ID;ID;...` for eight distinct IDs. Advanced form/slot/Tower Troop encoding and on-device opening were not independently verified; explain that forms and tower must be checked in game. The site cannot modify a game account directly.

Current ranked caps/access and event restrictions were not comprehensively verified; do not silently reuse a level-15 cap. No complete battle simulator, measured win probabilities, replay analysis, automatic meta feed or complete upgrade-cost table has been verified.
