"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BookOpen, Check, ChevronRight, Crown, ExternalLink, FlaskConical, History, Layers3, RefreshCw, Search, Shield, Swords, Trophy, X } from "lucide-react";
import { type Card, type Snapshot } from "../lib/model";
import { defaults, deckLink, evaluate } from "../lib/engine";
import { stats } from "../lib/engine";
import { type MechanicsCatalog, resolveMechanics } from "../lib/mechanics";
import { generateSelfMadeDecks, type SelfMadeResult, SELF_SLOTS } from "../lib/selfMadeDeckLab";
import { buildDeckPlaybook } from "../lib/deckPlaybook";
import { assessStrategy, focusChoices, type StrategyFocus } from "../lib/deckStrategy";
import { API_RESOURCES, type ResourceParam } from "../lib/apiResources";
import { emptyHistory, readLocalHistory, withSnapshot, writeLocalHistory } from "../lib/localHistory";

type Tab = "Overview" | "Cards" | "Decks" | "Battles" | "Explore";
const NAV: {name:Tab;Icon:typeof Trophy;description:string}[] = [
  {name:"Overview",Icon:Trophy,description:"Your account at a glance"},
  {name:"Cards",Icon:Layers3,description:"Owned cards, levels and details"},
  {name:"Decks",Icon:Swords,description:"Build and compare your eight cards"},
  {name:"Battles",Icon:History,description:"Understand recent matches"},
  {name:"Explore",Icon:Search,description:"Public Clash Royale API"},
];
const fmt=(v:number|null|undefined)=>v==null?"—":v.toLocaleString("en-IN");
const text=(v:unknown)=>typeof v==="string"||typeof v==="number"?String(v):"";
const asObject=(v:unknown):Record<string,unknown> =>
  v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const stat=(v:Record<string,unknown>,k:string)=> {
  const x=v[k];return typeof x==="number"&&Number.isFinite(x)?x:null;
};
const digits=(v:number|null|undefined)=>v==null?"—":Number.isInteger(v)?fmt(v):v.toFixed(1);
function CardArt({card,size="normal"}:{card:Card;size?:"normal"|"small"}){
  return <div className={"ri-art "+(size==="small"?"ri-art-small":"")}>
    {card.image?<img src={card.image} alt="" loading="lazy"/>:<Crown size={22}/>}
    <span className="ri-cost">{card.elixir??"?"}</span>
  </div>;
}
function Stat({label,value,hint}:{label:string;value:string|number;hint?:string}){
  return <div className="ri-stat"><div className="ri-muted ri-tiny">{label}</div>
    <strong>{value}</strong>{hint&&<small>{hint}</small>}</div>;
}
function MiniDeck({cards,select,active}:{cards:Card[];select?:(card:Card)=>void;active?:number}){
  return <div className="ri-deck-grid">{cards.map(c=>
    <button type="button" key={c.id} className={"ri-deck-tile "+(active===c.id?"is-selected":"")}
      onClick={()=>select?.(c)} disabled={!select} aria-label={c.name+", level "+(c.level??"?")}>
      <CardArt card={c}/><strong>{c.name}</strong><small>Lv {c.level??"?"}{c.evo===true?" · Evo":""}{c.hero===true?" · Hero":""}</small>
    </button>)}</div>;
}
function JsonDetails({value,summary="All fields from API"}:{value:unknown;summary?:string}){
  return <details className="ri-json"><summary>{summary}</summary>
    <pre>{JSON.stringify(value,null,2)}</pre>
  </details>;
}
function RecordList({value}:{value:unknown}){
  const o=asObject(value);
  const list=Array.isArray(value)?value:Array.isArray(o.items)?o.items:[];
  if(!Array.isArray(list)||!list.length) {
    if(Array.isArray(value)||Array.isArray(o.items))
      return <div className="ri-empty">The API returned an empty list. This is not a fabricated result.</div>;
    const fields=Object.entries(o).filter(([,v])=>
      typeof v==="string"||typeof v==="number"||typeof v==="boolean").slice(0,20);
    return <><div className="ri-kv">{fields.map(([k,v])=>
      <span key={k}><small>{k}</small><b>{String(v)}</b></span>)}</div><JsonDetails value={value}/></>;
  }
  return <><div className="ri-result-count">{list.length} record{list.length===1?"":"s"} returned</div>
    <div className="ri-records">{list.slice(0,100).map((raw,i)=>{
      const row=asObject(raw);
      const title=text(row.name)||text(row.title)||text(row.tag)||text(row.id)||"Entry "+(i+1);
      const details=["rank","tag","trophies","clanScore","clanWarTrophies","location","state","status","index","maxPlayers","members"].filter(k=>row[k]!=null).slice(0,5);
      const nested=asObject(row.gameMode);
      return <details key={i} className="ri-record"><summary><span className="ri-record-index">{i+1}</span><span><strong>{title}</strong>
        <small>{details.map(k=>k+": "+text(row[k])).join(" · ")}{nested.name?" · "+text(nested.name):""}</small></span><ChevronRight size={15}/></summary>
        <pre>{JSON.stringify(raw,null,2)}</pre></details>;
    })}</div>{list.length>100&&<p className="ri-muted">Showing the first 100 records. Use pagination to retrieve more.</p>}
    <JsonDetails value={value}/></>;
}
function ApiExplorer({playerTag,clanTag}:{playerTag:string;clanTag:string}){
  const [group,setGroup]=useState("Player");
  const available=API_RESOURCES.filter(x=>x.group===group);
  const [resource,setResource]=useState("player");
  const [values,setValues]=useState<Record<ResourceParam,string>>({
    tag:playerTag,name:"",location:"global",season:"2026-11",leaderboard:"",
  });
  const [result,setResult]=useState<{data:unknown;fetchedAt:string}|null>(null);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const [pageSize,setPageSize]=useState("25");
  const [cursor,setCursor]=useState("");
  useEffect(()=>{if(playerTag)setValues(v=>({...v,tag:playerTag}));},[playerTag]);
  const selected=API_RESOURCES.find(x=>x.id===resource)??API_RESOURCES[0];
  const update=(k:ResourceParam,v:string)=>{setValues(old=>({...old,[k]:v}));setResult(null);setCursor("");};
  const choose=(id:string)=>{setResource(id);setResult(null);setError("");setCursor("");
    if(["clan","members","race","race-log"].includes(id)&&clanTag)
      setValues(old=>({...old,tag:clanTag.replace(/^#/,"")}));
    else if(["player","battles","chests"].includes(id)&&playerTag)
      setValues(old=>({...old,tag:playerTag.replace(/^#/,"")}));
  };
  async function load(after="") {
    setBusy(true);setError("");setResult(null);
    try {
      const q=new URLSearchParams({resource,limit:pageSize});
      for(const field of selected.needs)q.set(field,values[field]);
      if(after)q.set("after",after);
      const response=await fetch("/api/resources?"+q.toString());
      const json=await response.json();
      if(!response.ok)throw new Error(json.error??"The API request failed.");
      setResult(json);setCursor(after);
    }catch(e){setError((e as Error).message)}
    finally{setBusy(false)}
  }
  const data=asObject(result?.data);
  const cursors=asObject(asObject(data.paging).cursors);
  return <div className="ri-stack">
    <div className="ri-section-title"><div><h2>Explore the API</h2><p>One simple viewer for all supported public Supercell resources.</p></div>
      <a className="ri-text-link" href="https://developer.clashroyale.com/#/documentation" target="_blank" rel="noreferrer">Official docs <ExternalLink size={14}/></a></div>
    <div className="ri-panel">
      <div className="ri-chip-row">{(["Player","Clan","Tournament","Rankings","Game"] as const).map(x=>
        <button type="button" key={x} className={"ri-chip "+(group===x?"is-active":"")}
          onClick={()=>{setGroup(x);const first=API_RESOURCES.find(y=>y.group===x)!;choose(first.id);}}>{x}</button>)}</div>
      <label className="ri-label" htmlFor="ri-resource">What do you want to see?</label>
      <select id="ri-resource" value={resource} onChange={e=>choose(e.target.value)}>
        {available.map(x=><option value={x.id} key={x.id}>{x.title}</option>)}
      </select>
      <p className="ri-subtle">{selected.description}</p>
      <form className="ri-explorer-form" onSubmit={e=>{e.preventDefault();void load();}}>
        {selected.needs.map(field=><label key={field} className="ri-field">
          <span>{field==="tag"?"Player, clan or tournament tag":field==="name"?"Search name":field==="location"?"Location ID":field==="season"?"Season (YYYY-MM)":"Leaderboard ID"}</span>
          <input required value={values[field]} onChange={e=>update(field,e.target.value)}
            placeholder={field==="tag"?"#VUYRP9GQL":field==="name"?"Search name":field==="location"?"global":field==="season"?"2026-11":"ID"}/>
        </label>)}
        {selected.list&&<label className="ri-field ri-field-small"><span>Results per page</span>
          <select value={pageSize} onChange={e=>setPageSize(e.target.value)}>
            {[10,25,50,100].map(x=><option key={x}>{x}</option>)}</select></label>}
        <button className="ri-button" type="submit" disabled={busy}>{busy?"Loading…":"Fetch data"} <ArrowRight size={16}/></button>
      </form>
    </div>
    {error&&<div className="ri-alert" role="alert">{error}</div>}
    {result&&<section className="ri-panel">
      <div className="ri-row ri-space"><div><h3>{selected.title}</h3><p className="ri-muted ri-tiny">Supercell API · fetched {new Date(result.fetchedAt).toLocaleString()}</p></div>
        <span className="ri-status">Read only</span></div>
      <RecordList value={result.data}/>
      {selected.list&&(typeof cursors.after==="string"||cursor)&&
        <div className="ri-row ri-pagination">
          {cursor&&<button className="ri-button-secondary" onClick={()=>void load()}>First page</button>}
          {typeof cursors.after==="string"&&<button className="ri-button-secondary" onClick={()=>void load(cursors.after as string)}>Next page <ChevronRight size={15}/></button>}
        </div>}
    </section>}
    <p className="ri-footnote">API coverage includes public player data, cards, clan/riverrace, tournaments, locations, Ranked and Trophy Road standings, league seasons, game-mode leaderboards and events. Restricted verification and removed or unavailable endpoints are deliberately excluded. Actual data depends on the game API.</p>
  </div>;
}
function PlayGuide({deck,mechanics,focus}:{deck:Card[];mechanics:MechanicsCatalog|null;focus:StrategyFocus}){
  const guide=buildDeckPlaybook(deck,mechanics,focus);
  if(!guide)return null;
  return <details className="ri-panel ri-guide"><summary><BookOpen size={18}/> How to play this deck <ChevronRight size={16}/></summary>
    <p className="ri-subtle">{guide.identity}</p>
    {[guide.opening,guide.single,guide.double,guide.finishing].map(x=>
      <div className="ri-guide-step" key={x.heading}><strong>{x.heading}</strong><p>{x.objective}</p>
        <ul>{x.steps.slice(0,3).map((v,i)=><li key={i}>{v}</li>)}</ul></div>)}
    <details><summary>Threat counters and individual card roles</summary>
      {guide.matchups.map(x=><p key={x.id}><strong>{x.name}:</strong> {x.instructions.join(" ")}</p>)}
      {guide.cardJobs.map(x=><p key={x.id}><strong>{x.name}:</strong> {x.job} — {x.when}</p>)}
    </details>
    <p className="ri-footnote">This is a role-based guide, not a guarantee of a match result.</p>
  </details>;
}

export default function Home() {
  const [tab,setTab]=useState<Tab>("Overview");
  const [tagInput,setTagInput]=useState("");
  const [player,setPlayer]=useState<Snapshot|null>(null);
  const [deck,setDeck]=useState<Card[]>([]);
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [mechanics,setMechanics]=useState<MechanicsCatalog|null>(null);
  const [self,setSelf]=useState<SelfMadeResult|null>(null);
  const [focus,setFocus]=useState<StrategyFocus>("balanced");
  const [maxElixir,setMaxElixir]=useState(5);
  const [cardsQuery,setCardsQuery]=useState("");
  const [cardsFilter,setCardsFilter]=useState("Owned");
  const [selectedCard,setSelectedCard]=useState<Card|null>(null);
  const [battleFilter,setBattleFilter]=useState("All");
  const [localBattles,setLocalBattles]=useState<Snapshot["battles"]>([]);
  const [apiReady,setApiReady]=useState<boolean|null>(null);
  const [historyOpened,setHistoryOpened]=useState(false);
  async function loadPlayer(raw:string){
    setLoading(true);setError("");
    try{
      const r=await fetch("/api/player?tag="+encodeURIComponent(raw.trim()));
      const payload=await r.json();
      if(!r.ok)throw new Error(payload.error??"Unable to load the player.");
      const snap=payload as Snapshot;
      if(snap.mode!=="live")throw new Error("The official player profile is unavailable.");
      setPlayer(snap);setDeck(snap.deck);setSelf(null);setSelectedCard(null);
      setTagInput(snap.tag.replace(/^#/,""));
      try{
        localStorage.setItem("ri-last-player-tag",snap.tag.replace(/^#/,""));
        window.history.replaceState(null,"","/?tag="+encodeURIComponent(snap.tag.replace(/^#/,"")));
        const h=withSnapshot(readLocalHistory(snap.tag),snap);
        writeLocalHistory(snap.tag,h);
        setLocalBattles(h.battles);
      }catch{setLocalBattles(snap.battles)}
    }catch(e){setError((e as Error).message)}
    finally{setLoading(false)}
  }
  useEffect(()=>{
    fetch("/api/status").then(r=>r.json()).then(x=>setApiReady(!!x.live)).catch(()=>setApiReady(false));
    fetch("/api/mechanics").then(r=>r.ok?r.json():null).then(x=>{if(x&&Array.isArray(x.cards))setMechanics(x);}).catch(()=>{});
    try{
      const url=new URL(window.location.href);
      const input=url.searchParams.get("tag")||localStorage.getItem("ri-last-player-tag");
      if(input){setTagInput(input);void loadPlayer(input);}
    }catch{}
  },[]);
  const collection=player?.catalog??[];
  const visible=useMemo(()=>collection.filter(c=>
    c.name.toLowerCase().includes(cardsQuery.trim().toLowerCase())&&
    (cardsFilter==="All"||(cardsFilter==="Owned"&&c.owned)||
     (cardsFilter==="Unowned"&&!c.owned)||
     (cardsFilter==="Evolutions"&&c.evo===true)||
     (cardsFilter==="Heroes"&&c.hero===true)))
    .sort((a,b)=>Number(b.owned)-Number(a.owned)||(b.level??0)-(a.level??0)||a.name.localeCompare(b.name)),
    [collection,cardsQuery,cardsFilter]);
  const current=player?evaluate(deck,{...defaults,cap:player.cap},mechanics):null;
  const strategy=deck.length===8?assessStrategy(deck,mechanics,{focus}):null;
  const battleSummary=player?stats(localBattles):null;
  const matches=localBattles.filter(b=>battleFilter==="All"||
    (battleFilter==="Wins"&&b.outcome==="win")||
    (battleFilter==="Losses"&&b.outcome==="loss"));
  const activeCard=selectedCard?collection.find(c=>c.id===selectedCard.id)??selectedCard:null;
  const cardStats=activeCard?resolveMechanics(activeCard,mechanics):null;
  const recent=matches.slice(0,historyOpened?100:20);
  function chooseTab(next:Tab){setTab(next);window.scrollTo({top:0,behavior:"smooth"});}
  function replaceDeckCard(card:Card) {
    if(!card.owned)return;
    if(deck.some(c=>c.id===card.id))return;
    const next=deck.length<8?[...deck,card]:[...deck.slice(0,7),card];
    setDeck(next);setSelf(null);
  }
  const winnerName=deck.find(c=>c.roles.includes("Win condition"))?.name||"Custom";
  return <div className="ri-shell">
    <header className="ri-header">
      <div className="ri-topbar">
        <button type="button" className="ri-brand" onClick={()=>chooseTab("Overview")} aria-label="Royal Intelligence home">
          <span className="ri-logo"><Crown size={20}/></span><span>Royal<span className="ri-brand-light"> Intelligence</span></span>
        </button>
        <nav className="ri-nav" aria-label="Main navigation">{NAV.map(({name})=>
          <button key={name} type="button" onClick={()=>chooseTab(name)}
            className={tab===name?"is-active":""} aria-current={tab===name?"page":undefined}>{name}</button>)}</nav>
        <a href="/advanced#Deck%20Laboratory" className="ri-advanced">Advanced tools <ArrowRight size={15}/></a>
      </div>
    </header>
    <main className="ri-main">
      <div className="ri-account">
        <form className="ri-search" onSubmit={e=>{e.preventDefault();void loadPlayer(tagInput);}}>
          <span aria-hidden="true">#</span><input aria-label="Player tag" placeholder="Enter player tag" value={tagInput}
            onChange={e=>setTagInput(e.target.value)} required/>
          <button type="submit" disabled={loading}><Search size={16}/>{loading?"Loading…":"Load player"}</button>
        </form>
        <div className="ri-row ri-statuses">
          <span className={"ri-status "+(player?"ri-status-good":"")}>{player?"● Connected: "+player.name:apiReady===false?"● API unavailable":"● No player selected"}</span>
          {player&&<button className="ri-refresh" onClick={()=>void loadPlayer(player.tag)} disabled={loading} aria-label="Refresh player data"><RefreshCw size={15}/></button>}
        </div>
      </div>
      {error&&<div className="ri-alert" role="alert">{error}</div>}
      {tab==="Explore"?<ApiExplorer playerTag={player?.tag??tagInput} clanTag={text(asObject(player?.raw).clan&&asObject(asObject(player?.raw).clan).tag)}/>:<>
        <div className="ri-heading"><div><p className="ri-eyebrow">ROYAL INTELLIGENCE / {tab.toUpperCase()}</p>
          <h1>{tab==="Overview"?"Clash Royale, simplified.":tab==="Cards"?"Your collection.":tab==="Decks"?"Build a better deck.":"Your battles."}</h1>
          <p>{tab==="Overview"?"Your profile, cards, decks and results. Nothing extra.":NAV.find(x=>x.name===tab)?.description}</p>
        </div>{player&&<span className="ri-tag">#{player.tag.replace(/^#/,"")}</span>}</div>
        {!player?<div className="ri-panel ri-welcome"><div className="ri-welcome-icon"><Crown size={26}/></div>
          <h2>Start with your player tag</h2><p>Enter your Clash Royale tag above to view official account data, your owned cards, battle history and deck suggestions.</p>
          <p className="ri-muted ri-tiny">Your API key stays on the server. This site reads public game data and does not control your account.</p>
        </div>:<>
          {tab==="Overview"&&<div className="ri-stack">
            <div className="ri-profile"><div className="ri-profile-icon">{player.name.slice(0,1).toUpperCase()}</div>
              <div><p className="ri-eyebrow">PLAYER PROFILE</p><h2>{player.name}</h2>
                <p>{player.arena} {player.clan?"· "+player.clan:""} · King Tower {player.kingLevel??"—"}</p></div>
              <span className="ri-status ri-status-good">Live profile</span></div>
            <div className="ri-stat-grid">
              <Stat label="Trophies" value={fmt(player.trophies)}/>
              <Stat label="Personal best" value={fmt(player.bestTrophies)}/>
              <Stat label="Cards owned" value={player.cards.filter(c=>!c.tower).length} hint={"of "+player.catalog.filter(c=>!c.tower).length+" catalog entries"}/>
              <Stat label="Recent win rate" value={battleSummary&&battleSummary.wins+battleSummary.losses?
                Math.round(100*battleSummary.wins/(battleSummary.wins+battleSummary.losses))+"%":"—"} hint="Observed battles only"/>
            </div>
            <section className="ri-panel"><div className="ri-section-title"><div><h2>Current deck</h2><p>{deck.length===8?(current?.avg?.toFixed(2)+" average elixir · "+winnerName):"No complete deck found"}</p></div>
              <button className="ri-text-button" onClick={()=>chooseTab("Decks")}>View deck <ArrowRight size={16}/></button></div>
              <MiniDeck cards={deck} select={c=>{setSelectedCard(c);chooseTab("Cards")}}/>
            </section>
            <div className="ri-shortcuts">
              <button onClick={()=>chooseTab("Cards")}><Layers3 size={20}/><span><strong>My cards</strong><small>Levels and Evolutions</small></span><ChevronRight size={18}/></button>
              <button onClick={()=>chooseTab("Decks")}><FlaskConical size={20}/><span><strong>Find a deck</strong><small>Owned-card numerical comparison</small></span><ChevronRight size={18}/></button>
              <button onClick={()=>chooseTab("Battles")}><History size={20}/><span><strong>Recent battles</strong><small>Results and opponents</small></span><ChevronRight size={18}/></button>
              <button onClick={()=>chooseTab("Explore")}><BarChart3 size={20}/><span><strong>More game data</strong><small>Clans, events and rankings</small></span><ChevronRight size={18}/></button>
            </div>
            {player.warnings.length>0&&<details className="ri-muted ri-tiny"><summary>Data notes ({player.warnings.length})</summary><ul>{player.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
          </div>}
          {tab==="Cards"&&<div className="ri-stack">
            <div className="ri-section-title"><div><h2>Card collection</h2><p>{visible.length} cards · tap one for its known details</p></div></div>
            <div className="ri-filterbar"><input aria-label="Search cards" placeholder="Search cards…" value={cardsQuery} onChange={e=>setCardsQuery(e.target.value)}/>
              <select aria-label="Card filter" value={cardsFilter} onChange={e=>setCardsFilter(e.target.value)}>
                {["Owned","All","Unowned","Evolutions","Heroes"].map(x=><option key={x}>{x}</option>)}</select></div>
            {activeCard&&<section className="ri-panel ri-card-detail"><button type="button" className="ri-close" aria-label="Close card" onClick={()=>setSelectedCard(null)}><X size={17}/></button>
              <CardArt card={activeCard}/><div><p className="ri-eyebrow">CARD DETAILS</p><h2>{activeCard.name}</h2>
                <p>{activeCard.owned?"Level "+(activeCard.level??"unknown"):"Not owned"} · {activeCard.elixir??"?"} elixir · {activeCard.rarity}</p>
                <div className="ri-mini-metrics">
                  <span>HP <strong>{digits(cardStats?.hitpoints)}</strong></span>
                  <span>DPS <strong>{digits(cardStats?.dps)}</strong></span>
                  <span>Hit damage <strong>{digits(cardStats?.damage)}</strong></span>
                  <span>Range <strong>{digits(cardStats?.rangeTiles)}</strong></span>
                </div><p className="ri-muted ri-tiny">{activeCard.roles.join(" · ")||"No role classification"}
                  {activeCard.evo===true?" · Evolution unlocked":""}{activeCard.hero===true?" · Hero unlocked":""}</p>
                {activeCard.owned&&<button className="ri-button-secondary" onClick={()=>{replaceDeckCard(activeCard);chooseTab("Decks")}}>Add to deck <ArrowRight size={14}/></button>}
                <small>Combat measurements come from separate community data, not the official player API. Unknown stats are not guessed.</small>
              </div></section>}
            <div className="ri-cards">{visible.map(c=>
              <button type="button" key={c.id} className={"ri-card "+(selectedCard?.id===c.id?"is-selected":"")}
                onClick={()=>setSelectedCard(c)}><CardArt card={c}/><strong>{c.name}</strong>
                <small>{c.owned?"Lv "+(c.level??"?"):"Locked"}{c.evo===true?" · Evo":""}{c.hero===true?" · Hero":""}</small></button>)}</div>
          </div>}
          {tab==="Decks"&&<div className="ri-stack">
            <section className="ri-panel"><div className="ri-section-title"><div><h2>Your selected deck</h2>
              <p>{deck.length}/8 cards · {current?.avg?.toFixed(2)??"—"} average elixir · {current?.cycle??"—"} four-card cycle</p></div>
              {deck.length===8&&<a href={deckLink(deck)} className="ri-button-secondary" target="_blank" rel="noreferrer">Open in game <ExternalLink size={14}/></a>}</div>
              <MiniDeck cards={deck} select={c=>setSelectedCard(c)} active={selectedCard?.id}/>
              {selectedCard&&deck.some(c=>c.id===selectedCard.id)&&<div className="ri-row ri-selection">
                <span>{selectedCard.name} selected</span>
                <button className="ri-text-button" onClick={()=>{setDeck(deck.filter(c=>c.id!==selectedCard.id));setSelectedCard(null);setSelf(null);}}>Remove card <X size={14}/></button>
              </div>}
              {strategy&&<div className="ri-mini-metrics"><span>Air defense <strong>{strategy.scenarios.find(x=>x.id==="air")?.score??"—"}/100</strong></span>
                <span>Tank defense <strong>{strategy.scenarios.find(x=>x.id==="tanks")?.score??"—"}/100</strong></span>
                <span>Swarm defense <strong>{strategy.scenarios.find(x=>x.id==="swarms")?.score??"—"}/100</strong></span></div>}
            </section>
            <section className="ri-panel"><div className="ri-section-title"><div><h2>Self-made deck generator</h2><p>Only cards you own. Eight different jobs. Actual-level comparisons.</p></div></div>
              <div className="ri-generator-form">
                <label className="ri-field"><span>What matters most?</span>
                  <select value={focus} onChange={e=>{setFocus(e.target.value as StrategyFocus);setSelf(null);}}>
                    {focusChoices.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>
                <label className="ri-field ri-field-small"><span>Maximum average elixir</span>
                  <select value={maxElixir} onChange={e=>{setMaxElixir(Number(e.target.value));setSelf(null);}}>
                    {[3,3.5,4,4.5,5,5.5,6,7].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
                <button type="button" className="ri-button" onClick={()=>{
                  const res=generateSelfMadeDecks(player.cards,{...defaults,maxElixir,cap:player.cap},mechanics,focus);
                  setSelf(res);if(res.candidates[0])setDeck(res.candidates[0].cards);
                }}>Find my best deck <ArrowRight size={16}/></button>
              </div>
              <p className="ri-footnote">Compares suitable owned cards for win condition, mini tank, air, air+splash, tank killer, ground defense, small spell and heavy spell. Rank is a heuristic, not a win probability.</p>
              {self&&<div className="ri-generated">
                {self.issues.map((s,i)=><div className="ri-alert" key={i}>{s}</div>)}
                <p className="ri-muted ri-tiny">{self.eligibleCardCount} owned cards inspected · {self.candidates.length} possible complete teams</p>
                {self.candidates.map((result,i)=><div className="ri-candidate" key={i}>
                  <div className="ri-row ri-space"><strong>Team {i+1} · {result.score.toFixed(1)}/100 suitability</strong>
                    <button className="ri-text-button" onClick={()=>setDeck(result.cards)}>{result.cards.map(c=>c.id).join(",")===deck.map(c=>c.id).join(",")?"Selected":"Choose team"} <Check size={15}/></button></div>
                  <MiniDeck cards={result.cards}/>
                  {result.specialSlots.length>0&&<p className="ri-muted ri-tiny">Suggested forms: {result.specialSlots.map(x=>x.slot+" — "+x.card).join(" · ")}</p>}
                  <details className="ri-role-details"><summary>Why these eight cards? <ChevronRight size={16}/></summary>
                    {result.slots.map(slot=><details key={slot.id} className="ri-role-row"><summary><strong>{slot.label}</strong><span>{slot.chosen.card.name} · {slot.chosen.grade}/100</span></summary>
                      <p>Lv {slot.chosen.card.level} · HP {digits(slot.chosen.hp)} · DPS {digits(slot.chosen.dps)} · Damage {digits(slot.chosen.damage)} · Numeric coverage {Math.round(slot.chosen.numericCoverage*100)}%</p>
                      <p>{slot.chosen.evidence}</p>
                      {slot.alternatives.length>0&&<p className="ri-muted">Other owned choices: {slot.alternatives.slice(0,12).map(c=>c.card.name+" ("+c.grade+")").join(" · ")}</p>}
                    </details>)}</details>
                  <PlayGuide deck={result.cards} mechanics={mechanics} focus={focus}/>
                </div>)}
              </div>}
            </section>
            <section className="ri-panel ri-advanced-panel"><Shield size={20}/><div><h3>Top global player comparison</h3>
              <p>Need the live Top 100/200/300 Ranked scanner, detailed substitutions, opponent matchups or advanced deck analysis?</p></div>
              <a href="/advanced#Deck%20Laboratory" className="ri-button-secondary">Open advanced lab <ArrowRight size={15}/></a></section>
          </div>}
          {tab==="Battles"&&<div className="ri-stack">
            <div className="ri-section-title"><div><h2>Battle history</h2><p>Actual results from available Supercell battle summaries and your saved device history.</p></div></div>
            <div className="ri-stat-grid ri-stat-grid-small"><Stat label="Wins" value={battleSummary?.wins??0}/><Stat label="Losses" value={battleSummary?.losses??0}/>
              <Stat label="Observed matches" value={localBattles.length}/></div>
            <div className="ri-chip-row">{["All","Wins","Losses"].map(x=>
              <button key={x} className={"ri-chip "+(battleFilter===x?"is-active":"")} onClick={()=>setBattleFilter(x)}>{x}</button>)}</div>
            <div className="ri-battles">{recent.map(b=><details className="ri-battle" key={b.id}>
              <summary><span className={"ri-result-dot "+(b.outcome==="win"?"is-win":b.outcome==="loss"?"is-loss":"")}></span>
                <span className="ri-battle-name"><strong>{b.opponent[0]?.name??"Unknown opponent"}</strong><small>{b.mode} · {b.time.slice(0,10)}</small></span>
                <span className="ri-battle-result">{b.outcome.toUpperCase()}{b.trophyChange!=null?" · "+(b.trophyChange>0?"+":"")+b.trophyChange:""}</span><ChevronRight size={16}/></summary>
              <div className="ri-battle-detail"><p>Opponent: {b.opponent.map(p=>p.name).join(", ")||"unknown"} · Mode: {b.mode}</p>
                <div className="ri-battle-decks"><div><small>Your cards</small><MiniDeck cards={b.team[0]?.cards??[]}/></div>
                  <div><small>Opponent cards</small><MiniDeck cards={b.opponent[0]?.cards??[]}/></div></div></div>
            </details>)}</div>
            {!recent.length&&<div className="ri-empty">No battles match this filter or the game API has not returned them.</div>}
            {!historyOpened&&matches.length>20&&<button className="ri-button-secondary" onClick={()=>setHistoryOpened(true)}>See more matches</button>}
            <p className="ri-footnote">The official API returns battle summaries, not move-by-move replay or troop placement data. Saved history is local to this browser.</p>
          </div>}
        </>}
      </>}
      <footer className="ri-footer"><span>Royal Intelligence · Unofficial Clash Royale fan tool. Not affiliated with Supercell.</span>
        <div><a href="https://developer.clashroyale.com/#/documentation" target="_blank" rel="noreferrer">API docs</a><a href="/advanced">Advanced tools</a></div></footer>
    </main>
    <nav className="ri-mobile-nav" aria-label="Mobile navigation">{NAV.map(({name,Icon})=>
      <button key={name} aria-current={tab===name?"page":undefined} className={tab===name?"is-active":""}
        onClick={()=>chooseTab(name)}><Icon size={18}/><span>{name}</span></button>)}</nav>
  </div>;
}
