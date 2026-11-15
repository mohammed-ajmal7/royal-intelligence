import { spawn } from "node:child_process";
const args = process.argv
  .slice(2)
  .filter((x) => x !== "--strictPort")
  .map((x) => (x === "--host" ? "--hostname" : x));
const p = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev", ...args],
  { stdio: "inherit" },
);
p.on("exit", (c) => process.exit(c ?? 1));
