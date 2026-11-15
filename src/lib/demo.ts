import sample from "../../public/catalog-sample.json";
import { normalize, card, Snapshot } from "./model";
export function demo(): Snapshot {
  const items = sample.items.map((c, i) => ({
    ...c,
    level: c.maxLevel - (i % 4),
    evolutionLevel: ["Knight", "Archers", "Skeletons"].includes(c.name) ? 1 : 0,
  }));
  const names = [
    "Hog Rider",
    "Valkyrie",
    "Musketeer",
    "Cannon",
    "Skeletons",
    "Ice Spirit",
    "Fireball",
    "The Log",
  ];
  const deck = names.map((n) => ({
    ...items.find((c) => c.name === n)!,
    evolutionLevel: 0,
  }));
  const at = "2026-11-15T00:00:00Z";
  const s = normalize(
    {
      tag: "#DEMO",
      name: "Training account",
      trophies: 7240,
      bestTrophies: 7420,
      arena: { name: "Training arena" },
      clan: { name: "Training Grounds" },
      cards: items,
      currentDeck: deck,
    },
    { items: sample.items },
    [],
    { items: [{ name: "Sample chest", index: 0 }] },
    at,
  );
  s.mode = "demo";
  s.warnings = [
    "Synthetic training account. These are not your stats.",
    "49-card historical sample; live API replaces this catalog.",
  ];
  s.battles = Array.from({ length: 12 }, (_, i) => {
    const win = i % 3 !== 0,
      own = {
        tag: "#DEMO",
        name: "Training account",
        crowns: win ? 3 : 1,
        cards: deck.map((c) => card(c, true, true)),
      },
      other = {
        tag: "#SAMPLE",
        name: ["Royal Sentinel", "North Star", "Crown Theory"][i % 3],
        crowns: win ? 1 : 3,
        cards: items
          .slice((i % 3) * 8, (i % 3) * 8 + 8)
          .map((c) => card(c, true, true)),
      };
    return {
      id: "demo-" + i,
      time: new Date(Date.parse(at) - i * 35 * 60000).toISOString(),
      mode: i % 4 === 0 ? "2v2" : "Trophy Road",
      team:
        i % 4 === 0
          ? [own, { ...own, tag: "#TEAM", name: "Training teammate" }]
          : [own],
      opponent:
        i % 4 === 0
          ? [other, { ...other, tag: "#OTHER", name: "Training opponent" }]
          : [other],
      outcome: win ? "win" : "loss",
    };
  });
  return s;
}
