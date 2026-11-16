import type { MechanicsCard, MechanicsGroupUnit } from "./mechanics";

/**
 * Published BASE-deployment unit counts. Do not include death spawns,
 * periodic building spawns, Evolution bonuses, or temporary abilities.
 * The historical community registry is a fallback for individual statistics.
 */
export const knownGroupRoster: Record<string, { name: string; count: number }[]> = {
  skeletonarmy: [{name:"Skeleton",count:15}],
  skeletons: [{name:"Skeleton",count:3}],
  bats: [{name:"Bat",count:5}],
  minions: [{name:"Minion",count:3}],
  minionhorde: [{name:"Minion",count:6}],
  goblins: [{name:"Goblin",count:4}],
  speargoblins: [{name:"Spear Goblin",count:3}],
  barbarians: [{name:"Barbarian",count:5}],
  elitebarbarians: [{name:"Elite Barbarian",count:2}],
  archers: [{name:"Archer",count:2}],
  royalrecruits: [{name:"Royal Recruit",count:6}],
  royalhogs: [{name:"Royal Hog",count:4}],
  guards: [{name:"Guard",count:3}],
  threemusketeers: [{name:"Musketeer",count:3}],
  skeletondragons: [{name:"Skeleton Dragon",count:2}],
  wallbreakers: [{name:"Wall Breaker",count:2}],
  zappies: [{name:"Zappy",count:3}],
  goblingang: [{name:"Goblin",count:3},{name:"Spear Goblin",count:3}],
  rascals: [{name:"Rascal Boy",count:1},{name:"Rascal Girl",count:2}],
  goblinbarrel: [{name:"Goblin",count:3}],
};

export const groupKey = (value: string) =>
  value.replace(/[^a-z0-9]/gi,"").toLowerCase();

export function rosterFor(name: string) {
  return knownGroupRoster[groupKey(name)] ?? null;
}
const leveled = (start: number, entries: readonly number[]) =>
  [...Array(start-1).fill(0),...entries];
