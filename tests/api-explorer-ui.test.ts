import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Explore renders every API field as structured UI instead of a raw JSON dump",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const renderer=readFileSync(new URL("../src/components/ApiResponseView.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/api-explorer.css",import.meta.url),"utf8");

  assert.match(renderer,/function ApiObjectFields/);
  assert.match(page,/Object\.entries\(value\)/);
  assert.match(renderer,/function ApiObjectTable/);
  assert.match(page,/rows\.flatMap\(row=>Object\.keys\(row\)\)/);
  assert.match(renderer,/function ApiValue/);
  assert.match(page,/ApiResponseView value=\\{result\\.data\\}/);
  assert.match(renderer,/export function ApiResponseView/);
  assert.doesNotMatch(page,/function JsonDetails/);
  assert.doesNotMatch(renderer,/function JsonDetails/);
  assert.doesNotMatch(page,/JSON\.stringify\(value,null,2\)/);
  assert.doesNotMatch(page,/\.slice\(0,20\)/);
  assert.doesNotMatch(page,/\.slice\(0,150\)/);
  assert.match(page,/import "\.\/api-explorer\.css"/);
  assert.match(css,/\.ri-api-field-grid/);
  assert.match(css,/\.ri-api-table/);
  assert.match(css,/\.ri-api-nested-field/);
  assert.match(css,/@media\(max-width:560px\)/);
});
