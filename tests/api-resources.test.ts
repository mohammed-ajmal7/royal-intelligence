import test from "node:test";
import assert from "node:assert/strict";
import { API_RESOURCES, resourcePath } from "../src/lib/apiResources";
import { api, clearCache } from "../server/service";

const qs=(input:Record<string,string>)=>new URLSearchParams(input);
const env={CLASH_API_TOKEN:"PRIVATE-TEST-TOKEN",CLASH_API_BASE:"https://proxy.royaleapi.dev/v1"};
test("resource manifest covers the current documented GET surfaces",()=>{
  assert.equal(new Set(API_RESOURCES.map(x=>x.id)).size,API_RESOURCES.length);
  for(const id of ["player","battles","chests","clans","clan","members","race",
    "race-log","tournaments","tournament","global-tournaments","locations","location",
    "ranked","trophy","top-clans","top-wars","tournament-ranks","seasons","season",
    "season-trophy","season-ranked","leaderboards","leaderboard","cards","events"])
    assert.ok(API_RESOURCES.some(x=>x.id===id),"Missing "+id);
  assert.ok(!API_RESOURCES.some(x=>x.id==="verifytoken"||x.id==="challenges"||
    x.id==="currentwar"||x.id==="warlog"));
});
test("all paths are explicit allowlisted valid canonical v1 paths",()=>{
  const defaults={tag:"VUYRP9GQL",name:"Test clan",location:"global",season:"2026-10",leaderboard:"merge-tactics"};
  for(const resource of API_RESOURCES){
    const path=resourcePath(resource.id,qs(defaults));
    assert.match(path,/^\//);
    assert.ok(!path.includes("https:"));
    assert.ok(!path.includes(".."));
    assert.ok(!path.includes("PRIVATE"));
  }
  assert.equal(resourcePath("player",qs({tag:"#VUYRP9GQL"})),
    "/players/%23VUYRP9GQL");
  assert.match(resourcePath("ranked",qs({location:"global"})),
    /^\/locations\/global\/pathoflegend\/players/);
  assert.match(resourcePath("clans",qs({name:"Two words"})),/name=Two%20words/);
});
test("unknown resources, bad paths and unbounded pagination are rejected",()=>{
  for(const [id,params] of [
    ["../../secrets",{}],
    ["player",{tag:"../../../owner"}],
    ["location",{location:"../../../api"}],
    ["season",{season:"2026../"}],
    ["leaderboard",{leaderboard:"http://host"}],
    ["ranked",{location:"global",limit:"100000"}],
    ["ranked",{location:"global",after:"ok",before:"bad"}],
    ["ranked",{location:"global",after:"!?secret"}],
  ] as const)assert.throws(()=>resourcePath(id,qs(params)),Error);
});
test("read-only resource gateway relays current official records without leaking the server token",async()=>{
  clearCache();const requests:string[]=[];
  const fetcher:typeof fetch=async (input,init)=>{
    const url=String(input);requests.push(url);
    assert.equal(new Headers(init?.headers).get("Authorization"),"Bearer PRIVATE-TEST-TOKEN");
    return Response.json({items:[{name:"Alpha",tag:"#VUYRP9GQL",score:12}],
      paging:{cursors:{after:"eyJwb3MiOjEwfQ=="}}});
  };
  const req=new Request("https://test.example/api/resources?resource=ranked&location=global&limit=10");
  const r=await api(req,env,fetcher);
  assert.equal(r.status,200);
  const body=await r.json();
  assert.equal(body.resource,"ranked");
  assert.equal(body.data.items[0].name,"Alpha");
  assert.ok(requests[0].endsWith("/locations/global/pathoflegend/players?limit=10"));
  assert.ok(!JSON.stringify(body).includes(env.CLASH_API_TOKEN));
  assert.equal((await api(new Request("https://test.example/api/resources"),{},fetcher)).status,200);
});
test("invalid resource input never reaches upstream or bypasses token checks",async()=>{
  clearCache();let calls=0;
  const mock:typeof fetch=async()=>{calls++;return Response.json({});};
  const bad=await api(new Request("https://test.example/api/resources?resource=player&tag=bad%2Funsafe"),env,mock);
  assert.equal(bad.status,400);
  const unknown=await api(new Request("https://test.example/api/resources?resource=raw&tag=VUYRP9GQL"),env,mock);
  assert.equal(unknown.status,400);
  assert.equal(calls,0);
  const missing=await api(new Request("https://test.example/api/resources?resource=cards"),{},mock);
  assert.equal(missing.status,503);
});
