import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { filterCollection } from "../src/lib/collectionFilter";
import { normalize } from "../src/lib/model";
import type { Card } from "../src/lib/model";

function item(name:string, owned:boolean, level:number|null, props:Partial<Card>={}):Card {
  return {id:name.length*100+name.charCodeAt(0),name,owned,evo:null,hero:null,level,
    rarity:"rare",elixir:3,image:undefined,active:"base",tower:false,roles:[],...props};
}
const cards:Card[]=[
  item("Archers",true,10,{hasEvolution:true,evo:false}),
  item("Knight",true,11,{hasHero:true,hero:false}),
  item("Wizard",true,8),
  item("Valkyrie",false,null,{hasEvolution:true}),
  item("Mini P.E.K.K.A",false,null,{hasHero:true}),
  item("Cannon",false,null),
  item("Goblin",true,8,{evo:true}),
  item("Bowler",false,null,{hero:true}),
  item("Tower Princess",true,11,{tower:true,hasEvolution:true}),
];

const filter=(ownership:"Owned"|"Locked"|"All",type:""|"Evolutions"|"Heroes"="",query="",formStatus:"All"|"Unlocked"|"Locked"="All")=>
  filterCollection(cards,{ownership,type,query,formStatus}).map(c=>c.name);

test("Owned is the default group and an empty type filter shows all owned cards",()=>{
  assert.deepEqual(filter("Owned"),["Knight","Archers","Goblin","Wizard"]);
});
test("Locked includes only unowned cards while All includes both",()=>{
  assert.deepEqual(filter("Locked"),["Bowler","Cannon","Mini P.E.K.K.A","Valkyrie"]);
  assert.equal(filter("All").length,8);
  assert.ok(filter("All").includes("Cannon"));
  assert.ok(filter("All").includes("Archers"));
});
test("All plus Evolutions includes every known evolution-capable owned and unowned card",()=>{
  assert.deepEqual(filter("All","Evolutions"),["Archers","Goblin","Valkyrie"]);
  assert.deepEqual(filter("Owned","Evolutions"),["Archers","Goblin"]);
  assert.deepEqual(filter("Owned","Evolutions","", "Locked"),["Archers"]);
  assert.deepEqual(filter("Owned","Evolutions","", "Unlocked"),["Goblin"]);
  assert.deepEqual(filter("Locked","Evolutions"),["Valkyrie"]);
});
test("All plus Heroes includes every known hero-capable owned and unowned card",()=>{
  assert.deepEqual(filter("All","Heroes"),["Knight","Bowler","Mini P.E.K.K.A"]);
  assert.deepEqual(filter("Owned","Heroes"),["Knight"]);
  assert.deepEqual(filter("Locked","Heroes"),["Bowler","Mini P.E.K.K.A"]);
  assert.deepEqual(filter("Owned","Heroes","", "Locked"),["Knight"]);
  assert.deepEqual(filter("Owned","Heroes","", "Unlocked"),[]);
});
test("capability is not mistaken for an unlocked evolution or hero",()=>{
  assert.equal(cards.find(c=>c.name==="Archers")?.evo,false);
  assert.equal(cards.find(c=>c.name==="Archers")?.hasEvolution,true);
  assert.equal(cards.find(c=>c.name==="Knight")?.hero,false);
  assert.equal(cards.find(c=>c.name==="Knight")?.hasHero,true);
  assert.ok(filter("Owned","Evolutions").includes("Archers"));
  assert.ok(filter("Owned","Heroes").includes("Knight"));
});
test("unknown form metadata is not guessed; search combines with both filters",()=>{
  assert.deepEqual(filter("All","Evolutions","can"),[]);
  assert.deepEqual(filter("All","Evolutions"," arC "),["Archers"]);
  assert.deepEqual(filter("All","Heroes","mini"),["Mini P.E.K.K.A"]);
  assert.ok(!filter("All","Evolutions").includes("Wizard"));
  assert.ok(!filter("All").includes("Tower Princess"));
  assert.equal(cards[0].name,"Archers");
});
test("owned profiles inherit eligible form metadata from the global catalog",()=>{
  const catalog=[
    {id:1,name:"Archers",maxLevel:16,maxEvolutionLevel:1,
      iconUrls:{medium:"https://example.com/archer.png",evolutionMedium:"https://example.com/evo.png"}},
    {id:2,name:"Knight",maxLevel:16,maxEvolutionLevel:2,
      iconUrls:{medium:"https://example.com/knight.png",heroMedium:"https://example.com/hero.png"}},
    {id:3,name:"Valkyrie",maxLevel:16,maxEvolutionLevel:1,
      iconUrls:{medium:"https://example.com/valkyrie.png",evolutionMedium:"https://example.com/valk-evo.png"}},
  ];
  const player={tag:"#VUYRP9GQL",name:"Test",cards:[
    {id:1,name:"Archers",level:10,maxLevel:16,iconUrls:{medium:"https://example.com/owned-archer.png"}},
    {id:2,name:"Knight",level:10,maxLevel:16,iconUrls:{medium:"https://example.com/owned-knight.png"}},
  ]};
  const result=normalize(player,{items:catalog},[],{});
  const archers=result.catalog.find(c=>c.name==="Archers");
  assert.equal(archers?.hasEvolution,true);
  assert.equal(archers?.evo,false);
  assert.equal(archers?.evolutionImage,"https://example.com/evo.png");
  assert.equal(result.catalog.find(c=>c.name==="Knight")?.hasHero,true);
  assert.equal(result.catalog.find(c=>c.name==="Valkyrie")?.hasEvolution,true);
  assert.deepEqual(filterCollection(result.catalog,{ownership:"All",type:"Evolutions",query:""}).map(c=>c.name),["Archers","Valkyrie"]);
  assert.deepEqual(filterCollection(result.catalog,{ownership:"All",type:"Heroes",query:""}).map(c=>c.name),["Knight"]);
});
test("Cards toolbar uses contextual ownership filters and Evolution/Hero empty states",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/globals.css",import.meta.url),"utf8");
  const cardCss=readFileSync(new URL("../src/components/collection-card-details.css",import.meta.url),"utf8");
  const overviewCss=readFileSync(new URL("../src/app/overview-dashboard.css",import.meta.url),"utf8");
  assert.match(page,/useState<CardOwnership>\("Owned"\)/);
  assert.match(page,/useState<FormStatusFilter>\("All"\)/);
  assert.match(page,/useState<CardTypeFilter>\(""\)/);
  assert.match(page,/role="group" aria-label="Collection filter"/);
  assert.match(page,/aria-pressed=\{cardsOwnership===ownership\}/);
  assert.match(page,/\["All","Owned","Locked"\] as const/);
  assert.match(page,/aria-label="Card type"/);
  assert.match(page,/label:"Evolution"/);
  assert.match(page,/label:"Hero"/);
  assert.match(page,/import \{ CardFormIcon \} from "\.\.\/components\/CardFormIcon"/);
  assert.match(page,/form=\{option\.value==="Evolutions"\?"evolution":"hero"\}/);
  assert.match(page,/className="ri-card-type-icon"/);
  assert.match(overviewCss,/\.ri-card-type-toggle button/);
  assert.match(overviewCss,/\.ri-card-type-icon/);
  assert.match(page,/cardsFilter&&cardsOwnership==="Owned"/);
  assert.match(page,/\["All","Unlocked","Locked"\] as const/);
  const cardsSection=page.slice(page.indexOf('{tab==="Cards"'),page.indexOf('{tab==="Decks"'));
  assert.doesNotMatch(cardsSection,/<select/);
  assert.doesNotMatch(cardsSection,/All card types/);
  assert.match(page,/filterCollection\(collection/);
  assert.match(page,/function SpecialFormEmptyState/);
  assert.match(page,/type: "Heroes" \| "Evolutions"/);
  assert.match(page,/status: FormStatusFilter/);
  assert.match(page,/status==="Unlocked"/);
  assert.match(page,/status==="Locked"/);
  assert.match(page,/You haven’t unlocked any /);
  assert.match(page,/No locked /);
  assert.match(page,/type={cardsFilter} status={cardsFormStatus}/);
  assert.match(page,/cardsFilter==="Heroes"\|\|cardsFilter==="Evolutions"/);
  assert.match(page,/Browse all \{label\} cards/);
  assert.match(page,/onShowAll=\{\(\)=>\{setCardsOwnership\("Owned"\);setCardsFormStatus\("All"\);setSelectedCard\(null\);\}\}/);
  assert.match(page,/No cards match these filters/);
  assert.match(page,/<svg viewBox="0 0 180 150"/);
  assert.match(page,/F2EDFC|F2/);
  assert.match(cardCss,/\.ri-cards-toolbar/);
  assert.match(cardCss,/\.ri-special-empty-art/);
  assert.match(cardCss,/\.ri-special-empty-action/);
  assert.match(css,/@media\(max-width:760px\)/);
});


