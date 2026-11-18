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
          </div>
        ))}
      </div>
      <div className="self-lab-factors">
        <span>Role power <b>{item.averageRolePower.toFixed(1)}</b></span>
        <span>Composition <b>{item.evaluation.score}</b></span>
        <span>Threat coverage <b>{item.strategy.score}</b></span>
        <span>Available Evolutions <b>{item.ownedEvolutionCount}</b></span>
      </div>
      {item.suggestedEvolutions.length > 0 && (
        <p className="self-lab-note">
          Suggested Evolution priorities (if usable in your mode):
          {" "}<strong>{item.suggestedEvolutions.join(" + ")}</strong>.
          These are unlocked-form preferences, not measured Evolution stat bonuses.
        </p>
      )}
      <details className="self-lab-details">
        <summary>Compare all eight picks against your owned cards</summary>
        <p className="self-lab-note">
          Every eligible owned card was considered for each role. The score is a
          weighted level / role / known-stat heuristic, not a damage multiplier
          or predicted win rate. Alternatives may clash with another occupied
          slot and cannot automatically replace its selection.
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
              <div className="self-lab-stats">
                <span>HP: {stat(slot.chosen.hp)}</span>
                <span>DPS: {stat(slot.chosen.dps)}</span>
                <span>Damage: {stat(slot.chosen.damage)}</span>
                <span>Targets: {slot.chosen.target}</span>
                <span>Stat coverage: {Math.round(slot.chosen.confidence * 100)}%</span>
                <span>Evolution: {slot.chosen.card.evo === true ? "Unlocked" : slot.chosen.card.evo === false ? "Not unlocked" : "Unknown"}</span>
              </div>
              <p className="self-lab-note">{slot.chosen.evidence}</p>
              {slot.alternatives.length > 0 && (
                <details className="self-lab-alternatives">
                  <summary>Top {slot.alternatives.length} alternative candidates</summary>
                  <table>
                    <thead><tr><th>Card</th><th>Lv</th><th>HP</th><th>DPS</th><th>Fit</th></tr></thead>
                    <tbody>{slot.alternatives.map(other => (
                      <tr key={other.card.id}>
                        <td>{other.card.name}{other.card.evo === true ? " ◈" : ""}</td>
                        <td>{other.card.level ?? "?"}</td>
                        <td>{stat(other.hp)}</td>
                        <td>{stat(other.dps)}</td>
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
          The eight-slot blueprint is strict, but it is not a proof that a
          deck wins every matchup. Published numbers may be from different
          balance patches; Evolution forms and Hero ability effects are not
          fabricated or treated as active in base-card DPS.
        </p>
      )}
    </div>
  );
}
