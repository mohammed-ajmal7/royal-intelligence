"use client";

import type { LabProgress, LiveMeta } from "../lib/liveMeta";
import type { LiveCandidate } from "../lib/liveDeckLab";

export function LiveMetaPanel({meta,progress,busy,error,failed,cancel,retry}:{
  meta:LiveMeta|null;progress:LabProgress|null;busy:boolean;error:string;
  failed:{rank:number;tag?:string;name:string;reason:string}[];
  cancel:()=>void;retry:()=>void;
}) {
  const steps=["Fetch current global top 100","Read 100 Ranked battle decks","Count cards, forms and roles","Adapt decks to your collection"];
  return <section className="live-meta" aria-label="Live top 100 deck analysis" aria-busy={busy}>
    <ol className="live-meta-steps">
      {steps.map((label,i)=><li key={label} data-active={busy&&progress?.stage===i+1}
        data-done={!!meta || !!progress&&progress.stage>i+1}>
        <span>{i+1}</span><strong>{label}</strong>
      </li>)}
    </ol>
    <p role="status" aria-live="polite">{busy?progress?.message??"Starting fresh requests…":
      meta?"Complete: 100 ranked accounts · 100 decks · 800 card slots.":
      "Each click starts a new scan. Unavailable data stops the recommendation; no saved top-100 result is reused."}</p>
    {busy&&<><progress max={progress?.total??100} value={progress?.completed??0}/>
      <button type="button" className="btn secondary" onClick={cancel}>Cancel scan</button></>}
    {error&&<div className="live-meta-incomplete" role="alert">
      <strong>Strict scan incomplete — no recommendation was generated.</strong>
      <p>{error}</p>
      <p className="micro">The current deck shown below is your existing selection,
        not a result from the incomplete scan. An unavailable Ranked battle cannot
        be replaced with a profile deck or a player outside the current top 100.</p>
      {!busy&&<button type="button" className="btn" onClick={retry}>
        Retry a completely fresh top-100 scan
      </button>}
    </div>}
    {failed.length>0&&<details className="live-meta-failed" open>
      <summary>Missing Ranked battle evidence ({failed.length})</summary>
      <ul>{failed.map(p=><li key={p.rank}>
        <strong>Rank #{p.rank} — {p.name?.trim()||p.tag||"Unnamed account"}</strong>
        {p.tag&&<span> {p.tag}</span>}
        <p>{p.reason||"No verifiable Ranked 1v1 battle available in sampled logs."}</p>
      </li>)}</ul>
    </details>}
    {meta&&<>
      <p className="micro">Collected {new Date(meta.startedAt).toLocaleString()} – {new Date(meta.completedAt).toLocaleTimeString()}.
        {" "}This is the completed scan, not a continuously updating leaderboard. Click again to fetch a new one.</p>
      <details open><summary>Card usage — number of accounts out of 100</summary>
        <div className="live-meta-scroll"><table><thead><tr><th>Card</th><th>Accounts</th><th>Played forms</th></tr></thead>
          <tbody>{meta.usage.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.count}/100 ({c.count}%)</td>
            <td>{Object.entries(c.forms).map(([form,n])=>`${form}: ${n}`).join(" · ")}</td></tr>)}</tbody></table></div>
      </details>
      <details><summary>Role coverage and most-used cards</summary>
        <p className="micro">Roles overlap. Deck coverage counts a role once per account; card slots count every card carrying that role.
          {" "}Role definitions are editorial (version {meta.roleVersion}), not official API labels.</p>
        <div className="live-meta-scroll"><table><thead><tr><th>Role</th><th>Decks</th><th>Card slots</th><th>Cards and counts</th></tr></thead>
          <tbody>{meta.roleUsage.map(r=><tr key={r.role}><td>{r.role}</td><td>{r.decks}/100</td><td>{r.slots}</td>
            <td>{r.cards.map(c=>`${c.name} (${c.count})`).join(" · ")}</td></tr>)}</tbody></table></div>
      </details>
      <details><summary>Inspect all 100 accounts and their eight cards</summary>
        <div className="live-meta-scroll"><table><thead><tr><th>Rank / account</th><th>Latest available Ranked battle</th><th>Eight cards</th><th>Tower</th></tr></thead>
          <tbody>{meta.players.map(p=><tr key={p.tag}>
            <td>#{p.rank} <a href={`https://royaleapi.com/player/${encodeURIComponent(p.tag.slice(1))}/battles`} target="_blank" rel="noreferrer">{p.name}</a><small>{p.tag}</small></td>
            <td>{new Date(p.battleTime).toLocaleString()}
              <small>Fetched {new Date(p.fetchedAt).toLocaleTimeString()}</small>
              <small>{p.evidenceOrigin==="other-top100-log"
                ? "Confirmed as opponent in top-100 rank #"+p.evidenceSourceRank+" Ranked battle"
                : "From this player's Ranked battle log"}</small>
            </td>
            <td>{p.cards.map(c=>`${c.name}${c.active!=="base"?` [${c.active}]`:""}`).join(" · ")}</td>
            <td>{p.towerNames.join(" · ")||"Not provided"}</td>
          </tr>)}</tbody></table></div>
      </details>
      <details><summary>Source and freshness limits</summary>
        <p className="micro">Official API through {new URL(meta.source).host}. No application response cache. Scan ID: {meta.id}.</p>
        <ul>{meta.warnings.map(w=><li key={w}>{w}</li>)}</ul>
      </details>
    </>}
  </section>;
}

export function LiveCandidateEvidence({candidate}:{candidate:LiveCandidate}) {
  const e=candidate.evidence;
  return <details className="live-meta-evidence"><summary>Why these eight? Live evidence and substitutions</summary>
    <p>Adapted from #{e.sourceRank} {e.sourceName} ({e.sourceTag}); retains {e.sharedCards}/8 base cards.
      {" "}This exact base-card combination appeared in {e.exactBaseDeckAccounts}/100 source decks.</p>
    <p className="micro">Source: {e.sourceCards.map(c=>`${c.name} [${c.active}]`).join(" · ")}</p>
    {e.substitutions.length>0?<ul>{e.substitutions.map(c=><li key={c.out}>{c.out} → {c.in}</li>)}</ul>:<p>All eight base cards retained.</p>}
    <p>{e.cardUsage.map(c=>`${c.name}: ${c.count}/100`).join(" · ")}</p>
    <ul>{e.components.map(c=><li key={c.name}>{c.name}: {c.score.toFixed(1)}/100, weight {c.weight}%.</li>)}</ul>
    {e.formDifferences.length>0&&<ul>{e.formDifferences.map(s=><li key={s}>{s}</li>)}</ul>}
    <p className="micro">Observed popularity is not a win rate. Adaptations are new hypotheses, not proven pro decks.
      Special-form abilities, tower synergy and exact battle interactions are not simulated.</p>
  </details>;
}
