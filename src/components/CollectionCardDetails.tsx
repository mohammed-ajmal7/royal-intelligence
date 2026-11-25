"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Crown, X } from "lucide-react";
import type { Card } from "../lib/model";
import type { CardReferenceSection, CurrentReference } from "../lib/liveCardReference";
import { getMechanicsRecord, MECHANICS_SOURCE, type MechanicsCatalog } from "../lib/mechanics";
import { statIconPath, statValueWithUnit, elixirAsset } from "../lib/statAssets";
import "./collection-card-details.css";

type Form = "base" | "evolution" | "hero";
type Props = {
  card: Card;
  cap: number;
  mechanics: MechanicsCatalog | null;
  mechanicsLoading: boolean;
  deckAction?: { label: string; disabled: boolean; run: () => void };
  onClose: () => void;
};

const priority = (label:string) =>
  /hit ?points|health/i.test(label) ? 0 :
  /\bdamage\b/i.test(label) ? 1 :
  /hit speed|attack speed/i.test(label) ? 2 :
  /target/i.test(label) ? 3 :
  /^speed|movement speed/i.test(label) ? 4 :
  /range/i.test(label) ? 5 :
  /count/i.test(label) ? 6 : 7;

function FactGrid({ facts, combat = false, unavailableFacts = [] }: { facts: Record<string,string>; combat?: boolean; unavailableFacts?: readonly string[] }) {
  const entries=Object.entries(facts);
  if (!entries.length) return null;
  if (combat) entries.sort(([a],[b]) => priority(a)-priority(b));
  return <dl className={"ri-inspector-facts "+(combat?"ri-inspector-combat-facts":"ri-inspector-information-facts")}>
    {entries.map(([label,value])=><div key={label} className={"ri-inspector-fact" + (unavailableFacts.includes(label) ? " is-unavailable" : "")}>
      {statIconPath(label)&&<img className="ri-inspector-stat-icon" src={statIconPath(label)!} alt="" loading="lazy" aria-hidden="true"/>}
      <div className="ri-inspector-fact-body">
        <dt>{label}</dt><dd>{statValueWithUnit(value,label)}</dd>
      </div>
    </div>)}
  </dl>;
}

function joinSections(base: CardReferenceSection[], changes: CardReferenceSection[]) {
  const merged = new Map(base.map(section => [section.name, section]));
  for (const section of changes) {
    const previous = merged.get(section.name);
    if (!previous) {
      merged.set(section.name, section);
      continue;
    }
    const levels = { ...previous.levels };
    for (const [level, fields] of Object.entries(section.levels)) {
      levels[Number(level)] = { ...levels[Number(level)], ...fields };
    }
    merged.set(section.name, { ...previous, ...section, facts: { ...previous.facts, ...section.facts }, levels });
  }
  return [...merged.values()];
}

function historicalSections(record: ReturnType<typeof getMechanicsRecord>): CardReferenceSection[] {
  if (!record) return [];
  function build(
    name: string,
    facts: Record<string, string | number | null | undefined>,
    columns: Record<string, number[] | null | undefined>,
  ): CardReferenceSection {
    const levels: CardReferenceSection["levels"] = {};
    for (const [label, series] of Object.entries(columns)) {
      series?.forEach((value, index) => {
        if (Number.isFinite(value) && value > 0) (levels[index + 1] ??= {})[label] = String(value);
      });
    }
    return { name, facts: Object.fromEntries(Object.entries(facts)
      .filter(([, value]) => value != null).map(([label, value]) => [label, String(value)])), levels };
  }
  const targets = (air: boolean | null | undefined, ground: boolean | null | undefined) =>
    air && ground ? "Air & Ground" : air ? "Air" : ground ? "Ground" : null;
  const seconds = (value: number | null) => value == null ? null : value + " s";
  const common = {
    Count: record.unitCount,
    Radius: record.areaRadiusTiles,
    "Deploy time": seconds(record.deploySeconds),
  };
  if (record.groupUnits?.length && (record.groupUnits.length > 1 || record.statSubject === "spawned-unit")) {
    return [
      build("Card stats", common, {}),
      ...record.groupUnits.map(unit => build(unit.name, {
        Count: unit.count,
        Targets: targets(unit.targetsAir, unit.targetsGround),
        Range: unit.rangeLabel ?? unit.rangeTiles,
        Speed: unit.moveSpeedLabel,
        "Hit speed": seconds(unit.hitSpeedSeconds),
      }, {
        Hitpoints: unit.hpByLevel, Damage: unit.damageByLevel, "Damage/sec": unit.dpsByLevel,
        "Shield hitpoints": unit.shieldHpByLevel,
      })),
    ];
  }
  return [build(record.statSubject === "spawned-unit" ? record.statSubjectLabel ?? "Spawned unit" : "Card stats", {
    ...common,
    Targets: record.buildingsOnly ? "Buildings" : targets(record.targetsAir, record.targetsGround),
    Range: record.rangeLabel ?? record.rangeTiles,
    Speed: record.moveSpeedLabel ?? (record.moveSpeedRaw == null ? null : `${record.moveSpeedRaw} (source units)`),
    "Hit speed": seconds(record.hitSpeedSeconds),
    "First hit": seconds(record.firstHitSeconds),
  }, record.extraStatsByLevel && Object.keys(record.extraStatsByLevel).length ? record.extraStatsByLevel : {
    Hitpoints: record.hpByLevel, Damage: record.damageByLevel, "Damage/sec": record.dpsByLevel,
  })];
}

