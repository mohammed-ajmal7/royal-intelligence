"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Check, ChevronRight, Crown, ExternalLink, FlaskConical, History, Layers3, RefreshCw, Search, Swords, Trophy, X } from "lucide-react";
import { type Card, type Snapshot } from "../lib/model";
import { defaults, deckLink, evaluate } from "../lib/engine";
import { stats } from "../lib/engine";
import { type MechanicsCatalog } from "../lib/mechanics";
import { generateSelfMadeDecks, type SelfMadeResult } from "../lib/selfMadeDeckLab";
import { buildDeckPlaybook } from "../lib/deckPlaybook";
import { assessStrategy, focusChoices, type StrategyFocus } from "../lib/deckStrategy";
import { API_RESOURCES, type ResourceParam } from "../lib/apiResources";
import { CollectionCardDetails } from "../components/CollectionCardDetails";
import { filterCollection, type CardOwnership, type FormStatusFilter, type CardTypeFilter } from "../lib/collectionFilter";
import { ProfileAvatar } from "../components/ProfileAvatar";
import { readLocalHistory, withSnapshot, writeLocalHistory } from "../lib/localHistory";
import { elixirAsset } from "../lib/statAssets";

type Tab = "Overview" | "Cards" | "Decks" | "Battles" | "Explore";
const NAV: {name:Tab;Icon:typeof Trophy}[] = [
  {name:"Overview",Icon:Trophy},
  {name:"Cards",Icon:Layers3},
  {name:"Decks",Icon:Swords},
  {name:"Battles",Icon:History},
  {name:"Explore",Icon:Search},
];
const fmt=(v:number|null|undefined)=>v==null?"—":v.toLocaleString("en-IN");
const text=(v:unknown)=>typeof v==="string"||typeof v==="number"?String(v):"";
const asObject=(v:unknown):Record<string,unknown> =>
  v&&typeof v==="object"&&!Array.isArray(v)?v as Record<string,unknown>:{};
const digits=(v:number|null|undefined)=>v==null?"—":Number.isInteger(v)?fmt(v):v.toFixed(1);
function CardArt({card,size="normal"}:{card:Card;size?:"normal"|"small"}){
  return <div className={"ri-art "+(size==="small"?"ri-art-small":"")}>
    {card.image?<img src={card.image} alt="" loading="lazy"/>:<Crown size={22}/>}
    {!card.tower&&<span className="ri-cost" aria-label={card.elixir==null?"Variable elixir cost":card.elixir+" elixir"}>{elixirAsset(card.elixir)?<img src={elixirAsset(card.elixir)!} alt="" width={28} height={28}/>:card.elixir??"—"}</span>}
  </div>;
}

