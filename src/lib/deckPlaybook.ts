import type { Card } from "./model";
import { resolveMechanics, type MechanicsCatalog } from "./mechanics";
import type { StrategyFocus } from "./deckStrategy";

/**
 * Explainable match playbook for the ACTUAL eight cards being shown.
 * This is deterministic, role-and-card grounded coaching, not simulated
 * game play, an LLM reply, or a claim of proven matchup win rates.
 */
export type PlaybookSection = {
  heading: string;
  objective: string;
  steps: string[];
  warning: string;
};
export type PlaybookMatchup = {
  id: "air"|"tanks"|"swarms"|"ground";
  name: string;
  cards: string[];
  instructions: string[];
  risk: string;
};
export type PlaybookCard = {
  id: number;
  name: string;
  level: number | null;
  elixir: number | null;
  job: string;
  when: string;
  protectAgainst: string;
};
export type DeckPlaybook = {
  title: string;
  winConditions: string[];
  identity: string;
  averageElixir: number | null;
  opening: PlaybookSection;
  single: PlaybookSection;
  double: PlaybookSection;
  finishing: PlaybookSection;
  matchups: PlaybookMatchup[];
  cardJobs: PlaybookCard[];
  reminders: string[];
  limitations: string[];
};
const hasRole=(c:Card,r:string)=>c.roles.includes(r);
const named=(deck:Card[],name:string)=>deck.find(c=>c.name===name);
const names=(cards:Card[])=>cards.map(c=>c.name);
const natural=(cards:Card[])=>cards.length?names(cards).join(" or "):"no reliable card identified";
const heavy=new Set(["Golem","Lava Hound","Elixir Golem","Giant","Goblin Giant","Electro Giant","Minion Giant"]);
const cyclePressure=new Set(["Hog Rider","Royal Hogs","Ram Rider","Battle Ram","Wall Breakers"]);
const siege=new Set(["Mortar","X-Bow"]);
const bait=new Set(["Goblin Barrel","Goblin Drill","Graveyard","Skeleton Barrel"]);
const spellCards=new Set(["Arrows","Zap","The Log","Fireball","Poison","Lightning",
  "Rocket","Earthquake","Void","Giant Snowball","Barbarian Barrel",
  "Royal Delivery","Tornado","Rage","Freeze"]);
const smallSpellCards=new Set(["Arrows","Zap","The Log","Giant Snowball",
  "Barbarian Barrel","Royal Delivery"]);
const heavySpellCards=new Set(["Fireball","Poison","Lightning","Rocket","Earthquake","Void"]);
const passiveBuilding=new Set(["Elixir Collector","Goblin Hut","Barbarian Hut"]);
const cyclingUnits=new Set(["Ice Spirit","Electro Spirit","Fire Spirit","Heal Spirit",
  "Skeletons","Ice Golem","Goblins","Bats","Spear Goblins"]);
