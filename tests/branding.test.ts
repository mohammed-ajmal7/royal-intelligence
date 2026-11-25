import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const content=(path:string)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("Crown-pilot is the only visible app branding in both dashboards",()=>{
  for(const path of ["src/app/page.tsx","src/components/LegacyWorkspace.tsx"]){
    const s=content(path);
    assert.match(s,/Crown-pilot/);
    assert.doesNotMatch(s,/Royal Intelligence|ROYAL INTELLIGENCE|ROYALINTELLIGENCE/);
    assert.match(s,/\/brand\/crown-pilot-mark\.svg/);
  }
});

test("package, lock, browser metadata and manifest agree on the new name",()=>{
  const pkg=JSON.parse(content("package.json"));
  const lock=JSON.parse(content("package-lock.json"));
  const manifest=JSON.parse(content("public/manifest.webmanifest"));
  assert.equal(pkg.name,"crown-pilot");
  assert.equal(lock.name,"crown-pilot");
  assert.equal(lock.packages[""].name,"crown-pilot");
  assert.equal(manifest.short_name,"Crown-pilot");
  assert.equal(manifest.display,"standalone");
  const metadata=content("src/app/layout.tsx");
  assert.match(metadata,/applicationName: "Crown-pilot"/);
  assert.match(metadata,/title: "Crown-pilot"/);
  assert.match(metadata,/manifest: "\/manifest\.webmanifest"/);
  assert.doesNotMatch(metadata,/Royal Intelligence/);
});

test("Crown-pilot has a native app icon, a scalable logo, and a launcher entry",()=>{
  const png=readFileSync(new URL("../public/brand/crown-pilot-192.png",import.meta.url));
  assert.equal(png.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  assert.equal(png.readUInt32BE(16),192);
  assert.equal(png.readUInt32BE(20),192);
  const svg=content("public/brand/crown-pilot-mark.svg");
  assert.match(svg,/viewBox="0 0 128 128"/);
  assert.match(svg,/Crown-pilot/);
  const manifest=JSON.parse(content("public/manifest.webmanifest"));
  for(const icon of manifest.icons){
    assert.ok(icon.src.startsWith("/brand/crown-pilot-"));
    assert.ok(existsSync(new URL("../public"+icon.src,import.meta.url)));
  }
});

test("old device history keys survive the brand migration",()=>{
  const oldKeys=content("src/app/page.tsx");
  assert.match(oldKeys,/ri-last-player-tag/);
});
