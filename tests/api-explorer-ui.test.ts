import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

test("Explore renders every API field as structured UI instead of a raw JSON dump",()=>{
  const page=readFileSync(new URL("../src/app/page.tsx",import.meta.url),"utf8");
  const css=readFileSync(new URL("../src/app/api-explorer.css",import.meta.url),"utf8");

  assert.match(page,/function ApiObjectFields/);
  assert.match(page,/Object\.entries\(value\)/);
  assert.match(page,/function ApiObjectTable/);
  assert.match(page,/rows\.flatMap\(row=>Object\.keys\(row\)\)/);
  assert.match(page,/function ApiValue/);
  assert.match(page,/function RecordList/);
  assert.doesNotMatch(page,/function JsonDetails/);
  assert.doesNotMatch(page,/JSON\.stringify\(value,null,2\)/);
  assert.doesNotMatch(page,/\.slice\(0,20\)/);
  assert.doesNotMatch(page,/\.slice\(0,150\)/);
  assert.match(page,/import "\.\/api-explorer\.css"/);
  assert.match(css,/\.ri-api-field-grid/);
  assert.match(css,/\.ri-api-table/);
  assert.match(css,/\.ri-api-nested-field/);
  assert.match(css,/@media\(max-width:560px\)/);
});
