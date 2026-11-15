import type { Card } from "./model";
import {
  type MechanicsCatalog,
  resolveMechanics,
} from "./mechanics";

const clamp100 = (n: number) =>
  Math.max(0,Math.min(100,n));
const weighted = (items: {score:number; weight:number}[]) =>
  items.length ? items.reduce((sum,x)=>sum+x.score*x.weight,0) /
    items.reduce((sum,x)=>sum+x.weight,0) : null;
type Diagnostic = {
  label: string;
  available: boolean;
  value: number | boolean | null;
  unit: string;
};
export type CardPower = {
  id: number;
  name: string;
  score: number | null;
  confidence: number;
  hp: number | null;
  damage: number | null;
  dps: number | null;
  hitSpeed: number | null;
  speedRaw: number | null;
  range: number | null;
  targets: string;
  splash: number | null;
  unitCount: number | null;
  deployTime: number | null;
  firstHit: number | null;
  signals: Diagnostic[];
};
/**
 * Bounded per-elixir mechanics ratings are transparent editorial heuristics:
 * they reflect *observed properties*, NOT measured matchup effectiveness.
 * Do not infer missing HP/damage/attack rate from levels or other cards.
 */
export function mechanicsOf(
  card: Card,
  source: MechanicsCatalog | null | undefined,
): CardPower {
  const m = resolveMechanics(card,source);
  const base: CardPower = {
    id:card.id,name:card.name,score:null,confidence:0,
    hp:m?.hitpoints ?? null,damage:m?.damage ?? null,
    dps:m?.dps ?? null,hitSpeed:m?.hitSpeedSeconds ?? null,
    speedRaw:m?.moveSpeedRaw ?? null,range:m?.rangeTiles ?? null,
    targets:!m || (m.targetsAir === null && m.targetsGround === null)
      ? "Unknown" : m.buildingsOnly ? "Buildings"
      : m.targetsAir && m.targetsGround ? "Ground & air"
      : m.targetsAir ? "Air" : m.targetsGround ? "Ground" : "None",
    splash:m?.splashRadiusTiles ?? null,unitCount:m?.unitCount ?? null,
    deployTime:m?.deploySeconds ?? null,firstHit:m?.firstHitSeconds ?? null,
    signals:[],
  };
  if (!m) return base;
  const elixir = card.elixir && card.elixir > 0 ? card.elixir : null;
  const items: {score:number;weight:number}[] = [];
  const diagnostics: Diagnostic[] = [];
  let possible=0,known=0;
  function add(label:string,value:number|boolean|null,unit:string,weight:number,scale:(value:number|boolean)=>number) {
    possible+=weight;
    const available = value !== null && elixir !== null;
    diagnostics.push({label,value,unit,available});
    if (available) {
      known+=weight;
      items.push({score:clamp100(scale(value!)),weight});
    }
  }
  // The same elixir efficiency denominator is used for each comparable unit.
  // Units, ranges and speeds are different dimensions; cap before combining.
  add("Hitpoints",m.hitpoints,"HP",23,v=>
    Number(v)/(elixir ?? 1)/600*100);
  add("Damage per second",m.dps,"DPS",29,v=>
    Number(v)/(elixir ?? 1)/80*100);
  add("Damage per hit",m.damage,"damage",11,v=>
    Number(v)/(elixir ?? 1)/200*100);
  add("Attack interval",m.hitSpeedSeconds,"seconds",6,v=>
    100-Math.max(0,Number(v)-0.7)*35);
  add("Attack range",m.rangeTiles,"tiles",8,v=>
    Number(v)/6.5*100);
  add("Movement speed (raw)",m.moveSpeedRaw,"game data units",4,v=>
    Number(v)/120*100);
  add("Can target air",m.targetsAir,"boolean",9,v=>v?100:0);
  add("Can target ground",m.targetsGround,"boolean",5,v=>v?100:0);
  add("Area damage radius",m.splashRadiusTiles,"tiles",3,v=>
    Number(v)/3*100);
  add("Unit count",m.unitCount,"units",2,v=>
    Math.min(Number(v),6)/6*100);
  const value = weighted(items);
  base.signals=diagnostics;
  base.score=value === null ? null : Math.round(value*10)/10;
  base.confidence=possible===0?0:Math.round(known/possible*1000)/1000;
  return base;
}
export type DeckMechanicsScore = {
  score: number | null;
  coverage: number;
  contributing: number;
  cardScores: CardPower[];
  source: string | null;
  lastDownloaded: string | null;
  missing: string[];
};
/**
 * Mechanics matter most when the data actually exists.
 * A high stat value is not a validated counter; player decisions and
 * variable mechanics cannot be simulated from these static records alone.
 */
export function scoreDeckMechanics(
  deck:Card[],
  source:MechanicsCatalog | null | undefined,
): DeckMechanicsScore {
  const cardScores=deck.map(c=>mechanicsOf(c,source));
  const known=cardScores.filter(x=>x.score!==null);
  const coverage=deck.length
    ? cardScores.reduce((sum,c)=>sum+c.confidence,0)/deck.length
    : 0;
  const sorted=known.map(c=>c.score!).sort((a,b)=>b-a);
  const average=sorted.length
    ? sorted.reduce((sum,x)=>sum+x,0)/sorted.length : null;
  const strongest=sorted.slice(0,Math.min(4,sorted.length));
  const focused=strongest.length
    ? strongest.reduce((sum,x)=>sum+x,0)/strongest.length : null;
  // Incorporates both best defensive/attack options and whole-deck strength.
  const score=average===null||focused===null ? null :
    Math.round(clamp100(average*0.65+focused*0.35)*10)/10;
  return {
    score,coverage:Math.round(coverage*1000)/1000,
    contributing:known.length,cardScores,
    source:source?.source ?? null,
    lastDownloaded:source?.fetchedAt ?? null,
    missing:cardScores.filter(x=>x.confidence<0.35).map(x=>x.name),
  };
}
