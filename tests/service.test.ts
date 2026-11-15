import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync} from 'node:fs';import {api,upstream,load,clearCache,DB,Statement} from '../server/service';import {demo} from '../src/lib/demo';
class Store implements DB{raw=new DatabaseSync(':memory:');constructor(){this.raw.exec(readFileSync(new URL('../drizzle/0000_many_famine.sql',import.meta.url),'utf8'));}prepare(sql:string):Statement{let args:unknown[]=[];const db=this.raw;const s:Statement={bind(...v){args=v;return s;},async run(){return db.prepare(sql).run(...args as never[]);},async all<T>(){return{results:db.prepare(sql).all(...args as never[]) as T[]};},async first<T>(){return(db.prepare(sql).get(...args as never[])??null) as T|null;}};return s;}async batch(ss:Statement[]){this.raw.exec('BEGIN');try{const r=[];for(const s of ss)r.push(await s.run());this.raw.exec('COMMIT');return r;}catch(e){this.raw.exec('ROLLBACK');throw e;}}}
const req=(path:string,owner='a',init:RequestInit={})=>new Request('https://test.example'+path,{...init,headers:{'oai-authenticated-user-id':owner,...init.headers}});
test('status reveals no secrets',async()=>{const r=await api(req('/api/status'),{CLASH_API_TOKEN:'SECRET'});assert.deepEqual(await r.json(),{live:true,database:false,version:'0.1.0'});});
test('identity required for account endpoints',async()=>{assert.equal((await api(new Request('https://test.example/api/history?tag=VUYRP9GQL'),{})).status,401);});
test('standalone key grants matching access',async()=>{assert.equal((await api(new Request('https://test.example/api/history?tag=VUYRP9GQL',{headers:{'x-app-access-key':'test'}}),{APP_ACCESS_KEY:'test'})).status,200);});
test('cross-origin mutation rejected',async()=>{assert.equal((await api(req('/api/history?tag=VUYRP9GQL','a',{method:'DELETE',headers:{origin:'https://evil.example'}}),{})).status,403);});
test('missing token is never replaced by a demo',async()=>{const r=await api(req('/api/player?tag=VUYRP9GQL'),{});assert.equal(r.status,503);assert.equal((await r.json()).mode,undefined);});
test('bearer destination allowlist',async()=>{await assert.rejects(()=>upstream('/cards',{CLASH_API_TOKEN:'test',CLASH_API_BASE:'https://evil.example'}),/Unsupported/);});
test('upstream caching',async()=>{clearCache();let n=0;const fetcher:typeof fetch=async()=>{n++;return Response.json({items:[]});};await upstream('/cards',{CLASH_API_TOKEN:'test'},fetcher);await upstream('/cards',{CLASH_API_TOKEN:'test'},fetcher);assert.equal(n,1);});
test('rate limited upstream retries',async()=>{clearCache();let n=0;await upstream('/retry',{CLASH_API_TOKEN:'test'},async()=>++n===1?new Response('',{status:429}):Response.json({}));assert.equal(n,2);});
test('partial API failure preserves player with warning',async()=>{clearCache();const c={id:26000000,name:'Knight',level:13,maxLevel:16};const f:typeof fetch=async input=>String(input).endsWith('/cards')?Response.json({items:[c]}):String(input).endsWith('/battlelog')||String(input).endsWith('/upcomingchests')?new Response('',{status:404}):Response.json({tag:'#VUYRP9GQL',name:'Test',cards:[c]});const s=await load('VUYRP9GQL',{CLASH_API_TOKEN:'test'},f);assert.equal(s.name,'Test');assert.equal(s.battles.length,0);assert.ok(s.warnings.some(w=>w.includes('Battle refresh')));});
test('actual migration, deduplication, owner isolation, tracking and deletion',async()=>{const db=new Store(),s={...demo(),tag:'#VUYRP9GQL',mode:'live'};for(const o of ['a','b'])for(let i=0;i<2;i++)await db.prepare('INSERT OR IGNORE INTO ri_snapshots VALUES(?,?,?,?,?)').bind(o,s.tag,s.fetchedAt,s.fetchedAt,JSON.stringify(s)).run();assert.equal((await(await api(req('/api/history?tag=VUYRP9GQL'),{DB:db})).json()).snapshots.length,1);const r=await api(req('/api/choices','a',{method:'POST',body:JSON.stringify({tag:s.tag,cards:s.deck.map(c=>c.id),mode:'Best overall'})}),{DB:db});assert.equal(r.status,201);assert.equal((await(await api(req('/api/history?tag=VUYRP9GQL'),{DB:db})).json()).choices.length,1);await api(req('/api/history?tag=VUYRP9GQL','a',{method:'DELETE'}),{DB:db});assert.equal((await(await api(req('/api/history?tag=VUYRP9GQL'),{DB:db})).json()).snapshots.length,0);assert.equal((await(await api(req('/api/history?tag=VUYRP9GQL','b'),{DB:db})).json()).snapshots.length,1);db.raw.close();});
test('stale fallback preserves timestamp',async()=>{const db=new Store(),s={...demo(),tag:'#VUYRP9GQL',mode:'live'};await db.prepare('INSERT INTO ri_snapshots VALUES(?,?,?,?,?)').bind('a',s.tag,s.fetchedAt,s.fetchedAt,JSON.stringify(s)).run();const r=await(await api(req('/api/player?tag=VUYRP9GQL'),{DB:db})).json();assert.equal(r.stale,true);assert.equal(r.fetchedAt,s.fetchedAt);db.raw.close();});
test('D1 atomic limit stops request twenty-one',async()=>{const db=new Store();for(let i=0;i<20;i++)assert.equal((await api(req('/api/player?tag=VUYRP9GQL'),{DB:db})).status,503);assert.equal((await api(req('/api/player?tag=VUYRP9GQL'),{DB:db})).status,429);db.raw.close();});


