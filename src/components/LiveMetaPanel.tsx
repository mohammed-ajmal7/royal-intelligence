"use client";

import type { GlobalRankedLimit, LabProgress, LiveMeta } from "../lib/liveMeta";
import type { LiveCandidate } from "../lib/liveDeckLab";

export function LiveMetaPanel({meta,progress,busy,error,failed,cancel,retry,target}:{
  meta:LiveMeta|null;progress:LabProgress|null;busy:boolean;error:string;
  failed:{rank:number;tag?:string;name:string;reason:string}[];
  cancel:()=>void;retry:()=>void;target:GlobalRankedLimit;
}) {
  const size=meta?.requestedCount ?? target;
  const skippedCount=meta?.unavailable.length ?? failed.length;
  const steps=["Fetch current global top "+size,
    "Read up to "+size+" Ranked battle decks","Count observed cards, forms and roles",
    "Adapt suitable decks to your collection"];
  return <section className="live-meta" aria-label={"Live top "+size+" deck analysis"} aria-busy={busy}>
    <ol className="live-meta-steps">
      {steps.map((label,i)=><li key={label} data-active={busy&&progress?.stage===i+1}
        data-done={!!meta || !!progress&&progress.stage>i+1}>
        <span>{i+1}</span><strong>{label}</strong>
      </li>)}
    </ol>
    <p role="status" aria-live="polite">{busy?progress?.message??"Starting fresh requests…":
      meta?"Analysis finished: "+meta.sampleSize+"/"+meta.requestedCount+
        " verified Ranked decks · "+(meta.sampleSize*8)+" observed card slots.":
      "Each click starts a fresh scan. Available verified decks are analyzed; missing accounts are disclosed rather than fabricated."}</p>
    {busy&&<><progress max={progress?.total??100} value={progress?.completed??0}/>
      <button type="button" className="btn secondary" onClick={cancel}>Cancel scan</button></>}
    {error&&<div className="live-meta-incomplete" role="alert">
      <strong>Could not generate an eligible deck from the available scan.</strong>
      <p>{error}</p>
      <p className="micro">If the current deck is displayed below, it is your existing selection,
        not a recommendation. No missing deck has been invented or substituted.</p>
      {!busy&&<button type="button" className="btn" onClick={retry}>
        Retry a completely fresh top-{target} scan
      </button>}
    </div>}
    {meta&&(meta.sampleSize<meta.requestedCount)&&<div className="live-meta-partial" role="status">
      <strong>Analyzed {meta.sampleSize} of {meta.requestedCount} selected global players</strong>
      {skippedCount>0&&<p>
        Skipped {skippedCount} {skippedCount===1?"player":"players"} with no
        verifiable recent Ranked 1v1 deck. These players contribute nothing
        to card usage, roles, pair counts, ranking scores or recommendations.
      </p>}
      <p>All recommendations use only the {meta.sampleSize} valid observed decks.
        Every card and role percentage uses {meta.sampleSize} as its denominator,
        never {meta.requestedCount}.</p>
      {meta.leaderboardCount<meta.requestedCount&&<p>
        The leaderboard supplied only {meta.leaderboardCount} of
        {" "}{meta.requestedCount} requested accounts; unretrieved ranks are not assumed to have decks.
      </p>}
      {meta.leaderboardWarning&&<p>{meta.leaderboardWarning}</p>}
    </div>}
    {!meta&&failed.length>0&&<p className="micro" role="status">
      Skipped {failed.length} unavailable Ranked
      {failed.length===1?" account":" accounts"}; no eligible verified
      sample was returned. No replacement decks were invented.
    </p>}
    {meta&&<>
      <p className="micro">Collected {new Date(meta.startedAt).toLocaleString()} – {new Date(meta.completedAt).toLocaleTimeString()}.
        {" "}This is the completed scan, not a continuously updating leaderboard. Click again to fetch a new one.</p>
      <details open><summary>Card usage — {meta.sampleSize} observed accounts</summary>
        <div className="live-meta-scroll"><table><thead><tr><th>Card</th><th>Accounts</th><th>Played forms</th></tr></thead>
          <tbody>{meta.usage.map(c=><tr key={c.id}><td>{c.name}</td><td>{c.count}/{meta.sampleSize} ({(c.count/meta.sampleSize*100).toFixed(1)}%)</td>
            <td>{Object.entries(c.forms).map(([form,n])=>`${form}: ${n}`).join(" · ")}</td></tr>)}</tbody></table></div>
      </details>
      <details><summary>Role coverage and most-used cards</summary>
        <p className="micro">Roles overlap. Deck coverage counts a role once per account; card slots count every card carrying that role.
          {" "}Role definitions are editorial (version {meta.roleVersion}), not official API labels.</p>
        <div className="live-meta-scroll"><table><thead><tr><th>Role</th><th>Decks</th><th>Card slots</th><th>Cards and counts</th></tr></thead>
          <tbody>{meta.roleUsage.map(r=><tr key={r.role}><td>{r.role}</td><td>{r.decks}/{meta.sampleSize}</td><td>{r.slots}</td>
            <td>{r.cards.map(c=>`${c.name} (${c.count})`).join(" · ")}</td></tr>)}</tbody></table></div>
      </details>
      <details><summary>Inspect all {meta.sampleSize} observed accounts and their eight cards</summary>
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
        <p className="micro">Official API through {new URL(meta.source).host}.
          Requested top {meta.requestedCount}; leaderboard returned {meta.leaderboardCount};
          verified battle sample {meta.sampleSize}. No application response cache.
          Scan ID: {meta.id}.</p>
        <ul>{meta.warnings.map(w=><li key={w}>{w}</li>)}</ul>
      </details>
    </>}
  </section>;
}

