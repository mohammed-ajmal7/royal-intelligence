# Royaleon UI pictograms

**Ownership:** These SVG graphics are new, original game-style illustrations created for the Royaleon interface, referencing the *types* of stats displayed in a user-supplied game screenshot. They are not original game sprite files, not Supercell official icons, and not copies downloaded from an unofficial APK dump.

- `stats/*.svg`: scalable 48×48 stat pictograms (hitpoints, damage, hit speed, target, speed, range, count, shields, cycles, rarity/forms, etc).
- `elixir/1.svg` … `elixir/10.svg`: numbered 48×48 elixir-cost pictograms.
- `src/lib/statAssets.ts`: single source of truth for mapping stat labels and costs to assets, also guards stat unit formatting.
- The assets contain inline SVG shapes only. No fonts, remote scripts, fetched icons, or third-party image hosts.

Supercell's official fan kit and [Fan Content Policy](https://supercell.com/en/fan-content-policy/) govern using official game content. Royaleon's card artwork is supplied through the official public Clash Royale card API; these UI icons are locally authored and deliberately distinguishable from protected game sprites. The app remains an unofficial, non-endorsed fan tool.

Use icons decoratively with an adjacent text label; do not make a metric understandable from its icon alone.