const skeletonHP = leveled(6,[
  51,56,61,67,74,81,89,98,108,119,130,144,158,174,192,
]);
const skeletonDamage = [...skeletonHP];
const goblinHP = [
  79,86,95,105,115,126,139,152,167,184,202,221,244,267,293,323,355,391,430,474,
];
const goblinDamage = [
  49,53,59,65,71,78,86,94,103,114,125,137,151,166,182,200,220,242,267,294,
];
const spearHP = [
  52,57,62,69,75,83,91,100,110,121,133,146,160,176,193,212,234,257,283,312,
];
const spearDamage = [
  32,35,38,42,46,51,56,61,67,74,81,89,98,108,119,130,144,158,174,192,
];
const boyHP = [
  716,787,866,952,1045,1145,1260,1381,1517,1668,1832,2011,2212,2427,2663,2928,3222,3544,3902,4296,
];
const boyDamage = [
  85,93,102,113,124,136,149,164,180,198,217,238,262,288,316,347,382,420,463,510,
];
const girlHP = [
  102,112,123,135,148,163,179,196,216,237,261,286,315,345,379,417,459,504,555,612,
];
const girlDamage = [...goblinDamage];
const updated = "2026-11-09";
const skeletonSource = "https://crtool.app/en/units/skeleton-army/";
const gangSource = "https://crtool.app/en/units/goblin-gang/";
const rascalSource = "https://crtool.app/en/units/rascals/";
function member(
  name:string,count:number,hp:number[],damage:number[],
  hitSpeedSeconds:number,sourceUrl:string,rangeTiles:number|null,
  targetsAir:boolean,targetsGround:boolean,shieldHpByLevel?:number[]
):MechanicsGroupUnit {
  return {name,count,hpByLevel:hp,damageByLevel:damage,
    hitSpeedSeconds,sourceUrl,rangeTiles,targetsAir,targetsGround,
    ...(shieldHpByLevel ? {shieldHpByLevel}: {})};
}
const references: Record<string, Omit<MechanicsCard,"id">> = {
  skeletonarmy: {
    name:"Skeleton Army",kind:"Troop",
    hpByLevel:skeletonHP,damageByLevel:skeletonDamage,
    hitSpeedSeconds:1.1,rangeTiles:0.5,moveSpeedRaw:90,
    targetsAir:false,targetsGround:true,buildingsOnly:false,
    areaRadiusTiles:null,unitCount:15,deploySeconds:1,
    firstHitSeconds:0.5,specialAbility:true,
    provenance:"crtool-game-data",statSubject:"spawned-unit",
    statSubjectLabel:"Skeleton",sourceUrl:skeletonSource,
    sourceUpdatedAt:updated,moveSpeedLabel:"Fast",rangeLabel:"Melee: Short",
    groupUnits:[member("Skeleton",15,skeletonHP,skeletonDamage,1.1,
      skeletonSource,0.5,false,true)],
    description:"15 independent Skeletons, not one combined HP bar. Evolution Skeleton General is separate.",
    extraStatsByLevel:{"Skeleton HP":skeletonHP,"Skeleton damage per hit":skeletonDamage},
    extraFormsByLevel:{"Skeleton Army Evolution — Skeleton General":{
      "Hitpoints":skeletonHP,"Damage":skeletonDamage,
      "Shield Hitpoints":skeletonHP}},
    sourceRecords:{reference:{
      source:skeletonSource,updatedAt:updated,gameDataVersion:"16.635.1",
      levelRange:"6–20",baseCount:15,
      note:"Evolution has a separate Skeleton General (shielded); base group statistics exclude it."}},
  },
  goblingang: {
    name:"Goblin Gang",kind:"Troop",
    hpByLevel:goblinHP,damageByLevel:goblinDamage,
    hitSpeedSeconds:1.1,rangeTiles:0.5,moveSpeedRaw:120,
    targetsAir:false,targetsGround:true,buildingsOnly:false,
    areaRadiusTiles:null,unitCount:6,deploySeconds:1,
    firstHitSeconds:null,specialAbility:false,
    provenance:"crtool-game-data",statSubject:"spawned-unit",
    statSubjectLabel:"Goblin",sourceUrl:gangSource,
    sourceUpdatedAt:updated,moveSpeedLabel:"Very Fast",
    groupUnits:[
      member("Goblin",3,goblinHP,goblinDamage,1.1,gangSource,0.5,false,true),
      member("Spear Goblin",3,spearHP,spearDamage,1.6,gangSource,5,true,true),
    ],
    description:"Three melee Goblins plus three Spear Goblins; independently targetable and with different HP and attacks.",
    sourceRecords:{reference:{source:gangSource,
      updatedAt:updated,gameDataVersion:"16.635.1",group:"3 Goblins + 3 Spear Goblins"}},
  },
  rascals: {
    name:"Rascals",kind:"Troop",
    hpByLevel:boyHP,damageByLevel:boyDamage,
    hitSpeedSeconds:1.5,rangeTiles:0.5,moveSpeedRaw:60,
    targetsAir:false,targetsGround:true,buildingsOnly:false,
    areaRadiusTiles:null,unitCount:3,deploySeconds:1,
    firstHitSeconds:null,specialAbility:false,
    provenance:"crtool-game-data",statSubject:"spawned-unit",
    statSubjectLabel:"Rascal Boy",sourceUrl:rascalSource,
    sourceUpdatedAt:"2026-10-06",moveSpeedLabel:"Medium",
    groupUnits:[
      member("Rascal Boy",1,boyHP,boyDamage,1.5,rascalSource,0.5,false,true),
      member("Rascal Girl",2,girlHP,girlDamage,1,rascalSource,5,true,true),
    ],
    description:"One melee Rascal Boy and two ranged Rascal Girls. Each component has separate HP and damage.",
    sourceRecords:{reference:{source:rascalSource,updatedAt:"2026-10-06",
      gameDataVersion:"16.402.2",group:"1 Rascal Boy + 2 Rascal Girls"}},
  },
};

/** No invented IDs or inferred levels. Uses the official card's ID at lookup. */
export function sourcedGroupReference(card: {id:number;name?:string}):MechanicsCard|undefined {
  const value=references[groupKey(card.name??"")];
  return value?{...value,id:card.id}:undefined;
}

/**
 * For homogeneous multi-unit cards, the old or newer reference's per-unit
 * HP/damage apply to each member. Mixed groups never copy one member's stats
 * onto another; they require explicit sourced groupUnits.
 */
export function withGroupComposition(card:MechanicsCard):MechanicsCard {
  if(card.groupUnits?.length) return card;
  const roster=rosterFor(card.name);
  if(!roster || roster.length!==1) return card;
  const only=roster[0];
  return {...card,unitCount:only.count,
    statSubject:"spawned-unit",statSubjectLabel:only.name,
    groupUnits:[{name:only.name,count:only.count,
      hpByLevel:card.hpByLevel,damageByLevel:card.damageByLevel,
      dpsByLevel:card.dpsByLevel??null,
      hitSpeedSeconds:card.hitSpeedSeconds,
      targetsAir:card.targetsAir,targetsGround:card.targetsGround,
      rangeTiles:card.rangeTiles,rangeLabel:card.rangeLabel,
      moveSpeedLabel:card.moveSpeedLabel,sourceUrl:card.sourceUrl,
      shieldHpByLevel:card.extraStatsByLevel?.["Shield Hitpoints"]}],
  };
}
