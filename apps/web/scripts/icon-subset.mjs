#!/usr/bin/env node
/**
 * Regenerates public/fonts/material-symbols-rounded-subset.woff2 with every Material Symbol
 * the app can render. Runs automatically before `next build` and `next dev` (see package.json).
 * Strategy: collect every snake_case / lowercase string literal in src/, keep the ones that are
 * real icon names (checked against Google's codepoints list), fetch the subset from Google Fonts.
 * Falls back to keeping the existing file if the network is unavailable.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const OUT = "public/fonts/material-symbols-rounded-subset.woff2";
const CODEPOINTS = "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints";

const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css|mjs)$/.test(f) && files.push(p); } })("src");
const candidates = new Set();
for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/["'`]([a-z][a-z0-9_]{1,40})["'`]/g)) candidates.add(m[1]);
// Names referenced only in this script's own list (dynamic / fallback icons)
for (const n of ["broken_image", "zoom_in", "open_in_full", "warning", "download", "content_copy", "notifications", "notifications_active", "photo_library"]) candidates.add(n);

try {
  const all = new Set((await (await fetch(CODEPOINTS, { headers: { "User-Agent": UA } })).text()).split("\n").map((l) => l.split(" ")[0]).filter(Boolean));
  const names = [...candidates].filter((n) => all.has(n)).sort();
  const list = names.join(",");
  const cssUrl = `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..700,0..1,0&icon_names=${list}&display=block`;
  const css = await (await fetch(cssUrl, { headers: { "User-Agent": UA } })).text();
  const url = css.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) throw new Error("No font URL in Google Fonts response: " + css.slice(0, 200));
  const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
  if (buf.length < 10_000) throw new Error("Font too small, refusing to overwrite");
  writeFileSync(OUT, buf);
  console.log(`[icon-subset] ${names.length} icons → ${(buf.length / 1024).toFixed(0)} KB`);
} catch (e) {
  if (existsSync(OUT)) console.warn(`[icon-subset] kept existing font (${e.message})`);
  else { console.error("[icon-subset] failed and no font present:", e.message); process.exit(1); }
}
