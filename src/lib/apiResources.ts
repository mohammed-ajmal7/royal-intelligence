/**
 * A small, allowlisted explorer for public Supercell Clash Royale API GET
 * resources. This file is safe to import on the client: NO token or base URL.
 * /verifytoken needs privileged player consent/scope and is intentionally absent.
 * Removed war endpoints, deprecated challenges, and broken seasonsV2 are absent.
 */
export type ResourceParam = "tag" | "name" | "location" | "season" | "leaderboard";
export type ResourceDefinition = {
  id: string;
  group: "Player"|"Clan"|"Tournament"|"Rankings"|"Game";
  title: string;
  description: string;
  needs: readonly ResourceParam[];
  list: boolean;
};
export const API_RESOURCES: readonly ResourceDefinition[] = [
  {id:"player",group:"Player",title:"Player profile",description:"Public player stats, cards, leagues, progression and active deck",needs:["tag"],list:false},
  {id:"battles",group:"Player",title:"Recent battles",description:"Battle summaries and played decks; no replay timeline",needs:["tag"],list:false},
  {id:"chests",group:"Player",title:"Upcoming chests",description:"Published chest sequence",needs:["tag"],list:false},
  {id:"clans",group:"Clan",title:"Search clans",description:"Search clans by name",needs:["name"],list:true},
  {id:"clan",group:"Clan",title:"Clan profile",description:"Clan stats and status",needs:["tag"],list:false},
  {id:"members",group:"Clan",title:"Clan members",description:"Roster and member trophies",needs:["tag"],list:true},
  {id:"race",group:"Clan",title:"Current river race",description:"Current Clan War race standings",needs:["tag"],list:false},
  {id:"race-log",group:"Clan",title:"River race history",description:"Recent river race results",needs:["tag"],list:true},
  {id:"tournaments",group:"Tournament",title:"Search tournaments",description:"Player-created tournaments by name",needs:["name"],list:true},
  {id:"tournament",group:"Tournament",title:"Tournament details",description:"Public tournament details by tag",needs:["tag"],list:false},
  {id:"global-tournaments",group:"Tournament",title:"Global tournaments",description:"Supercell-run global tournaments",needs:[],list:false},
  {id:"locations",group:"Rankings",title:"Locations",description:"Regions and their location IDs",needs:[],list:true},
  {id:"location",group:"Rankings",title:"Location details",description:"One location's details",needs:["location"],list:false},
  {id:"ranked",group:"Rankings",title:"Ranked players",description:"Current Path of Legend / Ranked leaderboard",needs:["location"],list:true},
  {id:"trophy",group:"Rankings",title:"Trophy Road players",description:"Trophy Road leaderboard",needs:["location"],list:true},
  {id:"top-clans",group:"Rankings",title:"Top clans",description:"Regional clan trophy rankings",needs:["location"],list:true},
  {id:"top-wars",group:"Rankings",title:"Top war clans",description:"Regional clan war rankings",needs:["location"],list:true},
  {id:"tournament-ranks",group:"Rankings",title:"Global tournament ranks",description:"Results for a tournament tag",needs:["tag"],list:true},
  {id:"seasons",group:"Rankings",title:"Seasons",description:"Available historical league seasons",needs:[],list:true},
  {id:"season",group:"Rankings",title:"Season details",description:"One league season",needs:["season"],list:false},
  {id:"season-trophy",group:"Rankings",title:"Season trophy leaderboard",description:"Historical season trophy ranks (some seasons return 404)",needs:["season"],list:true},
  {id:"season-ranked",group:"Rankings",title:"Season Ranked leaderboard",description:"Historical Path of Legend season standings",needs:["season"],list:true},
  {id:"leaderboards",group:"Game",title:"Game-mode leaderboards",description:"List published game-mode leaderboards",needs:[],list:true},
  {id:"leaderboard",group:"Game",title:"Leaderboard detail",description:"A leaderboard's player entries",needs:["leaderboard"],list:true},
  {id:"cards",group:"Game",title:"Card catalog",description:"Every card, base stats, costs, art and supported forms",needs:[],list:false},
  {id:"events",group:"Game",title:"Live events",description:"Published in-game events (may be empty)",needs:[],list:false},
];

