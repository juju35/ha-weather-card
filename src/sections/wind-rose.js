// ── Wind rose: where the wind came from over the last hours, by speed (a local weather station's history) ──
// Speeds in km/h for the classes, whatever the unit of the source; Beaufort's steps: 1–2, 3, 4, 5, 6, 7 and up.
import { WX_CARDINALS, wxChip, wxSectionTitle } from "./core.js";
import { wxSectionAlerts } from "./alerts.js";
import { wxSectionRain } from "./rain-in-next.js";
import { wxSectionHourly } from "./hourly-forecast.js";
import { wxSectionDaily } from "./daily-forecast.js";
import { wxSectionUv } from "./uv-index.js";
import { wxSectionAir } from "./air-quality.js";
import { wxSectionPollen } from "./pollen.js";
import { wxSectionSun } from "./sun.js";
import { wxSectionMoon } from "./moon.js";

export const WX_WIND_TO_KMH = [
  [/m\/s/i, 3.6],
  [/mph|mi\/h/i, 1.609344],
  [/kn|knot|kt/i, 1.852],
  [/ft\/s/i, 1.09728],
];
export const wxKmhFactor = (unit) => WX_WIND_TO_KMH.find(([re]) => re.test(unit || ""))?.[1] ?? 1;
// Below 1 km/h the wind is calm: it has no direction.
export const WX_WIND_CALM = 1;
export const WX_WIND_STEPS = [6, 20, 29, 39, 50];
export const WX_WIND_COLORS = ["#90caf9", "#4dd0e1", "#9ccc65", "#ffca28", "#ff7043", "#e53935"];

// The rose from the history: `dirs` and `speeds` as [time ms, value] in time order (the first one is the state at
// `start`), each reading held until the next. Returns the share of the time per sector (16, from N clockwise) and per
// speed class, the calm share, or null when nothing was recorded. No speeds: a single class.
export function wxWindRose(dirs, speeds, start, end, unit) {
  const k = wxKmhFactor(unit);
  const cuts = [...new Set([start, ...dirs.map((d) => d[0]), ...(speeds || []).map((d) => d[0]), end])].filter((t) => t >= start && t <= end).sort((a, b) => a - b);
  const at = (list, t) => {
    let v = null;
    for (const [tt, x] of list) {
      if (tt > t) break;
      v = x;
    }
    return v;
  };
  const classes = speeds ? WX_WIND_STEPS.length + 1 : 1;
  const bins = Array.from({ length: 16 }, () => new Array(classes).fill(0));
  let calm = 0;
  let total = 0;
  for (let i = 0; i < cuts.length - 1; i++) {
    const dt = cuts[i + 1] - cuts[i];
    const deg = at(dirs, cuts[i]);
    const v = speeds ? at(speeds, cuts[i]) : null;
    if (speeds && v != null && v * k < WX_WIND_CALM) {
      calm += dt;
      total += dt;
      continue;
    }
    if (deg == null || (speeds && v == null)) continue;
    const sector = Math.round((((deg % 360) + 360) % 360) / 22.5) % 16;
    const c = speeds ? WX_WIND_STEPS.filter((x) => v * k >= x).length : 0;
    bins[sector][c] += dt;
    total += dt;
  }
  if (!total) return null;
  return { bins: bins.map((b) => b.map((x) => x / total)), calm: calm / total, speeds: !!speeds };
}

// A petal's piece: the ring between radii r1 and r2 over the angles a1 → a2 (degrees, from north clockwise).
export function wxWedge(c, r1, r2, a1, a2) {
  const p = (r, a) => {
    const t = (a * Math.PI) / 180;
    return `${(c + r * Math.sin(t)).toFixed(1)} ${(c - r * Math.cos(t)).toFixed(1)}`;
  };
  return `M${p(r2, a1)}A${r2.toFixed(1)} ${r2.toFixed(1)} 0 0 1 ${p(r2, a2)}L${p(r1, a2)}A${r1.toFixed(1)} ${r1.toFixed(1)} 0 0 0 ${p(r1, a1)}Z`;
}

// The speed classes' bounds in the source's unit: "< 6", "6–20" … "50+" km/h.
export function wxWindLegend(fmt, unit) {
  const k = wxKmhFactor(unit);
  const n = (x) => wxFmtNum(fmt, x / k, k > 2 ? 1 : 0);
  const s = WX_WIND_STEPS;
  return [`< ${n(s[0])}`, ...s.slice(1).map((x, i) => `${n(s[i])}–${n(x)}`), `${n(s.at(-1))}+`];
}

