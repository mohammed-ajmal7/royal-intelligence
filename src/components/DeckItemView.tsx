"use client";

import { useMemo, useState } from "react";
import {
  Crown, Search, Shield, Swords, Info, Trophy, Zap, ChevronDown,
  ChevronUp, Layers3, SlidersHorizontal, BookOpen,
} from "lucide-react";
import type { Card, Snapshot } from "../lib/model";
import { getMechanicsRecord, type MechanicsCatalog, type MechanicsCard } from "../lib/mechanics";
import {
  defaultItemOptions,
  hitsToDefeat,
  itemLevelRows,
  rankDeckItems,
  type ItemRankingOptions,
  type RankedItem,
} from "../lib/deckItem";

type Props = {
  player: Snapshot;
  mechanics: MechanicsCatalog | null;
  mechanicsLoading: boolean;
  mechanicsError: string;
  onSelect: (card: Card) => void;
};

const fmt = (value: number | null, digits = 0) =>
  value === null ? "—" : value.toLocaleString(undefined, {
    maximumFractionDigits: digits,
  });
const yesNo = (value: boolean | null) =>
  value === null ? "—" : value ? "Yes" : "No";
const kindName = (kind: string | null) => kind ?? "Unclassified";
const levelLabel = (item: RankedItem) =>
  item.level === null ? "Level unknown" :
  item.levelOrigin === "player" ? "Owned Lv " + item.level :
  "Reference Lv " + item.level;

