import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Explore renders every API field as structured UI instead of a raw JSON dump",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const renderer=readFileSync(new URL("../src/components/ApiResponseView.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/api-explorer.css",import.meta.url),"utf8");

  assert.ok(renderer.includes("function ApiObjectFields"));
  assert.ok(renderer.includes("Object.entries(value)"));
  assert.ok(renderer.includes("function ApiObjectTable"));
  assert.ok(renderer.includes("rows.flatMap(row=>Object.keys(row))"));
  assert.ok(renderer.includes("function ApiValue"));
  assert.ok(page.includes("<ApiResponseView value={result.data}/>"));
  assert.ok(renderer.includes("export function ApiResponseView"));
  assert.ok(!page.includes("function JsonDetails"));
  assert.ok(!renderer.includes("function JsonDetails"));
  assert.ok(!page.includes("JSON.stringify(value,null,2)"));
  assert.ok(!renderer.includes("JSON.stringify(value,null,2)"));
  assert.ok(!renderer.includes(".slice(0,20)"));
  assert.ok(!renderer.includes(".slice(0,150)"));
  assert.ok(page.includes('import "./api-explorer.css"'));
  assert.ok(css.includes(".ri-api-field-grid"));
  assert.ok(css.includes(".ri-api-table"));
  assert.ok(css.includes(".ri-api-nested-field"));
  assert.ok(css.includes("@media(max-width:560px)"));
});