const specialist:Record<string,{when:string;protect:string}> = {
  "Royal Giant":{when:"After a successful defense or at a manageable elixir advantage; support his ranged tower damage rather than dropping every defender behind him.",protect:"Save a swarm-clearing answer for small defenders; avoid sending him unsupported into a ready building."},
  "Hog Rider":{when:"Use a low-commitment pressure window after the opponent spends their building or key counter.",protect:"Do not pair with all your defense before the opponent's counter cards are known."},
  "Goblin Barrel":{when:"Track the opponent's small spell. Apply pressure after they spend it, especially if your defense survives.",protect:"Vary placement only with purpose; avoid predictable barrels into a ready spell."},
  "Goblin Drill":{when:"Target the tower on favorable rotations while tracking the opponent's anti-drill defenders.",protect:"Don't spend your only swarm answer in advance without knowing their response."},
  "Graveyard":{when:"Use after a defensive stop with a surviving tank/attacker or when their area denial is out of cycle.",protect:"Avoid unsupported Graveyard into an unused counterspell."},
  "Miner":{when:"Use as controlled tower chip, to distract support troops, or to tank briefly for a surviving counterpush.",protect:"Vary placement; avoid spending him whenever you lack answers to the opponent's win condition."},
  "Golem":{when:"Prefer a known elixir advantage or double elixir before starting a large backline push.",protect:"Don't invest eight elixir at the back without enough resources for the opposite lane."},
  "Lava Hound":{when:"Build a flying push when the opponent's anti-air answers and opposite-lane pressure are known.",protect:"Keep an answer to the opponent's ground win condition; your air push can be raced."},
  "Balloon":{when:"Attack after their air-targeting building or key ranged defender has been forced out of cycle.",protect:"Don't commit into multiple ready anti-air counters without support."},
  "Mortar":{when:"Use offensive placement when defenders are available; switch to defensive pulling when pressured.",protect:"Avoid trading your only building away when the opponent has a win-condition push ready."},
  "X-Bow":{when:"Commit only when you can protect the lock and know their heavy tank/spell response.",protect:"Keep elixir for your own defense; don't force X-Bow into an obvious negative trade."},
  "Inferno Tower":{when:"Reserve for a major tank or other large win condition; center-placement pulls depend on current pathing.",protect:"Reset effects, distraction troops and heavy spells can defeat a single Inferno Tower answer."},
  "Inferno Dragon":{when:"Save its ramping damage for high-HP tanks with support to remove distractions.",protect:"Watch for reset effects, swarms and air-targeting defenders."},
  "Tesla":{when:"Use when a defensive building pull protects your tower against air or ground pressure.",protect:"Don't expose it for chip value if it is your primary defensive building."},
  "Cannon":{when:"Pull or delay ground-targeting win conditions and preserve other cards for air threats.",protect:"Cannon cannot attack air; never count it as a flying-tank answer."},
  "Bomber":{when:"Clear clustered ground defenders and support a counterpush at low cost.",protect:"Bomber cannot target flying enemies; reserve an actual air defender."},
  "Arrows":{when:"Clear a high-value low-HP swarm or air swarm, especially if it blocks your win condition.",protect:"Don't waste your only cheap spell before seeing the opponent's bait threat."},
  "Zap":{when:"Finish weak swarms or briefly reset/disrupt an important defender when that interaction is relevant.",protect:"A reset does not replace sustained tank or air defense."},
  "The Log":{when:"Clear ground swarms and reset ground pressure efficiently.",protect:"The Log cannot hit flying troops; retain a separate anti-air answer."},
  "Fireball":{when:"Take multi-unit or tower-plus-support value instead of spending it for no clear defensive return.",protect:"Preserve enough elixir to stop the next win-condition push."},
  "Poison":{when:"Deny a defended area or protect tower pressure when enemy support remains within its zone.",protect:"It deals damage over time; don't assume it prevents an immediate hit."},
  "Ice Spirit":{when:"Use for a cheap stall, a brief freeze or careful cycle when the next necessary counter is ready.",protect:"Do not treat its one-use freeze as a sustained anti-air solution."},
  "Electro Spirit":{when:"Use chain stun utility against clustered small units or to help a prepared defense.",protect:"It is one-use support, not a sustained tank killer or anti-air defender."},
  "Skeleton Army":{when:"Surround a ground threat only after checking the opponent's splash or small spell.",protect:"A ready splash answer can erase the entire group; it is not one shared HP bar."},
  "Guards":{when:"Use shielded defenders to intercept single-target ground pressure and preserve counterpush survivors.",protect:"Ground-only defense: support with a genuine air-targeting card."},
  "Archers":{when:"Split or space defensively and protect their sustained air/ground damage.",protect:"Avoid offering a spell favorable value by stacking them with support."},
  "Musketeer":{when:"Maintain ranged anti-air coverage behind a building or ground blocker.",protect:"Protect from enemy spells and fast units; don't use your only air defender in an irrelevant push."},
  "Baby Dragon":{when:"Splash through grouped support units, especially after a defender survives.",protect:"Avoid sending it alone into stronger air-targeting defenders."},
  "Wizard":{when:"Protect his wide splash attack behind a tank or building against ground and air groups.",protect:"Its elixir commitment is substantial; do not group multiple support units for spell value."},
  "Firecracker":{when:"Place with space to exploit long-range splash and air coverage.",protect:"Be mindful of potential King Tower activation and easy spell value."},
  "Rascals":{when:"Let the boy absorb damage while the girls supply ranged support.",protect:"Area damage and spells can remove the ranged girls quickly."},
};
export function buildDeckPlaybook(
  deck:Card[], mechanics?:MechanicsCatalog|null, focus:StrategyFocus="balanced",
):DeckPlaybook|null {
  if(deck.length!==8 || new Set(deck.map(c=>c.id)).size!==8)return null;
  const m=new Map(deck.map(c=>[c.id,resolveMechanics(c,mechanics)]));
  const canHitAir=(card:Card)=>m.get(card.id)?.targetsAir ??
    hasRole(card,"Air defense");
  const air=deck.filter(c=>canHitAir(c) && !hasRole(c,"Cycle") &&
    !smallSpellCards.has(c.name) && !heavySpellCards.has(c.name) &&
    !["Ice Spirit","Electro Spirit","Fire Spirit"].includes(c.name));
  const buildings=deck.filter(c=>hasRole(c,"Building") &&
    !passiveBuilding.has(c.name));
  const tank=deck.filter(c=>hasRole(c,"Tank killer"));
  const ground=deck.filter(c=>hasRole(c,"Ground defense"));
  const splash=deck.filter(c=>hasRole(c,"Swarm control") &&
    !spellCards.has(c.name));
  const small=deck.filter(c=>smallSpellCards.has(c.name));
  const large=deck.filter(c=>heavySpellCards.has(c.name));
  const win=deck.filter(c=>hasRole(c,"Win condition"));
  const main=win[0]??null;
  const cheap=deck.filter(c=>!win.some(w=>w.id===c.id) &&
      !hasRole(c,"Building") && !hasRole(c,"Tank killer") &&
      !spellCards.has(c.name) && (c.elixir??99)<=3)
    .sort((a,b)=>(a.elixir??99)-(b.elixir??99));
  const avg=deck.every(c=>c.elixir!==null)?
    deck.reduce((sum,c)=>sum+(c.elixir??0),0)/8:null;
  const mainName=main?.name??"the chosen win condition";
  const highCommit=!!(main && (heavy.has(main.name)||main.elixir!==null&&main.elixir>=6));
  const cycleStyle=focus==="cycle" || (avg!==null&&avg<=3);
  const defensive=focus==="air"||focus==="tank"||focus==="swarm";
  let title=main?"Play "+main.name+" with controlled defense":"Defend, then create a tower win condition";
  let identity=main?
    "Your primary tower-pressure plan is "+names(win).join(" + ")+
      ". Build pressure from surviving defense instead of treating all eight cards as attackers.":
    "No recognized win condition is present; the deck may struggle to produce repeatable tower damage.";
  if(main?.name==="Royal Giant") {
    title="Royal Giant defensive counterpush";
    identity="Keep a grounded anti-tank answer and real air defense available; defend first and use Royal Giant to punish a favorable rotation.";
  } else if(main&&siege.has(main.name)){
    title=main.name+" siege and reactive defense";
    identity="Protect your siege win condition when committing offensively, and defend with it when the opponent's push makes an offensive investment unsafe.";
  } else if(main&&heavy.has(main.name)){
    title=main.name+" buildup and supported pressure";
    identity="Avoid heavy opening commitments; win by building a supported push when your elixir and counters allow it.";
  } else if(main&&cyclePressure.has(main.name)){
    title=main.name+" rotation and pressure";
    identity="Use modest tower pressure and efficient defense; rotate back to "+main.name+" without giving up essential counters.";
  } else if(main&&bait.has(main.name)){
    title=main.name+" counterspell tracking";
    identity="Identify the opponent's anti-"+main.name+" response and pressure when that counter is unavailable.";
  }
  const openingMoves=cheap.length>=2?cheap.slice(0,2):
    cheap.length===1?cheap:[];
  const opening:PlaybookSection={
    heading:"Opening hand · 1× elixir",
    objective:"Discover their win condition without losing your defensive counter.",
    steps:[
      openingMoves.length?
        "Possible low-commitment openings, if safe: "+
        openingMoves.map(c=>c.name+" ("+(c.elixir??"?")+" elixir)").join(" or ")+
        ". Placement and timing still depend on the actual starting hand.":
        "If there is no safe cheap opening, wait briefly and react. Don't invent a safe starter.",
      buildings.length?
        "Keep "+natural(buildings)+" for an enemy commitment rather than dropping your only building at the back.":
        "Without a defensive building, preserve ground blockers and pressure removal.",
      highCommit?
        "Avoid opening with "+mainName+" unless a genuine advantage makes the investment safe.":
        "Don't reveal every answer in your first four cards; identify their main counter first.",
    ],
    warning:"Your starting hand is random; never assume that any named opening card is immediately available.",
  };
  const firstResponse=main?.name==="Royal Giant"?
    "After an efficient defense, deploy Royal Giant at a favorable bridge opportunity and keep elixir for its support.":
    main&&siege.has(main.name)?
    "Establish "+mainName+" pressure only when you can defend it; if threatened, use it defensively when appropriate.":
    main&&bait.has(main.name)?
    "Track the opponent's small spell or splash answer before committing "+mainName+".":
    main&&cyclePressure.has(main.name)?
    "Attack with "+mainName+" when the main building or hard counter is out of rotation.":
    main?.name==="Miner"?
    "Chip with Miner and support survivors without committing your entire defense.":
    "Turn surviving defenders into a counterpush led by "+mainName+" only when you can still cover the next threat.";
  const single:PlaybookSection={
    heading:"Single elixir · protect your counters",
    objective:"Trade efficiently; don't force a tower push into a full opponent defense.",
    steps:[
      "Identify which cards defend the opposing win condition before investing: "+
        (buildings.length?natural(buildings):natural(ground))+".",
      air.length?
        "Preserve at least one genuine air defender such as "+natural(air)+
        " until you understand their flying threat.":
        "No reliable sustained air defender was identified. Avoid wasting any scarce air-targeting option.",
      firstResponse,
      "Track the counter to "+mainName+" across rotations. Do not assume the opponent has spent their counter without seeing it.",
    ],
    warning:avg!==null&&avg>4?
      "Your "+avg.toFixed(2)+"-elixir average is expensive. Avoid stacking support troops without defending the opposite lane.":
      "A cheap cycle is not permission to spend your last response to a known win condition.",
  };
  const double:PlaybookSection={
    heading:"Double elixir · execute the win condition",
    objective:highCommit?
      "Use faster elixir regeneration to build one protected major push.":
      "Outrotate or outvalue the opponent's proven counters.",
    steps:[
      highCommit?
        "Commit "+mainName+" when you can afford its support and keep an answer for the opposite lane.":
        "Repeat a defended "+mainName+" pressure window rather than spending every support card at once.",
      splash.length?
        "Use "+natural(splash.slice(0,2))+" to clear clustered defenders that obstruct the push.":
        "No reliable splash troop was identified; reserve a spell or specialized answer for swarms.",
      large.length?
        "Look for meaningful support-unit or tower-plus-unit value with "+natural(large)+".":
        small.length?
          "Use "+natural(small)+" to clear vulnerable swarms only when it enables defense or tower pressure.":
          "No spell-based swarm answer is established; do not overcommit into a prepared swarm.",
      defensive?
        "Your chosen focus is "+focus+". Hold the relevant counter before expanding the attack.":
        "When a defender survives, spend additional elixir only if the opponent's next counter is covered.",
    ],
    warning:"Double elixir does not justify ignoring lane pressure or replacing a necessary air/tank counter with extra damage.",
  };
  const finishing:PlaybookSection={
    heading:"Overtime / final push",
    objective:"Close safely based on actual tower HP and opponent spell cycle.",
    steps:[
      main?"Keep winning with "+mainName+" when a safe pressure window exists.":"Protect your tower and look for measured counterpush damage.",
      large.length?
        "Use "+natural(large)+" for finishing damage only when its actual damage and opponent's remaining tower HP justify the play.":
        "Do not assume you have a guaranteed spell-finishing route; track the actual tower HP and damage.",
      "If ahead, prioritize preventing a decisive enemy push. If behind, create one intentional pressure opportunity instead of random card stacking.",
    ],
    warning:"No precise lethal-damage claim is made: card levels, tower levels, buffs, shields and patch stats can change outcomes.",
  };
  const buildMatch=(id:PlaybookMatchup["id"],name:string,answers:Card[],
    instructions:string[],risk:string):PlaybookMatchup=>({id,name,cards:names(answers),
      instructions,risk});
  const matchups:PlaybookMatchup[]=[
    buildMatch("air","Against heavy air (Balloon, Lava Hound, air swarms)",air,[
      air.length?
        "Assign "+natural(air.slice(0,2))+" to sustained air damage. Space defenders so one spell does not eliminate both.":
        "No reliable sustained air defense was identified; treat this matchup as dangerous.",
      buildings.filter(canHitAir).length?
        "Use "+natural(buildings.filter(canHitAir))+" as a pull/defensive anchor when the attack pattern allows.":
        "Do not claim ground-only buildings can target flying units.",
      small.filter(c=>["Arrows","Zap","Giant Snowball"].includes(c.name)).length?
        "Save "+natural(small.filter(c=>["Arrows","Zap","Giant Snowball"].includes(c.name)))+
        " for appropriate air swarms or timing utility, not as the primary flying-tank killer.":
        "Protect scarce air-targeting troops; avoid offensive overcommitment while their air win condition is in rotation.",
    ],air.length<2?"Fewer than two sustained air defenders; bait, spacing and rotation matter.":"Don't stack air defenders for opponent spell value."),
    buildMatch("tanks","Against tanks and large pushes",[
      ...tank,...buildings.filter(c=>!tank.some(x=>x.id===c.id))],[
      tank.length?
        "Preserve "+natural(tank)+" for the main high-HP attacker while using supporting defenders to clear escorts.":
        "No dedicated tank killer identified; avoid turning the matchup into a full-elixir tower trade.",
      buildings.length?
        "Use "+natural(buildings)+" to pull/delay the main ground threat where legal and helpful.":
        "Use available ground blockers to distract and keep damage dealers protected.",
      splash.length?
        "Use "+natural(splash.slice(0,2))+" on accompanying swarms or support, not as proof of single-target tank DPS.":
        "Keep damage-dealing support alive; avoid an unsupported defense.",
    ],named(deck,"Inferno Tower")||named(deck,"Inferno Dragon")?
      "Ramp-up Inferno damage can be reset or distracted; have another answer ready.":
      "Avoid giving enemy support a high-value spell trade."),
    buildMatch("swarms","Against swarms and spell bait",[
      ...splash,...small],[
      small.length?
        "Track the opponent's bait card and reserve "+natural(small)+" for a valuable response.":
        "No dependable cheap spell is present; control your splash defenders carefully.",
      splash.length?
        "Protect "+natural(splash.slice(0,2))+" to clear clusters, checking whether they actually hit air or only ground.":
        "No sustained splash attacker identified; avoid repeatedly feeding single-target defenders to mass swarms.",
      "If multiple threats demand the same spell, identify the higher-damage threat before committing.",
    ],"Swarm answers differ by target type: ground-only attacks cannot remove an airborne group."),
    buildMatch("ground","Against ground bridge pressure",[
      ...ground,...buildings.filter(c=>!ground.some(x=>x.id===c.id))],[
      ground.length?
        "Use "+natural(ground.slice(0,3))+" to absorb or redirect ground pressure, then support surviving defenders.":
        "The deck has limited recognizable ground defense; avoid a speculative opposite-lane rush.",
      tank.length?
        "Save "+natural(tank)+" for high-HP attackers or other threats requiring concentrated damage.":
        "Don't sacrifice a small spell or cycle unit expecting it to stop a heavy push alone.",
      "Attack only after the opposing push is controlled and you have enough elixir for your next defense.",
    ],"Predictive placements are not simulated: range, pathing, spell timing and tower levels change interactions."),
  ];
  const cardJobs:PlaybookCard[]=deck.map(card=>{
    const winRole=hasRole(card,"Win condition");
    const isAir=canHitAir(card);
    const isTank=hasRole(card,"Tank killer");
    const isSplash=hasRole(card,"Swarm control");
    const isBuilding=hasRole(card,"Building");
    const isSpell=spellCards.has(card.name)||hasRole(card,"Spell");
    const isCheap=card.elixir!==null && card.elixir<=2;
    const assignments=[
      winRole?"Win condition / main tower pressure":null,
      isBuilding?"Defensive building / lane control":null,
      isTank?"Tank removal":null,
      isAir?"Air-targeting response":null,
      isSplash?"Swarm/splash answer":null,
      isSpell?"Spell":null,
      hasRole(card,"Ground defense")?"Ground defense":null,
      hasRole(card,"Cycle")?"Cheap cycle / utility":null,
    ].filter((x):x is string=>!!x);
    const defaults={
      when:winRole?
        "Use after an efficient stop or during a known counter-rotation; support without abandoning defense.":
        isBuilding?"Deploy reactively to pull or delay a specific threat instead of wasting its active lifetime.":
        isTank?"Save for a substantial enemy attacker; cover against support and distractions.":
        isSpell?"Use for positive defense, valuable targets or planned tower-pressure support.":
        isSplash?"Remove grouped defenders and convert survivors into pressure.":
        isAir?"Keep ready for opponent air attacks and protect it from spells.":
        isCheap?"Cycle only when your next defensive answer remains available.":
        "Use in the role identified from the deck, responding to the opponent's demonstrated threat.",
      protect:"Avoid spending this together with your other essential defenders when the next enemy push is unknown.",
    };
    const special=specialist[card.name];
    return {
      id:card.id,name:card.name,level:card.level,elixir:card.elixir,
      job:assignments.join(" · ")||"Support / situational utility",
      when:special?.when??defaults.when,
      protectAgainst:special?.protect??defaults.protect,
    };
  });
  const reminders=[
    "The instructions refer only to these eight selected cards. If you change the deck, the playbook must change too.",
    win.length>1?"Multiple win conditions: coordinate their pressure instead of committing both before understanding counters.":
      "Preserve the main win condition's support and counter cards across rotations.",
    air.length<2?"Air defense is a weak point of this exact deck; play cautiously against air-heavy opponents.":
      "Keep at least one air defender available until the enemy's air threat is accounted for.",
    !small.length?"No conventional small spell in this deck; bait handling may be difficult.":
      "Do not spend your cheap swarm answer just to cycle when the opponent's bait card is available.",
    "A four-card cycle number is a best-case sum of cheap cards, not a guaranteed return time.",
  ];
  return {
    title,identity,winConditions:names(win),averageElixir:avg,
    opening,single,double,finishing,matchups,cardJobs,reminders,
    limitations:[
      "This is a deterministic strategy guide based on the deck's own eight cards, their categorized functions and available reference combat fields; it is not a live replay analysis or exact matchup simulator.",
      "Current hand, elixir, unit placement, spell timing, balance patch, Evolutions, tower levels and opponent rotation are unknown.",
      "A named counter is a tactical suggestion, not a guarantee of stopping that attack. Missing combat properties are never inferred as measured damage.",
    ],
  };
}