const validTag = (input:string):string => {
  const value=input.trim().toUpperCase().replace(/^#/,"");
  if(!/^[0289PYLQGRJCUV]{3,15}$/.test(value))
    throw new Error("Enter a valid player, clan or tournament tag.");
  return encodeURIComponent("#"+value);
};
const validLocation=(s:string):string =>{
  if(!/^(global|[0-9]{3,12})$/.test(s))throw new Error("Location must be 'global' or a numeric location ID.");
  return s;
};
const validSeason=(s:string):string=>{
  if(!/^[0-9]{4}-[0-9]{2}$/.test(s))throw new Error("Season must use YYYY-MM, such as 2026-10.");
  return s;
};
const validLeaderboard=(s:string):string=>{
  if(!/^[A-Za-z0-9_-]{1,80}$/.test(s))throw new Error("Enter a valid leaderboard ID.");
  return s;
};
const validName=(s:string):string=>{
  const value=s.trim();
  if(value.length<1||value.length>80)throw new Error("Enter a search name (1–80 characters).");
  return value;
};
/** The caller can select a known resource, never an arbitrary upstream path. */
export function resourcePath(id:string, query:URLSearchParams):string {
  const entry=API_RESOURCES.find(x=>x.id===id);
  if(!entry)throw new Error("Unsupported API resource.");
  const get=(k:ResourceParam)=>query.get(k)??"";
  const tag=()=>validTag(get("tag"));
  const loc=()=>validLocation(get("location")||"global");
  const season=()=>validSeason(get("season"));
  const leaderboard=()=>validLeaderboard(get("leaderboard"));
  let path:string;
  switch(id){
    case "player":path="/players/"+tag();break;
    case "battles":path="/players/"+tag()+"/battlelog";break;
    case "chests":path="/players/"+tag()+"/upcomingchests";break;
    case "clans":path="/clans?name="+encodeURIComponent(validName(get("name")));break;
    case "clan":path="/clans/"+tag();break;
    case "members":path="/clans/"+tag()+"/members";break;
    case "race":path="/clans/"+tag()+"/currentriverrace";break;
    case "race-log":path="/clans/"+tag()+"/riverracelog";break;
    case "tournaments":path="/tournaments?name="+encodeURIComponent(validName(get("name")));break;
    case "tournament":path="/tournaments/"+tag();break;
    case "global-tournaments":path="/globaltournaments";break;
    case "locations":path="/locations";break;
    case "location":path="/locations/"+loc();break;
    case "ranked":path="/locations/"+loc()+"/pathoflegend/players";break;
    case "trophy":path="/locations/"+loc()+"/rankings/players";break;
    case "top-clans":path="/locations/"+loc()+"/rankings/clans";break;
    case "top-wars":path="/locations/"+loc()+"/rankings/clanwars";break;
    case "tournament-ranks":path="/locations/global/rankings/tournaments/"+tag();break;
    case "seasons":path="/locations/global/seasons";break;
    case "season":path="/locations/global/seasons/"+season();break;
    case "season-trophy":path="/locations/global/seasons/"+season()+"/rankings/players";break;
    case "season-ranked":path="/locations/global/pathoflegend/"+season()+"/rankings/players";break;
    case "leaderboards":path="/leaderboards";break;
    case "leaderboard":path="/leaderboard/"+leaderboard();break;
    case "cards":path="/cards";break;
    case "events":path="/events";break;
    default:throw new Error("Unsupported API resource.");
  }
  // Pagination is permitted only for published list endpoints. No unbounded
  // user-controlled query parameters get passed to the external API.
  if(entry.list) {
    const limit=Number(query.get("limit")??"25");
    if(!Number.isInteger(limit)||limit<1||limit>100)
      throw new Error("Page size must be between 1 and 100.");
    const params=new URLSearchParams({limit:String(limit)});
    const after=query.get("after"),before=query.get("before");
    if(after&&before)throw new Error("Use either after or before, not both.");
    const cursor=after||before;
    if(cursor) {
      if(!/^[A-Za-z0-9_+\-=/]{1,200}$/.test(cursor))
        throw new Error("Invalid pagination cursor.");
      params.set(after?"after":"before",cursor);
    }
    path+=(path.includes("?")?"&":"?")+params.toString();
  }
  return path;
}
