"use client";

import { AlertTriangle, BookOpen, Crosshair, Shield, Swords, Timer, Zap } from "lucide-react";
import type { DeckPlaybook, PlaybookSection } from "../lib/deckPlaybook";
import { ElixirIcon } from "./ElixirIcon";

function Phase({value,index}:{value:PlaybookSection;index:number}){
  return <article className="deck-play-phase">
    <header><span>{String(index+1).padStart(2,"0")}</span>
      <div><h4>{value.heading}</h4><p>{value.objective}</p></div>
    </header>
    <ol>{value.steps.map((step,i)=><li key={i}>{step}</li>)}</ol>
    <p className="deck-play-warning"><AlertTriangle size={14}/>{value.warning}</p>
  </article>;
}
export function DeckPlaybookPanel({guide}:{guide:DeckPlaybook|null}){
  if(!guide)return <p className="micro">Choose eight distinct cards to generate a match plan.</p>;
  return <section className="deck-playbook" aria-label={"How to play "+guide.title}>
    <div className="deck-play-header">
      <span className="deck-play-eyebrow"><BookOpen size={16}/> PERSONALIZED MATCH PLAN</span>
      <h3>{guide.title}</h3>
      <p>{guide.identity}</p>
      <div className="deck-play-quick">
        <span><Crosshair size={14}/> Win condition: {guide.winConditions.length?
          guide.winConditions.join(" + "):"Not established"}</span>
        <span><Zap size={14}/> Average elixir: {guide.averageElixir===null?"unknown":
          guide.averageElixir.toFixed(2)}</span>
      </div>
    </div>
    <div className="deck-play-phases">
      {[guide.opening,guide.single,guide.double,guide.finishing].map((phase,index)=>
        <Phase key={phase.heading} value={phase} index={index}/>)}
    </div>
    <div className="deck-play-section-head">
      <Shield size={18}/><div><h4>What to do against each enemy attack</h4>
        <p>Only cards present in this eight-card deck are suggested.</p></div>
    </div>
    <div className="deck-play-matchups">
      {guide.matchups.map(m=><article className="deck-play-matchup" key={m.id}>
        <div className="deck-play-matchup-title">
          <Swords size={16}/><strong>{m.name}</strong>
        </div>
        <p className="deck-play-counters">Available answers: {m.cards.length?
          m.cards.join(" · "):"No reliable counter identified"}</p>
        <ol>{m.instructions.map((instruction,i)=>
          <li key={i}>{instruction}</li>)}</ol>
        <p className="deck-play-warning"><AlertTriangle size={14}/>{m.risk}</p>
      </article>)}
    </div>
    <details className="deck-play-details">
      <summary><BookOpen size={16}/> Each card's exact job and when to use it</summary>
      <div className="deck-play-card-jobs">
        {guide.cardJobs.map(card=><article key={card.id}>
          <div className="deck-play-card-head">
            <strong>{card.name}</strong>
            <span className="deck-play-card-cost">Lv {card.level??"?"} · <ElixirIcon cost={card.elixir} size={17} decorative/> elixir</span>
          </div>
          <p className="deck-play-card-job">{card.job}</p>
          <p><b>Use:</b> {card.when}</p>
          <p><b>Watch out:</b> {card.protectAgainst}</p>
        </article>)}
      </div>
    </details>
    <details className="deck-play-details">
      <summary><Timer size={16}/> Match reminders and accuracy limits</summary>
      <ul>{[...guide.reminders,...guide.limitations].map((note,i)=>
        <li key={i}>{note}</li>)}</ul>
    </details>
    <p className="deck-play-footnote">
      Strategic coaching, not guaranteed winning moves. No precise starting hand,
      current elixir, opponent cycle, or live replay was analyzed.
    </p>
  </section>;
}
