import test from 'node:test';import assert from 'node:assert/strict';import {tag,level,card,normalize,parseBattle} from '../src/lib/model';import {defaults,evaluate,generate,legal,stats,wilson,deckLink,importLink,combat,key} from '../src/lib/engine';import {demo} from '../src/lib/demo';
const s=demo(),raw={id:26000000,name:'Knight',level:13,maxLevel:16,elixirCost:3,evolutionLevel:3};
test('tag normalization and encoded input',()=>{for(const t of ['vuyrp9gql','#VUYRP9GQL',' %23VUYRP9GQL '])assert.equal(tag(t),'#VUYRP9GQL');});
test('invalid tags and route injection rejected',()=>{for(const t of ['','#ABC','../../cards','VUYRP9GQL?x=1'])assert.throws(()=>tag(t));});
test('rarity-relative levels and missing values',()=>{assert.equal(level(13,16),13);assert.equal(level(10,13),13);assert.equal(level(4,7),13);assert.equal(level(2,5),13);assert.equal(level(undefined,16),null);assert.equal(level(17,16),null);assert.equal(level(1.5,7),null);});
test('ownership and active forms remain separate',()=>{const c=card(raw,true);assert.equal(c.evo,true);assert.equal(c.hero,true);assert.equal(c.active,'unknown');assert.equal(card(raw,false).level,null);assert.equal(card({...raw,evolutionLevel:0},true,true).active,'base');assert.equal(card({...raw,evolutionLevel:8},true).evo,null);});
test('snapshot keeps tower troops separate and ignores deprecated progression',()=>{const t={...raw,id:159000000,name:'Tower Princess'};const x=normalize({tag:'#VUYRP9GQL',name:'Test',expLevel:60,cards:[raw],supportCards:[t],currentDeck:[{...raw,evolutionLevel:0}]},{items:[raw],supportItems:[t]},[],{});assert.equal(x.kingLevel,null);assert.equal(x.cards.length,1);assert.equal(x.towers.length,1);assert.equal(x.deck[0].hero,true);assert.equal(x.deck[0].active,'base');});
const p=(t:string,c:number)=>({tag:t,name:t,crowns:c,cards:[raw]});const b={battleTime:'20261115T120000.000Z',gameMode:{name:'2v2'},type:'2v2',team:[p('#VUYRP9GQL',3),p('#PYLQGR',3)],opponent:[p('#YQLGRJ',1),p('#GQLPRJ',1)]};
test('2v2 retains all participants and shared crowns',()=>{const x=parseBattle(b,'#VUYRP9GQL');assert.equal(x.team.length,2);assert.equal(x.opponent.length,2);assert.equal(x.outcome,'win');assert.equal(x.time,'2026-11-15T12:00:00Z');});
test('orientation is player-relative with stable identity',()=>{assert.equal(parseBattle(b,'#YQLGRJ').outcome,'loss');assert.equal(parseBattle(b,'#YQLGRJ').id,parseBattle({...b,team:[...b.team].reverse()},'#VUYRP9GQL').id);});
test('equal or inconsistent crowns remain unknown',()=>{assert.equal(parseBattle({...b,opponent:[p('#YQLGRJ',3)]},'#VUYRP9GQL').outcome,'unknown');assert.equal(parseBattle({...b,team:[p('#VUYRP9GQL',3),p('#PYLQGR',1)]},'#VUYRP9GQL').outcome,'unknown');});
test('normalization deduplicates battle observations',()=>{assert.equal(normalize({tag:'#VUYRP9GQL',name:'Test',cards:[raw]},{items:[raw]},[b,b],{}).battles.length,1);});
test('Wilson handles small samples and endpoints',()=>{assert.equal(wilson(0,0),null);assert.equal(wilson(0,10)?.low,0);assert.equal(wilson(10,10)?.high,1);assert.ok(Math.abs(wilson(5,10)!.low-.236593)<.00001);assert.throws(()=>wilson(11,10));});
test('unknown outcomes excluded from decisive denominator',()=>{const r=stats([s.battles[0],{...s.battles[0],outcome:'unknown'}]);assert.equal(r.ci?.total,1);assert.equal(r.unknown,1);});
test('elixir arithmetic and sustained air warning',()=>{const e=evaluate(s.deck);assert.equal(e.avg,2.875);assert.equal(e.cycle,7);assert.equal(e.air,1);assert.ok(e.warnings.some(x=>x.includes('anti-air')));assert.equal(evaluate(s.deck.map((c,i)=>i?c:{...c,elixir:null})).avg,null);});
test('deck legality rejects duplicates and unowned',()=>{assert.ok(legal(s.deck));assert.ok(!legal([...s.deck.slice(1),s.deck[1]]));assert.ok(!legal(s.deck.map((c,i)=>i?c:{...c,owned:false})));});
test('links roundtrip with exact card IDs',()=>{assert.equal(key(importLink(deckLink(s.deck),s.catalog)),key(s.deck));assert.throws(()=>importLink('https://evil.example/?deck=1;2;3;4;5;6;7;8',s.catalog));});
test('combat timing counts first hit once',()=>{assert.deepEqual(combat(1000,200,1.2,.5),{hits:5,dps:200/1.2,time:5.3});assert.equal(combat(100,200,1.2,.5)?.time,.5);assert.equal(combat(0,200,1,0),null);});
test('search respects ownership, exclusions, hard includes and cap',()=>{const inc=s.deck[2].id,exc=s.deck[1].id;const cs=generate(s.cards,{...defaults,include:[inc],exclude:[exc],maxElixir:4});assert.ok(cs.length);for(const c of cs){assert.ok(legal(c.cards));assert.ok(c.cards.some(x=>x.id===inc));assert.ok(!c.cards.some(x=>x.id===exc));assert.ok(c.evaluation.avg!<=4);}for(let i=0;i<cs.length;i++)for(let j=i+1;j<cs.length;j++)assert.ok(cs[i].cards.filter(c=>cs[j].cards.some(d=>d.id===c.id)).length<=6);});
test('impossible constraints produce no fabricated deck',()=>{assert.deepEqual(generate(s.cards,{...defaults,minLevel:99}),[]);assert.deepEqual(generate(s.cards,{...defaults,include:[1],exclude:[1]}),[]);});
test('teammate scoring applies only to complete 2v2 decks',()=>{assert.ok(evaluate(s.deck,{...defaults,mode:'2v2 balanced',teammate:s.deck}).features.some(f=>f.name==='Teammate complement'));assert.ok(!evaluate(s.deck,{...defaults,teammate:s.deck}).features.some(f=>f.name==='Teammate complement'));});

test('missing special form flag means ordinary base use while malformed flags stay unknown',()=>{
  const missing={...raw,evolutionLevel:undefined};
  const owned=card(missing,true);
  const equipped=card(missing,true,true);
  assert.equal(owned.evo,false);
  assert.equal(owned.hero,false);
  assert.equal(equipped.active,'base');
  assert.equal(equipped.evo,null);
  assert.equal(card({...missing,evolutionLevel:8},true).hero,null);
});
test('observed battle trophy changes and arena are source-backed',()=>{
  const v={...b,arena:{name:'Test arena'},team:[
    {...p('#VUYRP9GQL',3),trophyChange:25},p('#PYLQGR',3)]};
  const battle=parseBattle(v,'#VUYRP9GQL');
  assert.equal(battle.trophyChange,25);
  assert.equal(battle.arena,'Test arena');
  assert.equal(battle.battleType,'2v2');
  assert.equal(parseBattle(v,'#YQLGRJ').trophyChange,null);
});
