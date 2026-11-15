"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Crown,
  LayoutDashboard,
  Layers3,
  BookOpen,
  FlaskConical,
  ScanLine,
  Swords,
  History,
  TrendingUp,
  Globe2,
  Sparkles,
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
  defaults,
  evaluate,
  generate,
  modes,
  stats,
  key,
  deckLink,
  importLink,
  combat,
  Constraints,
} from "../lib/engine";
import { verifiedStats } from "../lib/references";
const nav = [
  ["Overview", LayoutDashboard],
  ["My Collection", Layers3],
  ["Card Encyclopedia", BookOpen],
  ["Deck Laboratory", FlaskConical],
  ["Deck Analyzer", ScanLine],
  ["Matchup Lab", Swords],
  ["Battle History", History],
  ["Upgrade Planner", TrendingUp],
  ["Meta Insights", Globe2],
  ["AI Coach", Sparkles],
  ["Settings", Settings],
] as const;
const titles: Record<string, string> = {
  Overview: "Your competitive edge.",
  "Deck Laboratory": "Build with intelligence.",
  "My Collection": "Every card. Every possibility.",
  "Battle History": "Find the pattern.",
  "AI Coach": "Think one move ahead.",
};
const descriptions: Record<string, string> = {
  Overview: "Understand your account. Build smarter decks. Play with purpose.",
  "My Collection": "Your cards, your levels, your possibilities.",
  "Card Encyclopedia": "Inspect the evidence behind every card.",
  "Deck Laboratory": "Find the right eight cards for the way you play.",
  "Deck Analyzer": "Understand your deck’s strengths, gaps, and roles.",
  "Matchup Lab": "Know the threats. Preserve the right answers.",
  "Battle History": "Learn from the matches available in your battle log.",
  "Upgrade Planner": "Invest in the cards that support your next climb.",
  "Meta Insights": "Separate current evidence from assumptions.",
  "AI Coach": "Grounded explanations, without invented statistics.",
  Settings: "Manage your connection, data, and preferences.",
};
const blank = {
  snapshots: [] as Snapshot[],
  battles: [] as Battle[],
  choices: [] as {
    id: string;
    observed: string;
    cards: number[];
    mode: string;
    score: number;
  }[],
};
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
    [tagInput, setTag] = useState("VUYRP9GQL"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("All cards"),
    [sort, setSort] = useState("Level"),
    [selected, setSelected] = useState<Card | null>(null),
    [q, setQ] = useState<Constraints>(defaults),
    [candidates, setCandidates] = useState<ReturnType<typeof generate>>([]),
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
    [resource, setResource] = useState({ gold: 0, wildCards: 0, shards: 0 }),
    [question, setQuestion] = useState(""),
    [answers, setAnswers] = useState<{ q: string; a: string }[]>([]),
    [comparison, setComparison] = useState<number>(0),
    [calc, setCalc] = useState({
      hp: 1000,
      damage: 200,
      interval: 1.2,
      delay: 0.5,
    }),
    [confirmDelete, setConfirmDelete] = useState(false);
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
    const requestedTag = new URLSearchParams(window.location.search).get("tag");
    if (requestedTag) {
      setTag(requestedTag);
      void connect(requestedTag);
    }
    try {
      const p = JSON.parse(localStorage.getItem("ri-preferences") ?? "null");
      if (p?.version === 1 && p.resource) setResource(p.resource);
    } catch {}
    return () => window.removeEventListener("hashchange", change);
  }, []);
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
    ev = evaluate(deck, q),
    current = evaluate(s.deck, { ...defaults, cap: s.cap });
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
    setError("");
    setLoading(true);
    try {
      const result: Snapshot = await request(
        "/api/player?tag=" + encodeURIComponent(searchTag),
      );
      setS(result);
      window.history.replaceState(
        null,
        "",
        window.location.pathname +
          "?tag=" + encodeURIComponent(result.tag.replace(/^#/, "")) +
          window.location.hash,
      );
      setDeck(result.deck);
      setQ({ ...defaults, cap: result.cap });
      setCandidates([]);
      setEnemy([]);
      setHist(blank);
      setModeFilter("All modes");
      try {
        setHist(
          await request("/api/history?tag=" + encodeURIComponent(result.tag)),
        );
        setToast(
          result.stale
            ? "Showing last saved snapshot."
            : "Account synchronized.",
        );
      } catch {
        setToast("Public profile loaded. Private history is unavailable.");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  function optimize() {
    setBusy(true);
    setError("");
    setTimeout(() => {
      try {
        const cs = generate(s.cards, q);
        setCandidates(cs);
        if (cs.length) setDeck(cs[0].cards);
        else
          setError(
            "No deck meets these constraints. Relax the level, elixir or include restrictions.",
          );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    }, 30);
  }
  function add(c: Card) {
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
    try {
      await request("/api/choices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tag: s.tag,
          cards: deck.map((c) => c.id),
          mode: q.mode,
        }),
      });
      setHist(await request("/api/history?tag=" + encodeURIComponent(s.tag)));
      setToast("Base composition tracked for future observed battles.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function answer(text: string) {
    const e = evaluate(deck, q);
    const a = /air|balloon|lava/i.test(text)
      ? `Your selected deck has ${e.air} sustained air-defense options. ${e.air < 2 ? "Add a second reliable air defender; cycle units alone are fragile." : "Avoid spending both air answers together before identifying the opponent’s win condition."} Protect your air defenders from spell value. This is role guidance, not a simulated matchup.`
      : /upgrade/i.test(text)
        ? "Prioritize the cards in your chosen deck, especially spells and your win condition. Check actual costs and interactions in-game; this app does not have a complete upgrade-cost dataset."
        : /win|lost|lose|mistake/i.test(text)
          ? `The loaded filter contains ${st.wins} wins, ${st.losses} losses and ${st.unknown} unknown outcomes. Battle summaries cannot reveal placement or timing mistakes. Review replays yourself and compare more matches in the same mode.`
          : `${name(deck)} averages ${ev.avg?.toFixed(2) ?? "unknown"} elixir. ${ev.warnings.join(" ") || "The annotated roles cover the basic checklist."} Use a low-commitment opening, preserve counters, and turn surviving defenders into pressure. Score ${ev.score}/100 is editorial, not a win probability.`;
    setAnswers([...answers, { q: text, a }]);
    setQuestion("");
  }
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
    <div>
      <aside className={mobile ? "sidebar open" : "sidebar"}>
        <a className="brand" href="#Overview">
          <span className="brand-icon">
            <Crown />
          </span>
          <span>
            ROYAL<small>INTELLIGENCE</small>
          </span>
        </a>
        <div className="nav-kicker">
          PLAYER WORKSPACE <small>v0.1</small>
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
          aria-label="Close menu"
          onClick={() => setMobile(false)}
        />
      )}
      <div className="workspace">
        <header className="topbar">
          <button
            className="mobile-toggle icon-btn"
            aria-label="Open menu"
            onClick={() => setMobile(true)}
          >
            <Menu />
          </button>
          <span>Workspace</span>
          <ChevronRight size={14} />
          <strong>{page}</strong>
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
          <div className="account-bar">
            <label className="tag-input">
              <span>#</span>
              <input
                aria-label="Player tag"
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
                    <span>Persistent history</span>
                    <strong>{s.stored ? "Saved" : "Session only"}</strong>
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
          {["Deck Laboratory", "Deck Analyzer"].includes(page) && (
            <>
              <div className="mode-tabs">
                {[
                  "Best overall",
                  "Maximum defense",
                  "Maximum offense",
                  "2v2 defensive support",
                  "Fast cycle",
                ].map((m) => (
                  <button
                    className={q.mode === m ? "active" : ""}
                    key={m}
                    onClick={() => setQ({ ...q, mode: m })}
                  >
                    {m}
                  </button>
                ))}
              </div>
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
                        disabled={busy}
                      >
                        <Sparkles size={16} />
                        {busy ? "Evaluating…" : "Optimize my deck"}
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
                    )}
                    <p className="micro">
                      Approximate beam search plus editorial archetype seeds. It
                      excludes Champions and does not optimize special forms,
                      abilities or tower synergy. Ranked limits must be
                      confirmed in-game.
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
              {candidates.length > 0 && (
                <Panel
                  title="Your candidate shortlist"
                  kicker="DIVERSE BASE-CARD COMPOSITIONS"
                >
                  <div className="candidate-grid">
                    {candidates.map((c, i) => (
                      <div className="candidate" key={key(c.cards)}>
                        <div className="deck-meta">
                          <Pill>0{i + 1}</Pill>
                          <strong>{c.evaluation.score}/100</strong>
                        </div>
                        <h4>{name(c.cards)}</h4>
                        <Deck cards={c.cards} onClick={setSelected} />
                        <p>
                          {c.evaluation.avg?.toFixed(2)} average elixir ·{" "}
                          {c.evaluation.air} sustained air defenders
                        </p>
                        <button
                          className="btn secondary"
                          onClick={() => setDeck(c.cards)}
                        >
                          Use this deck
                        </button>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
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
                      if (ids.length <= 8)
                        setEnemy(s.catalog.filter((c) => ids.includes(c.id)));
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
                  Matches base card IDs after the choice was saved; ignores form
                  and tower differences. Descriptive results do not prove
                  causation.
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
                          "ri-preferences",
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
                <Panel title="Competitive meta feed">
                  <Empty>
                    No representative global meta feed is connected. Global
                    usage rates and win rates are not invented.
                  </Empty>
                  <a
                    className="btn secondary"
                    href="https://royaleapi.com/decks/popular"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Browse RoyaleAPI ↗
                  </a>
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
              kicker="GROUNDED RULE-BASED COACH"
            >
              <Notice>
                This release uses a deterministic coach, not a connected
                language model. It explains the loaded data and editorial roles.
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
                    <span>Persistent database</span>
                    <Pill tone={status?.database ? "green" : "gold"}>
                      {status?.database ? "Configured" : "Unavailable"}
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
                <Panel title="Connect your real account">
                  <ol className="steps">
                    <li>
                      Create an official API key at{" "}
                      <a
                        href="https://developer.clashroyale.com/"
                        target="_blank"
                        rel="noreferrer"
                      >
                        developer.clashroyale.com
                      </a>
                      .
                    </li>
                    <li>
                      Configure <code>CLASH_API_TOKEN</code> as a server secret.
                    </li>
                    <li>
                      For serverless hosting, the{" "}
                      <a
                        href="https://docs.royaleapi.com/proxy"
                        target="_blank"
                        rel="noreferrer"
                      >
                        documented RoyaleAPI proxy
                      </a>{" "}
                      is an option. It receives the API key and requests; follow
                      its IP-allowlist instructions.
                    </li>
                    <li>
                      Set <code>CLASH_API_BASE</code> to the chosen supported
                      endpoint, redeploy, then connect your tag.
                    </li>
                  </ol>
                  <p className="micro">
                    Never enter your Supercell password or API token in the
                    player-tag field.
                  </p>
                </Panel>
              </div>
              <Panel title="Standalone hosting access">
                <p>
                  Sites uses your signed-in identity. On a standalone Next.js
                  deployment, configure APP_ACCESS_KEY on the server and enter
                  the matching key here. It stays in memory.
                </p>
                <label>
                  Application access key
                  <input
                    type="password"
                    value={access}
                    autoComplete="off"
                    onChange={(e) => setAccess(e.target.value)}
                  />
                </label>
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
                  Export includes loaded data only: up to 200 snapshots, 1,000
                  battles and 100 tracked choices. Preferences stay on this
                  device.
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
                          await request(
                            "/api/history?tag=" + encodeURIComponent(s.tag),
                            { method: "DELETE" },
                          );
                          setHist(blank);
                          setConfirmDelete(false);
                          setToast("Stored history deleted.");
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
                  Implemented: player sync, catalog browsing, base-deck
                  generation, role analysis, matchup notes, battle history,
                  database snapshots and tracked choices, heuristic upgrade
                  priorities, manual resources, export and deletion.
                </p>
                <Notice>
                  Not implemented: full combat simulation, automatic
                  special-form/tower optimization, representative global meta,
                  calibrated matchup predictions, replay analysis, cost-aware
                  upgrades or background refresh scheduling.
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
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label={selected.name}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-btn"
              aria-label="Close card details"
              onClick={() => setSelected(null)}
            >
              <X />
            </button>
            <div className="modal-head">
              <img src={selected.image} alt={selected.name} />
              <div>
                <Pill>{selected.rarity.toUpperCase()}</Pill>
                <h2>{selected.name}</h2>
                <p>
                  Card #{selected.id} · Level {selected.level ?? "unknown"} ·{" "}
                  {selected.elixir ?? "?"} elixir
                </p>
                <div className="tags">
                  {selected.roles.map((r) => (
                    <Pill key={r}>{r}</Pill>
                  ))}
                </div>
              </div>
            </div>
            <div className="two-col">
              <div className="fact">
                <span>Evolution owned</span>
                <strong>
                  {selected.evo == null
                    ? "Unknown"
                    : selected.evo
                      ? "Yes"
                      : "No"}
                </strong>
              </div>
              <div className="fact">
                <span>Hero owned</span>
                <strong>
                  {selected.hero == null
                    ? "Unknown"
                    : selected.hero
                      ? "Yes"
                      : "No"}
                </strong>
              </div>
            </div>
            <p>
              Active source form: {selected.active}. Boost state: not verified.
            </p>
            <h3>Verified reference specifications</h3>
            {verifiedStats.some((v) => v.cardId === selected.id) ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Form / statistic</th>
                      <th>Value</th>
                      <th>Level / patch</th>
                    </tr>
                  </thead>
                  <tbody>
                    {verifiedStats
                      .filter((v) => v.cardId === selected.id)
                      .map((v, i) => (
                        <tr key={i}>
                          <td>
                            <a
                              href={v.sourceUrl}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {v.form} · {v.statistic} ↗
                            </a>
                          </td>
                          <td>
                            {v.value} {v.unit}
                          </td>
                          <td>
                            {v.level ?? "All"} · {v.patch}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <Notice>
                HP, damage, DPS, range and ability costs are not verified for
                this card in the reference dataset.
              </Notice>
            )}
            <h3>Compare an alternative</h3>
            <select
              aria-label="Comparison card"
              value={comparison}
              onChange={(e) => setComparison(Number(e.target.value))}
            >
              <option value="0">Choose a card…</option>
              {s.catalog
                .filter((c) => c.id !== selected.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
            {comparison > 0 && s.catalog.find((c) => c.id === comparison) && (
              <p>
                {s.catalog.find((c) => c.id === comparison)!.name}:{" "}
                {s.catalog.find((c) => c.id === comparison)!.elixir ?? "?"}{" "}
                elixir · level{" "}
                {s.catalog.find((c) => c.id === comparison)!.level ?? "?"} ·{" "}
                {s.catalog.find((c) => c.id === comparison)!.roles.join(", ")}.
                Combat winner is not established.
              </p>
            )}
            <details>
              <summary>Simple combat calculator</summary>
              <p>
                Manual example inputs, not this card’s stats. Fixed
                single-target hits only; no shields, spawn, projectile or other
                mechanics.
              </p>
              <div className="form-grid">
                {(["hp", "damage", "interval", "delay"] as const).map((k) => (
                  <label key={k}>
                    {k}
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={calc[k]}
                      onChange={(e) =>
                        setCalc({ ...calc, [k]: Number(e.target.value) })
                      }
                    />
                  </label>
                ))}
              </div>
              <Notice>
                {(() => {
                  const r = combat(
                    calc.hp,
                    calc.damage,
                    calc.interval,
                    calc.delay,
                  );
                  return r
                    ? `${r.hits} hits · ${r.dps.toFixed(2)} DPS · ${r.time.toFixed(2)} seconds including first-hit delay`
                    : "Enter positive HP, damage and interval, and a nonnegative delay.";
                })()}
              </Notice>
            </details>
            <p className="micro">
              {s.mode === "demo"
                ? "Historical sample; synthetic ownership."
                : "Official API snapshot."}{" "}
              Roles are editorial. Reference values retain their original patch
              and level.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
