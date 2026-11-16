import type { MechanicsCard } from "../lib/mechanics";
import { groupAtLevel, type RankedItem } from "../lib/deckItem";

const fmt = (n: number | null, digits = 0) =>
  n === null ? "—" : n.toLocaleString(undefined,{maximumFractionDigits:digits});
const targetLabel = (air:boolean|null, ground:boolean|null) =>
  air === null && ground === null ? "Not recorded" :
  air && ground ? "Air & Ground" :
  air ? "Air" : ground ? "Ground" : "No direct targets";

export function GroupUnitDetails({
  item, source, incomingDamage, playerCap,
}: {
  item: RankedItem;
  source: MechanicsCard | undefined;
  incomingDamage: number;
  playerCap: number;
}) {
  const members = source?.groupUnits ?? [];
  if(members.length===0)return null;
  const countKnown = members.every(member => member.count !== null);
  const totalCount = countKnown
    ? members.reduce((sum,member)=>sum+(member.count ?? 0),0)
    : null;
  const composition = members.map(m =>
    (m.count === null ? "?":m.count)+" × "+m.name).join(" + ");
  const sumHp = item.groupUnits.length===members.length &&
    item.groupUnits.every(member=>member.hp!==null && member.count!==null)
      ? item.groupUnits.reduce((sum,member)=>sum+(member.hp ?? 0)*(member.count ?? 0),0)
      : null;
  const length = Math.min(30,Math.max(1,playerCap,
    ...members.map(member => Math.max(
      member.hpByLevel?.length ?? 0,
      member.damageByLevel?.length ?? 0,
      member.dpsByLevel?.length ?? 0,
      member.shieldHpByLevel?.length ?? 0,
    ))));
  return (
    <section className="group-stat-section" aria-label={item.card.name+" group member details"}>
      <div className="group-stat-heading">
        <div>
          <div className="group-stat-kicker">GROUP / SQUAD DETAILS</div>
          <h4>Each troop has its own HP</h4>
          <p>{composition} {totalCount!==null?"· "+totalCount+" separate units":""}</p>
        </div>
        {sumHp!==null &&
          <div className="group-sum-disclosure">
            <small>SUM OF SEPARATE UNIT HP</small>
            <strong>{fmt(sumHp)}</strong>
            <span>Not a shared health bar</span>
          </div>}
      </div>
      <p className="group-stat-alert">
        An attack does not deal damage to one combined group HP pool.
        Every member is independently targetable. The leaderboard compares
        the strongest <strong>single member</strong> for the selected metric.
        Splash, shields, simultaneous attacks and ongoing abilities can
        change real battle results.
      </p>
      <div className="group-member-grid">
        {item.groupUnits.map((unit,i)=>(
          <article className="group-member-card" key={unit.name+"-"+i}>
            <div className="group-member-card-title">
              <strong>{unit.name}</strong>
              <span>×{unit.count ?? "?"}</span>
            </div>
            <div className="group-member-metrics">
              <div><small>HP PER UNIT</small><strong>{fmt(unit.hp)}</strong></div>
              <div><small>DAMAGE / HIT</small><strong>{fmt(unit.damage)}</strong></div>
              <div><small>DPS PER UNIT</small><strong>{fmt(unit.dps,1)}</strong></div>
              <div><small>HITS TO DEFEAT ONE</small><strong>{fmt(unit.hitsToDefeat)}</strong></div>
              <div><small>FULL HITS SURVIVED</small><strong>{fmt(unit.hitsSurvived)}</strong></div>
              <div><small>SHIELD HP / UNIT</small><strong>{fmt(unit.shieldHp)}</strong></div>
            </div>
            <div className="group-member-footer">
              <span>Hit speed: {unit.hitSpeedSeconds===null?"—":fmt(unit.hitSpeedSeconds,2)+"s"}</span>
              <span>Targets: {targetLabel(unit.targetsAir,unit.targetsGround)}</span>
              <span>Range: {unit.rangeTiles===null
                ? unit.rangeLabel ?? "—"
                : fmt(unit.rangeTiles,2)+" tiles"}</span>
            </div>
          </article>
        ))}
      </div>
      <h4 className="group-stat-level-title">Level-by-level — each unit type</h4>
      {members.map((member,index)=>{
        const availableRows=Array.from({length},(_,i)=>i+1)
          .filter(level=>{
            const unit=groupAtLevel([member],level,incomingDamage)[0];
            return unit.hp!==null || unit.damage!==null ||
              unit.shieldHp!==null;
          }).length;
        return (
          <details className="group-member-levels" key={member.name} open={index===0}>
            <summary>
              {member.name} · ×{member.count ?? "?"}
              <small>{availableRows} levels with sourced figures</small>
            </summary>
            <div className="deck-item-level-scroll" tabIndex={0}
              role="region" aria-label={member.name+" all level combat statistics"}>
              <table className="deck-item-level-table">
                <thead><tr>
                  <th>Level</th><th>HP / unit</th>
                  <th>Damage / hit</th><th>DPS / unit</th>
                  <th>Shield / unit</th>
                  <th>Hits to defeat</th><th>Hits survived</th>
                </tr></thead>
                <tbody>
                  {Array.from({length},(_,i)=>i+1).map(level=>{
                    const unit=groupAtLevel([member],level,incomingDamage)[0];
                    return (
                      <tr key={level}
                        className={level===item.level?"deck-item-current-level":""}>
                        <td>Lv {level}{level===item.level?" · Selected":""}</td>
                        <td>{fmt(unit.hp)}</td>
                        <td>{fmt(unit.damage)}</td>
                        <td>{fmt(unit.dps,1)}</td>
                        <td>{fmt(unit.shieldHp)}</td>
                        <td>{fmt(unit.hitsToDefeat)}</td>
                        <td>{fmt(unit.hitsSurvived)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
        );
      })}
      <p className="group-stat-source">
        {source?.sourceUrl
          ? <a href={source.sourceUrl} target="_blank" rel="noreferrer">
              Published reference for this squad
            </a>
          : "Community-reference stats"}
        {" · "}Values are per member at the chosen reference/player level;
        only explicit sourced level entries are displayed. Evolution,
        shields, summons and other effects are not silently added to
        the base group totals.
      </p>
    </section>
  );
}