function SpecialFormEmptyState({
  type,status,onShowAll,
}:{
  type: "Heroes" | "Evolutions";
  status: FormStatusFilter;
  onShowAll:()=>void;
}){
  const isHero=type==="Heroes";
  const label=isHero?"Hero":"Evolution";
  const title=status==="Unlocked"
    ? "You haven’t unlocked any "+label+" cards yet"
    : status==="Locked"
      ? "No locked "+label+" cards found"
      : "No "+label+" cards in your collection yet";
  const description=status==="Unlocked"
    ? "Your collection has no owned cards with an unlocked "+label+" form right now. Browse all "+label+" cards to explore the cards that support it."
    : status==="Locked"
      ? "Your collection has no owned cards with a locked "+label+" form right now. Browse all "+label+" cards to explore the available cards."
      : "There are no owned cards with a "+label+" form in your collection right now. Browse all "+label+" cards to explore the available cards.";
  return <section className="ri-empty-state ri-special-empty" aria-labelledby="ri-special-empty-title">
    <div className={"ri-special-empty-art "+(isHero?"is-hero":"is-evolution")} aria-hidden="true">
      {isHero ? <svg viewBox="0 0 180 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="90" cy="72" r="59" fill="#EEF3FC"/>
        <circle cx="90" cy="72" r="48" fill="#F8FAFF"/>
        <path d="M31 45l5 8 8 2-8 4-5 8-3-8-8-4 8-2 3-8Z" fill="#E4B64D"/>
        <path d="M145 35l3 6 7 2-7 3-3 7-3-7-7-3 7-2 3-6Z" fill="#E4B64D"/>
        <path d="M147 103l3 5 6 2-6 3-3 6-3-6-6-3 6-2 3-5Z" fill="#A9BCE5"/>
        <path d="M54 42 90 27l36 15v35c0 25-15 39-36 50-21-11-36-25-36-50V42Z" fill="#fff" stroke="#3157A5" strokeWidth="3" strokeLinejoin="round"/>
        <path d="M63 49 90 38l27 11v27c0 18-10 29-27 39-17-10-27-21-27-39V49Z" fill="#E8EFFB"/>
        <path d="M71 69c0-11 8-19 19-19s19 8 19 19v5H71v-5Z" fill="#3157A5"/>
        <path d="M68 73h44l-5 14H73l-5-14Z" fill="#E4B64D" stroke="#24447F" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M80 72v-7m20 7v-7" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
        <path d="M90 88v12" stroke="#3157A5" strokeWidth="3" strokeLinecap="round"/>
        <path d="m84 91 6 5 6-5" stroke="#3157A5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M44 116c10-7 18-8 27-4m65 4c-10-7-18-8-27-4" stroke="#9CB1DD" strokeWidth="3" strokeLinecap="round"/>
      </svg> : <svg viewBox="0 0 180 150" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="90" cy="72" r="59" fill="#F2EDFC"/>
        <circle cx="90" cy="72" r="47" fill="#FBF9FF"/>
        <path d="M36 41l4 8 8 3-8 3-4 8-4-8-8-3 8-3 4-8Z" fill="#B59AEF"/>
        <path d="M145 35l3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z" fill="#D8C8FA"/>
        <path d="M145 104l3 5 6 2-6 3-3 6-3-6-6-3 6-2 3-5Z" fill="#A993E5"/>
        <path d="M91 27 119 54 106 112 72 124 48 82 61 43 91 27Z" fill="#E7DDFC" stroke="#8060C8" strokeWidth="3" strokeLinejoin="round"/>
        <path d="m91 27 4 44-23 53-24-42 13-39 30-16Z" fill="#C7B2F4"/>
        <path d="m91 27 28 27-24 17-4-44Z" fill="#F5F0FF"/>
        <path d="m95 71 24-17-13 58-34 12 23-53Z" fill="#A98CE8"/>
        <path d="m96 52-19 24h14l-7 25 22-31H92l4-18Z" fill="#fff" stroke="#7553BD" strokeWidth="2" strokeLinejoin="round"/>
        <path d="M53 104c10 7 22 11 37 11 13 0 24-3 34-10" stroke="#B8A5E9" strokeWidth="3" strokeLinecap="round"/>
      </svg>}
    </div>
    <span className="ri-special-empty-eyebrow">{isHero?"HERO COLLECTION":"EVOLUTION COLLECTION"}</span>
    <h2 id="ri-special-empty-title">{title}</h2>
    <p>{description}</p>
    <button type="button" className="ri-button ri-special-empty-action" onClick={onShowAll}>
      Browse all {label} cards <ChevronRight size={16}/>
    </button>
  </section>;
}
function Stat({label,value,hint}:{label:string;value:string|number;hint?:string}){
  return <div className="ri-stat"><div className="ri-muted ri-tiny">{label}</div>
    <strong>{value}</strong>{hint&&<small>{hint}</small>}</div>;
}
function MiniDeck({cards,select,active}:{cards:Card[];select?:(card:Card)=>void;active?:number}){
  return <div className="ri-deck-grid">{cards.map(c=>
    <button type="button" key={c.id} className={"ri-deck-tile "+(active===c.id?"is-selected":"")}
      onClick={()=>select?.(c)} disabled={!select} aria-pressed={select&&active!==undefined?active===c.id:undefined} aria-label={c.name+", level "+(c.level??"unknown")}>
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
      return <div className="ri-empty">No records returned.</div>;
    const fields=Object.entries(o).filter(([,v])=>
      typeof v==="string"||typeof v==="number"||typeof v==="boolean").slice(0,20);
    return <><div className="ri-kv">{fields.map(([k,v])=>
      <span key={k}><small>{k}</small><b>{String(v)}</b></span>)}</div><JsonDetails value={value}/></>;
  }
  return <><div className="ri-result-count">{list.length} record{list.length===1?"":"s"} returned</div>
    <div className="ri-records">{list.slice(0,150).map((raw,i)=>{
      const row=asObject(raw);
      const title=text(row.name)||text(row.title)||text(row.tag)||text(row.id)||"Entry "+(i+1);
      const details=["rank","tag","trophies","clanScore","clanWarTrophies","location","state","status","index","maxPlayers","members"].filter(k=>row[k]!=null).slice(0,5);
      const nested=asObject(row.gameMode);
      return <details key={i} className="ri-record"><summary><span className="ri-record-index">{i+1}</span><span><strong>{title}</strong>
        <small>{details.map(k=>k+": "+text(row[k])).join(" · ")}{nested.name?" · "+text(nested.name):""}</small></span><ChevronRight size={15}/></summary>
        <pre>{JSON.stringify(raw,null,2)}</pre></details>;
    })}</div>{list.length>150&&<p className="ri-muted">Showing the first 150 records. Use pagination to retrieve more.</p>}
    <JsonDetails value={value}/></>;
}
function ApiExplorer({playerTag,clanTag}:{playerTag:string;clanTag:string}){
  const [group,setGroup]=useState("Player");
  const available=API_RESOURCES.filter(x=>x.group===group);
  const [resource,setResource]=useState("player");
  const [values,setValues]=useState<Record<ResourceParam,string>>({
    tag:playerTag,name:"",location:"global",season:"",leaderboard:"",
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
    <div className="ri-section-title ri-explore-heading"><h1>Explore</h1>
      <a className="ri-text-link" href="https://developer.clashroyale.com/#/documentation" target="_blank" rel="noreferrer">API docs <ExternalLink size={14}/></a></div>
    <div className="ri-panel">
      <div className="ri-chip-row">{(["Player","Clan","Tournament","Rankings","Game"] as const).map(x=>
        <button type="button" key={x} className={"ri-chip "+(group===x?"is-active":"")}
          aria-pressed={group===x} disabled={busy} onClick={()=>{setGroup(x);const first=API_RESOURCES.find(y=>y.group===x)!;choose(first.id);}}>{x}</button>)}</div>
      <label className="ri-label" htmlFor="ri-resource">Resource</label>
      <select id="ri-resource" disabled={busy} value={resource} onChange={e=>choose(e.target.value)}>
        {available.map(x=><option value={x.id} key={x.id}>{x.title}</option>)}
      </select>
       <form className="ri-explorer-form" onSubmit={e=>{e.preventDefault();void load();}}>
        {selected.needs.map(field=><label key={field} className="ri-field">
          <span>{field==="tag"?"Player, clan or tournament tag":field==="name"?"Search name":field==="location"?"Location ID":field==="season"?"Season (YYYY-MM)":"Leaderboard ID"}</span>
          <input required disabled={busy} value={values[field]} onChange={e=>update(field,e.target.value)}
            placeholder={field==="tag"?"#VUYRP9GQL":field==="name"?"Search name":field==="location"?"global":field==="season"?"YYYY-MM":"ID"}/>
        </label>)}
        {selected.list&&<label className="ri-field ri-field-small"><span>Results per page</span>
          <select disabled={busy} value={pageSize} onChange={e=>setPageSize(e.target.value)}>
            {[10,25,50,100].map(x=><option key={x}>{x}</option>)}</select></label>}
        <button className="ri-button" type="submit" disabled={busy}>{busy?"Loading…":"Fetch data"}</button>
      </form>
    </div>
    {error&&<div className="ri-alert" role="alert">{error}</div>}
    {result&&<section className="ri-panel">
      <div className="ri-row ri-space"><div><h3>{selected.title}</h3><p className="ri-muted ri-tiny">{new Date(result.fetchedAt).toLocaleString()}</p></div>
 </div>
      <RecordList value={result.data}/>
      {selected.list&&(typeof cursors.after==="string"||cursor)&&
        <div className="ri-row ri-pagination">
          {cursor&&<button className="ri-button-secondary" onClick={()=>void load()}>First page</button>}
          {typeof cursors.after==="string"&&<button className="ri-button-secondary" onClick={()=>void load(cursors.after as string)}>Next page <ChevronRight size={15}/></button>}
        </div>}
    </section>}

  </div>;
}
function PlayGuide({deck,mechanics,focus}:{deck:Card[];mechanics:MechanicsCatalog|null;focus:StrategyFocus}){
  const guide=buildDeckPlaybook(deck,mechanics,focus);
  if(!guide)return null;
  return <details className="ri-panel ri-guide"><summary><BookOpen size={18}/> How to play this deck <ChevronRight size={16}/></summary>
 
    {[guide.opening,guide.single,guide.double,guide.finishing].map(x=>
      <div className="ri-guide-step" key={x.heading}><strong>{x.heading}</strong><p>{x.objective}</p>
        <ul>{x.steps.slice(0,3).map((v,i)=><li key={i}>{v}</li>)}</ul></div>)}
    <details><summary>Threat counters and individual card roles</summary>
      {guide.matchups.map(x=><p key={x.id}><strong>{x.name}:</strong> {x.instructions.join(" ")}</p>)}
      {guide.cardJobs.map(x=><p key={x.id}><strong>{x.name}:</strong> {x.job} — {x.when}</p>)}
    </details>
 
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
  const [mechanicsStatus,setMechanicsStatus]=useState<"idle"|"loading"|"ready"|"unavailable">("idle");
  const [self,setSelf]=useState<SelfMadeResult|null>(null);
  const [focus,setFocus]=useState<StrategyFocus>("balanced");
  const [maxElixir,setMaxElixir]=useState(5);
  const [cardsQuery,setCardsQuery]=useState("");
  const [cardsOwnership,setCardsOwnership]=useState<CardOwnership>("Owned");
  const [cardsFilter,setCardsFilter]=useState<CardTypeFilter>("");
  const [cardsFormStatus,setCardsFormStatus]=useState<FormStatusFilter>("All");
  const [selectedCard,setSelectedCard]=useState<Card|null>(null);
  const [replaceId,setReplaceId]=useState<number|null>(null);
  const [battleFilter,setBattleFilter]=useState("All");
  const [localBattles,setLocalBattles]=useState<Snapshot["battles"]>([]);
  const [apiReady,setApiReady]=useState<boolean|null>(null);
  const [battleLimit,setBattleLimit]=useState(20);
  async function loadPlayer(raw:string){
    setLoading(true);setError("");
    try{
      const r=await fetch("/api/player?tag="+encodeURIComponent(raw.trim()));
      const payload=await r.json();
      if(!r.ok)throw new Error(payload.error??"Unable to load the player.");
      const snap=payload as Snapshot;
      if(snap.mode!=="live")throw new Error("The official player profile is unavailable.");
      setPlayer(snap);setDeck(snap.deck);setSelf(null);setSelectedCard(null);setReplaceId(null);
      setTagInput(snap.tag.replace(/^#/,""));
      setBattleLimit(20);
      try{
        localStorage.setItem("ri-last-player-tag",snap.tag.replace(/^#/,""));
        const url=new URL(window.location.href);
        url.searchParams.set("tag",snap.tag.replace(/^#/,""));
        window.history.replaceState(null,"",url);
        const h=withSnapshot(readLocalHistory(snap.tag),snap);
        writeLocalHistory(snap.tag,h);
        setLocalBattles(h.battles);
      }catch{setLocalBattles(snap.battles)}
    }catch(e){setError((e as Error).message)}
    finally{setLoading(false)}
  }
  useEffect(()=>{
    function syncTab(){
      const hash=window.location.hash.slice(1).toLowerCase();
      const next=NAV.find(item=>item.name.toLowerCase()===hash)?.name??"Overview";
      setTab(next);
      setSelectedCard(null);
    }
    syncTab();
    window.addEventListener("hashchange",syncTab);
    fetch("/api/status").then(r=>r.json()).then(x=>setApiReady(!!x.live)).catch(()=>setApiReady(false));
    try{
      const url=new URL(window.location.href);
      const input=url.searchParams.get("tag")||localStorage.getItem("ri-last-player-tag");
      if(input){setTagInput(input);void loadPlayer(input);}
    }catch{}
    return ()=>window.removeEventListener("hashchange",syncTab);
  },[]);
  // Optional community mechanics are only loaded if the user opens cards
  // or deck analysis; the simple overview never downloads the large catalog.
  useEffect(()=>{
    if((tab!=="Cards"&&tab!=="Decks")||mechanicsStatus!=="idle")return;
    setMechanicsStatus("loading");
    fetch("/api/mechanics").then(r=>r.ok?r.json():null)
      .then(x=>{
        if(x&&Array.isArray(x.cards)){setMechanics(x);setMechanicsStatus("ready");}
        else setMechanicsStatus("unavailable");
      }).catch(()=>setMechanicsStatus("unavailable"));
  },[tab,mechanicsStatus]);
  const collection=player?.catalog??[];
  const visible=useMemo(()=>filterCollection(collection,{
    ownership:cardsOwnership,type:cardsFilter,formStatus:cardsFormStatus,query:cardsQuery,
  }),[collection,cardsQuery,cardsOwnership,cardsFilter,cardsFormStatus]);
  const current=player?evaluate(deck,{...defaults,cap:player.cap},mechanics):null;
  const strategy=deck.length===8?assessStrategy(deck,mechanics,{focus}):null;
  const battleSummary=player?stats(localBattles):null;
  const matches=localBattles.filter(b=>battleFilter==="All"||
    (battleFilter==="Wins"&&b.outcome==="win")||
    (battleFilter==="Losses"&&b.outcome==="loss"));
  const activeCard=selectedCard?collection.find(c=>c.id===selectedCard.id)??selectedCard:null;
  const recent=matches.slice(0,battleLimit);
  function chooseTab(next:Tab){
    if(next!==tab){
      const url=new URL(window.location.href);
      url.hash=next==="Overview"?"":next.toLowerCase();
      window.history.pushState(null,"",url);
      setTab(next);
    }
    window.scrollTo({top:0});
  }
  const playerParam=player?"?tag="+encodeURIComponent(player.tag.replace(/^#/,"")):"";
  const advancedPath="/advanced"+playerParam;
  const labPath=advancedPath+"#Deck%20Laboratory";
  function replaceDeckCard(card:Card) {
    if(!card.owned||deck.some(c=>c.id===card.id))return;
    if(deck.length===8&&replaceId===null)return;
    const next=deck.length<8?[...deck,card]:
      deck.map(c=>c.id===replaceId?card:c);
    setDeck(next);setSelf(null);setReplaceId(null);
  }
  const currentDeck=tab==="Overview"&&player?evaluate(player.deck,{...defaults,cap:player.cap}):null;
  const currentWinCondition=player?.deck.find(c=>c.roles.includes("Win condition"))?.name??"Custom";
  return <div className="ri-shell">
    <header className="ri-header">
      <div className="ri-topbar">
        <button type="button" className="ri-brand" onClick={()=>chooseTab("Overview")} aria-label="Royaleon home">
          <span className="ri-logo"><img src="/brand/royaleon-mark.svg" width={34} height={34} alt="" /></span><span>Royaleon</span>
        </button>
        <nav className="ri-nav" aria-label="Main navigation">{NAV.map(({name})=>
          <button key={name} type="button" onClick={()=>chooseTab(name)}
            className={tab===name?"is-active":""} aria-current={tab===name?"page":undefined}>{name}</button>)}</nav>
        <a href={labPath} className="ri-advanced"><FlaskConical size={16}/> <span>Advanced</span></a>
      </div>
    </header>
    <main className="ri-main">
      <div className="ri-account">
        <form className="ri-search" onSubmit={e=>{e.preventDefault();void loadPlayer(tagInput);}}>
          <span aria-hidden="true">#</span><input aria-label="Player tag" placeholder="Player tag" autoCapitalize="characters" autoCorrect="off" spellCheck={false} maxLength={32} value={tagInput}
            onChange={e=>setTagInput(e.target.value)} required/>
          <button type="submit" disabled={loading}><Search size={16}/>{loading?"Loading…":"Load player"}</button>
        </form>
        <div className="ri-row ri-statuses" aria-live="polite">
          {(loading||apiReady===false||player?.stale)&&<span className="ri-status">{loading?"Loading…":apiReady===false?"API unavailable":"Saved profile"}</span>}
          {player&&<button className="ri-refresh" onClick={()=>void loadPlayer(player.tag)} disabled={loading} aria-label="Refresh player data"><RefreshCw size={15}/></button>}
        </div>
      </div>
      {error&&<div className="ri-alert" role="alert">{error}</div>}
      {tab==="Explore"?<ApiExplorer playerTag={player?.tag??tagInput} clanTag={text(asObject(player?.raw).clan&&asObject(asObject(player?.raw).clan).tag)}/>:<>
        <div className="ri-heading"><h1>{tab==="Overview"?"Overview":tab==="Cards"?"Cards":tab==="Decks"?"Decks":"Battles"}</h1>
          {player&&<span className="ri-tag">#{player.tag.replace(/^#/,"")}</span>}</div>
        {!player?<div className="ri-welcome" aria-busy={loading}>
          <Crown size={27} aria-hidden="true"/><h2>{loading?"Loading profile…":"Enter a player tag above"}</h2>
        </div>:<>
          {tab==="Overview"&&<div className="ri-stack">
            <div className="ri-profile"><ProfileAvatar playerTag={player.tag} playerName={player.name}/>
              <div><h2>{player.name}</h2>
                <p>{player.arena} {player.clan?"· "+player.clan:""} · King {player.kingLevel??"—"}</p></div>
              {player.stale&&<span className="ri-status">Saved</span>}</div>
            <div className="ri-stat-grid">
              <Stat label="Trophies" value={fmt(player.trophies)}/>
              <Stat label="Personal best" value={fmt(player.bestTrophies)}/>
              <Stat label="Cards" value={player.cards.filter(c=>!c.tower).length} hint={"of "+player.catalog.filter(c=>!c.tower).length}/>
              <Stat label="Win rate" value={battleSummary&&battleSummary.wins+battleSummary.losses?
                Math.round(100*battleSummary.wins/(battleSummary.wins+battleSummary.losses))+"%":"—"}/>
            </div>
            <section className="ri-panel"><div className="ri-section-title"><div><h2>Current deck</h2><p>{player.deck.length===8?(currentDeck?.avg?.toFixed(2)+" elixir · "+currentWinCondition):"No deck"}</p></div>
              <button className="ri-text-button" onClick={()=>chooseTab("Decks")}>Edit <ChevronRight size={15}/></button></div>
              <MiniDeck cards={player.deck} select={c=>{setSelectedCard(c);chooseTab("Cards")}}/>
            </section>
            {player.warnings.length>0&&<details className="ri-muted ri-tiny"><summary>Data notes ({player.warnings.length})</summary><ul>{player.warnings.map((w,i)=><li key={i}>{w}</li>)}</ul></details>}
          </div>}
          {tab==="Cards"&&<div className="ri-stack">
            {mechanicsStatus==="loading"&&<p className="ri-muted ri-tiny">Loading optional combat reference…</p>}
            {replaceId!==null&&<div className="ri-status ri-replace-note">
              Choose a card to replace {deck.find(c=>c.id===replaceId)?.name??"the selected slot"}.
              <button className="ri-text-button" onClick={()=>setReplaceId(null)}>Cancel</button>
            </div>}
            <div className="ri-cards-toolbar">
              <div className="ri-filterbar">
                <div className="ri-card-toolbar-search-row">
                  <label className="ri-card-search">
                    <Search size={17} aria-hidden="true"/>
                    <input aria-label="Search cards" placeholder="Search cards by name…" value={cardsQuery} onChange={e=>setCardsQuery(e.target.value)}/>
                  </label>
                  <div className="ri-filter-count" aria-live="polite"><strong>{visible.length}</strong><span>cards</span></div>
                </div>

                <div className="ri-card-filter-groups">
                  <div className="ri-filter-group">
                    <span className="ri-filter-group-label">Collection</span>
                    <div className="ri-ownership-toggle" role="group" aria-label="Collection filter">
                      {(["All","Owned","Locked"] as const).map(ownership=><button key={ownership} type="button"
                        aria-pressed={cardsOwnership===ownership} className={cardsOwnership===ownership?"is-active":""}
                        onClick={()=>{setCardsOwnership(ownership);setCardsFormStatus("All");setSelectedCard(null);}}>{ownership}</button>)}
                    </div>
                  </div>

                  <div className="ri-filter-group">
                    <span className="ri-filter-group-label">Card type</span>
                    <div className="ri-ownership-toggle ri-card-type-toggle" role="group" aria-label="Card type">
                      {([{value:"",label:"All cards"},{value:"Evolutions",label:"Evolution"},{value:"Heroes",label:"Hero"}] as const).map(option=><button key={option.value||"all"} type="button"
                        aria-pressed={cardsFilter===option.value} className={cardsFilter===option.value?"is-active":""}
                        onClick={()=>{setCardsFilter(option.value);setCardsFormStatus("All");setSelectedCard(null);}}>{option.label}</button>)}
                    </div>
                  </div>

                  {cardsFilter&&cardsOwnership==="Owned"&&<div className="ri-filter-group ri-form-status-group">
                    <span className="ri-filter-group-label">{cardsFilter==="Evolutions"?"Evolution":"Hero"} status</span>
                    <div className="ri-ownership-toggle ri-form-status-toggle" role="group" aria-label={cardsFilter+" unlock status"}>
                      {(["All","Unlocked","Locked"] as const).map(status=><button key={status} type="button"
                        aria-pressed={cardsFormStatus===status} className={cardsFormStatus===status?"is-active":""}
                        onClick={()=>{setCardsFormStatus(status);setSelectedCard(null);}}>{status}</button>)}
                    </div>
                  </div>}
                </div>
              </div>
            </div>
            {activeCard&&<CollectionCardDetails key={activeCard.id} card={activeCard} cap={player.cap}
              mechanics={mechanics} mechanicsLoading={mechanicsStatus==="loading"}
              onClose={()=>setSelectedCard(null)}
              deckAction={activeCard.owned&&!activeCard.tower ? {
                disabled: deck.some(c=>c.id===activeCard.id)||(deck.length===8&&replaceId===null),
                label: deck.some(c=>c.id===activeCard.id)?"Already in deck":
                  deck.length===8?(replaceId!==null?"Replace selected card":"Choose a slot to replace in Decks"):"Add to deck",
                run: ()=>{replaceDeckCard(activeCard);setSelectedCard(null);chooseTab("Decks");},
              } : undefined}/>}
            {!visible.length&&((cardsFilter==="Heroes"||cardsFilter==="Evolutions")&&cardsOwnership==="Owned"&&!cardsQuery.trim()
              ? <SpecialFormEmptyState type={cardsFilter} status={cardsFormStatus}
                  onShowAll={()=>{setCardsOwnership("Owned");setCardsFormStatus("All");setSelectedCard(null);}}/>
              : <div className="ri-empty">No cards match these filters.</div>)}
            <div className="ri-cards">{visible.map(c=>
              <button type="button" key={c.id} className={"ri-card "+(selectedCard?.id===c.id?"is-selected":"")}
                aria-haspopup="dialog" onClick={()=>setSelectedCard(c)}><CardArt card={c}/><strong>{c.name}</strong>
                <small>{c.owned?"Lv "+(c.level??"?"):"Locked"}{c.evo===true?" · Evo":""}{c.hero===true?" · Hero":""}</small></button>)}</div>
          </div>}
          {tab==="Decks"&&<div className="ri-stack">
            <section className="ri-panel"><div className="ri-section-title"><div><h2>Selected deck</h2>
              <p>{deck.length}/8 · {current?.avg?.toFixed(2)??"—"} elixir · {current?.cycle??"—"} cycle</p></div>
              {deck.length===8&&<a href={deckLink(deck)} className="ri-button-secondary" target="_blank" rel="noreferrer">Open in game <ExternalLink size={14}/></a>}</div>
              <MiniDeck cards={deck} select={c=>setSelectedCard(c)} active={selectedCard?.id}/>
              {deck.length<8&&<button type="button" className="ri-button-secondary" onClick={()=>{setSelectedCard(null);setCardsOwnership("Owned");setCardsFilter("");chooseTab("Cards");}}>Browse owned cards</button>}
              {selectedCard&&deck.some(c=>c.id===selectedCard.id)&&<div className="ri-row ri-selection">
                <span>{selectedCard.name} selected</span>
                <button className="ri-text-button" onClick={()=>{setReplaceId(selectedCard.id);setSelectedCard(null);setCardsOwnership("Owned");setCardsFilter("");chooseTab("Cards");}}>Replace card</button>
                <button className="ri-text-button" onClick={()=>{setDeck(deck.filter(c=>c.id!==selectedCard.id));setSelectedCard(null);setSelf(null);setReplaceId(null);}}>Remove <X size={14}/></button>
              </div>}
              {strategy&&<div className="ri-mini-metrics"><span>Air defense <strong>{strategy.scenarios.find(x=>x.id==="air")?.score??"—"}/100</strong></span>
                <span>Tank defense <strong>{strategy.scenarios.find(x=>x.id==="tanks")?.score??"—"}/100</strong></span>
                <span>Swarm defense <strong>{strategy.scenarios.find(x=>x.id==="swarms")?.score??"—"}/100</strong></span></div>}
            </section>
            <section className="ri-panel"><div className="ri-section-title"><h2>Deck generator</h2></div>
              <div className="ri-generator-form">
                <label className="ri-field"><span>Playstyle</span>
                  <select value={focus} onChange={e=>{setFocus(e.target.value as StrategyFocus);setSelf(null);}}>
                    {focusChoices.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
                  <small className="ri-muted ri-tiny">{focusChoices.find(o=>o.value===focus)?.explanation}</small></label>
                <label className="ri-field ri-field-small"><span>Max elixir</span>
                  <select value={maxElixir} onChange={e=>{setMaxElixir(Number(e.target.value));setSelf(null);}}>
                    {[3,3.5,4,4.5,5,5.5,6,7].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
                <button type="button" className="ri-button" disabled={mechanicsStatus==="loading"||mechanicsStatus==="idle"} onClick={()=>{
                  const res=generateSelfMadeDecks(player.cards,{...defaults,maxElixir,cap:player.cap},mechanics,focus);
                  setSelf(res);if(res.candidates[0])setDeck(res.candidates[0].cards);
                }}>{mechanicsStatus==="loading"||mechanicsStatus==="idle"?"Loading card stats…":"Generate deck"}</button>
              </div>
              {mechanicsStatus==="unavailable"&&<p className="ri-alert">The external combat reference is unavailable. Only your owned level, costs and classified roles can be compared.</p>}
              <details className="ri-disclosure"><summary>How recommendations work</summary><p>Uses owned cards, levels, role coverage and available combat data. Scores are estimates, not win probabilities.</p></details>
              {self&&<div className="ri-generated">
                {self.issues.map((s,i)=><div className="ri-alert" key={i}>{s}</div>)}
                <p className="ri-muted ri-tiny">{self.eligibleCardCount} eligible cards · {self.candidates.length} teams</p>
                {self.candidates.map((result,i)=><div className="ri-candidate" key={i}>
                  <div className="ri-row ri-space"><strong>Team {i+1} · {result.score.toFixed(1)}/100 suitability</strong>
                    <button className="ri-text-button" onClick={()=>setDeck(result.cards)}>{result.cards.map(c=>c.id).join(",")===deck.map(c=>c.id).join(",")?"Selected":"Choose team"} <Check size={15}/></button></div>
                  <MiniDeck cards={result.cards}/>
                  {result.specialSlots.length>0&&<p className="ri-muted ri-tiny">Suggested forms: {result.specialSlots.map(x=>x.slot+" — "+x.card).join(" · ")}</p>}
                  <details className="ri-role-details"><summary>Role breakdown <ChevronRight size={16}/></summary>
                    {result.slots.map(slot=><details key={slot.id} className="ri-role-row"><summary><strong>{slot.label}</strong><span>{slot.chosen.card.name} · {slot.chosen.grade}/100</span></summary>
                      <p>Lv {slot.chosen.card.level} · HP {digits(slot.chosen.hp)} · DPS {digits(slot.chosen.dps)} · Damage {digits(slot.chosen.damage)} · Numeric coverage {Math.round(slot.chosen.numericCoverage*100)}%</p>
                      <p>{slot.chosen.evidence}</p>
                      {slot.alternatives.length>0&&<p className="ri-muted">Other owned choices: {slot.alternatives.slice(0,12).map(c=>c.card.name+" ("+c.grade+")").join(" · ")}</p>}
                    </details>)}</details>
                  <PlayGuide deck={result.cards} mechanics={mechanics} focus={focus}/>
                </div>)}
              </div>}
            </section>
            <section className="ri-panel ri-advanced-panel"><div><h3>Ranked Deck Lab</h3></div>
              <a href={labPath} className="ri-button-secondary">Open <ChevronRight size={15}/></a></section>
          </div>}
          {tab==="Battles"&&<div className="ri-stack">
            <div className="ri-stat-grid ri-stat-grid-small"><Stat label="Wins" value={battleSummary?.wins??0}/><Stat label="Losses" value={battleSummary?.losses??0}/>
              <Stat label="Observed matches" value={localBattles.length}/></div>
            <div className="ri-chip-row">{["All","Wins","Losses"].map(x=>
              <button key={x} className={"ri-chip "+(battleFilter===x?"is-active":"")} aria-pressed={battleFilter===x} onClick={()=>{setBattleFilter(x);setBattleLimit(20);}}>{x}</button>)}</div>
            <div className="ri-battles">{recent.map(b=>{
              const isTwoVTwo=b.team.length===2&&b.opponent.length===2;
              const yourTeamNames=b.team.map((person,index)=>
                person.tag===player?.tag?"You ("+person.name+")":(index===1?"Teammate ("+person.name+")":person.name)
              ).join(" + ");
              const opponentNames=b.opponent.map(person=>person.name).join(" + ");
              const playerDeck=(person:Snapshot["battles"][number]["team"][number],index:number,side:"team"|"opponent")=>
                <article className="ri-battle-player" key={(person.tag||person.name)+"-"+index}>
                  <header className="ri-battle-player-heading">
                    <strong>{side==="team"
                      ? person.tag===player?.tag?"You · "+person.name:"Teammate · "+person.name
                      : "Opponent "+(index+1)+" · "+person.name}</strong>
                    <small>{person.tag||"Player tag unavailable"} · {person.cards.length}/8 cards</small>
                  </header>
                  {person.cards.length
                    ? <MiniDeck cards={person.cards}/>
                    : <p className="ri-battle-no-deck">No deck cards were returned for this player.</p>}
                </article>;
              return <details className={"ri-battle"+(isTwoVTwo?" ri-battle-2v2":"")} key={b.id}>
                <summary><span className={"ri-result-dot "+(b.outcome==="win"?"is-win":b.outcome==="loss"?"is-loss":"")}></span>
                  <span className="ri-battle-name"><strong>{isTwoVTwo
                    ? yourTeamNames+" vs "+opponentNames
                    : b.opponent[0]?.name??"Unknown opponent"}</strong><small>{isTwoVTwo?"2v2 · 4 players · 4 decks · ":""}{b.mode} · {b.time.slice(0,10)}</small></span>
                  <span className="ri-battle-result">{b.outcome.toUpperCase()}{b.trophyChange!=null?" · "+(b.trophyChange>0?"+":"")+b.trophyChange:""}</span><ChevronRight size={16}/></summary>
                <div className="ri-battle-detail">
                  {isTwoVTwo
                    ? <>
                        <p>2v2 match · 4 players · 4 separate decks · {[...b.team,...b.opponent].reduce((sum,person)=>sum+person.cards.length,0)}/32 cards returned</p>
                        <div className="ri-battle-2v2-teams">
                          <section className="ri-battle-team">
                            <header><strong>Your team</strong><small>2 players · 16 cards expected</small></header>
                            {b.team.map((person,index)=>playerDeck(person,index,"team"))}
                          </section>
                          <section className="ri-battle-team">
                            <header><strong>Opposing team</strong><small>2 players · 16 cards expected</small></header>
                            {b.opponent.map((person,index)=>playerDeck(person,index,"opponent"))}
                          </section>
                        </div>
                      </>
                    : <>
                        <p>Opponent: {b.opponent.map(person=>person.name).join(", ")||"unknown"} · Mode: {b.mode}</p>
                        <div className="ri-battle-decks">
                          <div><small>Your cards</small><MiniDeck cards={b.team[0]?.cards??[]}/></div>
                          <div><small>Opponent cards</small><MiniDeck cards={b.opponent[0]?.cards??[]}/></div>
                        </div>
                      </>}
                </div>
              </details>;
            })}</div>
            {!recent.length&&<div className="ri-empty">No battles match this filter or the game API has not returned them.</div>}
            {matches.length>recent.length&&<button className="ri-button-secondary" onClick={()=>setBattleLimit(n=>n+20)}>Show more matches ({recent.length} of {matches.length})</button>}
          </div>}
        </>}
      </>}
      <footer className="ri-footer"><span>Unofficial fan project · Not endorsed by Supercell</span>
        <a href="https://developer.clashroyale.com/#/documentation" target="_blank" rel="noreferrer">Supercell API</a></footer>
    </main>
    <nav className="ri-mobile-nav" aria-label="Mobile navigation">{NAV.map(({name,Icon})=>
      <button key={name} aria-current={tab===name?"page":undefined} className={tab===name?"is-active":""}
        onClick={()=>chooseTab(name)}><Icon size={18}/><span>{name}</span></button>)}</nav>
  </div>;
}