export function wxSectionWind(card, m) {
  const w = m.wind;
  if (!w?.rose) return "";
  const { bins, calm, speeds } = w.rose;
  const C = 110;
  const R = 86;
  const r0 = 15;
  const totals = bins.map((b) => b.reduce((a, x) => a + x, 0));
  const max = Math.max(...totals) || 1;
  // A round scale for the rings (5, 10, 15, 20 %…), the outer ring just past the longest petal.
  const step = [0.02, 0.05, 0.1, 0.2, 0.25].find((x) => max / x <= 4) || 0.25;
  const top = Math.max(step, Math.ceil(max / step) * step);
  const rad = (p) => r0 + ((R - r0) * p) / top;
  const petals = bins
    .map((b, i) => {
      let cum = 0;
      return b
        .map((x, c) => {
          if (!x) return "";
          const d = wxWedge(C, rad(cum), rad(cum + x), i * 22.5 - 9.5, i * 22.5 + 9.5);
          cum += x;
          return `<path class="petal" d="${d}" style="fill:${speeds ? WX_WIND_COLORS[c] : "var(--wx-color)"};--d:${(i * 0.03).toFixed(2)}s"/>`;
        })
        .join("");
    })
    .join("");
  const pct = (v) => wxFmtNum(m.fmt, v * 100, 0);
  const rings = [];
  const ringLabels = [];
  for (let v = step; v <= top + 1e-9; v += step) {
    const r = rad(v);
    rings.push(`<circle class="ring" cx="${C}" cy="${C}" r="${r.toFixed(1)}"/>`);
    // Along the north-east diagonal, where the labels sit clear of the cardinal axes.
    const t = Math.PI / 4;
    ringLabels.push(`<text class="rl" x="${(C + r * Math.sin(t)).toFixed(1)}" y="${(C - r * Math.cos(t)).toFixed(1)}">${wxEsc(pct(v))} %</text>`);
  }
  const names = WX_CARDINALS[m.lang] || WX_CARDINALS.en;
  const pt = (r, deg) => {
    const t = (deg * Math.PI) / 180;
    return [(C + r * Math.sin(t)).toFixed(1), (C - r * Math.cos(t)).toFixed(1)];
  };
  // N, E, S, W in bold outside the rim, a tick for every other point of the compass.
  const ticks = Array.from({ length: 16 }, (_, i) => {
    const [x1, y1] = pt(R + 2, i * 22.5);
    const [x2, y2] = pt(R + (i % 4 ? 5 : 8), i * 22.5);
    return `M${x1} ${y1}L${x2} ${y2}`;
  }).join("");
  const cards = [0, 4, 8, 12]
    .map((i) => {
      const [x, y] = pt(R + 17, i * 22.5);
      return `<text class="cp" x="${x}" y="${y}">${wxEsc(names[i])}</text>`;
    })
    .join("");
  const now = w.now;
  // The current wind: an arrow from the rim, where it blows from, towards the centre, swaying in the gusts.
  const mark = now?.b
    ? `<g class="wmark" transform="rotate(${now.b.deg.toFixed(0)} ${C} ${C})"><path d="M${C} ${C - R - 2}l-7 -12h14z"/><path class="wline" d="M${C} ${C - R + 2}V${C - r0 - 2}"/></g>`
    : "";
  const dominant = totals.indexOf(max);
  const sp = wxWindSpeed(m.fmt, now?.speed, w.unit);
  const head =
    `<div class="wnowrow"><span class="wspeed">${sp ? `${wxEsc(sp)}<small>${wxEsc(w.unit)}</small>` : ""}</span>` +
    (now?.b ? `<span class="wdir"><span class="arrow" style="transform:rotate(${((now.b.deg + 180) % 360).toFixed(0)}deg)"><ha-icon icon="mdi:navigation"></ha-icon></span><b>${wxEsc(now.b.label)}</b></span>` : "") +
    "</div>";
  const chips = [
    now?.gust != null ? wxChip("mdi:weather-windy", card._t("gusts", { v: `${wxFmtNum(m.fmt, now.gust, 0)} ${w.unit}` }), { cls: "wgust" }) : "",
    wxChip("mdi:compass-outline", card._t("wind_from", { d: names[dominant], v: pct(max) }), { color: "var(--wx-color)", cls: "tint" }),
    calm > 0 ? wxChip("mdi:circle-outline", card._t("wind_calm", { v: pct(calm) })) : "",
  ].filter(Boolean);
  const legend = speeds
    ? `<div class="wlegend">${wxWindLegend(m.fmt, w.unit)
        .map((t, i) => `<span><i style="background:${WX_WIND_COLORS[i]}"></i>${wxEsc(t)}</span>`)
        .join("")}</div>`
    : "";
  return (
    `<div class="section s-wind">${wxSectionTitle(card, "wind", `<span class="wper">${wxEsc(card._t("wind_period", { n: w.hours }))}</span>`)}` +
    `<div class="windrose" data-more="${wxEsc(w.entity)}" role="button" tabindex="0">` +
    `<svg class="rose" viewBox="0 0 220 220" aria-hidden="true">${rings.join("")}<path class="axis" d="M${C} ${C - R}V${C + R}M${C - R} ${C}H${C + R}"/>` +
    `<path class="tick" d="${ticks}"/>${petals}<circle class="hub" cx="${C}" cy="${C}" r="${r0 - 2}"/>${ringLabels.join("")}${cards}${mark}</svg>` +
    `<div class="wtxt">${head}<div class="chips">${chips.join("")}</div>${legend ? `<div class="wunit">${wxEsc(w.unit)}</div>${legend}` : ""}</div></div></div>`
  );
}

// The speed with its precision: one decimal under 10 in m/s, knots or mph, whole numbers otherwise.
export const wxWindSpeed = (fmt, v, unit) => (v == null ? "" : wxFmtNum(fmt, v, v < 10 && wxKmhFactor(unit) > 2 ? 1 : 0));

export const WX_SECTION_RENDER = {
  alerts: wxSectionAlerts,
  rain: wxSectionRain,
  hourly: wxSectionHourly,
  daily: wxSectionDaily,
  air: wxSectionAir,
  uv: wxSectionUv,
  pollen: wxSectionPollen,
  sun: wxSectionSun,
  moon: wxSectionMoon,
  wind: wxSectionWind,
};
