"use client";
import { useMemo, useState } from "react";
import { ArrowLeftRight, Crown, Shield, Swords, X } from "lucide-react";
import type { Card } from "../lib/model";
import {
  resolveMechanics,
  MECHANICS_SOURCE,
  type MechanicsCatalog,
} from "../lib/mechanics";
import {
  comparisonDelta,
  detailStats,
  formatStat,
  signedStat,
  type CardStat,
} from "../lib/cardDetails";
import { verifiedStats } from "../lib/references";

type Props = {
  card: Card;
  cards: Card[];
  mechanics: MechanicsCatalog | null;
  loading: boolean;
  error: string;
  demo: boolean;
  onClose: () => void;
};
const ownership = (value: boolean | null) =>
  value == null ? "Unknown" : value ? "Yes" : "No";
function CardPortrait({
  card,
  level,
  side,
}: {
  card: Card;
  level: number | null;
  side: string;
}) {
  return (
    <div className={`detail-portrait ${side}`}>
      {card.image ? (
        <img src={card.image} alt={card.name} />
      ) : (
        <Crown size={48} />
      )}
      <div>
        <small>
          {card.rarity} · {card.elixir ?? "?"} elixir
        </small>
        <h3>{card.name}</h3>
        <span>Viewing level {level ?? "unknown"}</span>
        <small>
          {card.owned
            ? `Collection level ${card.level ?? "unknown"}`
            : "Not owned"}
        </small>
      </div>
    </div>
  );
}
function StatValue({
  stat,
  other,
  comparing,
  side,
}: {
  stat: CardStat;
  other?: CardStat;
  comparing: boolean;
  side: string;
}) {
  const result = comparisonDelta(
    stat.value,
    other?.value ?? null,
    stat.direction,
  );
  const maximum = Math.max(stat.value ?? 0, other?.value ?? 0);
  const width =
    stat.value === null || maximum === 0 ? 0 : (stat.value / maximum) * 100;
  return (
    <div className={`detail-value ${side}`}>
      <strong>
        {formatStat(stat.value)}{" "}
        {stat.value !== null && <small>{stat.unit}</small>}
      </strong>
      {comparing && (
        <>
          <div className="detail-track" aria-hidden="true">
            <span style={{ width: `${width}%` }} />
          </div>
          <span className={`detail-delta ${result.tone}`}>
            {signedStat(result.delta)}
            {result.delta !== null && result.delta !== 0 ? ` ${stat.unit}` : ""}
          </span>
        </>
      )}
    </div>
  );
}
function Traits({
  card,
  level,
  catalog,
}: {
  card: Card;
  level: number | null;
  catalog: MechanicsCatalog | null;
}) {
  const m = resolveMechanics({ ...card, level }, catalog);
  return (
    <dl className="detail-traits">
      {[
        ["Type", m?.kind ?? "Unknown"],
        ["Targets air", ownership(m?.targetsAir ?? null)],
        ["Targets ground", ownership(m?.targetsGround ?? null)],
        ["Buildings only", ownership(m?.buildingsOnly ?? null)],
        ["Evolution owned", ownership(card.evo)],
        ["Hero owned", ownership(card.hero)],
        ["Active collection form", card.active],
        ["Roles", card.roles.join(", ") || "Unclassified"],
      ].map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}
export function CardDetails({
  card,
  cards,
  mechanics,
  loading,
  error,
  demo,
  onClose,
}: Props) {
  const [left, setLeft] = useState(card);
  const [otherId, setOtherId] = useState(0);
  const [query, setQuery] = useState("");
  const [equalLevels, setEqualLevels] = useState(false);
  const [level, setLevel] = useState(11);
  const [damage, setDamage] = useState("200");
  const right = cards.find((c) => c.id === otherId && c.id !== left.id) ?? null;
  const leftLevel = equalLevels ? level : left.level;
  const rightLevel = equalLevels ? level : (right?.level ?? null);
  const incoming = damage.trim() ? Number(damage) : NaN;
  const a = detailStats(left, mechanics, leftLevel, incoming);
  const b = right ? detailStats(right, mechanics, rightLevel, incoming) : [];
  const source = mechanics?.cards.find((c) => c.id === left.id);
  const otherSource = mechanics?.cards.find((c) => c.id === right?.id);
  const choices = useMemo(
    () =>
      cards
        .filter(
          (c) =>
            c.id !== left.id &&
            (c.id === otherId ||
              c.name.toLowerCase().includes(query.trim().toLowerCase())),
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [cards, left.id, otherId, query],
  );
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <section
        className="modal card-detail-modal"
        role="dialog"
        aria-modal="true"
        aria-label={`${left.name} card details`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="detail-heading">
          <div>
            <span className="deck-item-eyebrow">CARD INTELLIGENCE</span>
            <h2>{right ? "Head to head" : "Inside the card"}</h2>
          </div>
          <button
            className="icon-btn"
            aria-label="Close card details"
            onClick={onClose}
          >
            <X />
          </button>
        </header>
        <div className="detail-selectors">
          <label>
            Find a comparison card
            <input
              aria-label="Find comparison card"
              placeholder="Search all cards…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            Compare against
            <select
              aria-label="Comparison card"
              value={right?.id ?? 0}
              onChange={(e) => setOtherId(Number(e.target.value))}
            >
              <option value={0}>Choose a second card…</option>
              {choices.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {!c.owned ? " · not owned" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="detail-level-controls">
          <label>
            <input
              type="checkbox"
              checked={equalLevels}
              onChange={(e) => setEqualLevels(e.target.checked)}
            />{" "}
            Compare at the same level
          </label>
          {equalLevels && (
            <label>
              Display level
              <select
                aria-label="Comparison level"
                value={level}
                onChange={(e) => setLevel(Number(e.target.value))}
              >
                {Array.from({ length: 16 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        <div className={`detail-portraits ${right ? "is-comparing" : ""}`}>
          <CardPortrait card={left} level={leftLevel} side="left" />
          {right && (
            <>
              <button
                className="detail-swap icon-btn"
                aria-label="Swap comparison cards"
                onClick={() => {
                  setLeft(right);
                  setOtherId(left.id);
                  setQuery("");
                }}
              >
                <ArrowLeftRight size={20} />
              </button>
              <CardPortrait card={right} level={rightLevel} side="right" />
            </>
          )}
        </div>
        {source?.description && (
          <p className="detail-description">{source.description}</p>
        )}
        {right && otherSource?.description && (
          <p className="detail-description">
            <b>{right.name}:</b> {otherSource.description}
          </p>
        )}
        <p className="detail-context">
          Base-form statistics, one unit.{" "}
          {demo
            ? "Collection levels are synthetic demo values."
            : "Collection levels come from the loaded profile."}{" "}
          {right && !equalLevels && leftLevel !== rightLevel
            ? "Different levels are selected; enable same-level comparison for a level playing field."
            : ""}
        </p>
        {loading && <p role="status">Loading combat statistics…</p>}
        {error && (
          <p role="alert" className="deck-item-notice">
            {error}
          </p>
        )}
        {!loading && !source && (
          <p className="deck-item-notice">
            This card has no matching combat record in the source. Missing
            values are unavailable, never zero.
          </p>
        )}
        <div className="detail-stat-heading">
          <h3>
            <Swords size={18} /> Combat statistics
          </h3>
          {right && <small>Each difference = this card − the other card</small>}
        </div>
        {right && (
          <p className="detail-legend">
            <span className="better">Green: favorable value</span>
            <span className="worse">Red: unfavorable value</span>
            <span>Speed and unit count: neutral context</span>
          </p>
        )}
        {mechanics?.sourceUpdatedAt && <p className="deck-item-notice">Combat source updated {mechanics.sourceUpdatedAt.slice(0,10)}. These records are not verified against the current balance patch.</p>}
      <div className="detail-stat-list">
        {right && <div className="detail-column-names"><strong>{left.name}</strong><strong>{right.name}</strong></div>}
          {a.map((stat, i) => (
            <div className="detail-stat-row" key={stat.key}>
              <div className="detail-stat-label">
                <span>{stat.label}</span>
                <small>
                  {stat.direction === "lower"
                    ? "Lower is favorable"
                    : stat.direction === "higher"
                      ? "Higher is favorable"
                      : "No universal advantage"}
                </small>
              </div>
              <div
                className={`detail-stat-values ${right ? "is-comparing" : ""}`}
              >
                <StatValue
                  stat={stat}
                  other={b[i]}
                  comparing={!!right}
                  side="left"
                />
                {right && (
                  <StatValue stat={b[i]} other={stat} comparing side="right" />
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="detail-hit-input">
          <Shield size={20} />
          <label>
            Incoming damage per hit
            <input
              aria-label="Details incoming damage per hit"
              type="number"
              min={1}
              max={100000}
              value={damage}
              onChange={(e) => setDamage(e.target.value)}
            />
          </label>
          <p>
            Hits to defeat = ceiling(HP ÷ damage), including the final hit.
            Excludes shields, reduction, decay and healing.
          </p>
        </div>
        {(!Number.isFinite(incoming) || incoming < 1 || incoming > 100000) && (
          <p role="alert">Enter damage between 1 and 100,000.</p>
        )}
        <h3>Targeting & collection</h3>
        <div className={`detail-trait-columns ${right ? "is-comparing" : ""}`}>
          <div>
            <h4>{left.name}</h4>
            <Traits card={left} level={leftLevel} catalog={mechanics} />
          </div>
          {right && (
            <div>
              <h4>{right.name}</h4>
              <Traits card={right} level={rightLevel} catalog={mechanics} />
            </div>
          )}
        </div>
        <details className="detail-source">
          <summary>All available source fields</summary>
          <p>
            Exact community records, including special attacks, shields, spawns
            and projectile fields where supplied. Raw values use source units
            and base levels; they are not automatically scaled to the selected
            level. Zero or null fields may mean inactive or unspecified. These
            are not additional verified comparison scores.
          </p>
          {[source, ...(right ? [otherSource] : [])].map((entry, i) => (
            <div key={i}>
              <h4>{i === 0 ? left.name : right?.name}</h4>
              {entry?.sourceRecords ? (
                Object.entries(entry.sourceRecords).map(([name, record]) => (
                  <details key={name}>
                    <summary>{name} record</summary>
                    <pre>{JSON.stringify(record, null, 2)}</pre>
                  </details>
                ))
              ) : (
                <p>No raw record available.</p>
              )}
            </div>
          ))}
        </details>
        {verifiedStats.some((v) => v.cardId === left.id) && (
          <details className="detail-source">
            <summary>Historical official patch references</summary>
            {verifiedStats
              .filter((v) => v.cardId === left.id)
              .map((v, i) => (
                <p key={i}>
                  <a href={v.sourceUrl} target="_blank" rel="noreferrer">
                    {v.form} · {v.statistic}: {v.value} {v.unit} ↗
                  </a>{" "}
                  · Level {v.level ?? "all"} · {v.patch}
                </p>
              ))}
          </details>
        )}
        <footer className="detail-source">
          <a href={MECHANICS_SOURCE} target="_blank" rel="noreferrer">
            Community data source ↗
          </a>
          <p>
            Downloaded{" "}
            {mechanics?.fetchedAt
              ? new Date(mechanics.fetchedAt).toLocaleString()
              : "not yet"}
            . Download time is not the balance-patch date. Data may lag the live
            game; unavailable levels are never extrapolated.
          </p>
          <p>
            DPS is damage ÷ attack interval, excluding abilities, attack ramps,
            splash totals and spawn damage. A bigger bar does not prove a card
            wins a fight. Evolution and Hero combat values are not mixed into
            base-form comparisons.
          </p>
          {mechanics?.warnings.map((w) => (
            <p key={w}>{w}</p>
          ))}
        </footer>
      </section>
    </div>
  );
}
