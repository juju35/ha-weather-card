// Narrow cards: the declared minimum width of the Sections view (and the mini card's default size, about 156 to 246px)
// must keep the title readable and every button, pill and chip inside the card. No browser on the CI: these tests
// read the card's CSS rules; the PR measured the rendering in Chromium.
import assert from "node:assert/strict";
import { test } from "node:test";
import { makeHass, NOON } from "./hass.mjs";
import { load, mount } from "./load.mjs";

const lib = load(NOON);
const html = (el) => el.shadowRoot.innerHTML.replace(/<style>[\s\S]*?<\/style>/g, "");

// The rules of a stylesheet as { at, sel, decl }: `at` is the enclosing @media / @container prelude, or "".
const rules = (css) => {
  const out = [];
  const walk = (src, at) => {
    let i = 0;
    while (i < src.length) {
      const open = src.indexOf("{", i);
      if (open < 0) break;
      const prelude = src.slice(i, open).trim();
      let depth = 1;
      let j = open + 1;
      for (; j < src.length && depth; j++) depth += src[j] === "{" ? 1 : src[j] === "}" ? -1 : 0;
      const body = src.slice(open + 1, j - 1);
      if (prelude.startsWith("@keyframes")) {
      } else if (prelude.startsWith("@")) walk(body, prelude);
      else {
        const decl = {};
        for (const d of body.split(";")) {
          const k = d.indexOf(":");
          if (k > 0) decl[d.slice(0, k).trim()] = d.slice(k + 1).trim();
        }
        for (const sel of prelude.split(",")) out.push({ at, sel: sel.trim(), decl });
      }
      i = j;
    }
  };
  walk(css.replace(/\/\*[\s\S]*?\*\//g, ""), "");
  return out;
};
const R = rules(lib.WX_STYLES);
// The declarations of `sel` outside any at-rule, merged in order.
const base = (sel) => Object.assign({}, ...R.filter((r) => r.sel === sel && !r.at).map((r) => r.decl));
// The @container rules for `sel`, as [maxWidth, decl].
const narrow = (sel) =>
  R.filter((r) => r.sel === sel && r.at.startsWith("@container")).map((r) => [Number(r.at.match(/max-width:\s*(\d+)px/)?.[1]), r.decl]);

test("narrow: the card is a size container, so its parts follow its own width rather than the window's", () => {
  assert.equal(base("ha-card")["container-type"], "inline-size");
});

test("narrow header: the title keeps a few characters, the pill gives way, the buttons never shrink", () => {
  const titles = base(".titles");
  assert.equal(titles.flex, "1 1 auto", "the title's base is its text, not 0");
  const m = String(titles["min-width"]).match(/^(\d+(?:\.\d+)?)ch$/);
  assert.ok(m && Number(m[1]) >= 5, `the title keeps about 4 characters and its ellipsis: ${titles["min-width"]}`);
  assert.equal(base(".name")["text-overflow"], "ellipsis");
  const st = base(".st");
  assert.equal(st.flex, "0 1 auto");
  assert.equal(st["min-width"], "0");
  assert.ok(Number.parseFloat(st["max-width"]) <= 50, st["max-width"]);
  assert.equal(base(".st .stt")["text-overflow"], "ellipsis");
  for (const sel of [".badge", ".zoom"]) assert.equal(base(sel).flex, "none", sel);
  assert.equal(rules(lib.WX_STYLES + lib.WX_POPUP_STYLES).find((r) => r.sel === ".close" && !r.at).decl.flex, "none", ".close");
  // On a narrow card the pill shows its dot only; its text stays for screen readers and in its title.
  const dotOnly = narrow(".st .stt");
  assert.ok(dotOnly.length, "a narrow card hides the pill's text");
  for (const [w, d] of dotOnly) {
    assert.ok(w >= 260, `the pill turns to a dot below ${w}px`);
    assert.notEqual(d.display, "none", "the text stays readable to screen readers");
    assert.match(`${d["clip-path"]}${d.clip}`, /inset\(50%\)|rect\(0/);
  }
});

test("narrow header: every status pill carries its text in a title, the unavailable one too", () => {
  const unavailable = mount(lib, "weather-plus-card", {}, makeHass("en", { "weather.paris": { state: "unavailable" } }));
  assert.match(html(unavailable), /<span class="st" title="Unavailable"><span class="dot"><\/span><span class="stt">Unavailable<\/span><\/span>/);
  for (const tag of ["weather-plus-card", "weather-plus-mini-card"]) {
    const out = html(mount(lib, tag, {}, makeHass()));
    const pill = out.match(/<span class="st[^"]*"[^>]*>/)[0];
    assert.match(pill, /title="[^"]+"/, tag);
  }
});

test("narrow mini card: below the threshold the badge and the scene step aside for the title and the temperature", () => {
  const badge = narrow("ha-card.mini .badge");
  assert.ok(badge.some(([, d]) => d.display === "none"), "the badge leaves room for the title on the narrowest mini card");
  const scene = narrow("ha-card.mini .content > div:first-child");
  assert.ok(scene.some(([, d]) => d.display === "none"), "the scene leaves room for the temperature");
  assert.ok(narrow("ha-card.mini .scene").length, "and shrinks first");
});

test("narrow card: the scene shrinks, the chips ellipsize instead of leaving the card", () => {
  assert.ok(narrow(".scene").some(([w, d]) => w >= 260 && Number.parseFloat(d.width) <= 88), "a smaller scene on a narrow card");
  const chip = base(".chip");
  assert.equal(chip["max-width"], "100%");
  assert.equal(chip["min-width"], "0");
  const ct = base(".chip .ct");
  assert.equal(ct.overflow, "hidden");
  assert.equal(ct["text-overflow"], "ellipsis");
  // Each chip's text is in its .ct span (text-overflow does not reach a flex container's bare text), the wind's too.
  const out = html(mount(lib, "weather-plus-card", {}, makeHass("pl")));
  const chips = [...out.matchAll(/<span class="chip[^"]*"[^>]*>([\s\S]*?)<\/span>(?=<span class="chip|<\/div>)/g)];
  assert.ok(chips.length > 5);
  for (const [whole, inner] of chips) assert.match(inner, /<span class="ct">[^<]+<\/span>$/, whole);
});

test("narrow card: the daily rows fit the card's minimum width, their bar steps aside", () => {
  const drow = base(".drow")["grid-template-columns"];
  assert.doesNotMatch(drow, /^\d+px/, `the day column is not fixed: ${drow}`);
  const cols = narrow(".drow");
  assert.ok(cols.length, "a narrow layout for the daily rows");
  for (const [w, d] of cols) {
    // Without the bar: day, icon, rain, low, high, and 4 gaps of 8px must fit in `w` with the day's text.
    const fixed = d["grid-template-columns"].match(/\d+px/g).map(Number.parseFloat);
    assert.equal(fixed.length, 4, d["grid-template-columns"]);
    assert.ok(fixed.reduce((a, b) => a + b, 0) + 4 * 8 + 40 <= 214, "fits a 238px card (9 columns of the narrowest section)");
    assert.ok(w >= 214);
  }
  assert.ok(narrow(".drow .range").some(([, d]) => d.display === "none"));
});

test("narrow card: the full card asks for 9 columns at least, the mini card keeps 6", () => {
  const full = mount(lib, "weather-plus-card", {}, makeHass());
  assert.deepEqual({ ...full.getGridOptions() }, { columns: 12, min_columns: 9 });
  const mini = mount(lib, "weather-plus-mini-card", {}, makeHass());
  assert.deepEqual({ ...mini.getGridOptions() }, { columns: 6, min_columns: 6 });
});
