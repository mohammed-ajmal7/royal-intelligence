"use client";

import { useMemo, useState } from "react";
import {
  Crown, Search, Shield, Swords, Info, Trophy, Zap,
} from "lucide-react";
import type { Card, Snapshot } from "../lib/model";
import type { MechanicsCatalog } from "../lib/mechanics";
import {
  defaultItemOptions,
  hitsToDefeat,
  rankDeckItems,
  type ItemRankingOptions,
} from "../lib/deckItem";

type Props = {
  player: Snapshot;
  mechanics: MechanicsCatalog | null;
  mechanicsLoading: boolean;
  mechanicsError: string;
  onSelect: (card: Card) => void;
};

function fmt(value: number | null, maxFractionDigits = 0) {
  return value === null ? "—" : value.toLocaleString(undefined, {
    maximumFractionDigits: maxFractionDigits,
  });
}

export function DeckItemView({
  player, mechanics, mechanicsLoading, mechanicsError, onSelect,
}: Props) {
  const [options, setOptions] = useState<ItemRankingOptions>(defaultItemOptions);
  const [damageText, setDamageText] = useState("200");
  const set = (value: Partial<ItemRankingOptions>) =>
    setOptions(previous => ({ ...previous, ...value }));
  const rows = useMemo(
    () => rankDeckItems(player.catalog, mechanics, options),
    [player.catalog, mechanics, options],
  );
  const ranked = rows.filter(item => item.available);
  const unranked = rows.length - ranked.length;
  const first = ranked[0] ?? null;
  const isDefense = options.category === "defense";
  const selectedName = isDefense
    ? options.defenseMetric === "hits" ? "Hits to defeat" : "Hitpoints (HP)"
    : options.attackMetric === "hit" ? "Damage per hit" : "Damage per second";
  const acceptedDamage = hitsToDefeat(1, options.incomingDamage) !== null;

  return (
    <section className="deck-item-page" aria-label="Deck Item rankings">
      <div className="deck-item-intro">
        <span className="deck-item-eyebrow"><Trophy size={16}/> DECK ITEM LEADERBOARD</span>
        <h2>Who is the strongest?</h2>
        <p>
          Compare your cards at their loaded levels. Switch between attack and
          defense, then see the highest real recorded values first.
        </p>
      </div>
      <div className="deck-item-controls">
        <div className="deck-item-filters">
          <label className="deck-item-control">
            <span>Choose category</span>
            <select
              aria-label="Choose ranking category"
              value={options.category}
              onChange={event => set({
                category: event.target.value as ItemRankingOptions["category"],
              })}
            >
              <option value="defense">🛡 Defense — hits it can take</option>
              <option value="attack">⚔ Attack — damage it deals</option>
            </select>
          </label>
          <label className="deck-item-control">
            <span>Sort by (highest first)</span>
            {isDefense ? (
              <select
                aria-label="Choose defense measurement"
                value={options.defenseMetric}
                onChange={event => set({
                  defenseMetric: event.target.value as ItemRankingOptions["defenseMetric"],
                })}
              >
                <option value="hits">Hits needed to defeat</option>
                <option value="hp">Hitpoints — damage absorbed</option>
              </select>
            ) : (
              <select
                aria-label="Choose attack measurement"
                value={options.attackMetric}
                onChange={event => set({
                  attackMetric: event.target.value as ItemRankingOptions["attackMetric"],
                })}
              >
                <option value="hit">Damage per hit</option>
                <option value="dps">Damage per second (DPS)</option>
              </select>
            )}
          </label>
          <label className="deck-item-control">
            <span>Card type</span>
            <select
              aria-label="Filter item type"
              value={options.kind}
              onChange={event => set({
                kind: event.target.value as ItemRankingOptions["kind"],
              })}
            >
              <option value="all">All cards</option>
              <option value="Troop">Troops</option>
              <option value="Building">Buildings</option>
              <option value="Spell">Spells</option>
            </select>
          </label>
          {isDefense && (
            <label className="deck-item-control deck-item-damage">
              <span>Incoming damage per hit</span>
              <span className="deck-item-damage-input">
                <Zap size={17}/>
                <input
                  type="number"
                  aria-label="Enemy damage per hit"
                  min={1}
                  max={100000}
                  step={1}
                  value={damageText}
                  onChange={event => {
                    const value = event.target.value;
                    setDamageText(value);
                    set({ incomingDamage: value.trim() === "" ? NaN : Number(value) });
                  }}
                />
                <small>damage</small>
              </span>
            </label>
          )}
        </div>
        <div className="deck-item-filter-row">
          <label className="deck-item-search">
            <Search size={17}/>
            <input
              aria-label="Search deck items"
              value={options.query}
              placeholder="Search a card…"
              onChange={event => set({query:event.target.value})}
            />
          </label>
          <label className="deck-item-owned">
            <input type="checkbox" checked={options.ownedOnly}
              onChange={event => set({ownedOnly:event.target.checked})}/>
            <span>My collection only</span>
          </label>
        </div>
      </div>

      {player.mode === "demo" && (
        <p className="deck-item-notice">
          <Info size={17}/> Demo collection loaded. Enter a real player tag above
          to rank actual owned cards and levels.
        </p>
      )}
      {mechanicsError && (
        <p className="deck-item-notice">
          <Info size={17}/> {mechanicsError} Cards without numerical combat
          data remain unranked.
        </p>
      )}
      {mechanics?.warnings.length ? (
        <details className="deck-item-source-warnings">
          <summary>Some source files are incomplete ({mechanics.warnings.length})</summary>
          {mechanics.warnings.map(warning=><p key={warning}>{warning}</p>)}
        </details>
      ) : null}
      <p className="deck-item-explainer">
        {isDefense
          ? options.defenseMetric === "hits"
            ? "Hits to defeat = ceiling(HP ÷ incoming damage). Includes the final hit that defeats a unit; hits survived is one less."
            : "Defense = hitpoints of ONE deployed unit at the player's recorded level. No invented defense score."
          : options.attackMetric === "hit"
            ? "Attack = actual recorded damage from one hit, at the card's recorded level. Spell damage is not directly comparable to a troop's sustained attack."
            : "Attack DPS = recorded damage per hit ÷ attack interval. One-unit steady attack only, without abilities, splash or deployment effects."}
        {" "}Shield absorption, damage reduction, buffs, special forms, opponent targeting
        and multiple-unit interactions are not simulated.
      </p>

      {mechanicsLoading && (
        <div className="deck-item-loading" role="status">Loading card combat statistics…</div>
      )}
      {!mechanicsLoading && (
        <>
          <div className="deck-item-results-head">
            <div>
              <div className="deck-item-eyebrow">DESCENDING RANKINGS</div>
              <h3>{isDefense ? <Shield size={20}/> : <Swords size={20}/>} {selectedName}</h3>
              <small>
                {ranked.length} ranked · {unranked} missing values
                {options.ownedOnly ? " · Owned cards" : " · Full catalog"}
              </small>
            </div>
            {first && (
              <div className="deck-item-leader">
                <Trophy size={22}/>
                <div><small>HIGHEST IN THIS SELECTION</small><strong>{first.card.name}</strong></div>
              </div>
            )}
          </div>
          {isDefense && !acceptedDamage && options.defenseMetric === "hits" && (
            <p className="deck-item-notice">
              <Info size={17}/> Enter a valid incoming damage value from 1 to
              100,000 to calculate hits to defeat.
            </p>
          )}
          {rows.length ? (
            <div className="deck-item-list">
              {rows.map(item=>(
                <button
                  type="button"
                  key={item.card.id}
                  className={
                    "deck-item-row" +
                    (item.rank === 1 ? " deck-item-row-first" : "") +
                    (!item.available ? " deck-item-row-unknown" : "")
                  }
                  onClick={() => onSelect(item.card)}
                  aria-label={
                    (item.rank == null ? "Not ranked" : "Rank " + item.rank) +
                    ": " + item.card.name +
                    ", " + (item.value === null ? "stat unavailable" : fmt(item.value,1) + " " + item.unit)
                  }
                >
                  <span className="deck-item-rank">
                    {item.rank === 1 ? <Trophy size={22}/> :
                      item.rank === null ? "—" : "#" + item.rank}
                  </span>
                  <span className="deck-item-art">
                    {item.card.image ? <img src={item.card.image} alt="" loading="lazy"/> :
                      <Crown size={33}/>}
                    {item.card.elixir !== null && (
                      <span className="deck-item-elixir">{item.card.elixir}</span>
                    )}
                  </span>
                  <span className="deck-item-name">
                    <strong>{item.card.name}</strong>
                    <small>{item.kind ?? "Unknown type"} · {item.card.owned
                      ? "Level " + (item.card.level ?? "unknown") : "Not owned"}</small>
                    <span className="deck-item-detail">
                      {isDefense
                        ? <>
                          {item.hp === null ? "HP unknown" : "HP " + fmt(item.hp)}
                          {item.hitsToDefeat !== null && " · Survives " + item.hitsSurvived + " full hits"}
                          {item.unitCount != null && item.unitCount > 1 &&
                            " · " + item.unitCount + " units/card"}
                        </>
                        : <>
                          {item.damage === null ? "Damage unknown" : "Hit " + fmt(item.damage)}
                          {item.dps !== null && " · DPS " + fmt(item.dps,1)}
                        </>}
                    </span>
                  </span>
                  <span className="deck-item-value">
                    <strong>{fmt(item.value, 1)}</strong>
                    <small>{item.value === null ? "Not ranked" : item.unit}</small>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="deck-item-empty">
              <Info size={24}/>
              <strong>No cards match these filters.</strong>
              <p>Try a different card type or clear the search.</p>
            </div>
          )}
          {rows.length > 0 && ranked.length === 0 && (
            <p className="deck-item-notice">
              <Info size={17}/> No reliable {selectedName.toLowerCase()} values
              are available for this selection. No ranks have been invented.
            </p>
          )}
          <div className="deck-item-footer">
            <strong>Where do these numbers come from?</strong>
            <p>
              Player ownership and levels come from Supercell's public profile.
              HP, hit damage, speed and timing are from a separate community-maintained
              data snapshot, which may lag balance changes.
              These rankings are not verified current-patch global rankings.
            </p>
            <p>
              HP and hits are calculated for <b>one unit</b> only; a swarm is
              not treated as one large health bar. Buildings can decay over time,
              and shields, abilities, projectile mechanics and multiple simultaneous
              enemies change real fights.
            </p>
            <a href="https://github.com/RoyaleAPI/cr-api-data"
              target="_blank" rel="noreferrer">View underlying community data ↗</a>
            <small>
              Source fetched: {mechanics?.fetchedAt?.replace("T"," ").slice(0,16) ?? "Unavailable"} UTC.
              Fetch time is not the last balance update.
            </small>
          </div>
        </>
      )}
    </section>
  );
}
