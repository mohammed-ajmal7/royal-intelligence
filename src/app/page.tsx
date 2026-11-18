"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Crown,
  LayoutDashboard,
  Layers3,
  BookOpen,
  ListOrdered,
  FlaskConical,
  ScanLine,
  Swords,
  History,
  TrendingUp,
  Globe2,
  Sparkles,
  BrainCircuit,
  Settings,
  Search,
  RefreshCw,
  ArrowUpRight,
  Shield,
  Zap,
  Trophy,
  Menu,
  X,
  Check,
  Copy,
  Download,
  Info,
  ChevronRight,
} from "lucide-react";
import { Card, Snapshot, Battle, roleGroups } from "../lib/model";
import { demo } from "../lib/demo";
import {
  emptyHistory,
  mergeHistory,
  withSnapshot,
  readLocalHistory,
  writeLocalHistory,
  clearLocalHistory,
} from "../lib/localHistory";
import {
  defaults,
  evaluate,
  modes,
  stats,
  key,
  deckLink,
  importLink,
  Constraints,
} from "../lib/engine";
import { verifiedStats } from "../lib/references";
import type { MechanicsCatalog } from "../lib/mechanics";
import {
  assessStrategy, compareStrategy, focusChoices, observedThreats,
  type StrategyFocus,
} from "../lib/deckStrategy";
import { DeckStrategyPanel } from "../components/DeckStrategyPanel";
import { buildDeckPlaybook } from "../lib/deckPlaybook";
import { DeckPlaybookPanel } from "../components/DeckPlaybookPanel";
import { generateSelfMadeDecks, type SelfMadeResult } from "../lib/selfMadeDeckLab";
import { SelfMadeDeckPanel } from "../components/SelfMadeDeckPanel";
import { recommendFromTop100, type LiveCandidate } from "../lib/liveDeckLab";
import type { GlobalRankedLimit, LabEvent, LabProgress, LiveMeta } from "../lib/liveMeta";
import { LiveMetaPanel, LiveCandidateEvidence } from "../components/LiveMetaPanel";
import { CardDetails } from "../components/CardDetails";
import { DeckItemView } from "../components/DeckItemView";
const nav = [
  ["Overview", LayoutDashboard],
  ["My Collection", Layers3],
  ["Deck Item", ListOrdered],
  ["Card Encyclopedia", BookOpen],
  ["Deck Laboratory", FlaskConical],
  ["Deck Analyzer", ScanLine],
  ["Matchup Lab", Swords],
  ["Battle History", History],
  ["Clan Intelligence", Shield],
  ["Upgrade Planner", TrendingUp],
  ["Meta Insights", Globe2],
  ["AI Coach", Sparkles],
  ["Settings", Settings],
] as const;
const titles: Record<string, string> = {
  Overview: "Your competitive edge.",
  "Deck Laboratory": "Build with intelligence.",
  "My Collection": "Every card. Every possibility.",
  "Deck Item": "The strongest cards, ranked by actual numbers.",
  "Battle History": "Find the pattern.",
  "Clan Intelligence": "Understand the clan.",
  "AI Coach": "Think one move ahead.",
};
const descriptions: Record<string, string> = {
  Overview: "Understand your account. Build smarter decks. Play with purpose.",
  "My Collection": "Your cards, your levels, your possibilities.",
  "Card Encyclopedia": "Inspect the evidence behind every card.",
  "Deck Item": "Sort your collection by hits survived, HP, damage or DPS.",
  "Deck Laboratory": "Find the right eight cards for the way you play.",
  "Deck Analyzer": "Understand your deck’s strengths, gaps, and roles.",
  "Matchup Lab": "Know the threats. Preserve the right answers.",
  "Battle History": "Learn from the matches available in your battle log.",
  "Clan Intelligence": "Live clan profile, members, and standings from Supercell.",
  "Upgrade Planner": "Invest in the cards that support your next climb.",
  "Meta Insights": "Separate current evidence from assumptions.",
  "AI Coach": "Grounded explanations, without invented statistics.",
  Settings: "Manage your connection, data, and preferences.",
};
const blank = emptyHistory();
type ScoutedPlayer = { tag: string; name: string; trophies: number | null; deck: Card[] };
type ClanProfile = {
  clan: { tag: string; name: string; [key: string]: unknown };
  members: { tag: string; name: string; [key: string]: unknown }[];
  riverRace: { clan?: { tag?: string; name?: string; [key: string]: unknown }; [key: string]: unknown } | null;
  warnings: string[];
  fetchedAt: string;
};
type RankingPlayer = { tag: string; name: string; [key: string]: unknown };
type PublicRankings = {
  ranked: RankingPlayer[];
  trophyRoad: RankingPlayer[];
  events: Record<string, unknown>[];
  warnings: string[];
};
function publicNumber(source: unknown, field: string): number | null {
  if (!source || typeof source !== "object") return null;
  const n = (source as Record<string, unknown>)[field];
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}
const pct = (n: number) => Math.round(n * 100) + "%";
const fmt = (n: number | null) => (n == null ? "—" : n.toLocaleString("en-US"));
function playerNumber(source: unknown, ...path: string[]): number | null {
  let current: unknown = source;
  for (const part of path) {
    if (!current || typeof current !== "object" || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "number" && Number.isFinite(current) ? current : null;
}
function Panel({
  title,
  kicker,
  action,
  children,
}: {
  title: string;
  kicker?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="panel">
      {kicker && <div className="eyebrow">{kicker}</div>}
      <div className="panel-head">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
function Pill({
  children,
  tone = "",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"pill " + tone}>{children}</span>;
}
function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="warning">
      <Info size={16} />
      <span>{children}</span>
    </div>
  );
}
function Tile({
  c,
  onClick,
  selected = false,
}: {
  c: Card;
  onClick?: () => void;
  selected?: boolean;
}) {
  return (
    <button
      className={"card-tile " + (selected ? "selected" : "")}
      onClick={onClick}
      aria-label={`${c.name}, level ${c.level ?? "unknown"}`}
    >
      <div className={"art " + c.rarity}>
        {c.image ? (
          <img src={c.image} alt={c.name} loading="lazy" />
        ) : (
          <Crown />
        )}
        <span className="elixir">{c.elixir ?? "?"}</span>
        {selected && <Check className="selected-check" size={18} />}
      </div>
      <strong>{c.name}</strong>
      <small>
        {c.owned ? "LEVEL " + (c.level ?? "?") : "NOT OWNED"}
        {c.evo ? " ◆" : ""}
        {c.hero ? " ✦" : ""}
      </small>
    </button>
  );
}
function Deck({
  cards,
  onClick,
}: {
  cards: Card[];
  onClick?: (c: Card) => void;
}) {
  return (
    <div className="deck">
      {cards.map((c) => (
        <Tile key={c.id} c={c} onClick={() => onClick?.(c)} />
      ))}
      {Array.from({ length: Math.max(0, 8 - cards.length) }, (_, i) => (
        <div key={"empty" + i} className="empty-slot">
          +
        </div>
      ))}
    </div>
  );
}
function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bar">
      <div>
        <span>{label}</span>
        <strong>
          {Math.round(value)}
          <small> /100</small>
        </strong>
      </div>
      <div className="track">
        <i style={{ width: Math.max(0, Math.min(100, value)) + "%" }} />
      </div>
    </div>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="empty">
      <Shield size={28} />
      <p>{children}</p>
    </div>
  );
}
type AIComparisonReview = {
  choiceIndex:number; verdict:string; evidence:string[]; risks:string[];
  substitutions:string[]; opening:string; defense:string;
  counterpush:string; limitations:string; model:string;
};
function name(cs: Card[]) {
  return (
    (cs.find((c) => c.roles.includes("Win condition"))?.name ?? "Custom") +
    " " +
    ((evaluate(cs).avg ?? 4) < 3.4 ? "cycle" : "control")
  );
}
export default function App() {
  const [page, setPage] = useState("Overview"),
    [mobile, setMobile] = useState(false),
    [s, setS] = useState<Snapshot>(demo),
    [deck, setDeck] = useState<Card[]>(() => demo().deck),
    [tagInput, setTag] = useState(""),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All cards"),
    [sort, setSort] = useState("Level"),
    [selected, setSelected] = useState<Card | null>(null),
    [q, setQ] = useState<Constraints>(defaults),
    [candidates, setCandidates] = useState<LiveCandidate[]>([]),
    [selfMade, setSelfMade] = useState<SelfMadeResult | null>(null),
    [deckOrigin, setDeckOrigin] = useState<"global" | "self" | "manual">("manual"),
    [globalTopLimit, setGlobalTopLimit] = useState<GlobalRankedLimit>(100),
    [focus, setFocus] = useState<StrategyFocus>("balanced"),
    [aiAccessCode, setAiAccessCode] = useState(""),
    [aiReview, setAiReview] = useState<AIComparisonReview | null>(null),
    [aiReviewLoading, setAiReviewLoading] = useState(false),
    [aiReviewError, setAiReviewError] = useState(""),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [toast, setToast] = useState(""),
    [status, setStatus] = useState<{ live: boolean; database: boolean } | null>(
      null,
    ),
    [access, setAccess] = useState(""),
    [hist, setHist] = useState(blank),
    [modeFilter, setModeFilter] = useState("All modes"),
    [openBattle, setOpenBattle] = useState(""),
    [enemy, setEnemy] = useState<Card[]>([]),
    [link, setLink] = useState(""),
    [opponentTag, setOpponentTag] = useState(""),
    [teammateTag, setTeammateTag] = useState(""),
    [scouting, setScouting] = useState<"" | "opponent" | "teammate">(""),
    [scouted, setScouted] = useState<ScoutedPlayer | null>(null),
    [clan, setClan] = useState<ClanProfile | null>(null),
    [clanLoading, setClanLoading] = useState(false),
    [clanError, setClanError] = useState(""),
    [rankings, setRankings] = useState<PublicRankings | null>(null),
    [rankingsLoading, setRankingsLoading] = useState(false),
    [rankingsError, setRankingsError] = useState(""),
    [mechanics, setMechanics] = useState<MechanicsCatalog | null>(null),
    [mechanicsLoading, setMechanicsLoading] = useState(true),
    [mechanicsError, setMechanicsError] = useState(""),
    [resource, setResource] = useState({ gold: 0, wildCards: 0, shards: 0 }),
    [question, setQuestion] = useState(""),
    [answers, setAnswers] = useState<{ q: string; a: string }[]>([]),
    [confirmDelete, setConfirmDelete] = useState(false);
  const [liveMeta,setLiveMeta]=useState<LiveMeta|null>(null);
  const [labProgress,setLabProgress]=useState<LabProgress|null>(null);
  const [labError,setLabError]=useState("");
  const [labFailed,setLabFailed]=useState<{rank:number;tag?:string;name:string;reason:string}[]>([]);
  const labRun=useRef(0);
  const labAbort=useRef<AbortController|null>(null);
  function cancelLab() {
    labRun.current++;
    labAbort.current?.abort();labAbort.current=null;
    setBusy(false);setLabProgress(null);setLiveMeta(null);setCandidates([]);
    setAiReview(null);setAiReviewLoading(false);setLabFailed([]);setLabError("");
  }
  useEffect(()=>{
    cancelLab();
    return ()=>{labRun.current++;labAbort.current?.abort();};
  },[s.tag,q,focus,globalTopLimit]);
  useEffect(() => { setSelfMade(null); setDeckOrigin("manual"); },[s.tag,q,focus,mechanics]);
  useEffect(() => {
    const change = () => {
      try {
        const p = decodeURIComponent(location.hash.slice(1));
        if (nav.some((n) => n[0] === p)) setPage(p);
      } catch {}
    };
    change();
    window.addEventListener("hashchange", change);
    fetch("/api/status")
      .then((r) => (r.ok ? r.json() : null))
      .then(setStatus)
      .catch(() => {});
    // Public, community-maintained combat stats. This is separate from the
    // official player API and never exposes the server's Supercell credential.
    fetch("/api/mechanics")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.cards))
          throw new Error(data.error ?? "Community combat-stat feed is unavailable.");
        return data as MechanicsCatalog;
      })
      .then((data) => {
        setMechanics(data);
        setCandidates([]);
      })
      .catch((error: Error) => setMechanicsError(error.message))
      .finally(() => setMechanicsLoading(false));
    let requestedTag = new URLSearchParams(window.location.search).get("tag");
    if (!requestedTag) {
      try { requestedTag = localStorage.getItem("ri-last-player-tag"); } catch {}
    }
    if (requestedTag) {
      setTag(requestedTag);
      void connect(requestedTag);
    }
    return () => window.removeEventListener("hashchange", change);
  }, []);
  useEffect(() => {
    if (!mobile) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobile(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mobile]);
  useEffect(() => {
    if (!selected) return;
    const prev = document.activeElement as HTMLElement;
    const el = document.querySelector<HTMLElement>("[role=dialog]");
    el?.querySelector<HTMLElement>("button")?.focus();
    const fn = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
      if (e.key === "Tab" && el) {
        const list = Array.from(
          el.querySelectorAll<HTMLElement>(
            "button,select,input,a[href],summary",
          ),
        ).filter(
          (x) => x.getClientRects().length && !x.hasAttribute("disabled"),
        );
        if (e.shiftKey && document.activeElement === list[0]) {
          e.preventDefault();
          list.at(-1)?.focus();
        } else if (!e.shiftKey && document.activeElement === list.at(-1)) {
          e.preventDefault();
          list[0]?.focus();
        }
      }
    };
    document.addEventListener("keydown", fn);
    return () => {
      document.removeEventListener("keydown", fn);
      prev?.focus();
    };
  }, [selected]);
  useEffect(() => {
    if (page !== "Clan Intelligence" || s.mode !== "live") return;
    const raw = s.raw as { clan?: { tag?: string } } | null;
    const clanTag = raw?.clan?.tag;
    if (!clanTag) {
      setClan(null);
      setClanError("This player is not currently in a clan.");
      return;
    }
    let cancelled = false;
    setClanLoading(true);
    setClanError("");
    setClan(null);
    request("/api/clan?tag=" + encodeURIComponent(clanTag))
      .then((value: ClanProfile) => { if (!cancelled) setClan(value); })
      .catch((error: Error) => { if (!cancelled) setClanError(error.message); })
      .finally(() => { if (!cancelled) setClanLoading(false); });
    return () => { cancelled = true; };
  }, [page, s]);

  useEffect(() => {
    if (page !== "Meta Insights" || rankings) return;
    let active = true;
    setRankingsLoading(true);
    setRankingsError("");
    request("/api/rankings")
      .then((data: PublicRankings) => { if (active) setRankings(data); })
      .catch((error: Error) => { if (active) setRankingsError(error.message); })
      .finally(() => { if (active) setRankingsLoading(false); });
    return () => { active = false; };
  }, [page, rankings]);
  const go = (p: string) => {
    setPage(p);
    setMobile(false);
    setSearch("");
    location.hash = encodeURIComponent(p);
    window.scrollTo({ top: 0 });
  };
  const all = useMemo(
    () =>
      s.mode === "demo"
        ? s.battles
        : [
            ...new Map(
              [...s.battles, ...hist.battles].map((b) => [b.id, b]),
            ).values(),
          ].sort((a, b) => b.time.localeCompare(a.time)),
    [s, hist],
  );
  const battles = all.filter(
      (b) => modeFilter === "All modes" || b.mode === modeFilter,
    ),
    st = stats(battles),
    ev = evaluate(deck, q, mechanics),
    current = evaluate(s.deck, { ...defaults, cap: s.cap }, mechanics),
    strategic = assessStrategy(deck,mechanics,{focus,battles:s.battles}),
    strategicSwaps = compareStrategy(s.deck,deck,mechanics,{focus}),
    selectedPlaybook = buildDeckPlaybook(deck,mechanics,focus),
    liveChoice = deckOrigin === "global" ? candidates.find(c=>key(c.cards)===key(deck)) : undefined,
    selfChoice = deckOrigin === "self" ? selfMade?.candidates.find(c=>key(c.cards)===key(deck)) : undefined,
    recommendationScore = selfChoice?.score ?? liveChoice?.recommendationScore ?? strategic.score;
  const visible = s.catalog
    .filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) &&
        (filter === "All cards" ||
          (filter === "Owned" && c.owned) ||
          (filter === "Unowned" && !c.owned) ||
          (filter === "Evolution owned" && c.evo === true) ||
          (filter === "Hero owned" && c.hero === true) ||
          (filter === "Tower Troop" && c.tower) ||
          c.rarity === filter.toLowerCase() ||
          c.roles.includes(filter)),
    )
    .sort((a, b) =>
      sort === "Name"
        ? a.name.localeCompare(b.name)
        : sort === "Elixir"
          ? (a.elixir ?? 99) - (b.elixir ?? 99)
          : (b.level ?? 0) - (a.level ?? 0),
    );
  async function request(path: string, init: RequestInit = {}) {
    const r = await fetch(path, {
      ...init,
      headers: {
        ...init.headers,
        ...(access ? { "x-app-access-key": access } : {}),
      },
    });
    const b = await r.json();
    if (!r.ok) throw new Error(b.error ?? "Request failed");
    return b;
  }
  async function connect(searchTag = tagInput) {
    cancelLab();
    setError("");
    setLoading(true);
    try {
      const result: Snapshot = await request(
        "/api/player?tag=" + encodeURIComponent(searchTag),
      );
      setS(result);
      setClan(null);
      setClanError("");
      try {
        localStorage.setItem("ri-last-player-tag", result.tag.replace(/^#/, ""));
        const storedResources = JSON.parse(localStorage.getItem("ri-preferences:" + result.tag) ?? "null");
        setResource(storedResources?.version === 1 ? storedResources.resource : { gold: 0, wildCards: 0, shards: 0 });
      } catch {
        setResource({ gold: 0, wildCards: 0, shards: 0 });
      }
      window.history.replaceState(
        null,
        "",
        window.location.pathname +
          "?tag=" + encodeURIComponent(result.tag.replace(/^#/, "")) +
          window.location.hash,
      );
      setDeck(result.deck);
      setAiReview(null);
      setAiReviewError("");
      setQ({ ...defaults, cap: result.cap });
      setCandidates([]);
      setEnemy([]);
      setScouted(null);
      setOpponentTag("");
      setTeammateTag("");
      setAnswers([]);
      setModeFilter("All modes");
      let local = withSnapshot(readLocalHistory(result.tag), result);
      try {
        const privateHistory = await request("/api/history?tag=" + encodeURIComponent(result.tag));
        local = mergeHistory(local, privateHistory);
      } catch {
        // Public visitors use their own browser history, never another owner's D1 records.
      }
      setHist(local);
      const saved = writeLocalHistory(result.tag, local);
      setToast(result.stale
        ? "Showing last stored snapshot."
        : saved
          ? "Real player profile loaded. Battle history saved on this device."
          : "Real player profile loaded. Device storage is unavailable.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function optimize() {
    if(busy)return;
    cancelLab();setError("");setAiReviewError("");
    if(s.mode!=="live") {setLabError("Load your real player tag before requesting live Ranked recommendations.");return;}
    if(q.mode.includes("2v2")) {setLabError("Global Ranked is a 1v1 sample. Select a 1v1 mode for this strict workflow.");return;}
    const run=++labRun.current, controller=new AbortController();
    labAbort.current=controller;setBusy(true);setDeck(s.deck);
    const timer=window.setTimeout(()=>controller.abort(),250000);
    let reader:ReadableStreamDefaultReader<Uint8Array>|undefined;
    let received=false;
    try {
      const response=await fetch("/api/deck-lab",{
        method:"POST",cache:"no-store",signal:controller.signal,
        headers:{"Content-Type":"application/json",...(access?{"x-app-access-key":access}:{})},
        body:JSON.stringify({tag:s.tag,top:globalTopLimit}),
      });
      if(!response.ok) {const value=await response.json();throw new Error(value.error??"Live scan failed.");}
      if(!response.body)throw new Error("Streaming data is unavailable. No offline result was used.");
      reader=response.body.getReader();
      const decoder=new TextDecoder();let buffer="";
      const consume=async(line:string)=>{
        if(!line.trim()||run!==labRun.current)return;
        const event=JSON.parse(line) as LabEvent;
        if(event.type==="progress")setLabProgress(event.progress);
        else if(event.type==="error") {setLabFailed(event.failed??[]);throw new Error(event.error);}
        else if(event.type==="complete") {
          if(received)throw new Error("Duplicate result received; scan discarded.");
          if(event.player.tag!==s.tag||event.player.mode!=="live"||event.player.stale)
            throw new Error("Fresh collection data did not match the requested account.");
          received=true;
          setLabProgress({stage:4,completed:0,total:event.meta.sampleSize,
            message:"Comparing "+event.meta.sampleSize+"/"+event.meta.requestedCount+
              " verified global Ranked decks against your card levels and filters…"});
          // Yield once so the final progress stage paints before bounded search.
          await new Promise<void>(resolve=>window.setTimeout(resolve,0));
          if(run!==labRun.current||controller.signal.aborted)return;
          // Keep the observed scan visible even if the user's constraints
          // prevent a legal eight-card adaptation.
          setS({...event.player,battles:s.battles,chests:s.chests,
            warnings:[...event.player.warnings,
              "Deck Lab refreshed your profile; battle history and chests retain their previous refresh."]});
          setLiveMeta(event.meta);
          try {
            const choices=await recommendFromTop100(event.player.cards,
              {...q,cap:event.player.cap},event.meta,mechanics,{focus},controller.signal);
            if(run!==labRun.current||controller.signal.aborted)return;
            setCandidates(choices);
            setLabProgress({stage:4,completed:event.meta.sampleSize,
              total:event.meta.sampleSize,
              message:"Completed "+event.meta.sampleSize+" observed-deck analyses."});
            if(choices.length){setDeck(choices[0].cards);setDeckOrigin("global");}
            else setLabError("The scan completed, but no suitable eight-card deck meets your ownership, levels, locked cards and elixir limits. Adjust those filters; the verified global sample is displayed above.");
          } catch(error) {
            if(run!==labRun.current||controller.signal.aborted)return;
            setCandidates([]);
            setLabError(error instanceof Error ? error.message :
              "No eligible recommendation could be built from this sample.");
          }
        }
      };
      while(true) {
        const {done,value}=await reader.read();
        buffer+=decoder.decode(value,{stream:!done});
        const lines=buffer.split("\n");buffer=lines.pop()??"";
        for(const line of lines)await consume(line);
        if(done){await consume(buffer);break;}
      }
      if(!received&&run===labRun.current)throw new Error(
        "The fresh global Ranked scan ended without usable played decks. No fabricated recommendation was generated.");
    } catch(e) {
      controller.abort();
      if(run===labRun.current) {
        setLiveMeta(null);setCandidates([]);setDeck(s.deck);
        setLabError(e instanceof Error&&e.name!=="AbortError"?e.message:"The scan timed out or was cancelled. Click again to start fresh.");
      }
    } finally {
      window.clearTimeout(timer);
      if(reader){await reader.cancel().catch(()=>{});reader.releaseLock();}
      if(run===labRun.current){setBusy(false);labAbort.current=null;}
    }
  }
  async function requestAIReview(){
    if(!candidates.length || aiReviewLoading)return;
    const reviewRun=labRun.current;
    setAiReviewLoading(true);
    setAiReviewError("");
    setAiReview(null);
    // Send only 8-card metadata and anonymous aggregated battle patterns.
    // Do not transmit player tag, identity, clan, raw profile or replay data.
    const brief=(cards:Card[],recommendationScore?:number)=>{
      const numeric=evaluate(cards,q,mechanics);
      const tactical=assessStrategy(cards,mechanics,{focus,battles:s.battles});
      return {
        cards:cards.map(c=>({id:c.id,name:c.name,level:c.level,
          elixir:c.elixir,roles:c.roles,active:c.active})),
        numericalScore:numeric.score,tacticalScore:tactical.score,
        recommendationScore:recommendationScore ??
          Math.round((numeric.score*0.58+tactical.score*0.42)*10)/10,
        avgElixir:numeric.avg,cycle:numeric.cycle,
        threatRatings:tactical.scenarios.map(t=>({name:t.label,score:t.score})),
        risks:tactical.risks,
      };
    };
    try{
      const response=await fetch("/api/deck-ai",{
        method:"POST",
        headers:{"Content-Type":"application/json",
          "x-deck-ai-access":aiAccessCode},
        body:JSON.stringify({
          focus,current:brief(s.deck),
          candidates:candidates.map(c=>brief(c.cards,c.recommendationScore)),
          observations:observedThreats(s.battles),
        }),
      });
      const result=await response.json();
      if(reviewRun!==labRun.current)return;
      if(!response.ok)throw new Error(result.error??"The AI review failed.");
      if(!result.review||typeof result.review.choiceIndex!=="number")
        throw new Error("The AI returned an invalid recommendation.");
      setAiReview({...result.review,model:result.model??"AI model"});
    }catch(error){
      if(reviewRun===labRun.current)setAiReviewError(error instanceof Error?error.message:"AI review failed.");
    }finally{if(reviewRun===labRun.current)setAiReviewLoading(false);}
  }
  function add(c: Card) {
    setDeckOrigin("manual");
    if (deck.some((x) => x.id === c.id))
      setDeck(deck.filter((x) => x.id !== c.id));
    else if (deck.length >= 8)
      setToast("Remove a card first. A deck has eight slots.");
    else if (c.owned && !c.tower) setDeck([...deck, { ...c, active: "base" }]);
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(deckLink(deck));
      setToast(
        "Base deck link copied. Configure special forms and tower in game.",
      );
    } catch {
      setToast("Clipboard unavailable. Use the Open in Clash Royale link.");
    }
  }
  async function track() {
    if (s.mode !== "live" || deck.length !== 8) return;
    const choice = {
      id: crypto.randomUUID(),
      observed: new Date().toISOString(),
      cards: deck.map((c) => c.id),
      mode: q.mode,
      score: evaluate(deck, q, mechanics).score,
    };
    let updated = mergeHistory(hist, {
      snapshots: [],
      battles: [],
      choices: [choice],
    });
    // Sites can additionally persist choices in its authenticated database.
    if (status?.database || access) {
      try {
        const savedChoice = await request("/api/choices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tag: s.tag, cards: choice.cards, mode: choice.mode }),
        });
        updated = mergeHistory(hist, { snapshots: [], battles: [], choices: [savedChoice] });
      } catch {
        // Browser-local tracking remains functional on public standalone hosting.
      }
    }
    setHist(updated);
    setToast(writeLocalHistory(s.tag, updated)
      ? "Tracked on this device. Refresh later to compare new battles."
      : "Tracked for this session only; browser storage is unavailable.");
  }
  async function scoutPlayer(kind: "opponent" | "teammate") {
    const tagToSearch = kind === "opponent" ? opponentTag : teammateTag;
    setScouting(kind);
    setError("");
    try {
      const player: ScoutedPlayer = await request(
        "/api/scout?tag=" + encodeURIComponent(tagToSearch),
      );
      if (player.deck.length !== 8) throw new Error("This player's selected eight-card deck is unavailable.");
      if (kind === "opponent") {
        setScouted(player);
        setEnemy(player.deck);
      } else {
        setQ((old) => ({ ...old, teammate: player.deck }));
      }
      setToast(player.name + "'s real selected deck loaded.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setScouting("");
    }
  }
  function answer(text: string) {
    const e = evaluate(deck, q, mechanics);
    const strategy=assessStrategy(deck,mechanics,{focus,battles:s.battles});
    const air=strategy.scenarios.find(x=>x.id==="air");
    const a = /air|balloon|lava/i.test(text)
      ? `Air-defense estimate ${air?.score ?? "unknown"}/100: ${air?.explanation ?? "No usable data."} ${air?.caution ?? ""} ${strategy.risks.slice(0,2).join(" ")} This is not a simulated fight or a win probability.`
      : /upgrade/i.test(text)
        ? "Prioritize the cards in your chosen deck, especially spells and your win condition. Check actual costs and interactions in-game; this app does not have a complete upgrade-cost dataset."
        : /win|lost|lose|mistake/i.test(text)
          ? `The loaded filter contains ${st.wins} wins, ${st.losses} losses and ${st.unknown} unknown outcomes. Observed matchup appearances: ${strategy.battleSignals.map(x=>x.name+" in "+x.seen+" games ("+x.losses+" losses)").join("; ")}. Those observations alone cannot establish why a battle was lost. Replays are needed for timing and placement.`
          : `${name(deck)} averages ${ev.avg?.toFixed(2) ?? "unknown"} elixir. Tactical coverage is ${strategy.score}/100: ${strategy.headline} ${strategy.risks.slice(0,3).join(" ")} ${strategy.synergies.slice(0,2).join(" ")} Neither this nor the numerical ${ev.score}/100 is a proven win rate.`;
    setAnswers([...answers, { q: text, a }]);
    setQuestion("");
  }
  const publicProfile = s.raw && typeof s.raw === "object" && !Array.isArray(s.raw)
    ? s.raw as Record<string, unknown> : {};
  const profileBadges = Array.isArray(publicProfile.badges)
    ? publicProfile.badges.filter((v): v is Record<string, unknown> =>
        !!v && typeof v === "object" && !Array.isArray(v)) : [];
  const profileAchievements = Array.isArray(publicProfile.achievements)
    ? publicProfile.achievements.filter((v): v is Record<string, unknown> =>
        !!v && typeof v === "object" && !Array.isArray(v)) : [];
  const profileProgress = publicProfile.progress && typeof publicProfile.progress === "object"
    && !Array.isArray(publicProfile.progress)
    ? Object.entries(publicProfile.progress as Record<string, unknown>) : [];
  const upgrades = s.cards
    .filter((c) => c.level != null && c.level < s.cap)
    .map((c) => ({
      c,
      score:
        (deck.some((d) => d.id === c.id) ? 50 : 0) +
        (c.roles.includes("Spell") ? 15 : 0) +
        (c.roles.includes("Win condition") ? 15 : 0) +
        (s.cap - c.level!) * 2,
    }))
    .sort((a, b) => b.score - a.score);
  function battleRow(b: Battle) {
    return (
      <div className="battle" key={b.id}>
        <button
          className="battle-summary"
          onClick={() => setOpenBattle(openBattle === b.id ? "" : b.id)}
        >
          <span>
            <strong>{b.opponent.map((p) => p.name).join(" & ")}</strong>
            <small>
              {b.mode} · {b.time.slice(0, 10)}
              {b.trophyChange == null ? "" : " · " + (b.trophyChange > 0 ? "+" : "") + b.trophyChange + " trophies"}
            </small>
          </span>
          <span className="mini-deck">
            {b.team
              .find((p) => p.tag === s.tag)
              ?.cards.slice(0, 4)
              .map((c) => (
                <img key={c.id} src={c.image} alt={c.name} />
              ))}
          </span>
          <Pill
            tone={
              b.outcome === "win" ? "green" : b.outcome === "loss" ? "red" : ""
            }
          >
            {b.outcome}
          </Pill>
          <strong>
            {b.team[0]?.crowns ?? "?"} : {b.opponent[0]?.crowns ?? "?"}
          </strong>
        </button>
        {openBattle === b.id && (
          <div className="battle-detail">
            {[...b.team, ...b.opponent].map((p, i) => (
              <div key={p.tag + i}>
                <h4>
                  {i < b.team.length ? "Team" : "Opponent"} · {p.name}
                </h4>
                <Deck cards={p.cards} onClick={setSelected} />
                <div className="actions">
                  <button type="button" className="text-btn"
                    disabled={!p.tag.startsWith("#")}
                    onClick={() => { setTag(p.tag); go("Overview"); void connect(p.tag); }}>
                    View public player ↗
                  </button>
                  {p.cards.length === 8 && (
                    <button type="button" className="text-btn"
                      onClick={() => {
                        setEnemy(p.cards);
                        setScouted(null);
                        go("Matchup Lab");
                      }}>Analyze this battle deck ↗</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  function filters() {
    return (
      <div className="filters">
        <label className="search">
          <Search size={17} />
          <input
            aria-label="Search cards"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your cards…"
          />
        </label>
        <select
          aria-label="Card filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          {[
            "All cards",
            "Owned",
            "Unowned",
            "Evolution owned",
            "Hero owned",
            "Tower Troop",
            "common",
            "rare",
            "epic",
            "legendary",
            "champion",
            ...Object.keys(roleGroups),
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Sort cards"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {["Level", "Name", "Elixir"].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div className="royal-app">
      <aside className={mobile ? "sidebar open" : "sidebar"} aria-label="All workspace sections">
        <a className="brand" href="#Overview" onClick={() => setMobile(false)}>
          <span className="brand-icon">
            <Crown />
          </span>
          <span>
            ROYAL<small>INTELLIGENCE</small>
          </span>
        </a>
        <div className="nav-kicker">
          PLAYER WORKSPACE <small>ARENA DESK</small>
          <button type="button" className="drawer-close icon-btn"
            aria-label="Close navigation"
            onClick={() => setMobile(false)}><X size={21}/></button>
        </div>
        <nav>
          {nav.map(([p, Icon]) => (
            <button
              className={page === p ? "active" : ""}
              key={p}
              onClick={() => go(p)}
            >
              <Icon size={18} />
              {p}
              {p === "Deck Laboratory" && <span className="lab-tag">LAB</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="connection">
            <i className={s.mode === "live" ? "live" : ""} />
            <div>
              <strong>
                {s.mode === "demo" ? "Demo workspace" : "Account connected"}
              </strong>
              <small>
                {s.mode === "demo" ? "Explore with sample data" : s.tag}
              </small>
            </div>
          </div>
          <button className="profile-button" onClick={() => go("Settings")}>
            <span className="avatar">{s.name[0]}</span>
            <span>
              {s.name}
              <small>
                {s.mode === "demo" ? "SYNTHETIC ACCOUNT" : "PLAYER PROFILE"}
              </small>
            </span>
            <Settings size={15} />
          </button>
        </div>
      </aside>
      {mobile && (
        <button
          className="scrim"
          aria-label="Close navigation drawer"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-toggle icon-btn"
            aria-label="Open all sections"
            onClick={() => setMobile(true)}
          >
            <Menu size={22} />
          </button>
          <div className="mobile-brand" aria-label="Royal Intelligence">
            <span className="mobile-crown"><Crown size={24} /></span>
            <span className="mobile-brand-wordmark">ROYAL<small>INTELLIGENCE</small></span>
          </div>
          <div className="desktop-breadcrumb">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong>{page}</strong>
          </div>
          <div className="mobile-live-status" aria-label={s.mode === "live" ? "Live player loaded" : "Demo player"}>
            <span className={s.mode === "live" ? "live-dot active" : "live-dot"} />
            {s.mode === "live" ? "LIVE" : "DEMO"}
          </div>
          <div className="top-right">
            <span className="dot" />
            Transparent by design
            <a
              href="https://developer.clashroyale.com/"
              target="_blank"
              rel="noreferrer"
            >
              API docs <ArrowUpRight size={13} />
            </a>
            <span className="avatar">RI</span>
          </div>
        </header>
        <main>
          <div className="account-bar">
            <label className="tag-input">
              <span>#</span>
              <input
                aria-label="Player tag"
                placeholder="Enter any CR player tag"
                value={tagInput.replace(/^#/, "")}
                onChange={(e) => setTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !loading && connect()}
              />
            </label>
            <button className="btn" disabled={loading} onClick={() => connect()}>
              <RefreshCw size={14} className={loading ? "spin" : ""} />
              {loading ? "Loading profile…" : "Search player"}
            </button>
            <div className="source-label">
              <Pill tone={s.mode === "demo" ? "gold" : "green"}>
                {s.mode === "demo"
                  ? "DEMO DATA"
                  : s.stale
                    ? "STALE DATA"
                    : "LIVE ACCOUNT"}
              </Pill>
              <small>
                {s.mode === "demo"
                  ? "Illustrative account · not your stats"
                  : s.fetchedAt.replace("T", " ").slice(0, 19) + " UTC"}
              </small>
            </div>
          </div>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <i />
                ROYAL INTELLIGENCE / {page.toUpperCase()}
              </div>
              <h1>{titles[page] ?? page}</h1>
              <p>{descriptions[page]}</p>
            </div>
            <button
              className="btn secondary"
              onClick={() =>
                go(
                  page === "Deck Laboratory"
                    ? "My Collection"
                    : "Deck Laboratory",
                )
              }
            >
              <FlaskConical size={16} />
              {page === "Deck Laboratory" ? "View collection" : "Open Deck Lab"}
              <ArrowUpRight size={15} />
            </button>
          </div>
          {s.mode === "demo" && (
            <div className="demo-banner">
              <Info size={14} />
              <span>
                You’re exploring a synthetic training account. Connect your tag
                to use your real cards and battles.
              </span>
              <button onClick={() => go("Settings")}>Connection setup →</button>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <button
                className="icon-btn"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {s.stale && (
            <Notice>
              Showing a stored snapshot. Fresh data is unavailable.
            </Notice>
          )}
          {page === "Overview" && (
            <>
              <section className="hero">
                <div className="crest">
                  <Crown size={43} />
                  <small>RI</small>
                </div>
                <div className="hero-name">
                  <Pill>
                    {s.mode === "demo" ? "TRAINING PROFILE" : "PLAYER PROFILE"}
                  </Pill>
                  <span className="muted">{s.arena}</span>
                  <h2>
                    {s.name} <small>{s.tag}</small>
                  </h2>
                  <p>
                    {s.clan} <span>·</span> King Tower level{" "}
                    {s.kingLevel ?? "—"}
                  </p>
                </div>
                <div className="trophy">
                  <Trophy size={30} />
                  <div>
                    <strong>{fmt(s.trophies)}</strong>
                    <small>CURRENT TROPHIES</small>
                  </div>
                  <span>
                    <small>Personal best</small>
                    {fmt(s.bestTrophies)}
                  </span>
                </div>
                <Crown className="hero-watermark" />
              </section>
              <div className="metrics">
                {[
                  [
                    "Recent win rate",
                    st.ci ? pct(st.ci.rate) : "—",
                    `${st.wins} wins · ${st.losses} losses`,
                    st.ci
                      ? `95% interval ${pct(st.ci.low)}–${pct(st.ci.high)}`
                      : "No decisive matches",
                  ],
                  [
                    "Cards collected",
                    `${s.cards.length} / ${s.catalog.filter((c) => !c.tower).length}`,
                    s.mode === "demo"
                      ? "Within sample catalog"
                      : "Within loaded catalog",
                    "Ownership is separate from special forms",
                  ],
                  [
                    "Unlocked Evolutions",
                    String(s.cards.filter((c) => c.evo).length),
                    "Owned forms, not active slots",
                    "Hero ownership tracked separately",
                  ],
                  [
                    "Deck readiness",
                    Math.round(current.readiness) + " /100",
                    "Level suitability heuristic",
                    `Relative to level ${s.cap} reference`,
                  ],
                ].map(([a, b, c, d], i) => (
                  <div className="metric" key={a}>
                    <div>
                      {a}
                      {i === 0 ? (
                        <TrendingUp size={18} />
                      ) : i === 1 ? (
                        <Layers3 size={18} />
                      ) : i === 2 ? (
                        <Zap size={18} />
                      ) : (
                        <Shield size={18} />
                      )}
                    </div>
                    <strong>{b}</strong>
                    <p>{c}</p>
                    <small>{d}</small>
                  </div>
                ))}
              </div>
              <div className="overview-grid">
                <Panel
                  title="Your current deck"
                  kicker="THE EIGHT THAT MATTER"
                  action={
                    <button
                      className="text-btn"
                      onClick={() => {
                        setDeck(s.deck);
                        go("Deck Analyzer");
                      }}
                    >
                      Analyze deck ↗
                    </button>
                  }
                >
                  <div className="deck-meta">
                    <h4>{name(s.deck)}</h4>
                    <span className="muted">
                      ◈ {current.avg?.toFixed(2) ?? "?"} average elixir
                    </span>
                  </div>
                  <Deck cards={s.deck} onClick={setSelected} />
                  <p className="micro">
                    Active forms come from the source context. Ownership alone
                    does not activate an Evolution.
                  </p>
                </Panel>
                <section className="panel promo">
                  <div className="eyebrow">PERSONAL INTELLIGENCE</div>
                  <h3>A smarter next move</h3>
                  <Sparkles className="promo-icon" />
                  <h2>
                    Better choices.
                    <br />
                    Stronger decks.
                  </h2>
                  <p>
                    Find a composition that fits your levels, covers your
                    weaknesses, and matches your playstyle.
                  </p>
                  <div className="checklist">
                    ✓ Account-aware search
                    <br />✓ Transparent scoring
                    <br />✓ No win-rate promises
                  </div>
                  <button className="btn" onClick={() => go("Deck Laboratory")}>
                    Find my next deck <ArrowUpRight size={16} />
                  </button>
                </section>
                <Panel
                  title="Recent battles"
                  action={
                    <button
                      className="text-btn"
                      onClick={() => go("Battle History")}
                    >
                      View all ↗
                    </button>
                  }
                >
                  {all.slice(0, 4).map(battleRow)}
                  {!all.length && <Empty>No battles loaded yet.</Empty>}
                </Panel>
                <Panel title="Where to focus" kicker="DECK HEALTH">
                  <Bar label="Ground & air defense" value={current.defense} />
                  <Bar label="Offensive roles" value={current.offense} />
                  <Bar label="Level readiness" value={current.readiness} />
                  <Notice>
                    {current.warnings[0] ??
                      "Gather more same-mode matches before drawing conclusions."}
                  </Notice>
                  <p className="micro">
                    Editorial role scores, not measured performance.
                  </p>
                </Panel>
              </div>
              <div className="two-col">
                <Panel title="Account facts">
                  <div className="fact">
                    <span>Evidence</span>
                    <strong>
                      {s.mode === "demo" ? "Synthetic fixture" : "Official API"}
                    </strong>
                  </div>
                  <div className="fact">
                    <span>Observed history</span>
                    <strong>{s.stored ? "Private workspace" : hist.snapshots.length ? "Saved on this device" : "Not yet saved"}</strong>
                  </div>
                  <details>
                    <summary>Inspect all returned profile fields</summary>
                    <pre>{JSON.stringify(s.raw, null, 2)}</pre>
                  </details>
                </Panel>
                <Panel
                  title="Upcoming chests"
                  kicker={
                    s.mode === "demo"
                      ? "SAMPLE DATA"
                      : "RETURNED SCHEDULE WINDOW"
                  }
                >
                  {s.chests.map((c, i) => (
                    <div className="fact" key={i}>
                      <span>{c.name}</span>
                      <strong>
                        {c.index === 0
                          ? "Next chest"
                          : "+" + c.index + " positions"}
                      </strong>
                    </div>
                  ))}
                  {!s.chests.length && (
                    <Empty>No chest schedule returned.</Empty>
                  )}
                  <p className="micro">
                    Positions in the returned cycle, not time estimates.
                  </p>
                </Panel>
              </div>
              <div className="two-col">
                <Panel title="Lifetime battle record" kicker="OFFICIAL PROFILE STATISTICS">
                  <div className="fact"><span>Wins</span><strong>{fmt(playerNumber(s.raw, "wins"))}</strong></div>
                  <div className="fact"><span>Losses</span><strong>{fmt(playerNumber(s.raw, "losses"))}</strong></div>
                  <div className="fact"><span>Total games</span><strong>{fmt(playerNumber(s.raw, "battleCount"))}</strong></div>
                  <div className="fact"><span>Three-crown wins</span><strong>{fmt(playerNumber(s.raw, "threeCrownWins"))}</strong></div>
                  <div className="fact"><span>Total donations</span><strong>{fmt(playerNumber(s.raw, "totalDonations"))}</strong></div>
                  <p className="micro">Lifetime values come from the profile endpoint and differ from recent-battle sample statistics. Missing values are not estimated.</p>
                </Panel>
                <Panel title="Challenges & ranked" kicker="OFFICIAL PROFILE STATISTICS">
                  <div className="fact"><span>Challenge maximum wins</span><strong>{fmt(playerNumber(s.raw, "challengeMaxWins"))}</strong></div>
                  <div className="fact"><span>Challenge cards won</span><strong>{fmt(playerNumber(s.raw, "challengeCardsWon"))}</strong></div>
                  <div className="fact"><span>Tournament cards won</span><strong>{fmt(playerNumber(s.raw, "tournamentCardsWon"))}</strong></div>
                  <div className="fact"><span>Current ranked trophies</span><strong>{fmt(playerNumber(s.raw, "leagueStatistics", "currentSeason", "trophies"))}</strong></div>
                  <div className="fact"><span>Best season global rank</span><strong>{fmt(playerNumber(s.raw, "leagueStatistics", "bestSeason", "rank"))}</strong></div>
                  <p className="micro">Ranked and challenge fields appear only when the official API returns them. Detailed historical charts need snapshots collected over time.</p>
                </Panel>
              </div>
              <div className="two-col">
                <Panel title="Ranked / Path of Legend" kicker="OFFICIAL PROFILE · SEASON RESULTS">
                  <div className="fact"><span>Current league number</span><strong>{fmt(playerNumber(s.raw, "currentPathOfLegendSeasonResult", "leagueNumber"))}</strong></div>
                  <div className="fact"><span>Current Ranked trophies</span><strong>{fmt(playerNumber(s.raw, "currentPathOfLegendSeasonResult", "trophies"))}</strong></div>
                  <div className="fact"><span>Current global rank</span><strong>{fmt(playerNumber(s.raw, "currentPathOfLegendSeasonResult", "rank"))}</strong></div>
                  <div className="fact"><span>Previous league number</span><strong>{fmt(playerNumber(s.raw, "lastPathOfLegendSeasonResult", "leagueNumber"))}</strong></div>
                  <div className="fact"><span>Best Ranked league number</span><strong>{fmt(playerNumber(s.raw, "bestPathOfLegendSeasonResult", "leagueNumber"))}</strong></div>
                  <p className="micro">These values are separate from Trophy Road. No ranking is inferred when Supercell returns null.</p>
                </Panel>
                <Panel title="Favorites and active tower" kicker="PUBLIC PLAYER PROFILE">
                  <div className="fact"><span>Favorite card</span><strong>{String((publicProfile.currentFavouriteCard as {name?: string}|undefined)?.name ?? "—")}</strong></div>
                  <div className="fact"><span>Current Tower Troop</span><strong>{
                    Array.isArray(publicProfile.currentDeckSupportCards)
                      ? publicProfile.currentDeckSupportCards.map((v) =>
                          String((v as {name?: string})?.name ?? "Unknown")).join(", ") || "—"
                      : "—"
                  }</strong></div>
                  <div className="fact"><span>Legacy Trophy Road high score</span><strong>{fmt(playerNumber(s.raw, "legacyTrophyRoadHighScore"))}</strong></div>
                  <div className="fact"><span>Current win/loss streak</span><strong>{fmt(playerNumber(s.raw, "currentWinLoseStreak"))}</strong></div>
                  <p className="micro">Tower Troops and special-form deployment are reported independently of ordinary card ownership.</p>
                </Panel>
              </div>
              <div className="two-col">
                <Panel title="Player achievements" kicker="OFFICIAL PLAYER PROFILE">
                  {profileAchievements.slice(0, 20).map((achievement, i) => (
                    <div className="fact" key={String(achievement.name ?? i)}>
                      <span>{String(achievement.name ?? "Achievement")}</span>
                      <strong>{fmt(publicNumber(achievement,"stars"))} stars</strong>
                    </div>
                  ))}
                  {!profileAchievements.length && <Empty>No achievements returned for this player.</Empty>}
                </Panel>
                <Panel title="Public badges" kicker="OFFICIAL PLAYER PROFILE">
                  {profileBadges.slice(0, 20).map((badge, i) => (
                    <div className="fact" key={String(badge.name ?? i)}>
                      <span>{String(badge.name ?? "Badge")}</span>
                      <strong>{publicNumber(badge,"level") != null
                        ? "Level " + fmt(publicNumber(badge, "level"))
                        : publicNumber(badge,"progress") != null
                          ? fmt(publicNumber(badge,"progress")) + " progress"
                          : "Earned"}</strong>
                    </div>
                  ))}
                  {!profileBadges.length && <Empty>No badges returned for this player.</Empty>}
                  <p className="micro">Badge names and progression are supplied by the official API.</p>
                </Panel>
              </div>
              <Panel title="Side-mode progress" kicker="OFFICIAL PROFILE · MODE SEASON KEYS">
                {profileProgress.slice(0, 20).map(([mode, value]) => (
                  <div className="fact" key={mode}>
                    <span>{mode || "Legacy / default mode"} · {String((value as {arena?:{name?:string}}|null)?.arena?.name ?? "Unspecified arena")}</span>
                    <strong>{fmt(publicNumber(value,"trophies"))} / best {fmt(publicNumber(value,"bestTrophies"))}</strong>
                  </div>
                ))}
                {!profileProgress.length && <Empty>No extra mode progression returned.</Empty>}
                <p className="micro">Mode-season keys are treated as source identifiers; they are not renamed or inferred.</p>
              </Panel>
            </>
          )}
          {page === "Clan Intelligence" && (
            <>
              {s.mode === "demo" ? (
                <Notice>Search for a real player's tag to load their clan from the official API.</Notice>
              ) : clanLoading ? (
                <Empty>Loading the live clan profile and member roster…</Empty>
              ) : clanError ? (
                <Notice>{clanError}</Notice>
              ) : clan ? (
                <>
                  <section className="hero">
                    <div className="crest"><Shield size={40} /><small>CLAN</small></div>
                    <div className="hero-name">
                      <Pill>OFFICIAL CLAN PROFILE</Pill>
                      <h2>{clan.clan.name} <small>{clan.clan.tag}</small></h2>
                      <p>{String((clan.clan.location as { name?: string } | undefined)?.name ?? "Location unavailable")}</p>
                    </div>
                    <div className="trophy">
                      <Trophy size={27} />
                      <div><strong>{fmt(publicNumber(clan.clan, "clanScore"))}</strong><small>CLAN SCORE</small></div>
                      <span><small>War trophies</small>{fmt(publicNumber(clan.clan, "clanWarTrophies"))}</span>
                    </div>
                  </section>
                  <div className="collection-summary">
                    <div><strong>{fmt(publicNumber(clan.clan, "members"))}</strong><small>REPORTED MEMBERS</small></div>
                    <div><strong>{fmt(publicNumber(clan.clan, "requiredTrophies"))}</strong><small>REQUIRED TROPHIES</small></div>
                    <div><strong>{clan.members.length}</strong><small>ROSTER RETURNED</small></div>
                    <div><strong>{String(clan.clan.type ?? "—")}</strong><small>CLAN TYPE</small></div>
                  </div>
                  <div className="two-col">
                    <Panel title="Clan description" kicker="PUBLIC CLAN DATA">
                      <p style={{ whiteSpace: "pre-wrap" }}>{String(clan.clan.description ?? "No description returned.")}</p>
                      <div className="fact"><span>Clan tag</span><strong>{clan.clan.tag}</strong></div>
                      <div className="fact"><span>Fetched</span><strong>{clan.fetchedAt.slice(0, 16).replace("T", " ")} UTC</strong></div>
                      <p className="micro">These are official, read-only clan details. Membership and trophies can change.</p>
                    </Panel>
                    <Panel title="Clan participation" kicker="PUBLIC ROSTER">
                      <div className="fact"><span>Donations by listed members</span><strong>{
                        clan.members.some((m) => publicNumber(m, "donations") != null)
                          ? fmt(clan.members.reduce((total, m) => total + (publicNumber(m, "donations") ?? 0), 0))
                          : "—"
                      }</strong></div>
                      <div className="fact"><span>Co-leaders</span><strong>{clan.members.filter((m) => m.role === "coLeader").length}</strong></div>
                      <div className="fact"><span>Elders</span><strong>{clan.members.filter((m) => m.role === "elder").length}</strong></div>
                      <p className="micro">Only fields returned for this clan are shown. Donations are a sum of roster values, not an all-time total.</p>
                    </Panel>
                  </div>
                  <Panel title="Current Clan River Race" kicker="OFFICIAL CURRENT CLAN WAR DATA">
                    {clan.riverRace?.clan ? (
                      <>
                        <div className="fact"><span>River Race phase</span><strong>{String(clan.riverRace.periodType ?? "—")}</strong></div>
                        <div className="fact"><span>Clan fame</span><strong>{fmt(publicNumber(clan.riverRace.clan, "fame"))}</strong></div>
                        <div className="fact"><span>Boat attacks</span><strong>{fmt(publicNumber(clan.riverRace.clan, "boatAttacks"))}</strong></div>
                        <div className="fact"><span>Participating members reported</span><strong>{
                          Array.isArray(clan.riverRace.clan.participants) ? clan.riverRace.clan.participants.length : "—"
                        }</strong></div>
                        <p className="micro">These are official values for the current river race when returned. Historic wars are not inferred.</p>
                      </>
                    ) : <Empty>No current River Race data was returned.</Empty>}
                  </Panel>
                  <Panel title="Clan member roster" kicker="CLICK A MEMBER TO INSPECT THEIR PUBLIC PLAYER DATA">
                    {clan.members.length ? (
                      <div className="table-wrap">
                        <table>
                          <thead><tr><th>Member</th><th>Role</th><th>Trophies</th><th>Donations</th><th>Profile</th></tr></thead>
                          <tbody>{[...clan.members].sort((a,b)=>(publicNumber(b,"trophies")??0)-(publicNumber(a,"trophies")??0)).map((member) => (
                            <tr key={member.tag}>
                              <td><strong>{member.name}</strong><div className="micro">{member.tag}</div></td>
                              <td>{String(member.role ?? "Member")}</td>
                              <td>{fmt(publicNumber(member, "trophies"))}</td>
                              <td>{fmt(publicNumber(member, "donations"))}</td>
                              <td><button className="text-btn" onClick={() => { setTag(member.tag); go("Overview"); void connect(member.tag); }}>View profile ↗</button></td>
                            </tr>
                          ))}</tbody>
                        </table>
                      </div>
                    ) : <Empty>The member roster is not available.</Empty>}
                    {clan.warnings.map((w) => <Notice key={w}>{w}</Notice>)}
                  </Panel>
                </>
              ) : <Empty>Clan data is not available for this player.</Empty>}
            </>
          )}
          {["My Collection", "Card Encyclopedia"].includes(page) && (
            <>
              <div className="collection-summary">
                <div>
                  <strong>{s.catalog.length}</strong>
                  <small>
                    {s.mode === "demo" ? "SAMPLE CARDS" : "CATALOG ENTRIES"}
                  </small>
                </div>
                <div>
                  <strong>{s.cards.length}</strong>
                  <small>OWNED BASE CARDS</small>
                </div>
                <div>
                  <strong>{s.cards.filter((c) => c.evo).length}</strong>
                  <small>EVOLUTIONS OWNED</small>
                </div>
                <div>
                  <strong>{s.cards.filter((c) => c.hero).length}</strong>
                  <small>HEROES OWNED</small>
                </div>
              </div>
              <button
                type="button"
                className="btn deck-item-entry"
                onClick={() => go("Deck Item")}
              >
                <ListOrdered size={18}/>
                Rank my cards by Attack or Defense
                <ArrowUpRight size={17}/>
              </button>
              {filters()}
              <div className="section-note">
                <span>{visible.length} cards shown</span>
                <span>
                  ◆ Evolution owned · ✦ Hero owned · Click for details
                </span>
              </div>
              <div className="collection-grid">
                {visible.map((c) => (
                  <Tile key={c.id} c={c} onClick={() => setSelected(c)} />
                ))}
              </div>
              {!visible.length && <Empty>No cards match these filters.</Empty>}
              {page === "Card Encyclopedia" && (
                <Notice>
                  HP, damage and other combat values are only shown where a
                  patch-scoped reference exists. Unknown values are never
                  fabricated.
                </Notice>
              )}
            </>
          )}
          {page === "Deck Item" && (
            <DeckItemView
              player={s}
              mechanics={mechanics}
              mechanicsLoading={mechanicsLoading}
              mechanicsError={mechanicsError}
              onSelect={setSelected}
            />
          )}
          {["Deck Laboratory", "Deck Analyzer"].includes(page) && (
            <>
              <Panel title="Top Global Player Comparison Deck Generator"
                kicker={"FRESH GLOBAL TOP "+globalTopLimit+" · AVAILABLE-DATA RECOMMENDATIONS"}>
                <p className="smart-intro">
                  Choose the current global Ranked top 100, 200 or 300 accounts.
                  Each click fetches the available real Ranked 1v1 battle decks,
                  counts played cards and roles, and finds the best suitable eight
                  cards from your collection using your levels and selected conditions.
                  Missing battle logs are disclosed, but verified decks still
                  contribute. No Trophy Road, 2v2, old snapshot or fabricated deck.
                </p>
                <div className="global-top-picker">
                  <div>
                    <label htmlFor="global-ranked-size">Global Ranked player sample</label>
                    <p>Larger scans use more API requests and may have more unavailable
                      accounts. Only verified played decks contribute to recommendations.</p>
                  </div>
                  <select id="global-ranked-size" value={globalTopLimit}
                    disabled={busy}
                    onChange={event=>{
                      const chosen=Number(event.target.value);
                      if(chosen!==100&&chosen!==200&&chosen!==300)return;
                      setGlobalTopLimit(chosen);
                      setDeck(s.deck);
                    }}>
                    <option value={100}>Top 100 global players</option>
                    <option value={200}>Top 200 global players</option>
                    <option value={300}>Top 300 global players</option>
                  </select>
                </div>
                <div className="mode-tabs smart-modes" aria-label="Choose deck playstyle">
                  {[
                    ["Best overall", "Balanced"],
                    ["Maximum defense", "Strong defense"],
                    ["Maximum offense", "Aggressive"],
                    ["Fast cycle", "Fast cycle"],
                  ].map(([mode, label]) => (
                    <button
                      className={q.mode === mode ? "active" : ""}
                      key={mode}
                      aria-pressed={q.mode === mode}
                      onClick={() => setQ({ ...q, mode })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="reasoned-focus-picker">
                  <div>
                    <label htmlFor="deck-reasoning-focus">What should this deck beat?</label>
                    <p>Choose your actual weakness. A different objective can give a
                      different correct recommendation.</p>
                  </div>
                  <select id="deck-reasoning-focus" value={focus}
                    onChange={event=>{
                      setFocus(event.target.value as StrategyFocus);
                      setCandidates([]);
                      setAiReview(null);
                    }}>
                    {focusChoices.map(item=><option key={item.value}
                      value={item.value}>{item.label}</option>)}
                  </select>
                </div>
                <div className="actions">
                  <button className="btn smart-find" disabled={busy || loading || s.mode !== "live" || s.cards.length < 8}
                    onClick={optimize}>
                    <Sparkles size={17} />
                    {busy ? "Reading top "+globalTopLimit+"…" :
                      "Find best deck — fresh top "+globalTopLimit}
                  </button>
                  <button className="btn secondary"
                    onClick={() => {
                      setQ({ ...defaults, cap: s.cap, mode: q.mode });
                      setCandidates([]);
                      setAiReview(null);
                      setDeck(s.deck);
                      setError("");
                    }}>
                    Reset filters
                  </button>
                </div>
                <p className="micro">
                  Recommendations use verified top-{globalTopLimit} Ranked battle decks,
                  actual owned levels, required air/ground/splash/tank roles and your
                  selected strategy. Each source-slot replacement costs at most
                  +1 elixir and must preserve its key combat functions; the
                  overall average elixir, minimum level, locked and excluded cards
                  are also enforced. Stronger owned cards can replace an
                  underleveled pro favorite. Missing accounts remain excluded.
                  Scores estimate suitability — never a guaranteed winning deck.
                  {s.mode === "demo" ? " Load your real tag to use this workflow." : ""}
                </p>
                <LiveMetaPanel meta={liveMeta} progress={labProgress} busy={busy}
                  error={labError} failed={labFailed} cancel={cancelLab}
                  retry={()=>{void optimize();}} target={globalTopLimit}/>
                <div className="smart-overview">
                  <div className="smart-overview-head">
                    <div>
                      <div className="eyebrow">{selfChoice ? "SELF-MADE · EIGHT REQUIRED ROLES · OWNED CARDS" : liveChoice ? "RECOMMENDED FROM "+liveMeta?.sampleSize+
                        "/"+liveMeta?.requestedCount+" VERIFIED RANKED DECKS" :
                        labError ? "YOUR CURRENT DECK — NO ELIGIBLE RECOMMENDATION" :
                        "MANUALLY SELECTED / CURRENT DECK"}</div>
                      <h3>{name(deck)}</h3>
                      <span className="muted">
                        {deck.length}/8 cards · picked from {s.cards.length} owned base cards
                      </span>
                    </div>
                    <div className="smart-score">
                      <strong>{ev.score}</strong>
                      <span>/100</span>
                      <small>NUMERICAL SCORE</small>
                    </div>
                  </div>
                  <Deck cards={deck} onClick={setSelected}/>
                  <div className="reasoned-recommendation-score">
                    <span><BrainCircuit size={18}/> {selfChoice ? "Independent owned-collection recommendation" : liveChoice ? "Recommendation from the completed live scan" : "Selected deck: tactical analysis"}</span>
                    <strong>{recommendationScore.toFixed(1)}<small>/100</small></strong>
                    <p>{selfChoice ? "Owned role power 48% · composition 29% · tactical threats 23%, plus a small unlocked-Evolution preference." : liveChoice ?
                      "Observed combinations 20% · Tactical roles 25% · Actual owned-level readiness 40% · Observed usage 5% · Functional replacement fit 10%. Each direct substitution has a hard +1 elixir ceiling." :
                      "This selection is not being claimed as a fresh global Ranked recommendation."}
                      Scores are editorial estimates, never predicted win rates.</p>
                    {liveChoice&&<LiveCandidateEvidence candidate={liveChoice}/>}
                  </div>
                  <div className="smart-resource-metrics" aria-label="Elixir and rotation cost">
                    <div className="smart-resource-metric">
                      <span className="resource-gem"><Zap size={17}/></span>
                      <div><small>AVG ELIXIR</small><strong>{ev.avg?.toFixed(2) ?? "—"}</strong></div>
                    </div>
                    <div className="smart-resource-metric">
                      <span className="resource-gem"><RefreshCw size={17}/></span>
                      <div><small>4-CARD CYCLE</small><strong>{ev.cycle ?? "—"} <em>elixir</em></strong></div>
                    </div>
                  </div>
                  <p className="micro smart-metric-explainer">
                    Cycle is the sum of the four cheapest cards, a best-case rotation measure—not
                    a guaranteed return cost for every card.
                  </p>
                  <div className="mechanics-headline" aria-label="Optional combat-stat analysis">
                    <div>
                      <strong><Shield size={16}/> Separate combat-stat analysis</strong>
                      <p>
                        {mechanicsLoading ? "Checking community combat-stat data…" :
                        mechanicsError ? "Combat stats unavailable. Tactical estimates will state their limitations." :
                        mechanics ? "Community game-data snapshot · patch accuracy not guaranteed" :
                        "Combat-stat feed unavailable."}
                      </p>
                    </div>
                    <strong className="mechanics-share">{ev.scoring.mechanics.toFixed(1)}% <small>MECHANICS WEIGHT</small></strong>
                  </div>
                  <div className="mechanics-weight-grid">
                    <div><small>HP · DAMAGE · DPS · TARGETS · SPEED · RANGE</small><strong>{ev.scoring.mechanics.toFixed(1)}%</strong></div>
                    <div><small>DECK STRUCTURE · CARD LEVELS</small><strong>{ev.scoring.structure.toFixed(1)}%</strong></div>
                    <div><small>AVERAGE ELIXIR</small><strong>{ev.scoring.averageElixir}%</strong></div>
                    <div><small>FOUR-CARD CYCLE</small><strong>{ev.scoring.fourCardCycle}%</strong></div>
                  </div>
                  <p className="micro">
                    Measured-field coverage: {Math.round(ev.mechanic.coverage * 100)}% across {deck.length} cards.
                    When source fields are missing, that weight moves to structural analysis.
                    Scores are relative heuristic ratings, never expected win rates.
                  </p>
                  <div className="smart-checks" aria-label="Deck coverage checklist">
                    {ev.audit.checks.map(check => (
                      <div className={check.ok ? "smart-check ok" : "smart-check miss"} key={check.id}>
                        {check.ok ? <Check size={14}/> : <X size={14}/>}
                        <span>{check.label}</span>
                      </div>
                    ))}
                  </div>
                  <p className="micro">
                    {ev.audit.passed}/{ev.audit.total} defensive and offensive checks covered.
                    Missing a check does not necessarily make a deck unusable.
                  </p>
                  <div className="actions">
                    <button className="btn secondary" disabled={deck.length !== 8} onClick={copy}>
                      <Copy size={14}/> Copy game deck link
                    </button>
                    {deck.length === 8 && <a className="btn secondary" href={deckLink(deck)}
                      target="_blank" rel="noreferrer">Open in Clash Royale ↗</a>}
                    <button className="btn secondary" disabled={s.mode === "demo" || deck.length !== 8}
                      onClick={track}><History size={14}/> Track this deck</button>
                  </div>
                </div>
              </Panel>
              <details className="lab-advanced">
                <summary>Advanced options · manually edit cards, lock choices, or set limits</summary>
                <p className="micro">
                  Optional. Lock required cards using "Must include", block bad fits
                  with "Must exclude", or adjust limits. Leave these empty to search
                  your entire eligible collection automatically.
                </p>
                <div className="lab-grid">
                <Panel
                  title="Your arsenal"
                  action={<Pill>{s.cards.length}</Pill>}
                >
                  <label className="search">
                    <Search size={15} />
                    <input
                      aria-label="Search owned cards"
                      placeholder="Find a card…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </label>
                  <div className="arsenal">
                    {s.cards
                      .filter((c) =>
                        c.name.toLowerCase().includes(search.toLowerCase()),
                      )
                      .map((c) => (
                        <Tile
                          key={c.id}
                          c={c}
                          selected={deck.some((x) => x.id === c.id)}
                          onClick={() => add(c)}
                        />
                      ))}
                  </div>
                  <p className="micro">Click to add or remove a card.</p>
                </Panel>
                <div>
                  <Panel
                    title={name(deck)}
                    kicker="DECK BUILDER"
                    action={
                      <button className="text-btn" onClick={() => setDeck([])}>
                        Clear
                      </button>
                    }
                  >
                    <div className="deck-meta">
                      <span>{deck.length}/8 cards</span>
                      <span>◈ {ev.avg?.toFixed(2) ?? "?"} average elixir</span>
                    </div>
                    <Deck cards={deck} onClick={add} />
                    <div className="actions">
                      <button
                        className="btn"
                        onClick={optimize}
                        disabled={busy || loading || s.mode !== "live"}
                      >
                        <Sparkles size={16} />
                        {busy ? "Reading live top 100…" : "Find the best deck — fresh top 100"}
                      </button>
                      <button
                        className="btn secondary"
                        disabled={deck.length !== 8}
                        onClick={copy}
                      >
                        <Copy size={15} />
                        Copy link
                      </button>
                    </div>
                    {deck.length === 8 && (
                      <a
                        className="text-btn"
                        href={deckLink(deck)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open in Clash Royale ↗
                      </a>
                    )}
                    <p className="micro">
                      Base-card link. Configure special forms, Champion slots
                      and Tower Troop in-game.
                    </p>
                    <button
                      className="text-btn"
                      disabled={s.mode === "demo" || deck.length !== 8}
                      onClick={track}
                    >
                      <History size={14} /> Track this composition
                    </button>
                  </Panel>
                  <Panel title="Make it yours">
                    <div className="form-grid">
                      <label>
                        Optimization mode
                        <select
                          value={q.mode}
                          onChange={(e) => setQ({ ...q, mode: e.target.value })}
                        >
                          {modes.map((m) => (
                            <option key={m}>{m}</option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Maximum average elixir
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="0.1"
                          value={q.maxElixir}
                          onChange={(e) =>
                            setQ({
                              ...q,
                              maxElixir: Math.max(
                                1,
                                Math.min(10, Number(e.target.value)),
                              ),
                            })
                          }
                        />
                      </label>
                      <label>
                        Minimum display level
                        <input
                          type="number"
                          min="1"
                          max={s.cap}
                          value={q.minLevel}
                          onChange={(e) =>
                            setQ({
                              ...q,
                              minLevel: Math.max(1, Number(e.target.value)),
                            })
                          }
                        />
                      </label>
                      <label>
                        Confirmed reference level
                        <input
                          type="number"
                          min="1"
                          max="30"
                          value={q.cap}
                          onChange={(e) =>
                            setQ({
                              ...q,
                              cap: Math.max(
                                1,
                                Math.min(30, Number(e.target.value)),
                              ),
                            })
                          }
                        />
                      </label>
                      {(["include", "exclude"] as const).map((k) => (
                        <label key={k}>
                          Must {k}
                          <select
                            multiple
                            value={q[k].map(String)}
                            onChange={(e) =>
                              setQ({
                                ...q,
                                [k]: Array.from(e.target.selectedOptions).map(
                                  (o) => Number(o.value),
                                ),
                              })
                            }
                          >
                            {s.cards.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ))}
                      {(["defense", "offense"] as const).map((k) => (
                        <label key={k}>
                          {k} priority · {q[k]}
                          <input
                            type="range"
                            min="5"
                            max="80"
                            value={q[k]}
                            onChange={(e) =>
                              setQ({ ...q, [k]: Number(e.target.value) })
                            }
                          />
                        </label>
                      ))}
                    </div>
                    {q.mode.includes("2v2") && (
                      <>
                      <label>
                        Teammate's player tag
                        <div className="inline">
                          <input aria-label="Teammate player tag" value={teammateTag}
                            onChange={(e) => setTeammateTag(e.target.value)}
                            placeholder="#PLAYER_TAG"/>
                          <button className="btn secondary" type="button"
                            disabled={scouting !== "" || !teammateTag.trim()}
                            onClick={() => void scoutPlayer("teammate")}>
                            {scouting === "teammate" ? "Loading…" : "Load real deck"}
                          </button>
                        </div>
                        <small>Loads your teammate's real selected deck. Edit it below if necessary.</small>
                      </label>
                      <label>
                        Teammate’s eight cards
                        <select
                          multiple
                          value={(q.teammate ?? []).map((c) => String(c.id))}
                          onChange={(e) => {
                            const ids = Array.from(
                              e.target.selectedOptions,
                            ).map((o) => Number(o.value));
                            if (ids.length <= 8)
                              setQ({
                                ...q,
                                teammate: s.catalog.filter((c) =>
                                  ids.includes(c.id),
                                ),
                              });
                          }}
                        >
                          {s.catalog
                            .filter((c) => !c.tower)
                            .map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                        </select>
                        <small>
                          {q.teammate?.length ?? 0}/8 selected. Role complement
                          applies only with all eight.
                        </small>
                      </label>
                      </>
                    )}
                    <p className="micro">
                      Candidates are adapted only from the freshly retrieved top-100 decks.
                      Locked cards and level/elixir filters still apply. Champions are excluded;
                      recommended cards use base forms. Form differences are shown explicitly.
                      Scores are estimates, not win probabilities. Check Ranked rules in-game.
                    </p>
                  </Panel>
                </div>
                <Panel
                  title="Live evaluation"
                  kicker="EXPLAINABLE · NOT A WIN RATE"
                >
                  <div className="score">
                    <strong>{ev.score}</strong>
                    <span>/100</span>
                    <small>COMPOSITION SCORE</small>
                  </div>
                  <Bar label="Defense" value={ev.defense} />
                  <Bar label="Offense" value={ev.offense} />
                  <Bar label="Level readiness" value={ev.readiness} />
                  <div className="fact">
                    <span>Four-card base cycle</span>
                    <strong>{ev.cycle ?? "?"} elixir</strong>
                  </div>
                  <div className="fact">
                    <span>Sustained air defenders</span>
                    <strong>{ev.air}</strong>
                  </div>
                  {ev.warnings.map((w) => (
                    <Notice key={w}>{w}</Notice>
                  ))}
                  <details>
                    <summary>How this is calculated</summary>
                    {ev.features.map((f) => (
                      <div className="fact" key={f.name}>
                        <span>
                          {f.name} · weight {f.weight}
                        </span>
                        <strong>{f.value.toFixed(1)}</strong>
                      </div>
                    ))}
                    <p className="micro">
                      Weighted mean of editorial role, level, cost and
                      composition features. Not calibrated to actual win rates.
                    </p>
                  </details>
                </Panel>
                </div>
              </details>
              <Panel title="How to Play This Deck"
                kicker="OPENINGS · DEFENSE · COUNTERPUSH · DOUBLE ELIXIR · CARD JOBS">
                <p className="micro">
                  This playbook follows the exact eight cards currently shown
                  above. It updates when you select a different recommended
                  deck, change a card, or choose a different tactical focus.
                  No separate AI subscription is required.
                </p>
                <DeckPlaybookPanel guide={selectedPlaybook}/>
              </Panel>
              <Panel title="Explain my deck" kicker="WHY THESE EIGHT · MATCHUPS · TRADE-OFFS">
                <DeckStrategyPanel report={strategic}
                  comparison={strategicSwaps} />
              </Panel>
              {candidates.length > 0 && (
                <Panel title="AI second opinion"
                  kicker="OPTIONAL REAL LANGUAGE MODEL · OWNER-ONLY">
                  <p className="micro">
                    The free strategy evaluation above works without any AI key.
                    Real model reasoning is optional, requires a separately billed
                    OpenAI API key on the server and a private access code.
                    It can choose any shortlisted deck or recommend keeping your
                    current deck. Nothing is applied automatically.
                  </p>
                  <div className="reasoned-ai-controls">
                    <label>AI access code
                      <input type="password" autoComplete="off"
                        value={aiAccessCode}
                        onChange={event=>setAiAccessCode(event.target.value)}
                        placeholder="Private owner access code"/>
                    </label>
                    <button className="btn" type="button"
                      disabled={aiReviewLoading||!aiAccessCode.trim()}
                      onClick={()=>void requestAIReview()}>
                      <BrainCircuit size={17}/>
                      {aiReviewLoading?"Comparing decks…":"Ask real AI to compare decks"}
                    </button>
                  </div>
                  {aiReviewError&&<p className="reasoned-ai-error" role="alert">
                    {aiReviewError}
                  </p>}
                  {aiReview&&<div className="reasoned-ai-result">
                    <div className="reasoned-ai-result-head">
                      <strong>{aiReview.choiceIndex===-1
                        ?"AI suggests keeping your current deck"
                        :"AI prefers alternative #"+(aiReview.choiceIndex+1)}</strong>
                      <small>Model: {aiReview.model} · Evidence-based opinion</small>
                    </div>
                    <p>{aiReview.verdict}</p>
                    <h4>Reasons</h4>
                    <ul>{aiReview.evidence.map((x,i)=><li key={i}>{x}</li>)}</ul>
                    <h4>Risks and counterarguments</h4>
                    <ul>{aiReview.risks.map((x,i)=><li key={i}>{x}</li>)}</ul>
                    {aiReview.substitutions.length>0&&<>
                      <h4>Card changes</h4>
                      <ul>{aiReview.substitutions.map((x,i)=><li key={i}>{x}</li>)}</ul>
                    </>}
                    <div className="reasoned-ai-play">
                      <p><b>Opening:</b> {aiReview.opening}</p>
                      <p><b>Defense:</b> {aiReview.defense}</p>
                      <p><b>Counterpush:</b> {aiReview.counterpush}</p>
                    </div>
                    <p className="reasoned-micro">{aiReview.limitations}</p>
                    <button className="btn" type="button"
                      onClick={()=>{
                        const target=aiReview.choiceIndex===-1?s.deck:
                          candidates[aiReview.choiceIndex]?.cards;
                        if(target)setDeck(target);
                      }}>
                      Use the AI-selected eight cards
                    </button>
                  </div>}
                </Panel>
              )}
              {candidates.length > 0 && (
                <Panel
                  title="Top alternative teams"
                  kicker={"LIVE GLOBAL TOP "+globalTopLimit+" · YOUR OWNED-LEVEL ADAPTATION"}
                >
                  <div className="candidate-grid">
                    {candidates.map((c, i) => (
                      <div className="candidate" key={key(c.cards)}>
                        <div className="deck-meta">
                          <Pill>0{i + 1}</Pill>
                          <strong>{c.recommendationScore.toFixed(1)}/100 estimated fit</strong>
                        </div>
                        <h4>{name(c.cards)}</h4>
                        <Deck cards={c.cards} onClick={setSelected} />
                        <p>
                          Avg {c.evaluation.avg?.toFixed(2) ?? "—"} elixir ·
                          4-card cycle {c.evaluation.cycle ?? "—"} ·
                          {" "}{c.evaluation.air} reliable air defenders
                        </p>
                        <p className="micro">
                          Numerical: {c.evaluation.score}/100 · Tactical:
                          {" "}{c.strategy?.score ?? "—"}/100.
                        </p>
                        <LiveCandidateEvidence candidate={c}/>
                        <details className="deck-play-alternative">
                          <summary>How to play alternative #{i+1}</summary>
                          <DeckPlaybookPanel
                            guide={buildDeckPlaybook(c.cards,mechanics,focus)}/>
                        </details>
                        {c.strategy?.risks.slice(0,2).map((risk,i)=>(
                          <p className="micro" key={i}>{risk}</p>
                        ))}
                        {c.evaluation.audit.missing.length > 0 && (
                          <p className="micro">
                            Structural flags: {c.evaluation.audit.missing.join(", ")}.
                          </p>
                        )}
                        <button
                          className="btn secondary"
                          onClick={() => setDeck(c.cards)}
                        >
                          {key(deck) === key(c.cards) ? "Selected" : "Use this deck"}
                        </button>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
              <Panel title="Combat mechanics for your eight cards" kicker="HITPOINTS · DAMAGE · ATTACK SPEED · TARGETING · RANGE">
                <p className="micro">
                  Numeric combat stats are sourced separately from community game-data files and
                  shown at the player's recorded card level only when an explicit level entry exists.
                  Unknown means unavailable—not zero. The source may lag balance changes or
                  special forms; this is not a complete combat simulator.
                </p>
                {mechanicsError && <Notice>{mechanicsError}</Notice>}
                {mechanics?.warnings.map((warning) => <Notice key={warning}>{warning}</Notice>)}
                <div className="mechanics-grid">
                  {ev.mechanic.cardScores.map((m) => (
                    <div className="mechanics-card" key={m.id}>
                      <div className="mechanics-card-top">
                        <strong>{m.name}</strong>
                        <span>Stat coverage {Math.round(m.confidence * 100)}%</span>
                      </div>
                      <div className="mechanics-card-stats">
                        <div><small>HP / UNIT</small><strong>{fmt(m.hp)}</strong></div>
                        <div><small>DAMAGE/HIT</small><strong>{fmt(m.damage)}</strong></div>
                        <div><small>DPS / UNIT</small><strong>{m.dps == null ? "—" : Math.round(m.dps).toLocaleString()}</strong></div>
                        <div><small>HIT INTERVAL</small><strong>{m.hitSpeed == null ? "—" : m.hitSpeed.toFixed(2) + "s"}</strong></div>
                        <div><small>RANGE</small><strong>{m.range == null ? "—" : m.range.toFixed(1) + " tiles"}</strong></div>
                        <div><small>TARGETS</small><strong>{m.targets}</strong></div>
                      </div>
                      <details>
                        <summary>More mechanics</summary>
                        <div className="fact"><span>Movement speed</span><strong>{m.speedRaw ?? "—"} (raw data)</strong></div>
                        <div className="fact"><span>Splash radius</span><strong>{m.splash == null ? "—" : m.splash.toFixed(1) + " tiles"}</strong></div>
                        <div className="fact"><span>Unit count</span><strong>{m.unitCount ?? "—"}</strong></div>
                        <div className="fact"><span>Deploy time</span><strong>{m.deployTime == null ? "—" : m.deployTime.toFixed(2) + "s"}</strong></div>
                        <div className="fact"><span>Attack preload (raw)</span><strong>{m.firstHit == null ? "—" : m.firstHit.toFixed(2) + "s"}</strong></div>
                        <div className="fact"><span>Derived card mechanics score</span><strong>{m.score == null ? "—" : m.score.toFixed(1) + "/100"}</strong></div>
                      </details>
                    </div>
                  ))}
                </div>
                <p className="micro">
                  Source: <a href="https://github.com/RoyaleAPI/cr-api-data"
                    target="_blank" rel="noreferrer">RoyaleAPI community stat files ↗</a>.
                  Last downloaded: {mechanics?.fetchedAt
                    ? mechanics.fetchedAt.replace("T"," ").slice(0,16) + " UTC"
                    : "unavailable"}.
                  This timestamp is a retrieval time, not an official balance-patch date.
                </p>
              </Panel>
              <Panel
                title="Why these eight?"
                kicker="CARD-BY-CARD ROLE ANALYSIS"
              >
                <div className="role-grid">
                  {deck.map((c) => (
                    <button key={c.id} onClick={() => setSelected(c)}>
                      <img src={c.image} alt="" />
                      <div>
                        <strong>
                          {c.name} <small>Lv {c.level ?? "?"}</small>
                        </strong>
                        <p>{c.roles.join(" · ") || "Unclassified"}</p>
                        <small>Inspect evidence ↗</small>
                      </div>
                    </button>
                  ))}
                </div>
              </Panel>
              <Panel title="Your playbook" kicker="EDITORIAL GUIDANCE">
                <div className="playbook">
                  {[
                    [
                      "Opening",
                      "Use a low-commitment opening. Identify their win condition before spending your only reliable air counter.",
                    ],
                    [
                      "Single elixir",
                      "Defend efficiently and support surviving troops. Preserve a counter to the main threat.",
                    ],
                    [
                      "Double elixir",
                      "Increase pressure when their key answer is out of rotation. Avoid giving easy spell value.",
                    ],
                    [
                      "Overtime",
                      "Verify spell damage in-game and your next defense before committing to a spell-cycle finish.",
                    ],
                  ].map(([a, b], i) => (
                    <div key={a}>
                      <span>0{i + 1}</span>
                      <h4>{a}</h4>
                      <p>{b}</p>
                    </div>
                  ))}
                </div>
              </Panel>
            </>
          )}
          {page === "Matchup Lab" && (
            <>
              <Panel title="Compare an opponent">
                <label>
                  Opponent's player tag
                  <div className="inline">
                    <input aria-label="Opponent player tag" placeholder="#PLAYER_TAG"
                      value={opponentTag} onChange={(e) => setOpponentTag(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && scouting === "") void scoutPlayer("opponent"); }}/>
                    <button type="button" className="btn"
                      disabled={scouting !== "" || !opponentTag.trim()}
                      onClick={() => void scoutPlayer("opponent")}>
                      <Search size={15} />
                      {scouting === "opponent" ? "Loading…" : "Load real deck"}
                    </button>
                  </div>
                  <small>Uses the opponent's currently selected public deck, which may differ from past battle decks.</small>
                </label>
                {scouted && (
                  <div className="fact">
                    <span>{scouted.name} · {scouted.tag}</span>
                    <strong>{fmt(scouted.trophies)} trophies</strong>
                  </div>
                )}
                <label>
                  Official deck link
                  <div className="inline">
                    <input
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      placeholder="https://link.clashroyale.com/deck/en?deck=…"
                    />
                    <button
                      className="btn"
                      onClick={() => {
                        try {
                          setEnemy(importLink(link, s.catalog));
                          setScouted(null);
                          setError("");
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Import
                    </button>
                  </div>
                </label>
                <label>
                  Or select eight opponent cards
                  <select
                    multiple
                    value={enemy.map((c) => String(c.id))}
                    onChange={(e) => {
                      const ids = Array.from(e.target.selectedOptions).map(
                        (o) => Number(o.value),
                      );
                      if (ids.length <= 8) {
                        setEnemy(s.catalog.filter((c) => ids.includes(c.id)));
                        setScouted(null);
                      }
                    }}
                  >
                    {s.catalog
                      .filter((c) => !c.tower)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                </label>
              </Panel>
              <div className="two-col">
                <Panel title="Your selected deck">
                  <Deck cards={deck} onClick={setSelected} />
                  <Bar label="Defensive role coverage" value={ev.defense} />
                </Panel>
                <Panel title="Opponent composition">
                  <Deck cards={enemy} onClick={setSelected} />
                  <Bar
                    label="Defensive role coverage"
                    value={evaluate(enemy).defense}
                  />
                </Panel>
              </div>
              {enemy.length === 8 ? (
                <Panel title="Threat checklist">
                  <Notice>
                    {enemy.some((c) =>
                      ["Balloon", "Lava Hound"].includes(c.name),
                    ) && ev.air < 2
                      ? "Air win condition against limited sustained air coverage. Protect your air defenders."
                      : "Identify the opponent’s win condition and keep your primary answer available."}
                  </Notice>
                  <Notice>
                    {enemy.some((c) =>
                      ["Golem", "Giant", "Mega Knight", "P.E.K.K.A"].includes(
                        c.name,
                      ),
                    ) && !ev.roles["Tank killer"]
                      ? "Heavy ground threat without a recognized tank killer."
                      : "Compare rotation and spell vulnerability, not just the role score."}
                  </Notice>
                  <p>
                    No matchup win probability is available. Levels, placement,
                    special forms and tower choice can change interactions.
                  </p>
                </Panel>
              ) : (
                <Empty>
                  Select all eight opponent cards to see qualitative matchup
                  notes.
                </Empty>
              )}
            </>
          )}
          {page === "Battle History" && (
            <>
              <div className="filters">
                <select
                  aria-label="Battle mode"
                  value={modeFilter}
                  onChange={(e) => setModeFilter(e.target.value)}
                >
                  {["All modes", ...new Set(all.map((b) => b.mode))].map(
                    (m) => (
                      <option key={m}>{m}</option>
                    ),
                  )}
                </select>
                <span className="muted">
                  {battles.length} battles · {st.wins} wins · {st.losses} losses
                  · {st.unknown} unknown
                </span>
              </div>
              <Panel title="Recent performance" kicker="OBSERVED RESULTS">
                <div className="result-strip">
                  {battles.map((b) => (
                    <span
                      key={b.id}
                      className={b.outcome}
                      title={b.mode + " " + b.time}
                    >
                      {b.outcome === "win"
                        ? "W"
                        : b.outcome === "loss"
                          ? "L"
                          : "?"}
                    </span>
                  ))}
                </div>
                <p>
                  {st.ci
                    ? `${pct(st.ci.rate)} decisive win rate · Wilson 95% interval ${pct(st.ci.low)}–${pct(st.ci.high)} · n=${st.ci.total}`
                    : "Not enough decisive results."}
                </p>
                <small>
                  Equal crowns without decisive evidence remain unknown. 2v2
                  crowns are shared, never summed.
                </small>
              </Panel>
              {s.mode === "live" && (
                <Panel title="Trophy history" kicker="SAMPLED SNAPSHOTS STORED ON THIS DEVICE">
                  {hist.snapshots.length > 1 ? hist.snapshots.slice(0, 20).map((snap, index) => {
                    const next = hist.snapshots[index + 1];
                    const delta = snap.trophies != null && next?.trophies != null ? snap.trophies - next.trophies : null;
                    return (
                      <div className="fact" key={snap.fetchedAt}>
                        <span>{snap.fetchedAt.replace("T"," ").slice(0,16)} UTC</span>
                        <strong>{fmt(snap.trophies)} {delta == null ? "" : delta > 0 ? "(+" + delta + ")" : "(" + delta + ")"}</strong>
                      </div>
                    );
                  }) : <Empty>Refresh this player again later to build a real trophy timeline.</Empty>}
                  <p className="micro">Only sampled points are available. No trophies are inferred between visits.</p>
                </Panel>
              )}
              <Panel title="Battle log">
                {battles.map(battleRow)}
                {!battles.length && (
                  <Empty>No battles match this filter.</Empty>
                )}
              </Panel>
              <Panel title="Tracked deck choices">
                {hist.choices.map((c) => {
                  const bs = all.filter(
                      (b) =>
                        b.time > c.observed &&
                        b.team.some(
                          (p) =>
                            p.tag === s.tag &&
                            key(p.cards) ===
                              c.cards
                                .slice()
                                .sort((a, b) => a - b)
                                .join(";"),
                        ),
                    ),
                    v = stats(bs);
                  return (
                    <div className="fact" key={c.id}>
                      <span>
                        {c.mode} · {c.observed.slice(0, 10)} · {c.score}/100
                      </span>
                      <strong>
                        {v.wins}W / {v.losses}L · {bs.length} matches
                      </strong>
                    </div>
                  );
                })}
                {!hist.choices.length && (
                  <Empty>
                    Connect a real account and track a base composition in Deck
                    Lab.
                  </Empty>
                )}
                <p className="micro">
                  Public player tracking is saved on this device. Refresh the player
                  later to accumulate newer battles. Matching uses base card IDs
                  after each choice and ignores special forms and towers.
                  Observed results do not prove causation.
                </p>
              </Panel>
              <Notice>
                Replay analysis is not available. Battle summaries cannot
                establish placement or timing mistakes.
              </Notice>
            </>
          )}
          {page === "Upgrade Planner" && (
            <>
              <div className="two-col">
                <Panel title="Your manual resources">
                  <div className="form-grid">
                    {(["gold", "wildCards", "shards"] as const).map((k) => (
                      <label key={k}>
                        {k}
                        <input
                          type="number"
                          min="0"
                          value={resource[k]}
                          onChange={(e) =>
                            setResource({
                              ...resource,
                              [k]: Math.max(0, Number(e.target.value)),
                            })
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <button
                    className="btn secondary"
                    onClick={() => {
                      try {
                        localStorage.setItem(
                          "ri-preferences:" + s.tag,
                          JSON.stringify({ version: 1, resource }),
                        );
                        setToast("Manual resources saved on this device.");
                      } catch {
                        setToast("Device storage is unavailable.");
                      }
                    }}
                  >
                    Save on this device
                  </button>
                </Panel>
                <Panel title="Spend where it matters">
                  <h2>
                    Prioritize the cards
                    <br />
                    you actually play.
                  </h2>
                  <p>
                    The list favors your selected deck, spells and win
                    conditions. Resources are recorded for planning; costs and
                    interaction breakpoints are not verified.
                  </p>
                  <Notice>
                    This ranking does not guarantee affordability.
                  </Notice>
                </Panel>
              </div>
              <Panel title="Suggested upgrade order">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Priority</th>
                        <th>Card</th>
                        <th>Level</th>
                        <th>Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upgrades.map(({ c }, i) => (
                        <tr key={c.id}>
                          <td>#{i + 1}</td>
                          <td>
                            <button
                              className="table-card"
                              onClick={() => setSelected(c)}
                            >
                              <img src={c.image} alt="" />
                              {c.name}
                            </button>
                          </td>
                          <td>
                            {c.level} → {c.level! + 1}
                          </td>
                          <td>
                            {deck.some((d) => d.id === c.id)
                              ? "Used in your selected deck"
                              : "Alternative composition"}{" "}
                            · heuristic
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
            </>
          )}
          {page === "Meta Insights" && (
            <>
              <div className="two-col">
                <Panel title="Global Ranked leaders" kicker="OFFICIAL RANKING — NOT DECK WIN RATE">
                  {rankingsLoading && <Empty>Loading the official global rankings…</Empty>}
                  {rankingsError && <Notice>{rankingsError}</Notice>}
                  {rankings?.ranked.slice(0, 10).map((player, i) => (
                    <div className="fact" key={player.tag}>
                      <span>
                        #{publicNumber(player, "rank") ?? i + 1} · {player.name}
                        <small> · {player.tag}</small>
                      </span>
                      <button className="text-btn" onClick={() => {
                        setTag(player.tag); go("Overview"); void connect(player.tag);
                      }}>
                        {fmt(publicNumber(player, "eloRating") ?? publicNumber(player, "trophies"))} · View ↗
                      </button>
                    </div>
                  ))}
                  {rankings && rankings.ranked.length === 0 &&
                    <Empty>No current global Ranked standings were returned.</Empty>}
                  <p className="micro">Ranks and ratings are official API observations. These do not establish global card usage or matchup win probability.</p>
                  <a className="text-btn" href="https://royaleapi.com/decks/popular"
                    target="_blank" rel="noreferrer">Browse external community meta research ↗</a>
                </Panel>
                <Panel
                  title="Your observed opponent cards"
                  kicker={
                    s.mode === "demo"
                      ? "SYNTHETIC SAMPLE"
                      : "PERSONAL ENCOUNTERS"
                  }
                >
                  {Object.entries(
                    all.reduce<Record<string, number>>((a, b) => {
                      for (const n of new Set(
                        b.opponent.flatMap((p) => p.cards.map((c) => c.name)),
                      ))
                        a[n] = (a[n] ?? 0) + 1;
                      return a;
                    }, {}),
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 8)
                    .map(([n, count]) => (
                      <div className="fact" key={n}>
                        <span>{n}</span>
                        <strong>
                          {count}/{all.length} battles
                        </strong>
                      </div>
                    ))}
                  <p className="micro">
                    Your encounters are not global usage rates.
                  </p>
                </Panel>
              </div>
              <div className="two-col">
                <Panel title="Global Trophy Road leaders" kicker="OFFICIAL RANKING">
                  {rankingsLoading && <Empty>Loading the leaderboard…</Empty>}
                  {rankings?.trophyRoad.slice(0, 12).map((player, i) => (
                    <div className="fact" key={player.tag}>
                      <span>#{publicNumber(player, "rank") ?? i + 1} · {player.name}</span>
                      <button className="text-btn" onClick={() => {
                        setTag(player.tag); go("Overview"); void connect(player.tag);
                      }}>
                        {fmt(publicNumber(player, "trophies"))} · View ↗
                      </button>
                    </div>
                  ))}
                  {rankings && !rankings.trophyRoad.length && <Empty>No current Trophy Road rankings returned.</Empty>}
                  <p className="micro">Official player rankings may be empty early in a season.</p>
                </Panel>
                <Panel title="Current in-game events" kicker="OFFICIAL EVENT CATALOG">
                  {rankingsLoading && <Empty>Loading active events…</Empty>}
                  {rankings?.events.map((event, index) => (
                    <div className="fact" key={String(event.eventTag ?? event.id ?? index)}>
                      <span>{String(event.title ?? event.name ??
                        (event.gameMode as {name?: string}|undefined)?.name ?? "In-game event")}</span>
                      <strong>{String(event.gameMode ? (event.gameMode as {name?: string}).name ?? "Event" : "Event")}</strong>
                    </div>
                  ))}
                  {rankings && !rankings.events.length && <Empty>No active events were returned.</Empty>}
                  {rankings?.warnings.map((w) => <Notice key={w}>{w}</Notice>)}
                  <p className="micro">Only events actually returned by the official API are listed.</p>
                </Panel>
              </div>
              <Panel title="Patch-scoped reference records">
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Card / form</th>
                        <th>Statistic</th>
                        <th>Value</th>
                        <th>Level / patch</th>
                        <th>Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {verifiedStats.map((v, i) => (
                        <tr key={i}>
                          <td>
                            {v.cardName} · {v.form}
                          </td>
                          <td>{v.statistic}</td>
                          <td>
                            {v.value} {v.unit}
                          </td>
                          <td>
                            {v.level ?? "All"} · {v.patch}
                          </td>
                          <td>
                            <a
                              href={v.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              Official source ↗
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="micro">
                  Partial dataset. Values belong to the stated patch and level;
                  they are not automatically current or scaled to your cards.
                </p>
              </Panel>
            </>
          )}
          {page === "AI Coach" && (
            <Panel
              title="Your personal strategy desk"
              kicker="GROUNDED STRATEGIC ANALYSIS"
            >
              <Notice>
                This coach uses the same tactical scenarios as Deck Laboratory:
                air pressure, tanks, swarms, ground defense, tower pressure,
                elixir and battle evidence. It is deterministic, not the
                paid language-model review. For an optional actual AI comparison
                of five eligible decks, open Deck Laboratory.
              </Notice>
              <div className="prompt-grid">
                {[
                  "How can I defend heavy air?",
                  "Explain my selected deck",
                  "What should I upgrade?",
                  "Why did I lose?",
                ].map((x) => (
                  <button
                    className="btn secondary"
                    key={x}
                    onClick={() => answer(x)}
                  >
                    {x} ↗
                  </button>
                ))}
              </div>
              {answers.length === 0 && (
                <Empty>
                  Choose a question to explore your selected deck and loaded
                  battles.
                </Empty>
              )}
              {answers.map((a, i) => (
                <div className="conversation" key={i}>
                  <strong>{a.q}</strong>
                  <p>
                    <Sparkles size={17} />
                    {a.a}
                  </p>
                </div>
              ))}
              <form
                className="inline"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (question.trim()) answer(question.trim());
                }}
              >
                <input
                  aria-label="Coach question"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about your deck, air defense or upgrades…"
                />
                <button className="btn" disabled={!question.trim()}>
                  Ask coach
                </button>
              </form>
            </Panel>
          )}
          {page === "Settings" && (
            <>
              <div className="two-col">
                <Panel title="Connection status">
                  <div className="fact">
                    <span>Clash Royale API</span>
                    <Pill tone={status?.live ? "green" : "gold"}>
                      {status?.live ? "Configured" : "Token required"}
                    </Pill>
                  </div>
                  <div className="fact">
                    <span>Private database (not required for visitors)</span>
                    <Pill tone={status?.database ? "green" : ""}>
                      {status?.database ? "Configured" : "Local browser tracking"}
                    </Pill>
                  </div>
                  <div className="fact">
                    <span>Current data</span>
                    <strong>
                      {s.mode === "demo"
                        ? "Synthetic fixture"
                        : "Official API snapshot"}
                    </strong>
                  </div>
                  <button
                    className="btn secondary"
                    onClick={() =>
                      fetch("/api/status")
                        .then((r) => r.json())
                        .then(setStatus)
                        .catch(() => setToast("Status check failed."))
                    }
                  >
                    Check configuration
                  </button>
                </Panel>
                <Panel title="Use any Clash Royale player tag">
                  <p>
                    Enter a valid player tag at the top of the page or share
                    a link containing <code>?tag=PLAYER_TAG</code>.
                    Anyone can search available public player information.
                    No Supercell login, developer key, or Vercel account is needed.
                  </p>
                  <p className="micro">
                    The website operator configures the official Supercell API
                    key privately on Vercel. Visitors should never enter API tokens.
                  </p>
                  <details>
                    <summary>Server administrator setup</summary>
                    <p>Generate a key at <a href="https://developer.clashroyale.com/"
                      target="_blank" rel="noreferrer">Supercell Developer Portal ↗</a>.
                      Set <code>CLASH_API_TOKEN</code> in server environment variables.
                      Choose an authorized API base; for dynamic hosting, follow the
                      <a href="https://docs.royaleapi.com/proxy"
                        target="_blank" rel="noreferrer"> RoyaleAPI proxy instructions ↗</a>,
                      then redeploy. Never publish real tokens in GitHub.</p>
                  </details>
                </Panel>
              </div>
              <Panel title="Public visitor data and privacy">
                <p>
                  Profiles come from the official API. Recent battles, sampled trophy history,
                  tracked compositions and manually entered resources are stored in this browser
                  separately by searched player tag; they do not sync between devices.
                </p>
                <div className="fact"><span>Recorded snapshots</span><strong>{hist.snapshots.length}</strong></div>
                <div className="fact"><span>Remembered battles</span><strong>{hist.battles.length}</strong></div>
                <div className="fact"><span>Tracked deck choices</span><strong>{hist.choices.length}</strong></div>
                <details>
                  <summary>Optional private workspace access (administrators only)</summary>
                  <p className="micro">Public visitors do not need an API key or password. Administrators of a private Sites/D1 deployment may use their separate APP_ACCESS_KEY here.</p>
                  <label>Application access key
                    <input type="password" value={access} autoComplete="off"
                      onChange={(e) => setAccess(e.target.value)} />
                  </label>
                </details>
              </Panel>
              <Panel title="Your data, your control">
                <div className="actions">
                  <button
                    className="btn secondary"
                    onClick={() => {
                      const url = URL.createObjectURL(
                        new Blob(
                          [
                            JSON.stringify(
                              { snapshot: s, history: hist, resource },
                              null,
                              2,
                            ),
                          ],
                          { type: "application/json" },
                        ),
                      );
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "royal-intelligence-export.json";
                      a.click();
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                    }}
                  >
                    <Download size={15} />
                    Export loaded data
                  </button>
                  <button
                    className="btn secondary"
                    onClick={() => {
                      setS(demo());
                      setDeck(demo().deck);
                      setHist(blank);
                      setCandidates([]);
                      setQ(defaults);
                      setEnemy([]);
                      setModeFilter("All modes");
                      setError("");
                    }}
                  >
                    Open demo
                  </button>
                  <button
                    className="btn secondary"
                    disabled={s.mode === "demo"}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete tracked history
                  </button>
                </div>
                <p className="micro">
                  Export includes your current official profile, up to 90 browser-saved
                  snapshots, 200 remembered battles, and 100 tracked deck choices.
                  Resources and history stay on this device per player tag.
                </p>
                {confirmDelete && (
                  <div className="delete-confirm">
                    <Notice>
                      Delete all stored tracking for {s.tag}? This cannot be
                      undone.
                    </Notice>
                    <button
                      className="btn"
                      onClick={async () => {
                        try {
                          const removed = clearLocalHistory(s.tag);
                          try { localStorage.removeItem("ri-preferences:" + s.tag); } catch {}
                          if (status?.database || access) {
                            try {
                              await request(
                                "/api/history?tag=" + encodeURIComponent(s.tag),
                                { method: "DELETE" },
                              );
                            } catch {
                              // Browser history is independently deletable.
                            }
                          }
                          setHist(emptyHistory());
                          setResource({ gold: 0, wildCards: 0, shards: 0 });
                          setConfirmDelete(false);
                          setToast(removed ? "Local history for this player deleted." : "History cleared from this session; browser storage is unavailable.");
                        } catch (e) {
                          setError((e as Error).message);
                        }
                      }}
                    >
                      Delete history
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </Panel>
              <Panel title="Release scope">
                <p>
                  Implemented: public tag lookup and shareable profiles,
                  official player/deck/cards/chests and observed battle data,
                  badges, achievements, Ranked and side-mode progression,
                  clan rosters and current River Race, opponent and teammate
                  tag scouting, official global leaderboards and in-game events,
                  browser-local history and tracked choices, explainable deck
                  generation, upgrade priorities, matchup notes, export and deletion.
                </p>
                <Notice>
                  Not available from the public API alone: complete lifetime
                  battle logs, replay or placement analysis, definitive card
                  damage at every level, global deck matchup/win rates, private
                  inventories, calibrated matchup predictions, automated in-game
                  upgrades or historical data before the browser first tracked
                  a player. The local coach is deterministic, not an LLM.
                </Notice>
                <p className="micro">
                  Source is public on{" "}
                  <a
                    href="https://github.com/mohammed-ajmal7/royal-intelligence"
                    target="_blank"
                    rel="noreferrer"
                  >
                    GitHub
                  </a>
                  . No credentials or real account records are committed.
                </p>
              </Panel>
            </>
          )}
          <footer>
            <div>
              <Crown size={15} />
              <strong>ROYAL INTELLIGENCE</strong>
              <span>Evidence over guesswork.</span>
            </div>
            <p>
              Unofficial fan content, not endorsed by Supercell.{" "}
              <a
                href="https://supercell.com/en/fan-content-policy/"
                target="_blank"
                rel="noreferrer"
              >
                Fan Content Policy ↗
              </a>
            </p>
          </footer>
        </main>
      </div>
      <nav className="mobile-bottom-nav" aria-label="Mobile primary navigation">
        {([
          ["Overview", LayoutDashboard, "Home"],
          ["My Collection", Layers3, "Cards"],
          ["Deck Laboratory", FlaskConical, "Build"],
          ["Battle History", Swords, "Battles"],
        ] as const).map(([p, Icon, label]) => (
          <button
            key={p}
            className={page === p ? "mobile-tab active" : "mobile-tab"}
            aria-current={page === p ? "page" : undefined}
            onClick={() => go(p)}
          >
            <span className="mobile-tab-icon"><Icon size={22} /></span>
            <span>{label}</span>
          </button>
        ))}
        <button
          className={["Overview","My Collection","Deck Laboratory","Battle History"].includes(page) ? "mobile-tab" : "mobile-tab active"}
          aria-label="More sections"
          aria-expanded={mobile}
          onClick={() => setMobile(true)}
        >
          <span className="mobile-tab-icon"><Menu size={22} /></span>
          <span>More</span>
        </button>
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
          <button
            className="icon-btn"
            aria-label="Dismiss notification"
            onClick={() => setToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {selected && <CardDetails key={selected.id} card={selected} cards={s.catalog}
        mechanics={mechanics} loading={mechanicsLoading} error={mechanicsError}
        demo={s.mode === "demo"} onClose={() => setSelected(null)}/>}

    </div>
  );
}

