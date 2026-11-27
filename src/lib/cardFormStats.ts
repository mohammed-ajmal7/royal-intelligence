import type { CardReferenceSection } from "./liveCardReference";

export type StatForm = "base" | "evolution" | "hero";

export type UnifiedStatEntry = {
  id: string;
  section: string;
  sourceLabel: string;
  label: string;
  value: string;
  baseValue: string | null;
  delta: string | null;
  ownedProgression: { level: number; equation: string } | null;
  marker: Exclude<StatForm, "base"> | null;
};

export type UnifiedLevelColumn = {
  id: string;
  section: string;
  sourceLabel: string;
  label: string;
  marker: Exclude<StatForm, "base"> | null;
};

export type UnifiedLevelCell = {
  value: string | null;
  delta: string | null;
};

export type UnifiedLevelRow = {
  level: number;
  cells: UnifiedLevelCell[];
};

export type UnifiedLevelTable = {
  columns: UnifiedLevelColumn[];
  rows: UnifiedLevelRow[];
};

function cleanValue(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function sectionLabel(section: string, label: string): string {
  return /^(card stats|combat stats)$/i.test(section) ? label : section + " · " + label;
}

function valuesDiffer(baseValue: string | null, formValue: string): boolean {
  if (baseValue == null) return true;
  const base = numericParts(baseValue);
  const form = numericParts(formValue);
  if (base && form && base.unit.toLowerCase() === form.unit.toLowerCase()) {
    return Math.abs(base.number - form.number) >= 0.000001;
  }
  return baseValue.trim() !== formValue.trim();
}

function numericParts(value: string): { number: number; unit: string } | null {
  const match = value.trim().replace(/,/g, "").match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(.*?)$/);
  if (!match) return null;
  const number = Number(match[1]);
  return Number.isFinite(number) ? { number, unit: match[2].trim().replace(/\s+/g, " ") } : null;
}

export function signedStatDelta(baseValue: string | null, formValue: string | null): string | null {
  if (baseValue == null || formValue == null) return null;
  const base = numericParts(baseValue);
  const form = numericParts(formValue);
  if (!base || !form || base.unit.toLowerCase() !== form.unit.toLowerCase()) return null;

  const difference = form.number - base.number;
  if (Math.abs(difference) < 0.000001) return null;

  const rounded = Math.round(Math.abs(difference) * 100) / 100;
  const amount = Number.isInteger(rounded) ? String(rounded) : String(rounded);
  return (difference > 0 ? "+" : "−") + amount + (base.unit ? " " + base.unit : "");
}

function statPriority(label: string): number {
  return /hit ?points|health/i.test(label) ? 0 :
    /\bdamage\b/i.test(label) ? 1 :
    /hit speed|attack speed/i.test(label) ? 2 :
    /target/i.test(label) ? 3 :
    /^speed|movement speed/i.test(label) ? 4 :
    /range/i.test(label) ? 5 :
    /count/i.test(label) ? 6 : 7;
}

function findSection(sections: CardReferenceSection[], name: string): CardReferenceSection | undefined {
  return sections.find(section => section.name === name);
}

function valueAt(section: CardReferenceSection | undefined, label: string, level: number): string | null {
  if (!section) return null;
  return cleanValue(section.levels[level]?.[label]) ?? cleanValue(section.facts[label]);
}

function sectionNames(baseSections: CardReferenceSection[], formSections: CardReferenceSection[]): string[] {
  return [...new Set([...baseSections.map(section => section.name), ...formSections.map(section => section.name)])];
}

function labelsForLevel(
  base: CardReferenceSection | undefined,
  form: CardReferenceSection | undefined,
  level: number,
): string[] {
  return [...new Set([
    ...Object.keys(base?.facts ?? {}),
    ...Object.keys(base?.levels[level] ?? {}),
    ...Object.keys(form?.facts ?? {}),
    ...Object.keys(form?.levels[level] ?? {}),
  ])];
}

