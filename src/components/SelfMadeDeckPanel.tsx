import type { Card } from "../lib/model";
import type { MechanicsCatalog } from "../lib/mechanics";
import { key } from "../lib/engine";
import { buildDeckPlaybook } from "../lib/deckPlaybook";
import type { StrategyFocus } from "../lib/deckStrategy";
import {
  type SelfMadeCandidate,
  type SelfMadeResult,
} from "../lib/selfMadeDeckLab";
import { DeckPlaybookPanel } from "./DeckPlaybookPanel";

type Props = {
  result: SelfMadeResult | null;
  selected: Card[];
  focus: StrategyFocus;
  mechanics: MechanicsCatalog | null;
  onChoose: (cards: Card[]) => void;
};

const stat = (value: number | null) =>
  value === null ? "unknown" : Math.round(value).toLocaleString("en-US");

function Candidate({ item, index, selected, focus, mechanics, onChoose }: {
  item: SelfMadeCandidate;
  index: number;
  selected: Card[];
  focus: StrategyFocus;
  mechanics: MechanicsCatalog | null;
  onChoose: (cards: Card[]) => void;
}) {
  const chosen = key(item.cards) === key(selected);
  return (
    <article className="self-lab-candidate">
      <header className="self-lab-candidate-head">
        <div>
          <span className="self-lab-kicker">OWNED-COLLECTION TEAM {index + 1}</span>
          <h4>{item.cards.find(c => c.roles.includes("Win condition"))?.name ?? "Custom"} balanced control</h4>
          <p>{item.evaluation.avg?.toFixed(2) ?? "—"} average elixir · {item.evaluation.air} air defenders</p>
        </div>
        <div className="self-lab-score">
          <strong>{item.score.toFixed(1)}<small>/100</small></strong>
          <span>Estimated suitability</span>
        </div>
      </header>
      <div className="self-lab-card-row">
        {item.slots.map(slot => (
          <div className="self-lab-card-tile" key={slot.id}>
            <small>{slot.label}</small>
            {slot.chosen.card.image && <img src={slot.chosen.card.image}
              alt="" loading="lazy"/>}
            <strong>{slot.chosen.card.name}</strong>
            <span>Lv {slot.chosen.card.level ?? "?"} · {slot.chosen.card.elixir ?? "?"} elixir</span>
            {slot.chosen.card.evo === true &&
              <em>Evolution unlocked</em>}
            {slot.chosen.card.rarity.toLowerCase() === "champion" &&
              <em>Champion owned</em>}
          </div>
        ))}
      </div>
      <div className="self-lab-factors">
        <span>Measured role strength <b>{item.averageRolePower.toFixed(1)}</b></span>
        <span>Composition <b>{item.evaluation.score}</b></span>
        <span>Threat coverage <b>{item.strategy.score}</b></span>
        <span>Available Evolutions <b>{item.ownedEvolutionCount}</b></span>
      </div>
      {item.specialSlots.length > 0 && (
        <div className="self-lab-special-slots" aria-label="Recommended special-card slots">
          {item.specialSlots.map(s => (
            <span key={s.slot}>
              <strong>{s.slot}</strong> · {s.card}
              <small> ({s.form})</small>
            </span>
          ))}
          <p className="self-lab-note">
            Suggested eligible slots only, not proof that the form is currently
            equipped. Abilities and evolved DPS are not invented.
          </p>
        </div>
      )}
      <details className="self-lab-details">
        <summary>Compare all eight picks against your owned cards</summary>
        <p className="self-lab-note">
          Every eligible owned card was ranked against your other owned cards
          in the SAME category. Verified role-specific HP, DPS, damage, range,
          splash and elixir efficiency drive up to 60% of the role grade;
          owned level contributes 25% and role fit 15%. Missing combat
          evidence is excluded, never guessed. An unlocked Evolution/Hero
          adds at most 7 flexibility points for unlocked forms, recorded abilities and verified Evolution improvements; it never fabricates damage.
          Cards selected for another role cannot be reused.
        </p>
        <div className="self-lab-role-grid">
          {item.slots.map((slot, i) => (
            <section className="self-lab-role" key={slot.id}>
              <div className="self-lab-role-head">
                <span>{String(i + 1).padStart(2, "0")}</span>
                <div><h5>{slot.label}</h5><small>{slot.purpose} · {slot.considered} candidates checked</small></div>
              </div>
              <div className="self-lab-picked">
                <strong>{slot.chosen.card.name} · Lv {slot.chosen.card.level ?? "?"}</strong>
                <b>{slot.chosen.grade.toFixed(1)}/100</b>
              </div>
              <p className="self-lab-note">
                Numerical role score: {slot.chosen.numericScore === null ? "unavailable" :
                  slot.chosen.numericScore.toFixed(1) + "/100"} ·
                {" "}{Math.round(slot.chosen.numericCoverage*100)}% relevant combat evidence ·
                {" "}Special-form flexibility +{slot.chosen.specialBonus.toFixed(1)}
              </p>
              {slot.chosen.measured.length > 0 && <p className="self-lab-note">
                Compared against your owned cards in this role:{" "}
                {slot.chosen.measured.map(m =>
                  m.label + " " + m.value + " " + m.unit + " (" + m.relative +
                  "% of owned-role benchmark)").join(" · ")}
              </p>}
              <div className="self-lab-stats">
                <span>HP: {stat(slot.chosen.hp)}</span>
                <span>DPS: {stat(slot.chosen.dps)}</span>
                <span>Damage: {stat(slot.chosen.damage)}</span>
                <span>Targets: {slot.chosen.target}</span>
                <span>Stat coverage: {Math.round(slot.chosen.confidence * 100)}%</span>
                <span>Attack interval: {slot.chosen.hitSpeed === null ? "unknown" : slot.chosen.hitSpeed + "s"}</span>
                <span>Range: {slot.chosen.range === null ? "unknown" : slot.chosen.range + " tiles"}</span>
                <span>Splash radius: {slot.chosen.splash === null ? "unknown" : slot.chosen.splash + " tiles"}</span>
                <span>Base ability: {slot.chosen.abilityRecorded === null ? "unknown" : slot.chosen.abilityRecorded ? "Recorded" : "None recorded"}</span>
                <span>Evolution: {slot.chosen.card.evo === true ? "Unlocked" : slot.chosen.card.evo === false ? "Not unlocked" : "Unknown"}</span>
              </div>
              <p className="self-lab-note">{slot.chosen.evidence}</p>
              {slot.chosen.evolved && <p className="self-lab-note">
                Published {slot.chosen.evolved.form} at your level:
                {" "}HP {stat(slot.chosen.evolved.hp)} · Damage {stat(slot.chosen.evolved.damage)} · DPS {stat(slot.chosen.evolved.dps)}.
                Not assumed active; unknown values remain unknown.
              </p>}
              {slot.alternatives.length > 0 && (
                <details className="self-lab-alternatives">
                  <summary>Full owned-role ranking · {slot.alternatives.length} other candidates</summary>
                  <table>
                    <thead><tr><th>Card</th><th>Lv</th><th>Elixir</th><th>HP</th><th>DPS</th><th>Damage</th><th>Evo / Hero</th><th>Numeric</th><th>Coverage</th><th>Role power</th></tr></thead>
                    <tbody>{slot.alternatives.map(other => (
                      <tr key={other.card.id}>
                        <td>{other.card.name}{other.card.evo === true ? " ◈" : ""}</td>
                        <td>{other.card.level ?? "?"}</td>
                        <td>{other.card.elixir ?? "?"}</td>
                        <td>{stat(other.hp)}</td>
                        <td>{stat(other.dps)}</td>
                        <td>{stat(other.damage)}</td>
                        <td>{[other.card.evo === true ? "Evo" : "",
                          other.card.hero === true ? "Hero" : "",
                          other.card.rarity.toLowerCase() === "champion" ? "Champion" : ""]
                          .filter(Boolean).join(" / ") || "—"}</td>
                        <td>{other.numericScore === null ? "unknown" :
                          other.numericScore.toFixed(1)}</td>
                        <td>{Math.round(other.numericCoverage * 100)}%</td>
                        <td>{other.grade.toFixed(1)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </details>
              )}
            </section>
          ))}
        </div>
      </details>
      <details className="deck-play-alternative">
        <summary>How to play this self-made deck</summary>
        <DeckPlaybookPanel guide={buildDeckPlaybook(item.cards, mechanics, focus)}/>
      </details>
      <div className="self-lab-actions">
        <button className="btn secondary" type="button" onClick={() => onChoose(item.cards)}
          disabled={chosen}>{chosen ? "Current deck" : "Use this self-made deck"}</button>
      </div>
    </article>
  );
}

export function SelfMadeDeckPanel({
  result, selected, focus, mechanics, onChoose,
}: Props) {
  if (!result) return null;
  return (
    <div className="self-lab-results">
      {result.issues.map(issue =>
        <p className="self-lab-error" role="status" key={issue}>{issue}</p>)}
      <p className="self-lab-note">
        {result.eligibleCardCount} distinct owned cards inspected ·
        {" "}{result.candidates.length} full eight-role team(s) shortlisted.
        {" "}No global-player ranking was used.
        {result.source ? " Combat fields: " + result.source + "." :
          " No external combat dataset was available; missing stats were not guessed."}
      </p>
      {result.candidates.map((item, i) => (
        <Candidate key={key(item.cards)} item={item} index={i}
          selected={selected} focus={focus} mechanics={mechanics}
          onChoose={onChoose}/>
      ))}
      {result.candidates.length > 0 && (
        <p className="self-lab-note">
          Role strength takes priority over deck synergy in this generator,
          subject to eight distinct cards and your filters. Damage stats are
          not directly comparable across different troop mechanics or spells.
          The eight-slot blueprint is strict, but it is not a proof that a
          deck wins every matchup. Published numbers may be from different
          balance patches; Evolution forms and Hero ability effects are not
          fabricated or treated as active in base-card DPS.
        </p>
      )}
    </div>
  );
}
