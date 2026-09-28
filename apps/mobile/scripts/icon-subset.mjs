#!/usr/bin/env node
/**
 * Mobile twin of apps/web/scripts/icon-subset.mjs: builds assets/fonts/MaterialSymbolsRounded*.ttf
 * with every Material Symbol used by the mobile app OR the web app, so <Icon name="…"> renders the
 * exact glyphs the web renders. Native text can't drive variable-font axes, so two static instances
 * are fetched: outlined (FILL 0) and filled (FILL 1). Run: `pnpm --filter mobile icons`.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "assets", "fonts");
const CODEPOINTS = "https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsRounded%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints";
// No browser UA → Google Fonts serves TrueType, which expo-font can load on iOS/Android.
const UA = "curl/8.0";

const files = [];
function walk(d) {
  if (!existsSync(d)) return;
  for (const f of readdirSync(d)) {
    if (f === "node_modules" || f.startsWith(".")) continue;
    const p = join(d, f);
    statSync(p).isDirectory() ? walk(p) : /\.(tsx?|mjs)$/.test(f) && files.push(p);
  }
}
for (const d of ["app", "components", "constants", "hooks"]) walk(join(ROOT, d));
walk(join(ROOT, "..", "web", "src"));

const candidates = new Set();
for (const f of files) for (const m of readFileSync(f, "utf8").matchAll(/["'`]([a-z][a-z0-9_]{1,40})["'`]/g)) candidates.add(m[1]);
for (const n of ["broken_image", "zoom_in", "open_in_full", "warning", "download", "content_copy", "notifications", "notifications_active", "photo_library", "chevron_left", "chevron_right", "expand_less", "expand_more", "close", "check", "add", "remove", "search", "search_off", "share", "print", "qr_code_2", "logout", "login", "restart_alt", "tune", "filter_list", "apps", "sort_by_alpha", "payments", "inventory_2", "arrow_forward", "arrow_back", "schedule", "location_on", "event", "date_range", "calendar_month", "check_circle", "pause_circle", "play_circle", "group_add", "group_remove", "celebration", "storefront", "dashboard", "pending_actions", "package_2", "eco", "potted_plant", "nutrition", "skillet", "account_circle", "home", "groups", "agriculture", "auto_stories", "photo_camera", "videocam", "add_photo_alternate", "image", "delete", "send", "edit", "visibility", "local_shipping", "event_repeat", "auto_awesome", "restaurant", "menu_book", "lightbulb", "wb_sunny", "bedtime", "wb_twilight", "park", "forest", "stars", "shopping_basket", "shopping_cart_checkout", "favorite", "verified", "percent", "mic", "spa", "grass", "local_florist", "yard", "landscape", "nature_people", "workspace_premium", "monitor_weight", "fitness_center", "block", "priority_high", "info", "circle", "cloud_off", "wifi_off", "person", "phone", "mail", "key", "star", "history", "receipt_long", "brightness_auto", "light_mode", "dark_mode", "devices", "smartphone", "contrast", "palette", "help", "task_alt", "settings", "sync", "hourglass_empty", "photo", "sticky_note_2", "group_remove", "rocket_launch", "check_circle", "event_available", "calendar_today", "north_east", "keyboard_arrow_left", "keyboard_arrow_right", "swipe", "touch_app"]) candidates.add(n);
// Names that only live in packages/types (ORDER_TIMELINE), which this script does not walk.
for (const n of ["inventory", "agriculture", "local_shipping", "apartment"]) candidates.add(n);

const codepoints = new Map((await (await fetch(CODEPOINTS, { headers: { "User-Agent": UA } })).text()).split("\n").map((l) => l.trim().split(" ")).filter((p) => p.length === 2));
const all = new Set(codepoints.keys());
const names = [...candidates].filter((n) => all.has(n)).sort();
const list = names.join(",");
mkdirSync(OUT_DIR, { recursive: true });

async function fetchTtf(fill, file) {
  const cssUrl = `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,${fill},0&icon_names=${list}&display=block`;
  const css = await (await fetch(cssUrl, { headers: { "User-Agent": UA } })).text();
  const url = css.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) throw new Error("No font URL in Google Fonts response: " + css.slice(0, 200));
  const buf = Buffer.from(await (await fetch(url, { headers: { "User-Agent": UA } })).arrayBuffer());
  if (buf.length < 5_000) throw new Error("Font too small, refusing to overwrite");
  writeFileSync(join(OUT_DIR, file), buf);
  console.log(`[icon-subset] ${file}: ${names.length} icons → ${(buf.length / 1024).toFixed(0)} KB (${url.split(".").pop()})`);
}
await fetchTtf(0, "MaterialSymbolsRounded.ttf");
await fetchTtf(1, "MaterialSymbolsRoundedFilled.ttf");
// Exact name → codepoint maps come from the fonts themselves (needs python3 + fontTools).
import { execFileSync } from "node:child_process";
try {
  process.stdout.write(execFileSync(process.env.PYTHON ?? "python3", [join(ROOT, "scripts", "icon-codepoints.py")], { encoding: "utf8" }));
} catch (e) {
  console.warn("[icon-subset] could not run icon-codepoints.py (pip install fonttools); falling back to Google's outlined codepoints");
  const map = JSON.stringify(Object.fromEntries(names.map((n) => [n, parseInt(codepoints.get(n), 16)])));
  writeFileSync(join(ROOT, "constants", "icon-names.ts"), `// Generated by scripts/icon-subset.mjs — do not edit.\nexport const ICON_CODEPOINTS: Record<string, number> = ${map};\nexport const ICON_CODEPOINTS_FILLED: Record<string, number> = {};\nexport const ICON_NAMES = new Set(Object.keys(ICON_CODEPOINTS));\n`);
}
