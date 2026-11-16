import type { MechanicsCard, MechanicsGroupUnit, MechanicsKind } from "./mechanics";
import { rosterFor } from "./groupCardReferences";

export const REFERENCE_BASE = "https://crtool.app/en/units/";
const clean = (v:string) => v.toLowerCase().replace(/[^a-z0-9]/g,"");
export function referenceSlug(name:string):string|null {
  if (name.length>60 || !/^[a-zA-Z0-9 .'\-]+$/.test(name)) return null;
  const aliases:Record<string,string> = {
    pekka:"pekka",minipekka:"mini-pekka",xbow:"x-bow",
    thelog:"the-log",threemusketeers:"three-musketeers"
  };
  const slug=aliases[clean(name)] || name.toLowerCase().replace(/['.]/g,"")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
  return slug.length>=2 && slug.length<=50?slug:null;
}
const htmlText = (value:string) =>
  value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
    .replace(/<[^>]*>/g," ")
    .replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&")
    .replace(/&#(\d+);/g,(_,n:string)=>String.fromCharCode(Number(n)))
    .replace(/\s+/g," ").trim();
const valueOf = (value:string):number|null => {
  const val=value.replace(/,/g,"").trim();
  return /^\d+(?:\.\d+)?$/.test(val)?Number(val):null;
};
type DataTable={headers:string[];rows:{level:number;stats:(number|null)[]}[]};
function tableFrom(html:string):DataTable|null {
  const cells=(row:string) => [...row.matchAll(/<(?:td|th)\b[^>]*>([\s\S]*?)<\/(?:td|th)>/gi)]
    .map(x=>htmlText(x[1]));
  const lines=[...html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)]
    .map(x=>cells(x[1])).filter(x=>x.length>1);
  const heading=lines.findIndex(line=>line.some(x=>/(hitpoints|damage|shield|heal|crown tower)/i.test(x)) &&
    !/^level\s*\d+$/i.test(line[0]));
  if(heading<0)return null;
  const rows=lines.slice(heading+1).flatMap(line=>{
    const match=line[0].match(/^(?:level|lv\.?)\s*(\d{1,2})$/i);
    const level=match?Number(match[1]):0;
    return level>=1 && level<=30?[{level,stats:line.slice(1).map(valueOf)}]:[];
  });
  return rows.length>=2?{headers:lines[heading],rows}:null;
}
const readField=(body:string,key:string,pattern:string) =>
  body.match(new RegExp("(?:^|\\s)"+key+"\\s+("+pattern+")(?:\\s|$)","i"))?.[1]??null;
const seconds=(v:string|null):number|null => {
  const match=v?.match(/^([\d.]+)\s*sec$/i);
  return match?Number(match[1]):null;
};
export type CurrentReference={card:MechanicsCard;updatedAt:string|null;version:string|null;rows:number};
export function parseCurrentReference(
  html:string, card:{id:number;name:string}, sourceUrl:string
):CurrentReference|null {
  if(html.length>1_500_000)return null;
  const title=html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  if(!title||clean(htmlText(title[1]))!==clean(card.name))return null;
  const body=html.slice(title.index??0);
  const alt=[...body.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)]
    .find(x=>/\b(evolution|hero)\b/i.test(htmlText(x[1])));
  const base=alt?.index===undefined?body:body.slice(0,alt.index);
  const tables=[...base.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)]
    .map(x=>tableFrom(x[0])).filter((t):t is DataTable=>t!==null);
  const first=tables.find(t=>t.headers.some(x=>/(hitpoints|damage)/i.test(x)));
  if(!first)return null;
  const otherSections:Record<string,Record<string,number[]>>={};
  const headings=[...body.matchAll(/<h[234]\b[^>]*>([\s\S]*?)<\/h[234]>/gi)]
    .map(h=>({at:h.index??0,label:htmlText(h[1])}));
  for(const match of body.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)) {
    if((match.index??0)<base.length)continue;
    const other=tableFrom(match[0]);
    if(!other)continue;
    const section=headings.filter(h=>h.at<(match.index??0)).at(-1)?.label || "Other form";
    const group=(otherSections[section]??={});
    for(const row of other.rows)other.headers.slice(1).forEach((label,i)=>{
      if(label)(group[label]??=[])[row.level-1]=row.stats[i]??0;
    });
  }
  const fieldLabels=first.headers.slice(1);
  const series:Record<string,number[]>={};
  const seen=new Set<number>();
  for(const table of tables.filter(t=>t.headers.join("|")===first.headers.join("|"))) {
    for(const row of table.rows){
      seen.add(row.level);
      fieldLabels.forEach((key,i)=>{
        if(key)(series[key]??=[])[row.level-1]=row.stats[i]??0;
      });
    }
  }
  const length=Math.max(0,...seen);
  const padded=(a:number[]|undefined) => a?Array.from({length},(_,i)=>a[i]||0):null;
  const hpKey=fieldLabels.find(k=>/^(hitpoints|hit points|hp)$/i.test(k));
  const damageKey=fieldLabels.find(k=>/^(damage|area damage|ranged damage|melee damage|impact damage|damage: 1 target)$/i.test(k));
  const dpsKey=fieldLabels.find(k=>
    /^(damage\s*\/\s*sec|damage\s*\/\s*s|damage per second|dps)$/i.test(k));
  const hp=padded(hpKey?series[hpKey]:undefined);
  const damage=padded(damageKey?series[damageKey]:undefined);
  const dps=padded(dpsKey?series[dpsKey]:undefined);
  const firstTablePos=body.search(/<table\b/i);
  const summary=htmlText(body.slice(0,firstTablePos<0?body.length:firstTablePos));
  const hitSpeed=readField(summary,"Hit Speed","[\\d.]+\\s*sec");
  const target=readField(summary,"Targets","Air\\s*(?:&|and)\\s*Ground|Buildings|Ground|Air");
  const movement=readField(summary,"Speed","Very Fast|Very Slow|Fast|Medium|Slow");
  const range=readField(summary,"Range","Melee:\\s*(?:Short|Medium|Long)|[\\d.]+");
  const count=readField(summary,"Count","\\d+");
  const deploy=readField(summary,"Deploy Time","[\\d.]+\\s*sec");
  const type=summary.match(/\b(?:Common|Rare|Epic|Legendary|Champion)\s+(Troop|Building|Spell)\b/i);
  const kind:MechanicsKind=(type?.[1] as MechanicsKind)??"Other";
  const version=htmlText(html).match(/Game data:\s*([\d.]+)/i)?.[1]??null;
  const m=htmlText(html).match(/updated\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i);
  const date=m?Date.parse([m[1],m[2],m[3]].join(" ")):NaN;
  const updatedAt=Number.isFinite(date)?new Date(date).toISOString().slice(0,10):null;
  const lowered=target?.toLowerCase()??null;
  // Cards with separately named members (Goblin Gang, Rascals) publish
  // separate base-unit tables. Read each as an independent health pool.
  const roster=rosterFor(card.name);
  let groupUnits:MechanicsGroupUnit[]|undefined;
  if(roster && roster.length>1) {
    const sections=[...base.matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)]
      .map(h=>({at:h.index??0,name:htmlText(h[1])}));
    const unitTables=[...base.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi)];
    const members=roster.map(member=>{
      const match=unitTables.find(t=>{
        const section=sections.filter(h=>h.at<(t.index??0)).at(-1);
        return section && clean(section.name)===clean(member.name);
      });
      if(!match)return null;
      const table=tableFrom(match[0]);
      if(!table)return null;
      const heading=sections.filter(h=>h.at<(match.index??0)).at(-1);
      if(!heading)return null;
      const labels=table.headers.slice(1);
      const hpIndex=labels.findIndex(x=>/^(hitpoints|hit points|hp)$/i.test(x));
      const damageIndex=labels.findIndex(x=>
        /^(damage|ranged damage|area damage|melee damage)$/i.test(x));
      const shieldIndex=labels.findIndex(x=>/^shield hitpoints$/i.test(x));
      const dpsIndex=labels.findIndex(x=>
        /^(damage\/sec|damage\/s|damage per second|dps)$/i.test(x));
      const getSeries=(column:number):number[]|null=>{
        if(column<0)return null;
        const out:number[]=[];
        for(const row of table.rows)out[row.level-1]=row.stats[column]??0;
        return Array.from({length:Math.max(0,...table.rows.map(r=>r.level))},
          (_,i)=>out[i]||0);
      };
      const part=htmlText(base.slice(heading.at,match.index??0));
      const rate=seconds(readField(part,"Hit Speed","[\\d.]+\\s*sec"));
      const rangeText=readField(part,"Range","Melee:\\s*(?:Short|Medium|Long)|[\\d.]+");
      const targetText=readField(part,"Targets","Air\\s*(?:&|and)\\s*Ground|Buildings|Ground|Air");
      const unitTarget=targetText?.toLowerCase()??null;
      return {
        name:member.name,count:member.count,
        hpByLevel:getSeries(hpIndex),damageByLevel:getSeries(damageIndex),
        dpsByLevel:getSeries(dpsIndex),shieldHpByLevel:getSeries(shieldIndex),
        hitSpeedSeconds:rate,
        targetsAir:unitTarget?unitTarget.includes("air"):null,
        targetsGround:unitTarget?
          unitTarget.includes("ground")||unitTarget.includes("buildings"):null,
        rangeTiles:rangeText && /^\d+(?:\.\d+)?$/.test(rangeText)
          ? Number(rangeText):null,
        rangeLabel:rangeText??undefined,sourceUrl,
      } satisfies MechanicsGroupUnit;
    });
    if(members.every((x):x is MechanicsGroupUnit=>x!==null))
      groupUnits=members;
  }
  const record:MechanicsCard={
    id:card.id,name:card.name,kind,
    hpByLevel:hp?.some(v=>v>0)?hp:null,
    damageByLevel:damage?.some(v=>v>0)?damage:null,
    dpsByLevel:dps?.some(v=>v>0)?dps:null,
    hitSpeedSeconds:seconds(hitSpeed),
    rangeTiles:range&&/^\d+(?:\.\d+)?$/.test(range)?Number(range):null,
    moveSpeedRaw:null,targetsAir:lowered?lowered.includes("air"):null,
    targetsGround:lowered?lowered.includes("ground")||lowered.includes("buildings"):null,
    buildingsOnly:lowered?lowered.includes("buildings"):null,
    areaRadiusTiles:null,
    unitCount:groupUnits?.length
      ? groupUnits.reduce((sum,member)=>sum+(member.count??0),0)
      : count?Number(count):null,
    groupUnits,
    deploySeconds:seconds(deploy),firstHitSeconds:null,
    specialAbility:false,provenance:"crtool-game-data",
    statSubject:groupUnits?.length?"spawned-unit":"card",
    statSubjectLabel:groupUnits?.[0]?.name??card.name,
    sourceUrl,sourceUpdatedAt:updatedAt??undefined,
    moveSpeedLabel:movement??undefined,rangeLabel:range??undefined,
    extraStatsByLevel:Object.fromEntries(Object.entries(series).map(([key,a])=>[key,padded(a)??[]])),
    extraFormsByLevel:Object.fromEntries(Object.entries(otherSections)
      .map(([form,fields])=>[form,Object.fromEntries(
        Object.entries(fields).map(([key,a])=>[key,padded(a)??[]])
      )])),
    sourceRecords:{
      reference:{url:sourceUrl,version,updatedAt,knownLevelRows:seen.size},
      observed:{hitSpeed,target,movement,range,count,deploy},
      formNames:{names:Object.keys(otherSections)},
      levelFields:{columns:fieldLabels,valuesByLevel:Object.fromEntries(
        [...seen].sort((a,b)=>a-b).map(level=>[level,
          Object.fromEntries(Object.entries(series).map(([key,a])=>[key,a[level-1]||null]))
        ])
      )}
    }
  };
  if(!record.hpByLevel&&!record.damageByLevel&&!Object.keys(series).length)return null;
  return {card:record,updatedAt,version,rows:seen.size};
}