function LevelStats({ section, level, cap, allLevels }: {
  section: CardReferenceSection; level: number; cap: number; allLevels: boolean;
}) {
  const entries = Object.entries(section.levels).filter(([value]) => Number(value) <= cap);
  const current = section.levels[level];
  if (!entries.length) return null;
  const columns = [...new Set(entries.flatMap(([, row]) => Object.keys(row)))];
  if (allLevels) {
    return <div className="ri-inspector-table" tabIndex={0} role="region" aria-label={section.name + " by level"}>
      <table>
        <thead><tr><th scope="col">Level</th>{columns.map(label => <th key={label} scope="col">{label}</th>)}</tr></thead>
        <tbody>{entries.map(([value, row]) => <tr key={value} className={Number(value) === level ? "is-viewing" : undefined}>
          <th scope="row">{value}</th>{columns.map(label => <td key={label}>{row[label] ?? "—"}</td>)}
        </tr>)}</tbody>
      </table>
    </div>;
  }
  return current ? null : <p className="ri-inspector-note">No values are published for level {level}.</p>;
}

const formLabels: Record<Form, string> = { base: "Base", evolution: "Evolution", hero: "Hero" };

export function CollectionCardDetails({ card, cap, mechanics, mechanicsLoading, deckAction, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [form, setForm] = useState<Form>("base");
  const [level, setLevel] = useState(card.level ?? Math.min(11, cap));
  const [allLevels, setAllLevels] = useState(false);
  const [reference, setReference] = useState<CurrentReference | null>(null);
  const [referenceStatus, setReferenceStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({ id: String(card.id), name: card.name, view: "details" });
    fetch("/api/card-reference?" + query, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error("Reference unavailable");
        const data: CurrentReference = await response.json();
        if (!data.profile?.forms.base || data.card.id !== card.id) throw new Error("Incomplete reference");
        return data;
      })
      .then(data => {
        if (controller.signal.aborted) return;
        setReference(data);
        setReferenceStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) setReferenceStatus("unavailable");
      });
    return () => controller.abort();
  }, [card.id, card.name, attempt]);

  const profile = reference?.profile;
  const prior = getMechanicsRecord(card, mechanics);
  const hasEvolution = Boolean(profile?.forms.evolution) || (card.hasEvolution ?? card.evo ?? null);
  const hasHero = Boolean(profile?.forms.hero) || (card.hasHero ?? card.hero ?? null);
  const selectable: Form[] = ["base", ...(hasEvolution ? ["evolution" as const] : []), ...(hasHero ? ["hero" as const] : [])];
  const baseSections = profile?.forms.base?.sections ?? (referenceStatus === "unavailable" ? historicalSections(prior) : []);
  const chosen = profile?.forms[form];
  const sections = form === "base" ? baseSections : chosen ? joinSections(baseSections, chosen.sections) : [];
  const minimum = Math.min(cap, Math.max(1, card.minimumLevel ?? 1));
  const viewing = Math.min(cap, Math.max(minimum, level));
  const description = chosen?.description ?? (form === "base" && !profile ? prior?.description : null);
  const image = (form === "evolution" ? card.evolutionImage : form === "hero" ? card.heroImage : card.image) ?? card.image;
  const fallbackUrl = referenceStatus === "unavailable" && prior ? prior.sourceUrl ?? MECHANICS_SOURCE : null;
  const sourceUrl = reference?.card.sourceUrl ?? fallbackUrl;
  const sourceDate = reference?.updatedAt ?? prior?.sourceUpdatedAt ?? mechanics?.sourceUpdatedAt;
  const hasRows = sections.some(section => Object.keys(section.levels).some(value => Number(value) <= cap));
  const starLevel = card.starLevel == null ? "Not reported" : card.starLevel === 0 ? "None" : String(card.starLevel);
  const costIcon=elixirAsset(card.elixir);
  const formStatus = (available: boolean | null, unlocked: boolean | null, unavailableLabel = "No form listed") =>
    unlocked ? "Unlocked" : available ? card.owned && unlocked === false ? "Locked" : "Available" :
      available === false || profile ? unavailableLabel : "Unknown";
  const evolutionStatus = formStatus(hasEvolution, card.evo, "Not available");
  const heroStatus = formStatus(hasHero, card.hero, "Not available");

  return <dialog ref={dialog} className="ri-card-dialog ri-inspector" aria-labelledby={titleId}
    onClose={onClose} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <article className="ri-inspector-content">
      <header className="ri-inspector-header">
        <div className="ri-inspector-portrait">
          {image ? <img src={image} alt=""/> : <Crown size={28} aria-hidden="true"/>}

        </div>
        <div className="ri-inspector-identity">
          <h2 id={titleId}>{card.name}</h2>
          <div className="ri-inspector-meta">
            <span>{card.rarity !== "unknown" ? card.rarity : profile?.rarity ?? "Unknown rarity"}</span>
            <span className="ri-inspector-meta-dot" aria-hidden="true">·</span>
            <span>{card.tower ? "Tower Troop" : profile?.type ?? (prior?.kind !== "Other" ? prior?.kind : null) ?? "Unknown type"}</span>
            {costIcon && <span className="ri-inspector-cost"><img src={costIcon} width={24} height={24} alt={card.elixir+" elixir"} />Elixir</span>}
          </div>
          <p className="ri-inspector-ownership">{card.owned ? card.level != null ? "Lv "+card.level+" · Owned" : "Owned" : "Not owned"}</p>
        </div>
        <button type="button" className="ri-close" aria-label="Close card details" onClick={() => dialog.current?.close()}><X size={21}/></button>
      </header>
      <div className="ri-inspector-body">
        <div className="ri-inspector-controls">
          {selectable.length > 1 && <div className="ri-inspector-forms" role="group" aria-label="Card form preview">
            {selectable.map(option => <button key={option} type="button" aria-pressed={form === option}
              onClick={() => setForm(option)}>{formLabels[option]}</button>)}
          </div>}
          <label className="ri-inspector-level">Card level
            <select value={viewing} onChange={event => setLevel(Number(event.target.value))}>
              {Array.from({ length: cap - minimum + 1 }, (_, index) => minimum + index)
                .map(value => <option key={value} value={value}>{value}{value === card.level ? " (owned)" : ""}</option>)}
            </select>
          </label>
          {hasRows && <button type="button" className="ri-button-secondary ri-inspector-all-levels" aria-pressed={allLevels}
            onClick={() => setAllLevels(!allLevels)}>{allLevels ? "Selected level" : "All levels"}</button>}
        </div>

        {referenceStatus === "loading" && <p className="ri-inspector-note" role="status">Loading the card reference…</p>}
        {referenceStatus === "unavailable" && <div className="ri-inspector-notice">
          <p>{prior ? "Current reference unavailable. Showing the dated community record." :
            mechanicsLoading ? "Current reference unavailable. Looking for a community record…" : "No combat reference is available for this card."}</p>
          <button type="button" className="ri-text-button" onClick={() => { setReferenceStatus("loading"); setAttempt(value => value + 1); }}>Retry</button>
        </div>}

        {form !== "base" && !chosen && referenceStatus !== "loading" &&
          <p className="ri-inspector-note">Stats for this form are unavailable.</p>}
        {chosen?.cycles != null && <FactGrid facts={{ "Evolution cycles": String(chosen.cycles) }}/>}
        {sections.map(section => <section key={section.name} className="ri-inspector-section">
          <h3>{section.name === "Card stats" ? "Combat stats" : section.name}
            {!allLevels && <span className="ri-inspector-section-level"> · Lv {viewing}</span>}</h3>
          <FactGrid combat facts={{...section.facts,...(allLevels?{}:(section.levels[viewing]??{}))}}/>
          <LevelStats section={section} level={viewing} cap={cap} allLevels={allLevels}/>
          {section.description && <details className="ri-inspector-about"><summary>Ability details</summary><p>{section.description}</p></details>}
        </section>)}

        {description && <details className="ri-inspector-about"><summary>About {card.name}</summary><p>{description}</p></details>}
        <section className="ri-inspector-section">
          <h3>Card information</h3>
          <FactGrid facts={{
            "Star level": starLevel,
            ...(card.maxStarLevel != null ? { "Maximum star level": String(card.maxStarLevel) } : {}),
            Evolution: evolutionStatus,
            Hero: heroStatus,
            ...(profile?.arena ? { "Unlock arena": profile.arena } : {}),
            ...(card.roles.length ? { Roles: card.roles.join(", ") } : {}),
          }} unavailableFacts={[
            ...(evolutionStatus === "Not available" ? ["Evolution"] : []),
            ...(heroStatus === "Not available" ? ["Hero"] : []),
          ]}/>

        </section>
        {sourceUrl && <p className="ri-inspector-note">
          <a href={sourceUrl} target="_blank" rel="noreferrer">Combat stat source</a>
          {reference?.version && " · Game data " + reference.version}
          {sourceDate && " · " + sourceDate.slice(0, 10)}
        </p>}
        {deckAction && <button type="button" className="ri-button-secondary" disabled={deckAction.disabled}
          onClick={() => { dialog.current?.close(); deckAction.run(); }}>{deckAction.label}</button>}
      </div>
    </article>
  </dialog>;
}
