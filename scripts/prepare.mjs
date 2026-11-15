import { mkdir, writeFile } from "node:fs/promises";

await mkdir(".sites-runtime", { recursive: true });
try {
  await writeFile(".sites-runtime/assets.json", "{}", { flag: "wx" });
} catch (error) {
  if (error.code !== "EEXIST") throw error;
}
