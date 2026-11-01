// Text drawn in a state color (UV, air and pollen levels, rain, strong wind, tinted chips, the status pill) must stay
// readable on the card in a light and a dark theme: WCAG AA, 4.5:1 for text of this size. The colors are resolved
// the way the browser does (var(), color-mix() in sRGB, a translucent tint over the card's background).
import assert from "node:assert/strict";
import { test } from "node:test";
import { makeHass, NOON } from "./hass.mjs";
import { load, mount } from "./load.mjs";

const lib = load(NOON);

// Home Assistant's default themes (the screenshots use the same values).
const THEMES = {
  light: { "--primary-text-color": "#212121", "--card-background-color": "#ffffff", "--disabled-text-color": "#bdbdbd" },
  dark: { "--primary-text-color": "#e1e1e1", "--card-background-color": "#1c1c1c", "--disabled-text-color": "#6f6f6f" },
};

// Splits on the commas that are not inside parentheses.
const args = (s) => {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && !depth) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
};

// A CSS color expression → [r, g, b, alpha], with `vars` for the custom properties.
const resolve = (expr, vars) => {
  const e = expr.trim();
  if (e === "transparent") return [0, 0, 0, 0];
  let m = e.match(/^#([0-9a-f]{6})$/i);
  if (m) return [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)).concat(1);
  m = e.match(/^var\((--[\w-]+)\s*(?:,(.*))?\)$/s);
  if (m) {
    if (vars[m[1]] != null) return resolve(vars[m[1]], vars);
    assert.ok(m[2], `no value for ${m[1]}`);
    return resolve(m[2], vars);
  }
  m = e.match(/^color-mix\(\s*in srgb\s*,(.*)\)$/s);
  if (m) {
    const [a, b] = args(m[1]).map((part) => {
      const p = part.match(/^(.*?)(?:\s+([\d.]+)%)?$/s);
      return { c: resolve(p[1], vars), p: p[2] == null ? null : Number(p[2]) / 100 };
    });
    const pa = a.p ?? (b.p == null ? 0.5 : 1 - b.p);
    const pb = 1 - pa;
    // Premultiplied alpha, as in CSS Color 5.
    const alpha = a.c[3] * pa + b.c[3] * pb;
    const rgb = [0, 1, 2].map((i) => (alpha ? (a.c[i] * a.c[3] * pa + b.c[i] * b.c[3] * pb) / alpha : 0));
    return [...rgb, alpha];
  }
  throw new Error(`unsupported color: ${e}`);
};

const over = (c, bg) => [0, 1, 2].map((i) => c[i] * c[3] + bg[i] * (1 - c[3]));
const luminance = (rgb) => {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// Contrast of a text color on a background (itself possibly a translucent tint over the card), in one theme.
const contrast = (color, background, theme, vars = {}) => {
  const v = { ...THEMES[theme], ...vars };
  const card = resolve("var(--card-background-color)", v).slice(0, 3);
  const bg = background ? over(resolve(background, v), card) : card;
  return ratio(over(resolve(color, v), bg), bg);
};

// Every state color the scales give the card.
const STATE_COLORS = [
  ...new Set(
    [
      ...lib.WX_UV.map((l) => l.color),
      ...lib.WX_ALERT_COLORS,
      ...lib.WX_VG_COLORS,
      ...lib.WX_AQ_COLORS,
      ...lib.WX_LEVEL_COLORS,
      ...Object.values(lib.WX_CONDITIONS).map((c) => c.color),
      "var(--disabled-text-color, #9e9e9e)",
    ].filter(Boolean),
  ),
];

// The declarations of the rule written exactly `selector { … }` in the card's styles.
const rule = (selector) => {
  const esc = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = lib.WX_STYLES.match(new RegExp(`(?:^|\\n)\\s*${esc}\\s*\\{([^}]*)\\}`));
  assert.ok(m, `rule ${selector}`);
  const decl = (prop) => m[1].match(new RegExp(`(?:^|[;{\\s])${prop}:\\s*([^;]+);`))?.[1];
  return { color: decl("color"), background: decl("background") };
};

const AA = 4.5;

test("contrast: text in a state color reaches 4.5:1 on the card, light and dark", () => {
  const failures = [];
  // Rules whose text takes the color of a scale through --k (or the status pill's --st-color / --wx-color).
  for (const selector of [".uvval", ".chip.tint", ".st"]) {
    const { color, background } = rule(selector);
    for (const k of STATE_COLORS)
      for (const theme of Object.keys(THEMES)) {
        const r = contrast(color, background, theme, { "--k": k, "--st-color": k, "--wx-color": k });
        if (r < AA) failures.push(`${selector} ${k} ${theme} ${r.toFixed(2)}:1`);
      }
  }
  // Rain probabilities and strong wind: one fixed color each.
  for (const selector of [".pv", ".drow .pp", ".wcol.strong"]) {
    const { color, background } = rule(selector);
    for (const theme of Object.keys(THEMES)) {
      const r = contrast(color, background, theme);
      if (r < AA) failures.push(`${selector} ${theme} ${r.toFixed(2)}:1`);
    }
  }
  assert.deepEqual(failures, []);
});

// The level's label next to its badge (UV, air quality, pollen), colored inline.
const labelColors = (out) => [...out.matchAll(/<div class="uvtxt"><b style="color:([^"]+)">/g)].map((m) => m[1].replaceAll("&quot;", '"'));

test("contrast: the UV, air quality and pollen level labels reach 4.5:1 at every level, light and dark", () => {
  const failures = [];
  const check = (what, out) => {
    const colors = labelColors(out);
    assert.ok(colors.length, `${what}: a level label`);
    for (const color of colors)
      for (const theme of Object.keys(THEMES)) {
        const r = contrast(color, null, theme);
        if (r < AA) failures.push(`${what} ${color} ${theme} ${r.toFixed(2)}:1`);
      }
  };
  const render = (changes) => {
    const el = mount(lib, "weather-plus-card", { type: "custom:weather-plus-card" }, makeHass("en", changes));
    return el.shadowRoot.innerHTML.replace(/<style>[\s\S]*?<\/style>/g, "");
  };
  for (const uv of [1, 4, 6, 9, 12]) {
    const out = render({ "sensor.paris_uv": { state: uv } });
    check(`UV ${uv}`, out.slice(out.indexOf("s-uv"), out.indexOf("s-uv") + 2000));
  }
  for (const level of [1, 2, 3, 4, 5, 6]) {
    const air = render({ "sensor.atmo_france_qualite_globale_paris": { state: level } });
    check(`air ${level}`, air.slice(air.indexOf("s-air")));
    const pollen = render({ "sensor.pollens_75_risklevel": { state: level } });
    check(`pollen ${level}`, pollen.slice(pollen.indexOf("s-pollen")));
  }
  assert.deepEqual(failures, []);
});

test("contrast: the state colors stay on the badges, dots and bars", () => {
  const out = mount(lib, "weather-plus-card", { type: "custom:weather-plus-card" }, makeHass("en", { "sensor.paris_uv": { state: 4 } })).shadowRoot.innerHTML;
  // The badge keeps its level color for its tint, the gauge's mark and the level bar their raw colors.
  assert.match(out, /<span class="uvval" style="--k:#fdd835">4<\/span>/);
  assert.match(out, /class="mark" style="left:[\d.]+%;--k:#fdd835"/);
  assert.match(rule(".uvval").background, /var\(--k\) 18%/);
  assert.match(rule(".pbar span").background ?? "", /#42a5f5/);
  assert.match(lib.WX_STYLES, /\.dots i\.on \{ background: var\(--k\); \}/);
});