export function LiveCandidateEvidence({candidate}:{candidate:LiveCandidate}) {
  const e=candidate.evidence;
  return <details className="live-meta-evidence"><summary>Why these eight? Live evidence and substitutions</summary>
    <p>{e.adaptationMethod==="observed-usage-fallback"
      ? "Built from observed global card usage and your eligible collection; closest observed source:"
      : "Adapted from observed Ranked deck:"}
      {" "}#{e.sourceRank} {e.sourceName} ({e.sourceTag}); retains {e.sharedCards}/8 base cards.
      {" "}This exact base-card combination appeared in {e.exactBaseDeckAccounts}/{e.observedCount} verified source decks
      (from a requested global top {e.requestedCount}).</p>
    <p className="micro">Observed source: {e.sourceCards.map(c=>
      c.name+" [Lv "+(c.level??"unknown")+", "+(c.elixir??"?")+
      " elixir, "+c.active+"]").join(" · ")}</p>
    <div className="live-meta-replacement-heading">
      <strong>Actual owned levels and replacement rules</strong>
      <p>Level benchmark: <b>Lv {e.ownedLevelBenchmark}</b> (upper-quartile of
        eligible owned cards). Lowest recommended card: <b>Lv {e.lowestOwnedLevel}</b>.
        Direct slot replacements must preserve the required attack/defense
        functions and cost at most <b>+{e.maxSlotElixirIncrease} elixir</b>
        compared with the observed source card. Overall average elixir
        remains limited by your selected filter.</p>
    </div>
    {e.adaptationMethod==="observed-usage-fallback"&&
      <p className="live-meta-replacement-caution">
        Built from observed global card usage and your collection because
        direct eight-slot adaptation was not eligible. This is not a verified
        one-to-one match of the pro player's deck; owned-level and average
        elixir constraints still apply.
      </p>}
    {e.substitutions.length>0?
      <div className="live-meta-replacement-grid">
        {e.substitutions.map((c,i)=><article key={c.out+":"+c.in+":"+i}
          className="live-meta-replacement">
          <div className="live-meta-replacement-pair">
            <strong>{c.out} <span>→</span> {c.in}</strong>
            <small>Functional fit {c.score?.toFixed(1)??"—"}/100 · heuristic</small>
          </div>
          <div className="live-meta-replacement-facts">
            <span>Global player: <b>Lv {c.sourceLevel??"unknown"}</b></span>
            <span>Your card: <b>Lv {c.ownedLevel??"unknown"}</b></span>
            <span>Elixir: <b>{c.sourceElixir??"?"} → {c.ownedElixir??"?"}</b></span>
          </div>
          <p>{c.reason}</p>
          {c.preserved.length>0&&<p><b>Preserved:</b> {c.preserved.join(", ")}</p>}
          {c.gained.length>0&&<p><b>Additional benefits:</b> {c.gained.join("; ")}</p>}
          {c.limitations.length>0&&<p className="micro">
            <b>Data gaps:</b> {c.limitations.join("; ")}</p>}
        </article>)}
      </div>
    :e.adaptationMethod==="source-deck"?
      <p>All eight original base-card identities are retained at your actual
        owned levels. Their strengths are not assumed equal to those of the
        global player's higher-level or special-form cards.</p>:null}
    <p>{e.cardUsage.map(c=>`${c.name}: ${c.count}/${e.observedCount}`).join(" · ")}</p>
    <ul>{e.components.map(c=><li key={c.name}>{c.name}: {c.score.toFixed(1)}/100, weight {c.weight}%.</li>)}</ul>
    {e.formDifferences.length>0&&<ul>{e.formDifferences.map(s=><li key={s}>{s}</li>)}</ul>}
    <p className="micro">Observed popularity is not a win rate. Adaptations are new hypotheses, not proven pro decks.
      Special-form abilities, tower synergy and exact battle interactions are not simulated.</p>
  </details>;
}
