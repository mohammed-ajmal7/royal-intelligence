import { NextRequest, NextResponse } from "next/server";
import { parseCurrentReference, referenceSlug, REFERENCE_BASE } from "../../../lib/liveCardReference";
import type { CurrentReference } from "../../../lib/liveCardReference";

export const runtime = "nodejs";
export const revalidate = 86400;
const cache = new Map<string,{at:number;value:CurrentReference}>();
const oneDay = 86_400_000;

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") ?? "";
  const id = Number(request.nextUrl.searchParams.get("id"));
  const slug = referenceSlug(name);
  if (!slug || !Number.isSafeInteger(id) || id <= 0 || id > 99999999) {
    return NextResponse.json({ error:"Enter a valid official card name and ID." },{ status:400 });
  }
  const key = String(id) + ":" + slug;
  const existing = cache.get(key);
  if (existing && Date.now() - existing.at < oneDay) {
    return NextResponse.json(existing.value,{headers:{
      "Cache-Control":"public, s-maxage=86400, stale-while-revalidate=86400",
    }});
  }
  // The origin is fixed. User-controlled names only fill a validated path.
  // This route does not use or expose the Supercell API credential.
  const sourceUrl = REFERENCE_BASE + slug + "/";
  try {
    const response = await fetch(sourceUrl,{
      next:{revalidate:86400},
      signal:AbortSignal.timeout(9000),
      headers:{accept:"text/html"},
    });
    if(!response.ok) return NextResponse.json({
      error:"This card's current community reference page is unavailable.",
      sourceUrl
    },{status:404,headers:{"Cache-Control":"public, s-maxage=300"}});
    const size=Number(response.headers.get("content-length") ?? 0);
    if(size>1_500_000) throw new Error("Response is larger than the reference limit");
    const html=await response.text();
    const result=parseCurrentReference(html,{id,name},sourceUrl);
    if(!result) return NextResponse.json({
      error:"No matching card information was published at this source.",
      sourceUrl
    },{status:422,headers:{"Cache-Control":"public, s-maxage=900"}});
    cache.set(key,{at:Date.now(),value:result});
    if(cache.size>160) cache.delete(cache.keys().next().value ?? "");
    return NextResponse.json(result,{headers:{
      "Cache-Control":"public, s-maxage=86400, stale-while-revalidate=86400",
    }});
  } catch {
    return NextResponse.json({
      error:"The current community card-stat source could not be reached. Historical values remain available.",
      sourceUrl
    },{status:502,headers:{"Cache-Control":"public, s-maxage=120"}});
  }
}
