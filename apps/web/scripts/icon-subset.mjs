#!/usr/bin/env node
/**
 * Regenerates public/fonts/material-symbols-rounded-subset.woff2 from the icon names used in src/.
 * Run after adding a new <Icon name="..."/>: node scripts/icon-subset.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const files = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : /\.(tsx?|css)$/.test(f) && files.push(p); } })("src");
const names = new Set();
for (const f of files) {
  const s = readFileSync(f, "utf8");
  for (const m of s.matchAll(/\bname=\{?"([a-z0-9_]+)"/g)) names.add(m[1]);
  for (const m of s.matchAll(/\bicon:\s*"([a-z0-9_]+)"/g)) names.add(m[1]);
  for (const m of s.matchAll(/\bicon="([a-z0-9_]+)"/g)) names.add(m[1]);
  for (const line of s.split("\n")) if (/Icon|icon|ICONS/.test(line)) for (const m of line.matchAll(/"([a-z][a-z0-9]*_[a-z0-9_]+)"/g)) names.add(m[1]);
}
// always-on basics that appear only dynamically
for (const n of ["eco","spa","park","yard","home","add","remove","close","search","edit","delete","check","login","logout","print","tune","save","send","share","info","error","key","person","forest","grass","bolt","grocery","nature","history","stars","percent","payments","replay","videocam","landscape","skillet","groups","group","apps","nutrition","restaurant","circle","lightbulb","bedtime","celebration","handshake","agriculture","dashboard","storefront","visibility","schedule","mic","image","refresh","block","cancel","event","download","warning","favorite","verified","routine","dark_mode","light_mode","broken_image","zoom_in","open_in_full"]) names.add(n);
const list = [...names].filter((n) => !["farm_diary","group_orders","meal_plans","user_recipes"].includes(n)).sort().join(",");
const cssUrl = `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,300..700,0..1,0&icon_names=${list}&display=block`;
const css = await (await fetch(cssUrl, { headers: { "User-Agent": UA } })).text();
const url = css.match(/url\((https:[^)]+)\)/)?.[1];
if (!url) { console.error("No font URL in response:\n" + css.slice(0, 400)); process.exit(1); }
const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
writeFileSync("public/fonts/material-symbols-rounded-subset.woff2", buf);
console.log(`icons: ${names.size}, font: ${(buf.length / 1024).toFixed(0)} KB`);
