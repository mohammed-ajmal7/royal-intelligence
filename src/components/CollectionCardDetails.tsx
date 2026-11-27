"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Crown, X } from "lucide-react";
import type { Card } from "../lib/model";
import type { CardReferenceSection, CurrentReference } from "../lib/liveCardReference";
import { getMechanicsRecord, MECHANICS_SOURCE, type MechanicsCatalog } from "../lib/mechanics";
import { statIconPath, statValueWithUnit, elixirAsset } from "../lib/statAssets";
import { CardFormIcon } from "./CardFormIcon";
import { buildUnifiedLevelTable, buildUnifiedStatEntries } from "../lib/cardFormStats";
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

function FormMarker({ form }: { form: Exclude<Form, "base"> }) {
  return <CardFormIcon className={"ri-inspector-form-marker is-" + form} form={form}/>;
}

function FactGrid({ facts, unavailableFacts = [] }: {
  facts: Record<string,string>;
  unavailableFacts?: readonly string[];
}) {
  const entries=Object.entries(facts);
  if (!entries.length) return null;
  return <dl className="ri-inspector-facts ri-inspector-information-facts">
    {entries.map(([label,value])=><div key={label} className={"ri-inspector-fact" + (unavailableFacts.includes(label) ? " is-unavailable" : "")}>
      {statIconPath(label)&&<img className="ri-inspector-stat-icon" src={statIconPath(label)!} alt="" loading="lazy" aria-hidden="true"/>}
      <div className="ri-inspector-fact-body">
        <dt>{label}</dt><dd>{statValueWithUnit(value,label)}</dd>
      </div>
    </div>)}
  </dl>;
}

function UnifiedStatGrid({ entries }: { entries: ReturnType<typeof buildUnifiedStatEntries> }) {
  if (!entries.length) return <p className="ri-inspector-note">No combat statistics are available for this form at the selected level.</p>;
  return <dl className="ri-inspector-facts ri-inspector-combat-facts ri-inspector-unified-facts">
    {entries.map(entry=><div key={entry.id} className="ri-inspector-fact">
      {statIconPath(entry.sourceLabel)&&<img className="ri-inspector-stat-icon" src={statIconPath(entry.sourceLabel)!} alt="" loading="lazy" aria-hidden="true"/>}
      <div className="ri-inspector-fact-body">
        <dt>{entry.label}{entry.marker && <FormMarker form={entry.marker}/>}</dt>
        <dd>{statValueWithUnit(entry.value,entry.sourceLabel)}
          {entry.delta && <small className="ri-inspector-stat-delta">{entry.delta} vs Base</small>}
        </dd>
      </div>
    </div>)}
  </dl>;
}

function LevelMetricIcon({ label }: { label: string }) {
  const normalized = label.toLowerCase();
  const kind = /hit ?points|health/.test(normalized)
    ? "health"
    : /damage\s*\/\s*sec|dps/.test(normalized)
      ? "dps"
      : /damage/.test(normalized)
        ? "damage"
        : "level";
  return (
    <span className={"ri-level-metric-icon is-" + kind} aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        {kind === "health" ? (
          <path d="M10 17s-7-4.1-7-9.2A3.8 3.8 0 0 1 10 5.7a3.8 3.8 0 0 1 7 2.1C17 12.9 10 17 10 17Z" fill="currentColor"/>
        ) : kind === "dps" ? (
          <path d="m11.2 1.8-7 9h4.5l-.1 7.4 7.2-10h-4.6l0-6.4Z" fill="currentColor"/>
        ) : kind === "damage" ? (
          <>
            <path d="m4 15.8 9.9-9.9 2 2L6 17.8H4v-2Z" fill="currentColor"/>
            <path d="m12.7 4.1 2-2 3.2 3.2-2 2-3.2-3.2ZM3 17l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </>
        ) : (
          <>
            <path d="M3 16.5h14M5 13V8.5m5 4.5V5m5 8V2.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </>
        )}
      </svg>
    </span>
  );
}