test('anonymous visitors can fetch any public player tag without reading saved history',async()=>{
  clearCache();
  const c={id:26000000,name:'Knight',level:13,maxLevel:16};
  const fake:typeof fetch=async input=>{
    const u=String(input);
    if(u.endsWith('/cards'))return Response.json({items:[c]});
    if(u.endsWith('/battlelog'))return Response.json([]);
    if(u.endsWith('/upcomingchests'))return Response.json({items:[{name:'Gold Crate',index:0}]});
    if(u.includes('/players/'))return Response.json({tag:'#VUYRP9GQL',name:'Live Player',trophies:1123,wins:15,losses:10,cards:[c],currentDeck:[c]});
    return new Response('',{status:404});
  };
  const r=await api(new Request('https://test.example/api/player?tag=%23VUYRP9GQL'),{CLASH_API_TOKEN:'test'},fake);
  assert.equal(r.status,200);
  const player=await r.json();
  assert.equal(player.name,'Live Player');
  assert.equal(player.mode,'live');
  assert.equal(player.raw.wins,15);
  assert.equal(player.stored,undefined);
  assert.equal((await api(new Request('https://test.example/api/history?tag=VUYRP9GQL'),{})).status,401);
  assert.equal((await api(new Request('https://test.example/api/choices',{method:'POST'}),{})).status,401);
});
test('anonymous lookups do not fall back to another owner saved snapshots',async()=>{
  clearCache();
  const db=new Store(),s={...demo(),tag:'#VUYRP9GQL',mode:'live'};
  await db.prepare('INSERT INTO ri_snapshots VALUES(?,?,?,?,?)').bind('a',s.tag,s.fetchedAt,s.fetchedAt,JSON.stringify(s)).run();
  const r=await api(new Request('https://test.example/api/player?tag=VUYRP9GQL'),{DB:db});
  assert.equal(r.status,503);
  assert.equal((await r.json()).stale,undefined);
  db.raw.close();
});