function formatStatNumber(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export function ownedLevelStatEquation(
  ownedValue: string | null,
  targetValue: string | null,
  ownedLevel: number,
  targetLevel: number,
): string | null {
  if (ownedValue == null || targetValue == null || ownedLevel === targetLevel) return null;
  const owned = numericParts(ownedValue);
  const target = numericParts(targetValue);
  if (!owned || !target || owned.unit.toLowerCase() !== target.unit.toLowerCase()) return null;

  const difference = Math.round((target.number - owned.number) * 100) / 100;
  if (Math.abs(difference) < 0.000001) return null;
  const operator = difference < 0 ? "−" : "+";
  const unit = target.unit ? " " + target.unit : "";
  return "Lv " + ownedLevel + ": " + formatStatNumber(owned.number) + " " +
    operator + " " + formatStatNumber(Math.abs(difference)) + " = " +
    formatStatNumber(target.number) + unit + " (Lv " + targetLevel + ")";
}

function comparison(
  section: string,
  label: string,
  baseSection: CardReferenceSection | undefined,
  formSection: CardReferenceSection | undefined,
  form: StatForm,
  level: number,
  ownedLevel: number | null,
) {
  const baseValue = valueAt(baseSection, label, level);
  const formValue = form === "base" ? null : valueAt(formSection, label, level);
  const value = form === "base" ? baseValue : formValue ?? baseValue;
  if (value == null) return null;

  const different = form !== "base" && formValue != null && valuesDiffer(baseValue, formValue);
  const ownedBaseValue = ownedLevel == null ? null : valueAt(baseSection, label, ownedLevel);
  const ownedFormValue = ownedLevel == null ? null : valueAt(formSection, label, ownedLevel);
  const ownedValue = form === "base" ? ownedBaseValue : ownedFormValue ?? ownedBaseValue;
  const ownedEquation = ownedLevel != null
    ? ownedLevelStatEquation(ownedValue, value, ownedLevel, level)
    : null;
  return {
    value,
    baseValue,
    delta: different ? signedStatDelta(baseValue, formValue) : null,
    ownedProgression: ownedEquation && ownedLevel != null ? { level: ownedLevel, equation: ownedEquation } : null,
    marker: different ? form as Exclude<StatForm, "base"> : null,
    id: section + "::" + label,
    section,
    sourceLabel: label,
    label: sectionLabel(section, label),
  };
}

export function buildUnifiedStatEntries(
  baseSections: CardReferenceSection[],
  formSections: CardReferenceSection[],
  form: StatForm,
  level: number,
  ownedLevel: number | null = null,
): UnifiedStatEntry[] {
  const entries: UnifiedStatEntry[] = [];
  for (const section of sectionNames(baseSections, formSections)) {
    const baseSection = findSection(baseSections, section);
    const formSection = findSection(formSections, section);
    for (const label of labelsForLevel(baseSection, formSection, level)) {
      const item = comparison(section, label, baseSection, formSection, form, level, ownedLevel);
      if (item) entries.push(item);
    }
  }

  return entries.sort((a, b) =>
    statPriority(a.sourceLabel) - statPriority(b.sourceLabel) ||
    sectionNames(baseSections, formSections).indexOf(a.section) - sectionNames(baseSections, formSections).indexOf(b.section) ||
    a.sourceLabel.localeCompare(b.sourceLabel)
  );
}

export function buildUnifiedLevelTable(
  baseSections: CardReferenceSection[],
  formSections: CardReferenceSection[],
  form: StatForm,
  minimum: number,
  cap: number,
): UnifiedLevelTable {
  const columns: UnifiedLevelColumn[] = [];
  for (const section of sectionNames(baseSections, formSections)) {
    const baseSection = findSection(baseSections, section);
    const formSection = findSection(formSections, section);
    const labels = [...new Set([
      ...Object.values(baseSection?.levels ?? {}).flatMap(row => Object.keys(row)),
      ...Object.values(formSection?.levels ?? {}).flatMap(row => Object.keys(row)),
    ])];

    for (const label of labels) {
      const marker = form === "base" ? null : Array.from({ length: Math.max(0, cap - minimum + 1) }, (_, index) => minimum + index)
        .some(level => {
          const baseValue = valueAt(baseSection, label, level);
          const formValue = valueAt(formSection, label, level);
          return formValue != null && valuesDiffer(baseValue, formValue);
        }) ? form as Exclude<StatForm, "base"> : null;

      columns.push({
        id: section + "::" + label,
        section,
        sourceLabel: label,
        label: sectionLabel(section, label),
        marker,
      });
    }
  }

  columns.sort((a, b) =>
    statPriority(a.sourceLabel) - statPriority(b.sourceLabel) ||
    sectionNames(baseSections, formSections).indexOf(a.section) - sectionNames(baseSections, formSections).indexOf(b.section) ||
    a.sourceLabel.localeCompare(b.sourceLabel)
  );

  const levels = Array.from({ length: Math.max(0, cap - minimum + 1) }, (_, index) => minimum + index);
  const rows: UnifiedLevelRow[] = levels.map(level => ({
    level,
    cells: columns.map(column => {
      const baseSection = findSection(baseSections, column.section);
      const formSection = findSection(formSections, column.section);
      const item = comparison(column.section, column.sourceLabel, baseSection, formSection, form, level, null);
      return { value: item?.value ?? null, delta: item?.delta ?? null };
    }),
  })).filter(row => row.cells.some(cell => cell.value != null));

  return { columns, rows };
}
