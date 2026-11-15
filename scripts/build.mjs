import {
  mkdir,
  rename,
  readdir,
  readFile,
  writeFile,
  cp,
} from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { build } from "esbuild";
await rename("src/app/api", "server/.api-temp");
try {
  const r = spawnSync(
    process.execPath,
    ["node_modules/next/dist/bin/next", "build"],
    { stdio: "inherit", env: { ...process.env, SITES_EXPORT: "1" } },
  );
  if (r.status !== 0) throw new Error("Frontend build failed");
} finally {
  await rename("server/.api-temp", "src/app/api");
}
const assets = {},
  mime = {
    html: "text/html; charset=utf-8",
    js: "text/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    json: "application/json",
    txt: "text/plain",
    svg: "image/svg+xml",
    png: "image/png",
    ico: "image/x-icon",
    woff2: "font/woff2",
  };
async function walk(dir, prefix = "") {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const path = dir + "/" + e.name,
      key = prefix + "/" + e.name;
    if (e.isDirectory()) await walk(path, key);
    else
      assets[key] = {
        body: (await readFile(path)).toString("base64"),
        type: mime[e.name.split(".").pop()] ?? "application/octet-stream",
      };
  }
}
await walk("out");
await mkdir(".sites-runtime", { recursive: true });
await writeFile(".sites-runtime/assets.json", JSON.stringify(assets));
await mkdir("dist/server", { recursive: true });
await mkdir("dist/.openai", { recursive: true });
await build({
  entryPoints: ["server/worker.ts"],
  outfile: "dist/server/index.js",
  bundle: true,
  minify: true,
  format: "esm",
  platform: "browser",
  target: "es2022",
});
await cp(".openai/hosting.json", "dist/.openai/hosting.json");
