// Builds src/ into the single HACS file dist/ha-weather-card.js, stamping the package version.
// Usage: node scripts/build.mjs  (dist/ is not committed: CI and the release workflow build it)
// shared.js comes first, then the animated scenes; each card is wrapped in its own block, inside one block for the
// whole bundle, so nothing leaks into the page.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { splitDist } from "./i18n-split.mjs";

export const PARTS = ["shared", "astro", "scene", "sections"];
export const CARDS = ["weather-plus-card"];
const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8"));
const src = (name) => readFileSync(`${root}src/${name}.js`, "utf8").replaceAll("__VERSION__", pkg.version);

const out = [
  `/*! ha-weather-card v${pkg.version} — https://github.com/juju35/ha-weather-card */`,
  "{",
  ...PARTS.map(src),
  ...CARDS.map((c) => `// ── ${c} ──\n{\n${src(c)}}\n`),
  "}",
  "",
].join("\n");

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  mkdirSync(`${root}dist`, { recursive: true });
  writeFileSync(`${root}dist/ha-weather-card.js`, out);
  console.log(`Built dist/ha-weather-card.js (${(out.length / 1024).toFixed(1)} KB)`);
}

// Translations: English stays in the bundle, each other language goes to dist/ha-weather-card.i18n.<lang>.js,
// fetched when a card needs it (scripts/i18n-split.mjs).
if (process.argv[1] === fileURLToPath(import.meta.url)) splitDist(`${root}dist`, "ha-weather-card.js", { version: pkg.version });