function LevelStats({ baseSections, formSections, form, minimum, cap, viewing }: {
  baseSections: CardReferenceSection[];
  formSections: CardReferenceSection[];
  form: Form;
  minimum: number;
  cap: number;
  viewing: number;
}) {
  const table = buildUnifiedLevelTable(baseSections, formSections, form, minimum, cap);
  if (!table.columns.length || !table.rows.length) return null;

  const numeric = (value: string | null) => {
    if (value == null) return null;
    const match = value.replace(/,/g, "").match(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)/);
    if (!match) return null;
    const result = Number(match[0]);
    return Number.isFinite(result) ? result : null;
  };
  const maxima = table.columns.map((_column, index) =>
    Math.max(0, ...table.rows.map(row => numeric(row.cells[index]?.value)).filter((value): value is number => value !== null))
  );

  return (
    <section className="ri-level-table-section ri-unified-level-table" aria-label="Combined card stats by level">
      <div className="ri-level-table-heading">
        <div className="ri-level-table-heading-copy">
          <span className="ri-level-table-eyebrow">LEVEL PROGRESSION</span>
          <strong>{form === "base" ? "Card stats by level" : formLabels[form] + " vs Base"}</strong>
        </div>
        <span className="ri-level-table-count">{table.rows.length} levels</span>
      </div>
      <p className="ri-level-table-caption">
        {form === "base" ? "All available stats in one table." : "Each level is compared with Base at the same level. Changes show the exact difference."}
      </p>
      <div className="ri-inspector-table" tabIndex={0} role="region" aria-label="Combined stats by level">
        <table>
          <thead>
            <tr>
              <th scope="col">
                <span className="ri-level-table-column is-level">
                  <LevelMetricIcon label="level"/>
                  <span>Level</span>
                </span>
              </th>
              {table.columns.map(column => (
                <th key={column.id} scope="col">
                  <span className={"ri-level-table-column is-" + (/hit ?points|health/i.test(column.sourceLabel) ? "health" : /damage\s*\/\s*sec|dps/i.test(column.sourceLabel) ? "dps" : /damage/i.test(column.sourceLabel) ? "damage" : "other")}>
                    <LevelMetricIcon label={column.sourceLabel}/>
                    <span className="ri-level-table-column-label">{column.label}</span>
                    {column.marker && <FormMarker form={column.marker}/>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map(row => (
              <tr key={row.level} className={row.level === viewing ? "is-viewing" : undefined}
                aria-current={row.level === viewing ? "true" : undefined}>
                <th scope="row">
                  <span className="ri-level-row-level">{row.level}</span>
                  {row.level === viewing && <span className="ri-level-row-current">Viewing</span>}
                </th>
                {row.cells.map((cell,index) => {
                  const value = cell.value;
                  const numericValue = numeric(value);
                  const maximum = maxima[index] ?? 0;
                  const ratio = numericValue !== null && maximum > 0
                    ? Math.max(0,Math.min(100,numericValue/maximum*100)) : null;
                  return (
                    <td key={table.columns[index].id} className={ratio === null ? undefined : "has-level-bar"}>
                      <span className="ri-level-table-cell">
                        <span className="ri-level-table-value">{value == null ? "—" : statValueWithUnit(value,table.columns[index].sourceLabel)}</span>
                        {cell.delta && <small className="ri-level-table-delta">{cell.delta}</small>}
                        {ratio !== null && (
                          <span className="ri-level-table-track" aria-hidden="true">
                            <span style={{width:ratio+"%"}}/>
                          </span>
                        )}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const formLabels: Record<Form, string> = { base: "Base", evolution: "Evolution", hero: "Hero" };

export function CollectionCardDetails({ card, cap, mechanics, mechanicsLoading, deckAction, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const levelPickerRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const levelPickerId = useId();
  const [form, setForm] = useState<Form>("base");
  const [level, setLevel] = useState(card.level ?? Math.min(11, cap));
  const [allLevels, setAllLevels] = useState(false);
  const [levelPickerOpen, setLevelPickerOpen] = useState(false);
  const [reference, setReference] = useState<CurrentReference | null>(null);
  const [referenceStatus, setReferenceStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);
  useEffect(() => {
    if (!levelPickerOpen) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !levelPickerRef.current?.contains(event.target)) {
        setLevelPickerOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        setLevelPickerOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [levelPickerOpen]);
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
  const minimum = Math.min(cap, Math.max(1, card.minimumLevel ?? 1));
  const viewing = Math.min(cap, Math.max(minimum, level));
  const activeSections = form === "base" ? baseSections : [...(chosen?.sections ?? [])];
  if (form !== "base" && chosen?.cycles != null) {
    const cardStatsIndex = activeSections.findIndex(section => section.name === "Card stats");
    if (cardStatsIndex >= 0) {
      activeSections[cardStatsIndex] = {
        ...activeSections[cardStatsIndex],
        facts: { ...activeSections[cardStatsIndex].facts, "Evolution cycles": String(chosen.cycles) },
      };
    } else {
      activeSections.push({ name: "Card stats", facts: { "Evolution cycles": String(chosen.cycles) }, levels: {} });
    }
  }
  const comparisonBase = form !== "base" && !chosen ? [] : baseSections;
  const statEntries = buildUnifiedStatEntries(comparisonBase, activeSections, form, viewing);
  const hasRows = buildUnifiedLevelTable(comparisonBase, activeSections, form, minimum, cap).rows.length > 0;
  const abilityDescriptions = activeSections.filter(section => section.name !== "Card stats" && section.description);
  const description = chosen?.description ?? (form === "base" && !profile ? prior?.description : null);
  const image = (form === "evolution" ? card.evolutionImage : form === "hero" ? card.heroImage : card.image) ?? card.image;
  const fallbackUrl = referenceStatus === "unavailable" && prior ? prior.sourceUrl ?? MECHANICS_SOURCE : null;
  const sourceUrl = reference?.card.sourceUrl ?? fallbackUrl;
  const sourceDate = reference?.updatedAt ?? prior?.sourceUpdatedAt ?? mechanics?.sourceUpdatedAt;
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
          <p className="ri-inspector-ownership">{card.owned ? card.level != null ? "Lv "+card.level+" · Current" : "Current" : "Not owned"}</p>
        </div>
        <button type="button" className="ri-close" aria-label="Close card details" onClick={() => dialog.current?.close()}><X size={21}/></button>
      </header>
      <div className="ri-inspector-body">
        {selectable.length > 1 && <div className="ri-inspector-controls">
          <div className="ri-inspector-forms" role="group" aria-label="Card form preview">
            {selectable.map(option => <button key={option} type="button" aria-pressed={form === option}
              onClick={() => setForm(option)}>
              {option !== "base" && <CardFormIcon form={option} className="ri-inspector-form-tab-icon" decorative/>}
              <span>{formLabels[option]}</span>
            </button>)}
          </div>
        </div>}
        <section className="ri-level-design" aria-label="Card level">
          <div className="ri-level-picker" ref={levelPickerRef}>
            {!levelPickerOpen && <button type="button" className="ri-level-trigger" aria-expanded={levelPickerOpen}
              aria-controls={levelPickerId} onClick={() => setLevelPickerOpen(open => !open)}>
              <span className="ri-level-trigger-copy">
                <span>Card level</span>
                <strong>Level {viewing}</strong>
              </span>
              <span className={"ri-level-owned-badge" + (card.owned && card.level != null ? "" : " is-unowned")}>
                {card.owned && card.level != null ? "CURRENT · " + card.level : card.owned ? "CURRENT" : "NOT OWNED"}
              </span>
              <ChevronDown className="ri-level-trigger-chevron" size={18} aria-hidden="true"/>
            </button>}
            <div className="ri-level-popover" id={levelPickerId} hidden={!levelPickerOpen}>
              <div className="ri-level-panel">
                <div className="ri-level-panel-header">
                  <div>
                    <h3>Card Level</h3>
                    <p>Choose a level to view card stats</p>
                  </div>
                  <div className="ri-level-panel-actions">
                    <span className={"ri-level-owned-badge" + (card.owned && card.level != null ? "" : " is-unowned")}>
                      {card.owned && card.level != null ? "CURRENT · " + card.level : card.owned ? "CURRENT" : "NOT OWNED"}
                    </span>
                    <button type="button" className="ri-level-panel-close" aria-label="Close card level selector"
                      onClick={() => setLevelPickerOpen(false)}><X size={16}/></button>
                  </div>
                </div>
                <div className="ri-level-grid" role="group" aria-label="Choose card level">
                  {Array.from({ length: cap - minimum + 1 }, (_, index) => minimum + index).map(value => {
                    const isOwned = card.owned && value === card.level;
                    return <button key={value} type="button"
                      className={"ri-level-option" + (viewing === value ? " is-selected" : "") + (isOwned ? " is-owned" : "")}
                      aria-pressed={viewing === value} aria-label={"Level " + value + (isOwned ? ", your current level" : "")}
                      onClick={() => { setLevel(value); setAllLevels(false); setLevelPickerOpen(false); }}>
                      <strong>{value}</strong>
                      <span>{isOwned ? "✓ CURRENT" : "LEVEL"}</span>
                    </button>;
                  })}
                </div>
                <div className="ri-level-panel-footer">
                  <span>Your actual card level</span>
                  <strong>{card.owned && card.level != null ? "Level " + card.level : card.owned ? "Current level unknown" : "Not owned"}</strong>
                </div>
              </div>
            </div>
          </div>
          {hasRows && <button type="button" className="ri-button-secondary ri-inspector-all-levels" aria-pressed={allLevels}
            onClick={() => setAllLevels(!allLevels)}>{allLevels ? "Selected level" : "All levels"}</button>}
        </section>

        {referenceStatus === "loading" && <p className="ri-inspector-note" role="status">Loading the card reference…</p>}
        {referenceStatus === "unavailable" && <div className="ri-inspector-notice">
          <p>{prior ? "Current reference unavailable. Showing the dated community record." :
            mechanicsLoading ? "Current reference unavailable. Looking for a community record…" : "No combat reference is available for this card."}</p>
          <button type="button" className="ri-text-button" onClick={() => { setReferenceStatus("loading"); setAttempt(value => value + 1); }}>Retry</button>
        </div>}

        {form !== "base" && !chosen && referenceStatus !== "loading" &&
          <p className="ri-inspector-note">Stats for this form are unavailable.</p>}
        <section className="ri-inspector-section ri-inspector-unified-section">
          <h3>Combat stats <span className="ri-inspector-section-level"> · Lv {viewing}</span></h3>
          <UnifiedStatGrid entries={statEntries}/>
          {allLevels && <LevelStats baseSections={comparisonBase} formSections={activeSections}
            form={form} minimum={minimum} cap={cap} viewing={viewing}/>}
          {abilityDescriptions.length > 0 && <details className="ri-inspector-about">
            <summary>Ability details</summary>
            {abilityDescriptions.map(section => <div key={section.name} className="ri-inspector-ability-description">
              <strong>{section.name}</strong><p>{section.description}</p>
            </div>)}
          </details>}
        </section>

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
