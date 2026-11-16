import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 40;
const card = z.object({
  id:z.number().int().positive(), name:z.string().min(1).max(65),
  level:z.number().int().min(1).max(30).nullable(),
  elixir:z.number().min(0).max(10).nullable(),
  roles:z.array(z.string().max(35)).max(10),
  active:z.string().max(18),
}).strict();
const candidate = z.object({
  cards:z.array(card).length(8),
  numericalScore:z.number().min(0).max(100),
  tacticalScore:z.number().min(0).max(100),
  recommendationScore:z.number().min(0).max(100),
  avgElixir:z.number().min(0).max(10).nullable(),
  cycle:z.number().min(0).max(40).nullable(),
  threatRatings:z.array(z.object({name:z.string().max(60),score:z.number().min(0).max(100)})).max(6),
  risks:z.array(z.string().max(220)).max(7),
}).strict();
const inputSchema=z.object({
  focus:z.enum(["balanced","air","tank","swarm","cycle","royal-giant"]),
  current:candidate,
  candidates:z.array(candidate).min(1).max(5),
  observations:z.array(z.object({
    name:z.string().max(60),seen:z.number().int().min(0).max(50),
    losses:z.number().int().min(0).max(50),
    wins:z.number().int().min(0).max(50),
  })).max(3),
}).strict();
const reviewSchema=z.object({
  choiceIndex:z.number().int().min(-1).max(4),
  verdict:z.string().min(20).max(700),
  evidence:z.array(z.string().min(8).max(300)).max(5),
  risks:z.array(z.string().min(8).max(300)).max(5),
  substitutions:z.array(z.string().min(8).max(250)).max(5),
  opening:z.string().min(8).max(350),
  defense:z.string().min(8).max(400),
  counterpush:z.string().min(8).max(350),
  limitations:z.string().min(12).max(350),
}).strict();
export type DeckAIReview=z.infer<typeof reviewSchema>;
const responseSchema={
  type:"object", additionalProperties:false,
  properties:{
    choiceIndex:{type:"integer"},
    verdict:{type:"string"},
    evidence:{type:"array",items:{type:"string"}},
    risks:{type:"array",items:{type:"string"}},
    substitutions:{type:"array",items:{type:"string"}},
    opening:{type:"string"},
    defense:{type:"string"},
    counterpush:{type:"string"},
    limitations:{type:"string"},
  },
  required:["choiceIndex","verdict","evidence","risks","substitutions",
    "opening","defense","counterpush","limitations"],
} as const;
const limits=new Map<string,{since:number;count:number}>();
function allowed(ip:string){
  const now=Date.now();
  const limit=limits.get(ip);
  if(!limit||now-limit.since>86_400_000){
    limits.set(ip,{since:now,count:1});return true;
  }
  if(limit.count>=12)return false;
  limit.count++;
  return true;
}
function authorized(provided:string,expected:string){
  if(!provided||!expected||provided.length!==expected.length)return false;
  return timingSafeEqual(Buffer.from(provided),Buffer.from(expected));
}
export async function POST(request:NextRequest){
  const apiKey=process.env.OPENAI_API_KEY;
  const accessCode=process.env.DECK_AI_ACCESS_TOKEN;
  // Opt-in only. A ChatGPT subscription is not an API key.
  if(!apiKey||!accessCode)return NextResponse.json({
    error:"AI review is not configured. Set OPENAI_API_KEY and DECK_AI_ACCESS_TOKEN in Vercel. The free strategic analysis still works.",
  },{status:503,headers:{"Cache-Control":"no-store"}});
  if(!authorized(request.headers.get("x-deck-ai-access")??"",accessCode))
    return NextResponse.json({error:"Enter the private AI review access code."},
      {status:403,headers:{"Cache-Control":"no-store"}});
  const size=Number(request.headers.get("content-length")??0);
  if(size>32000)return NextResponse.json({error:"Request is too large."},{status:413});
  let input:z.infer<typeof inputSchema>;
  try{
    const text=await request.text();
    if(text.length>32000)throw new Error("Request too large.");
    input=inputSchema.parse(JSON.parse(text));
    for(const selected of [input.current,...input.candidates]){
      if(new Set(selected.cards.map(c=>c.id)).size!==8)
        throw new Error("Each deck must contain eight distinct cards.");
    }
  }catch{
    return NextResponse.json({error:"Invalid or oversized deck comparison."},
      {status:400,headers:{"Cache-Control":"no-store"}});
  }
  // Best-effort per-instance limit; real billing caps must be set at provider.
  const ip=request.headers.get("x-real-ip")??request.headers.get("x-forwarded-for")?.split(",")[0]??"unknown";
  if(!allowed(ip))return NextResponse.json({
    error:"Daily AI review limit reached. Local tactical analysis remains available."
  },{status:429,headers:{"Cache-Control":"no-store"}});
  const instructions=[
    "You are a Clash Royale competitive deck strategist.",
    "Critically compare exactly the current player deck (choiceIndex -1) and the 0-indexed candidate decks.",
    "Choose the deck with the strongest reasoned balance for the requested focus. You may choose -1 to keep the current deck.",
    "Prioritize realistic defenses, hard counters, air coverage, tank removal, spell answer, elixir efficiency, redundancy, counterpush and card levels.",
    "Only use supplied card identities, card levels, threat assessments, and observed battle counts.",
    "Heuristic scores are guidance, not win probabilities. Do not invent current patch numbers or promise outcomes.",
    "Point out risky trades and the argument AGAINST your own favorite choice.",
    "Presence of a card in a lost battle does not establish it caused the loss. Do not infer player mistakes from battle logs.",
    "Mention when evidence is outdated/unknown, and note active Evolution/hero forms cannot be inferred from ownership.",
    "No invented cards, battle outcomes, damage values, or external statistics.",
    "Return concise JSON matching the required fields, no markdown or extra prose."
  ].join(" ");
  try {
    const response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",
      headers:{"Content-Type":"application/json",Authorization:"Bearer "+apiKey},
      signal:AbortSignal.timeout(31000),
      body:JSON.stringify({
        model:process.env.DECK_AI_MODEL||"gpt-6.1-sol",
        store:false,
        max_output_tokens:3400,
        reasoning:{effort:"medium"},
        instructions,
        input:[{role:"user",content:JSON.stringify(input)}],
        text:{format:{type:"json_schema",name:"deck_strategy_review",
          strict:true,schema:responseSchema}},
      }),
    });
    if(!response.ok){
      return NextResponse.json({error:
        response.status===429?"AI provider rate limit reached.":
        "AI provider could not complete the comparison. Check API billing and the configured model."},
        {status:502,headers:{"Cache-Control":"no-store"}});
    }
    const data=await response.json() as {
      output?:{type:string;content?:{type:string;text?:string}[]}[];
    };
    const output=data.output?.flatMap(item=>item.content??[])
      .filter(item=>item.type==="output_text").map(item=>item.text??"").join("")??"";
    const review=reviewSchema.parse(JSON.parse(output));
    if(review.choiceIndex>=input.candidates.length)
      return NextResponse.json({error:"The AI response selected an unavailable deck; no change was applied."},
        {status:502,headers:{"Cache-Control":"no-store"}});
    return NextResponse.json({kind:"model",review,model:process.env.DECK_AI_MODEL||"gpt-6.1-sol"},
      {headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({error:"The AI review timed out or returned an invalid response. Your local recommendation is unchanged."},
      {status:502,headers:{"Cache-Control":"no-store"}});
  }
}
