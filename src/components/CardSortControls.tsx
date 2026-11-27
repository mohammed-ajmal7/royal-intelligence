"use client";

import type { CardStatSortMetric, CardStatSortMode } from "../lib/cardCollectionSort";

type Props = {
  sort: CardStatSortMetric;
  mode: CardStatSortMode;
  status: "idle" | "loading" | "ready" | "unavailable";
  onSortChange: (sort: CardStatSortMetric) => void;
  onModeChange: (mode: CardStatSortMode) => void;
};

export function CardSortControls({ sort, mode, status, onSortChange, onModeChange }: Props) {
  return (
    <div className="ri-card-sort-controls">
      <label className="ri-card-sort-select">
        <span>Sort by</span>
        <select aria-label="Sort cards by" value={sort}
          onChange={event => onSortChange(event.target.value as CardStatSortMetric)}>
          <option value="none">Default order</option>
          <option value="hitpoints">Highest Hitpoints</option>
          <option value="damage">Highest Damage</option>
          <option value="dps">Highest Damage/Sec</option>
        </select>
      </label>
      <div className="ri-card-sort-level">
        <span className="ri-card-sort-level-label">Compare at</span>
        <div className="ri-card-sort-toggle" role="group" aria-label="Card stat level">
          {(["current", "max"] as const).map(value => (
            <button key={value} type="button" aria-pressed={mode === value}
              className={mode === value ? "is-active" : ""}
              onClick={() => onModeChange(value)}>{value === "current" ? "Current" : "Max"}</button>
          ))}
        </div>
      </div>
      {sort !== "none" && status === "loading" &&
        <span className="ri-card-sort-status" role="status">Loading card stats…</span>}
      {sort !== "none" && status === "unavailable" &&
        <span className="ri-card-sort-status" role="status">Stat data unavailable</span>}
      {sort !== "none" && status === "ready" &&
        <span className="ri-card-sort-status">
          {mode === "current"
            ? "Uses each card’s owned level; cards without a current level sort last."
            : "Uses the highest published level for each card."}
        </span>}
    </div>
  );
}
