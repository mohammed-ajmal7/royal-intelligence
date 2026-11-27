import { ChevronRight } from "lucide-react";
import { buildDeckPlaybook } from "../lib/deckPlaybook";
import type { StrategyFocus } from "../lib/deckStrategy";
import type { MechanicsCatalog } from "../lib/mechanics";
import type { SelfMadeCandidate } from "../lib/selfMadeDeckLab";
import { DeckPlaybookPanel } from "./DeckPlaybookPanel";

const displayStat=(value:number|null)=>value===null?"—":Math.round(value).toLocaleString("en-US");

export function DeckCandidateAnalysis({
  candidate,focus,mechanics,
}:{
  candidate:SelfMadeCandidate;
  focus:StrategyFocus;
  mechanics:MechanicsCatalog|null;
}){
  return <>
    <details className="ri-playstyle-analysis">
      <summary>Why this deck fits {candidate.playstyle.archetype} <ChevronRight size={15}/></summary>
      <p>{candidate.playstyle.summary}</p>
      <div className="ri-playstyle-factors">{candidate.playstyle.factors.map(factor=><div key={factor.id}>
        <span><strong>{factor.label}</strong><small>{factor.evidence}</small></span>
        <b>{factor.score.toFixed(0)}</b>
      </div>)}</div>
      {candidate.playstyle.tradeoffs.length>0&&<p className="ri-playstyle-tradeoffs"><strong>Trade-offs:</strong> {candidate.playstyle.tradeoffs.join(" ")}</p>}
      {candidate.playstyle.personalThreats.length>0&&<p className="ri-playstyle-personal"><strong>From your battle history:</strong> {candidate.playstyle.personalThreats.map(item=>item.name+" — "+item.losses+"/"+item.seen+" losses. "+item.response).join(" ")}</p>}
    </details>
    {candidate.specialSlots.length>0&&<p className="ri-muted ri-tiny">Suggested forms: {candidate.specialSlots.map(item=>item.slot+" — "+item.card).join(" · ")}</p>}
    <details className="ri-role-details"><summary>Role breakdown · all owned alternatives ranked <ChevronRight size={16}/></summary>
      {candidate.slots.map(slot=><details key={slot.id} className="ri-role-row"><summary><strong>{slot.label}</strong><span>{slot.chosen.card.name} · {slot.chosen.grade}/100 · {slot.considered} checked</span></summary>
        <p>Lv {slot.chosen.card.level} · HP {displayStat(slot.chosen.hp)} · DPS {displayStat(slot.chosen.dps)} · Damage {displayStat(slot.chosen.damage)} · Range {displayStat(slot.chosen.range)} tiles · Splash {displayStat(slot.chosen.splash)} tiles · Evidence coverage {Math.round(slot.chosen.confidence*100)}%</p>
        <p>{slot.chosen.evidence}</p>
        {slot.chosen.measured.length>0&&<p className="ri-muted">Role metrics: {slot.chosen.measured.map(metric=>metric.label+" "+metric.value+" "+metric.unit+" · "+metric.relative+"% of your role benchmark").join(" · ")}</p>}
        {slot.chosen.evolved&&<p className="ri-muted">Published {slot.chosen.evolved.form} at Lv {slot.chosen.card.level}: HP {displayStat(slot.chosen.evolved.hp)} · Damage {displayStat(slot.chosen.evolved.damage)} · DPS {displayStat(slot.chosen.evolved.dps)}. Only source-published values are shown.</p>}
        {slot.alternatives.length>0&&<details className="ri-role-ranking"><summary>Full ranking · {slot.considered} owned candidates checked</summary>
          <div className="ri-role-ranking-scroll"><table><thead><tr><th>Card</th><th>Level</th><th>Elixir</th><th>HP</th><th>Damage</th><th>DPS</th><th>Hit interval</th><th>Range</th><th>Splash</th><th>Evo / Hero</th><th>Evidence</th><th>Role score</th></tr></thead>
            <tbody>{[slot.chosen,...slot.alternatives].map((entry,index)=><tr key={entry.card.id}>
              <td>{index===0?"★ ":""}{entry.card.name}</td><td>{entry.card.level??"—"}</td><td>{entry.card.elixir??"—"}</td>
              <td>{displayStat(entry.hp)}</td><td>{displayStat(entry.damage)}</td><td>{displayStat(entry.dps)}</td>
              <td>{entry.hitSpeed===null?"—":entry.hitSpeed+"s"}</td><td>{entry.range===null?"—":entry.range+" tiles"}</td>
              <td>{entry.splash===null?"—":entry.splash+" tiles"}</td>
              <td>{[entry.card.evo===true?"Evo":"",entry.card.hero===true?"Hero":"",entry.card.rarity.toLowerCase()==="champion"?"Champion":""].filter(Boolean).join(" / ")||"—"}</td>
              <td>{Math.round(entry.confidence*100)}%</td><td>{entry.grade.toFixed(1)}</td>
            </tr>)}</tbody>
          </table></div>
        </details>}
      </details>)}
    </details>
    <details className="deck-play-alternative">
      <summary>How to play this deck</summary>
      <DeckPlaybookPanel guide={buildDeckPlaybook(candidate.cards,mechanics,focus)}/>
    </details>
    {candidate.warnings.length>0&&<p className="ri-playstyle-tradeoffs">{candidate.warnings.join(" ")}</p>}
  </>;
}
