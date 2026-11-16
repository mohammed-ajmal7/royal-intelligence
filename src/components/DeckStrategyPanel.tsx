"use client";

import { Shield, Swords, Sparkles, AlertTriangle, BrainCircuit } from "lucide-react";
import type { StrategyReport, SwapExplanation } from "../lib/deckStrategy";

export function DeckStrategyPanel({
  report,comparison,showCards=true,
}:{
  report:StrategyReport;
  comparison?:SwapExplanation;
  showCards?:boolean;
}){
  return <section className="reasoned-deck" aria-label="Deck strategic reasoning">
    <div className="reasoned-hero">
      <div>
        <span className="reasoned-eyebrow"><BrainCircuit size={16}/> TACTICAL REASONING</span>
        <h3>{report.score.toFixed(1)} <small>/100 strategic coverage</small></h3>
        <p>{report.headline}</p>
      </div>
      <span className="reasoned-label">Evidence-based estimates — not win odds</span>
    </div>
    <div className="reasoned-threats">
      {report.scenarios.map(s=><div className="reasoned-threat" key={s.id}>
        <div className="reasoned-threat-head">
          <strong>{s.label}</strong>
          <span className={"reasoned-status "+s.status}>{s.status} · {s.score.toFixed(0)}/100</span>
        </div>
        <div className="reasoned-track"><i style={{width:s.score+"%"}}/></div>
        <p>{s.explanation}</p>
        {s.caution&&<small className="reasoned-caution">{s.caution}</small>}
      </div>)}
    </div>
    <div className="reasoned-columns">
      <div className="reasoned-findings">
        <h4><Shield size={16}/> What this deck does well</h4>
        {report.strengths.length ? <ul>{report.strengths.slice(0,5).map(s=><li key={s}>{s}</li>)}</ul> :
          <p>None of the assessed scenarios is clearly covered yet. No strength is being invented.</p>}
      </div>
      <div className="reasoned-findings">
        <h4><AlertTriangle size={16}/> What can go wrong</h4>
        {report.risks.length ? <ul>{report.risks.map(s=><li key={s}>{s}</li>)}</ul> :
          <p>No major gap identified by the available static evidence. Matchups still vary.</p>}
      </div>
    </div>
    {report.synergies.length>0&&<div className="reasoned-synergy">
      <h4><Sparkles size={16}/> Why these cards work together</h4>
      <ul>{report.synergies.map(s=><li key={s}>{s}</li>)}</ul>
    </div>}
    {comparison &&(comparison.added.length||comparison.out.length)&&<div className="reasoned-swaps">
      <h4><Swords size={17}/> Compared with your loaded current deck</h4>
      <div className="reasoned-comparison">
        <div><small>REPLACE</small><strong>{comparison.out.join(" · ")||"None"}</strong></div>
        <div><small>BRING IN</small><strong>{comparison.added.join(" · ")||"None"}</strong></div>
      </div>
      {comparison.gains.length>0&&<p><b>Potential gains:</b> {comparison.gains.join(" ")}</p>}
      {comparison.costs.length>0&&<p><b>Trade-offs:</b> {comparison.costs.join(" ")}</p>}
      <p className="reasoned-micro">Coverage differences are heuristic points, not match-winning probabilities or measured counter interactions.</p>
    </div>}
    {showCards&&<details className="reasoned-detail">
      <summary>Explain each of the eight cards</summary>
      <div className="reasoned-card-grid">
        {report.cards.map(c=><div key={c.id}>
          <strong>{c.name}</strong>
          <p>{c.why}</p>
          <small>{c.data}</small>
        </div>)}
      </div>
    </details>}
    <details className="reasoned-detail">
      <summary>Battle evidence and limitations</summary>
      <p className="reasoned-micro">Battle logs include decks and outcomes but not placement, elixir mistakes or timing.</p>
      {report.battleSignals.map(b=><p className="reasoned-battle" key={b.id}>
        {b.name}: seen in {b.seen} eligible 1v1 battles; {b.losses} losses, {b.wins} wins.
        {b.seen<5?" Small sample — don't infer a trend.":""}
      </p>)}
      <ul>{report.limitations.map(c=><li key={c}>{c}</li>)}</ul>
    </details>
  </section>;
}