function ItemLevelDetails({
  item, catalog, incomingDamage, cap, onSelect,
}: {
  item: RankedItem;
  catalog: MechanicsCatalog | null;
  incomingDamage: number;
  cap: number;
  onSelect: (card: Card) => void;
}) {
  const raw = getMechanicsRecord(item.card, catalog);
  const levels = itemLevelRows(item.card, catalog, incomingDamage, cap);
  const known = levels.filter(level => level.hasNumericalStats).length;
  const allSourceFields = Object.entries(raw?.extraStatsByLevel ?? {})
    .filter(([, series]) => series.some(value=>value>0));
  const fullLength = Math.min(30,Math.max(levels.length,
    ...allSourceFields.map(([,series])=>series.length),0));
  const alternateForms = Object.entries(raw?.extraFormsByLevel ?? {})
    .filter(([,fields])=>Object.values(fields).some(series=>series.some(value=>value>0)));
  return (
    <div className="deck-item-expanded">
      <div className="deck-item-expanded-title">
        <div>
          <strong>{item.card.name} — combat information</strong>
          <p>
            {item.card.owned ? "Owned in this player collection" : "Not owned; comparison values are reference data"}
            {" · "}{kindName(item.kind)}
            {item.kindOrigin === "id-family" && " (type inferred from card ID)"}
          </p>
        </div>
        <button className="btn secondary" type="button" onClick={() => onSelect(item.card)}>
          <BookOpen size={15}/> Card details
        </button>
      </div>
      {item.statSubject === "spawned-unit" && (
        <p className="deck-item-spawn-note">
          <Info size={16}/>
          This card summons {item.unitCount ?? "multiple"} {item.statSubjectLabel ?? "units"}s.
          Hitpoints, damage, DPS, targeting and hit endurance below describe
          <strong> one spawned {item.statSubjectLabel ?? "unit"}</strong>,
          not the barrel or the combined damage of every spawned unit.
          Goblin Barrel deals no direct impact damage.
        </p>
      )}
      {item.sourceUrl && (
        <p className="deck-item-source-note">
          <BookOpen size={15}/>
          Game-data reference updated {item.sourceUpdatedAt ?? "date unavailable"}.
          <a href={item.sourceUrl} target="_blank" rel="noreferrer">
            View sourced level table ↗
          </a>
        </p>
      )}
      <div className="deck-item-full-stats">
        {[
          [item.statSubject === "spawned-unit" ? "HP / summoned " + (item.statSubjectLabel ?? "unit") : "HP / unit", fmt(item.hp)],
          [item.statSubject === "spawned-unit" ? "Damage / " + (item.statSubjectLabel ?? "unit") + " hit" : "Damage / hit", fmt(item.damage)],
          [item.statSubject === "spawned-unit" ? "DPS / " + (item.statSubjectLabel ?? "unit") : "DPS / unit", fmt(item.dps, 1)],
          ["Hit interval", item.attackInterval === null ? "—" : fmt(item.attackInterval, 2) + " s"],
          ["Range", item.rangeTiles === null
            ? raw?.rangeLabel ?? "—" : fmt(item.rangeTiles,2) + " tiles"],
          ["Movement", raw?.moveSpeedLabel ??
            (item.moveSpeedRaw === null ? "—" : fmt(item.moveSpeedRaw) + " (raw)")],
          ["Targets air", yesNo(item.targetsAir)],
          ["Targets ground", yesNo(item.targetsGround)],
          ["Buildings only", yesNo(item.buildingsOnly)],
          ["Splash radius", item.splashRadiusTiles === null ? "—" : fmt(item.splashRadiusTiles, 2) + " tiles"],
          ["Unit count", fmt(item.unitCount)],
          ["Deploy time", item.deploySeconds === null ? "—" : fmt(item.deploySeconds, 2) + " s"],
          ["Attack preload", item.firstHitSeconds === null ? "—" : fmt(item.firstHitSeconds, 2) + " s"],
          ["Special mechanics flag", item.specialAbility === null ? "—" : yesNo(item.specialAbility)],
          ["Hits to defeat", fmt(item.hitsToDefeat)],
          ["Complete hits survived", fmt(item.hitsSurvived)],
        ].map(([label,value])=>(
          <div className="deck-item-stat" key={label}>
            <small>{label}</small>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
      <div className="deck-item-level-head">
        <div>
          <h4>All reference levels</h4>
          <small>{known} level rows with numeric HP or damage · {levels.length} level slots</small>
        </div>
      </div>
      <div className="deck-item-level-scroll" role="region"
        aria-label={item.card.name + " level-by-level statistics"} tabIndex={0}>
        <table className="deck-item-level-table">
          <thead>
            <tr>
              <th scope="col">Level</th>
              <th scope="col">HP / unit</th>
              <th scope="col">Damage / hit</th>
              <th scope="col">DPS / unit</th>
              <th scope="col">Hits to defeat</th>
              <th scope="col">Hits survived</th>
            </tr>
          </thead>
          <tbody>
            {levels.map(level=>(
              <tr key={level.level}
                className={level.level === item.level ? "deck-item-current-level" : ""}>
                <td><strong>Lv {level.level}</strong>{level.level === item.level ? " · Selected" : ""}</td>
                <td>{fmt(level.hp)}</td>
                <td>{fmt(level.damage)}</td>
                <td>{fmt(level.dps, 1)}</td>
                <td>{fmt(level.hitsToDefeat)}</td>
                <td>{fmt(level.hitsSurvived)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {allSourceFields.length>0 && (
        <section className="deck-item-all-fields">
          <div className="deck-item-level-head">
            <div>
              <h4>Every sourced numeric field, by level</h4>
              <small>{allSourceFields.length} source columns · including special damage,
                shields, tower damage or duration where published</small>
            </div>
          </div>
          <div className="deck-item-level-scroll" role="region"
            aria-label={item.card.name + " all numeric source fields"} tabIndex={0}>
            <table className="deck-item-level-table">
              <thead><tr><th>Level</th>
                {allSourceFields.map(([label])=><th key={label}>{label}</th>)}
              </tr></thead>
              <tbody>
                {Array.from({length:fullLength},(_,i)=>i+1).map(level=>(
                  <tr key={level}
                    className={level===item.level?"deck-item-current-level":""}>
                    <td>Lv {level}</td>
                    {allSourceFields.map(([label,series])=>(
                      <td key={label}>{series[level-1]>0?fmt(series[level-1],2):"—"}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {alternateForms.length>0 && (
        <section className="deck-item-form-sections">
          <h4>Other forms, abilities and summoned units</h4>
          <p className="deck-item-note">
            These values are separate from the base-card attack and HP.
            They are not added to direct damage or treated as one combined unit.
          </p>
          {alternateForms.map(([form,fields])=>(
            <details key={form} className="deck-item-raw">
              <summary>{form} · {Object.keys(fields).length} numeric fields</summary>
              <div className="deck-item-level-scroll" tabIndex={0}
                role="region" aria-label={item.card.name + " " + form + " statistics"}>
                <table className="deck-item-level-table">
                  <thead><tr><th>Level</th>
                    {Object.keys(fields).map(label=><th key={label}>{label}</th>)}
                  </tr></thead>
                  <tbody>
                    {Array.from({length:Math.min(30,Math.max(0,
                      ...Object.values(fields).map(series=>series.length)))},
                      (_,i)=>i+1).map(level=>(
                      <tr key={level} className={level===item.level?"deck-item-current-level":""}>
                        <td>Lv {level}</td>
                        {Object.entries(fields).map(([label,series])=>(
                          <td key={label}>{series[level-1]>0?fmt(series[level-1],2):"—"}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </section>
      )}
      {!raw && (
        <p className="deck-item-note">
          This card is in the official catalog, but the community data source
          has no numeric combat record for it. Values are intentionally missing.
        </p>
      )}
      {raw?.sourceRecords && (
        <details className="deck-item-raw">
          <summary>Available source metadata and fields (JSON)</summary>
          <p>Reference fields are independently maintained, may be historical,
            and are not a guarantee of in-game performance.</p>
          <pre>{JSON.stringify(raw.sourceRecords,null,2)}</pre>
        </details>
      )}
      <p className="deck-item-note">
        Level rows are directly indexed community reference entries.
        They may not match current in-game leveling or balance changes.
        No unknown level is filled by estimated scaling.
      </p>
    </div>
  );
}

export function DeckItemView({
  player, mechanics, mechanicsLoading, mechanicsError, onSelect,
}: Props) {
  const [options, setOptions] = useState<ItemRankingOptions>(defaultItemOptions);
  const [damageText, setDamageText] = useState("200");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [current, setCurrent] = useState<Record<number, MechanicsCard>>({});
  const [unavailable, setUnavailable] = useState<number[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({done:0,total:0});
  const [errorNote, setErrorNote] = useState("");
  const set = (patch: Partial<ItemRankingOptions>) =>
    setOptions(previous=>({...previous,...patch}));

  const merged = useMemo<MechanicsCatalog | null>(() => {
    const refreshed = Object.values(current);
    if (!mechanics && refreshed.length === 0) return null;
    const byId = new Map<number, MechanicsCard>(
      (mechanics?.cards ?? []).map(card=>[card.id,card])
    );
    for (const card of refreshed) byId.set(card.id,card);
    return {
      source: mechanics?.source ?? "https://crtool.app/en/units/",
      fetchedAt: mechanics?.fetchedAt ?? new Date().toISOString(),
      sourceUpdatedAt: mechanics?.sourceUpdatedAt ?? null,
      warnings: mechanics?.warnings ?? [],
      cards:[...byId.values()],
    };
  },[mechanics,current]);
  async function loadCurrent(card:Card):Promise<void> {
    try {
      const params = new URLSearchParams({name:card.name,id:String(card.id)});
      const response = await fetch("/api/card-reference?" + params);
      const data = await response.json();
      if (!response.ok || data?.card?.id !== card.id ||
          data.card?.provenance !== "crtool-game-data") {
        throw new Error(data?.error ?? "A current card reference is unavailable.");
      }
      setCurrent(previous=>({...previous,[card.id]:data.card as MechanicsCard}));
    } catch (reason) {
      setUnavailable(previous=>previous.includes(card.id)?previous:[...previous,card.id]);
      setErrorNote(reason instanceof Error ? reason.message : "Some cards could not be refreshed.");
    }
  }
  async function syncCatalog(retryFailed = false) {
    if (syncing) return;
    const requested = player.catalog.filter(card=>!card.tower && !current[card.id]
      && (retryFailed || !unavailable.includes(card.id)));
    setSyncing(true);
    setProgress({done:0,total:requested.length});
    setErrorNote("");
    try {
      // Three parallel requests at a time; the server caches each public source
      // for one day. No Supercell token or new player API calls are involved.
      for (let i=0;i<requested.length;i+=3) {
        const batch=requested.slice(i,i+3);
        await Promise.all(batch.map(loadCurrent));
        setProgress({done:Math.min(i+batch.length,requested.length),total:requested.length});
      }
    } finally {
      setSyncing(false);
    }
  }
  const rows = useMemo(
    () => rankDeckItems(player.catalog, merged, options),
    [player.catalog, merged, options],
  );
  const maxLevel = useMemo(() => Math.min(30, Math.max(
    player.cap,
    16,
    ...(merged?.cards.map(card=>Math.max(
      card.hpByLevel?.length ?? 0,
      card.damageByLevel?.length ?? 0,
    )) ?? []),
    ...player.catalog.map(card=>{
      const reference = getMechanicsRecord(card, merged);
      return Math.max(
        reference?.hpByLevel?.length ?? 0,
        reference?.damageByLevel?.length ?? 0,
      );
    }),
  )), [merged, player.cap, player.catalog]);
  const rankedCount = rows.filter(item=>item.available).length;
  const first = rows.find(item=>item.available);
  const isDefense = options.category === "defense";
  const selectedName = isDefense
    ? options.defenseMetric === "hits" ? "Hits to defeat" : "Hitpoints (HP)"
    : options.attackMetric === "hit" ? "Damage per hit" : "Damage per second";
  const sourceOutdated = mechanics?.sourceUpdatedAt
    ? Date.now() - Date.parse(mechanics.sourceUpdatedAt) > 90 * 86400000 : true;
  const acceptedDamage = hitsToDefeat(1,options.incomingDamage) !== null;

  return (
    <section className="deck-item-page" aria-label="Deck Item rankings">
      <div className="deck-item-intro">
        <span className="deck-item-eyebrow"><Trophy size={16}/> ALL-CARD ITEM INTELLIGENCE</span>
        <h2>Rank every card. Compare every available level.</h2>
        <p>
          Browse the entire official card catalog. Compare attack and defense
          using community-sourced numerical combat stats, even for cards
          you have not unlocked.
        </p>
      </div>
      <div className="deck-item-controls">
        <div className="deck-item-filters">
          <label className="deck-item-control">
            <span>Category</span>
            <select aria-label="Choose ranking category" value={options.category}
              onChange={e=>set({category:e.target.value as ItemRankingOptions["category"]})}>
              <option value="attack">⚔ Attack</option>
              <option value="defense">🛡 Defense</option>
            </select>
          </label>
          <label className="deck-item-control">
            <span>Descending by</span>
            {isDefense ? (
              <select aria-label="Choose defense measurement" value={options.defenseMetric}
                onChange={e=>set({defenseMetric:e.target.value as ItemRankingOptions["defenseMetric"]})}>
                <option value="hits">Hits needed to defeat</option>
                <option value="hp">Actual hitpoints (HP)</option>
              </select>
            ) : (
              <select aria-label="Choose attack measurement" value={options.attackMetric}
                onChange={e=>set({attackMetric:e.target.value as ItemRankingOptions["attackMetric"]})}>
                <option value="hit">Damage per hit</option>
                <option value="dps">Damage per second</option>
              </select>
            )}
          </label>
          <label className="deck-item-control">
            <span>Levels to compare</span>
            <select aria-label="Select level comparison mode" value={options.levelMode}
              onChange={e=>set({levelMode:e.target.value as ItemRankingOptions["levelMode"]})}>
              <option value="comparison">Same reference level (fair)</option>
              <option value="player">My levels + reference fallback</option>
            </select>
          </label>
          <label className="deck-item-control">
            <span>Reference level</span>
            <select aria-label="Select reference level" value={options.referenceLevel}
              onChange={e=>set({referenceLevel:Number(e.target.value)})}>
              {Array.from({length:maxLevel},(_,i)=>i+1).map(level=>(
                <option key={level} value={level}>Level {level}</option>
              ))}
            </select>
          </label>
          <label className="deck-item-control">
            <span>Card type</span>
            <select aria-label="Filter item type" value={options.kind}
              onChange={e=>set({kind:e.target.value as ItemRankingOptions["kind"]})}>
              <option value="all">All types</option>
              <option value="Troop">Troops</option>
              <option value="Building">Buildings</option>
              <option value="Spell">Spells</option>
              <option value="Other">Other / unclassified</option>
            </select>
          </label>
          {isDefense && (
            <label className="deck-item-control deck-item-damage">
              <span>Incoming damage per hit</span>
              <span className="deck-item-damage-input">
                <Zap size={17}/>
                <input type="number" aria-label="Enemy damage per hit"
                  min={1} max={100000} step={1} value={damageText}
                  onChange={e=>{
                    setDamageText(e.target.value);
                    set({incomingDamage:e.target.value.trim() === ""
                      ? NaN : Number(e.target.value)});
                  }}/>
                <small>damage</small>
              </span>
            </label>
          )}
        </div>
        <div className="deck-item-filter-row">
          <label className="deck-item-search">
            <Search size={17}/>
            <input aria-label="Search deck items" value={options.query}
              placeholder="Find any card…" onChange={e=>set({query:e.target.value})}/>
          </label>
          <label className="deck-item-owned">
            <input type="checkbox" checked={options.ownedOnly}
              onChange={e=>set({ownedOnly:e.target.checked})}/>
            <span>Only cards I own</span>
          </label>
        </div>
        <p className="deck-item-level-disclosure">
          <SlidersHorizontal size={16}/>
          {options.levelMode === "comparison"
            ? "Fair comparison: every card uses reference level " + options.referenceLevel + ". Your collection level is not changed."
            : "Owned cards use their recorded player level. Unowned cards use reference level " +
              options.referenceLevel + ". These mixed-level ranks are not a same-level comparison."}
        </p>
      </div>
      {player.mode === "demo" && (
        <p className="deck-item-notice"><Info size={17}/>
          Demo collection loaded. Search a real player tag above to see ownership
          and actual player card levels.
        </p>
      )}
      {mechanicsError && (
        <p className="deck-item-notice"><Info size={17}/>
          {mechanicsError} Entries without sourced stats remain visible but unranked.
        </p>
      )}
      {sourceOutdated && !mechanicsLoading && mechanics && (
        <p className="deck-item-notice"><Info size={17}/>
          Combat data is an older community reference, not verified for the latest
          Clash Royale balance patch. Do not treat these as confirmed live damage values.
        </p>
      )}
      {!!mechanics?.warnings.length && (
        <details className="deck-item-source-warnings">
          <summary>Combat data source notices ({mechanics.warnings.length})</summary>
          {mechanics.warnings.map((warning,i)=><p key={i}>{warning}</p>)}
        </details>
      )}
      <div className="deck-item-refresh">
        <div>
          <strong>2026 card reference coverage</strong>
          <p>
            {Object.keys(current).length} of {player.catalog.filter(c=>!c.tower).length} cards
            refreshed from individual published game-data pages.
            {" "}{unavailable.length} current references unavailable.
            Unrefreshed cards retain their historical data where it exists.
          </p>
          {syncing && <progress aria-label="Card reference sync progress"
            value={progress.done} max={Math.max(1,progress.total)}/>}
          {errorNote && <small role="status">{errorNote}</small>}
        </div>
        <button type="button" className="btn secondary"
          disabled={syncing || mechanicsLoading}
          onClick={()=>{
            if (unavailable.length) setUnavailable([]);
            void syncCatalog(true);
          }}>
          <Layers3 size={17}/>
          {syncing
            ? "Loading "+progress.done+"/"+progress.total+" cards…"
            : Object.keys(current).length
              ? "Refresh remaining card data"
              : "Get all available card stats"}
        </button>
      </div>
      <p className="deck-item-explainer">
        {isDefense
          ? options.defenseMetric === "hits"
            ? "Hits to defeat = ceil(HP ÷ incoming hit damage). This includes the lethal hit. The unit survives one fewer complete hits."
            : "HP is the sourced hitpoints of one unit, not a subjective defense score."
          : options.attackMetric === "hit"
            ? "Damage per hit is one sourced attack/effect value, not overall winning potential."
            : "DPS is sourced damage per hit ÷ hit interval, without special attack phases or abilities."}
        {" "}Shield mechanics, variable damage, temporary buffs, swarms, knockback,
        building decay and live combat timing require additional simulation.
      </p>
      {mechanicsLoading ? (
        <div className="deck-item-loading" role="status">Loading combat reference…</div>
      ) : (
        <>
          <div className="deck-item-results-head">
            <div>
              <div className="deck-item-eyebrow">DESCENDING RANKINGS</div>
              <h3>{isDefense ? <Shield size={20}/> : <Swords size={20}/>} {selectedName}</h3>
              <small>{rankedCount} ranked · {rows.length-rankedCount} missing values
                {" · "}{options.ownedOnly ? "My collection" : "Full catalog"}
                {" · "}{options.levelMode === "comparison"
                  ? "Reference Lv " + options.referenceLevel : "Mixed owned/reference levels"}
              </small>
            </div>
            {first && (
              <div className="deck-item-leader">
                <Trophy size={22}/>
                <div><small>HIGHEST IN THIS SELECTION</small><strong>{first.card.name}</strong></div>
              </div>
            )}
          </div>
          {isDefense && options.defenseMetric === "hits" && !acceptedDamage && (
            <p className="deck-item-notice"><Info size={17}/>
              Enter damage per hit from 1 to 100,000 to rank survivability.
            </p>
          )}
          {rows.length ? (
            <div className="deck-item-list">
              {rows.map(item=>(
                <div className="deck-item-entry-wrap" key={item.card.id}>
                  <button type="button"
                    className={"deck-item-row" +
                      (item.rank === 1 ? " deck-item-row-first" : "") +
                      (!item.available ? " deck-item-row-unknown" : "")}
                    onClick={()=>onSelect(item.card)}
                    aria-label={(item.rank===null?"Not ranked":"Rank "+item.rank) +
                      ": "+item.card.name + ", "+
                      (item.value===null?"stat unavailable":fmt(item.value,1)+" "+item.unit)}>
                    <span className="deck-item-rank">
                      {item.rank===1?<Trophy size={22}/> :
                        item.rank===null?"—":"#"+item.rank}
                    </span>
                    <span className="deck-item-art">
                      {item.card.image
                        ? <img src={item.card.image} alt="" loading="lazy"/>
                        : <Crown size={33}/>}
                      {item.card.elixir!==null &&
                        <span className="deck-item-elixir">{item.card.elixir}</span>}
                    </span>
                    <span className="deck-item-name">
                      <strong>{item.card.name}</strong>
                      <small>
                        {kindName(item.kind)} · {levelLabel(item)}
                        {item.kindOrigin==="id-family"?" · Inferred type":""}
                      </small>
                      <span className="deck-item-detail">
                        {item.value===null
                          ? item.missingReason ?? "Numeric value unavailable"
                          : isDefense
                            ? (item.statSubject === "spawned-unit" ? "HP per " + (item.statSubjectLabel ?? "unit") + " " : "HP ") + fmt(item.hp)+
                              (item.hitsSurvived!==null
                                ?" · "+fmt(item.hitsSurvived)+" full hits survived":"")
                            : (item.statSubject === "spawned-unit" ? (item.statSubjectLabel ?? "Unit") + " hit " : "Hit ") + fmt(item.damage)+
                              (item.dps!==null?" · DPS "+fmt(item.dps,1):"")}
                        {item.unitCount!==null && item.unitCount>1
                          ?" · "+item.unitCount+" units per card":""}
                      </span>
                      {item.sourceUrl && (
                        <span className="deck-item-source-label">
                          Game data {item.sourceUpdatedAt ?? "undated"}
                          {item.statSubject === "spawned-unit" ? " · per spawned unit" : ""}
                        </span>
                      )}
                      <span className="deck-item-owned-label">
                        {item.card.owned
                          ? "Owned · actual Lv "+(item.card.level??"unknown")
                          : "Not owned · reference stats"}
                      </span>
                    </span>
                    <span className="deck-item-value">
                      <strong>{fmt(item.value,1)}</strong>
                      <small>{item.value===null?"Not ranked":item.unit}</small>
                    </span>
                  </button>
                  <button type="button"
                    className="deck-item-expand"
                    aria-expanded={expanded===item.card.id}
                    aria-controls={"item-levels-"+item.card.id}
                    onClick={()=>{
                      setExpanded(value=>value===item.card.id?null:item.card.id);
                      if(!current[item.card.id] && !unavailable.includes(item.card.id))
                        void loadCurrent(item.card);
                    }}>
                    <Layers3 size={15}/>
                    {expanded===item.card.id?"Hide level stats":"All levels + full card stats"}
                    {expanded===item.card.id?<ChevronUp size={16}/>:<ChevronDown size={16}/>}
                  </button>
                  {expanded===item.card.id &&
                    <div id={"item-levels-"+item.card.id}>
                      <ItemLevelDetails item={item} catalog={merged}
                        incomingDamage={options.incomingDamage} cap={player.cap}
                        onSelect={onSelect}/>
                    </div>}
                </div>
              ))}
            </div>
          ) : (
            <div className="deck-item-empty">
              <Info size={24}/>
              <strong>No cards match these filters.</strong>
              <p>Try another type, a different name, or the full catalog.</p>
            </div>
          )}
          {rows.length>0 && rankedCount===0 &&
            <p className="deck-item-notice"><Info size={17}/>
              No numerical {selectedName.toLowerCase()} values are available
              at these levels from the selected source. Rankings are not fabricated.
            </p>}
          <div className="deck-item-footer">
            <strong>Official API and community reference are different sources.</strong>
            <p>
              Supercell provides the live card catalog, icons, elixir cost,
              ownership and player levels. The normal official public API
              does not supply a complete live combat-stat table for every level.
              HP, damage and related fields come from independently maintained
              game-data references. Minion Giant and Goblin Barrel have
              dated November 2026 reference values; older cards may use
              an earlier community snapshot.
            </p>
            <p>
              Reference numbers are not certified current balance-patch values.
              An unowned card is compared at your selected reference level,
              not falsely labeled as unlocked. Open any item to view every
              available reference level and its raw source fields.
            </p>
            <a href="https://crtool.app/en/units/"
              target="_blank" rel="noreferrer">Community source data ↗</a>
            <small>
              Source updated: {mechanics?.sourceUpdatedAt?.slice(0,10) ?? "Unverified"}.
              {" "}Downloaded: {mechanics?.fetchedAt?.replace("T"," ").slice(0,16) ?? "Unavailable"} UTC.
              Download time is not the game's balance patch date.
            </small>
          </div>
        </>
      )}
    </section>
  );
}