test("form-specific artwork is sufficient evidence for Evolution/Hero collection eligibility",()=>{
  const artOnly:Card[]=[
    item("Evo art only",true,10,{evolutionImage:"https://example.com/evolution.png"}),
    item("Hero art only",true,10,{heroImage:"https://example.com/hero.png"}),
    item("Base only",true,10,{image:"https://example.com/base.png"}),
  ];
  assert.deepEqual(filterCollection(artOnly,{ownership:"All",type:"Evolutions",query:""}).map(c=>c.name),["Evo art only"]);
  assert.deepEqual(filterCollection(artOnly,{ownership:"All",type:"Heroes",query:""}).map(c=>c.name),["Hero art only"]);
});


test("card art shows top-right Evolution and Hero badges with unlocked and locked states",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/globals.css",import.meta.url),"utf8");
  const badgeLib=readFileSync(new URL("../src/lib/cardFormBadges.ts",import.meta.url),"utf8");
  const heroCoin=readFileSync(new URL("../public/game-icons/card-forms/hero-coin.svg",import.meta.url),"utf8");

  assert.match(page,/import \{ getCardFormBadges \} from "\.\.\/lib\/cardFormBadges"/);
  assert.match(page,/function CardFormBadges\(\{card\}:\{card:Card\}\)/);
  assert.match(page,/className=\{"ri-card-form-badge is-"\+form\+" "\+\(unlocked\?"is-unlocked":"is-locked"\)\}/);
  assert.match(page,/CardFormIcon form="evolution"/);
  assert.match(page,/src="\/game-icons\/card-forms\/hero-coin\.svg"/);
  assert.match(page,/<CardFormBadges card=\{card\}\/?>/);
  assert.match(page,/ElixirIcon cost=\{card\.elixir\} size=\{28\}/);
  assert.match(css,/\.ri-card-form-badges\{[\s\S]*position:absolute;[\s\S]*top:3px;[\s\S]*right:3px/);
  assert.match(css,/\.ri-card-form-badge\.is-locked\{[\s\S]*filter:grayscale\(1\)/);
  assert.match(css,/\.ri-card-form-badge\.is-unlocked/);
  assert.match(badgeLib,/card\.hasEvolution === true \|\| card\.evo === true \|\| Boolean\(card\.evolutionImage\)/);
  assert.match(badgeLib,/card\.hasHero === true \|\| card\.hero === true \|\| Boolean\(card\.heroImage\)/);
  assert.match(heroCoin,/<title>Hero coin<\/title>/);
  assert.match(heroCoin,/linearGradient id="heroCoinFace"/);
});
