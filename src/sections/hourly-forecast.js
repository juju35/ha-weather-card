// ── Hourly forecast: icons, a temperature curve and the precipitation ──
import { wxBearing, wxSectionTitle } from "./core.js";

export const WX_COL = 52;
export function wxSectionHourly(card, m) {
  const h = m.hourly;
  if (!h?.length) return "";
  const temps = h.map((x) => x.temperature).filter((t) => t != null);
  if (!temps.length) return "";
  const lo = Math.min(...temps);
  const hi = Math.max(...temps);
  const W = h.length * WX_COL;
  const y = (t) => (hi === lo ? 30 : 40 - ((t - lo) / (hi - lo)) * 20);
  // An hour without a temperature takes the value interpolated between its known neighbours (the nearest one at the
  // edges), so the curve passes through instead of diving to the minimum; its dot and label stay hidden.
  const t = h.map((x) => x.temperature);
  const known = t.map((v, i) => (v == null ? null : i)).filter((i) => i != null);
  const fill = (i) => {
    const p = known.findLast((k) => k < i);
    const n = known.find((k) => k > i);
    if (p == null) return t[n];
    if (n == null) return t[p];
    return t[p] + ((t[n] - t[p]) * (i - p)) / (n - p);
  };
  const pts = h.map((_, i) => [i * WX_COL + WX_COL / 2, y(t[i] ?? fill(i))]);
  // A smooth curve through the points (Catmull-Rom as cubic Béziers).
  let d = `M${pts[0][0]} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 2] || pts[i - 1];
    const p1 = pts[i - 1];
    const p2 = pts[i];
    const p3 = pts[i + 1] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${p2[0]} ${p2[1].toFixed(1)}`;
  }
  const area = `${d}L${pts.at(-1)[0]} 48L${pts[0][0]} 48Z`;
  // The curve stretches with the track (the columns share its width), so the dots and the temperatures are laid in
  // the columns rather than in the SVG, where they would stretch too.
  const labels = pts
    .map((p, i) =>
      h[i].temperature == null
        ? '<div class="pt"></div>'
        : `<div class="pt" style="--y:${p[1].toFixed(1)}px"><span>${wxFmtNum(m.fmt, h[i].temperature, 0)}°</span><i></i></div>`,
    )
    .join("");
  const curve =
    `<div class="curve"><svg viewBox="0 0 ${W} 48" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="wx-area" x1="0" y1="0" x2="0" y2="1">` +
    '<stop offset="0" stop-color="var(--wx-color)" stop-opacity=".28"/><stop offset="1" stop-color="var(--wx-color)" stop-opacity="0"/></linearGradient></defs>' +
    `<path class="area" d="${area}" fill="url(#wx-area)"/><path class="line" d="${d}" pathLength="100"/></svg><div class="hrow pts">${labels}</div></div>`;
  const top = h
    .map(
      (x, i) =>
        `<div class="hcol${i === 0 ? " now" : ""}"><span class="t">${wxEsc(i === 0 ? card._t("now") : wxTime(m.fmt, x.datetime, true, m.tf))}</span>` +
        `<ha-icon icon="${wxCondIcon(x.condition, x.night)}" style="color:${wxCondColor(x.condition, x.night)}"></ha-icon></div>`,
    )
    .join("");
  // The precipitation of each hour: its probability, or its amount when the provider gives no probability.
  const wet = h.some((x) => x.precipitation_probability > 0 || x.precipitation > 0);
  // The wind of each hour: an arrow pointing where it blows, its speed, the gusts on hover.
  const windy = h.some((x) => x.wind_speed != null);
  const wunit = m.a.wind_speed_unit || "km/h";
  // "Strong wind" at about 50 km/h, whatever unit the provider speaks.
  const strongAt = { "km/h": 50, mph: 31, "m/s": 14, kn: 27, "ft/s": 45, Beaufort: 7 }[wunit] ?? 50;
  const wind = windy
    ? h
        .map((x) => {
          const b = wxBearing(m.lang, x.wind_bearing);
          const gust = wxNumber(x.wind_gust_speed);
          const title = [b?.label, x.wind_speed != null ? `${wxFmtNum(m.fmt, x.wind_speed, 0)} ${wunit}` : "", gust ? card._t("gusts", { v: `${wxFmtNum(m.fmt, gust, 0)} ${wunit}` }) : ""]
            .filter(Boolean)
            .join(" · ");
          const strong = (gust ?? x.wind_speed ?? 0) >= strongAt;
          return (
            `<div class="wcol${strong ? " strong" : ""}" title="${wxEsc(title)}">${b ? `<span class="arrow" style="transform:rotate(${(b.deg + 180) % 360}deg)"><ha-icon icon="mdi:navigation"></ha-icon></span>` : ""}` +
            `<span>${x.wind_speed != null ? wxFmtNum(m.fmt, x.wind_speed, 0) : ""}</span></div>`
          );
        })
        .join("")
    : "";
  // A full bar at 4 mm an hour, whatever unit the provider speaks.
  const punit = m.a.precipitation_unit || "mm";
  const bottom = h
    .map((x) => {
      const p = x.precipitation_probability;
      const amount = x.precipitation;
      const pct = p != null ? p : amount != null ? Math.min(100, wxToMm(amount, punit) * 25) : 0;
      const txt = p != null ? (p ? `${wxFmtNum(m.fmt, p, 0)} %` : "") : amount ? `${wxFmtNum(m.fmt, amount, 1)}` : "";
      return `<div class="pcol"><div class="pbar"><span style="height:${Math.max(0, Math.min(100, pct))}%"></span></div><span class="pv">${wxEsc(txt)}</span></div>`;
    })
    .join("");
  return (
    `<div class="section s-hourly">${wxSectionTitle(card, "hourly")}<div class="hscroll"><div class="track" style="min-width:${W}px">` +
    `<div class="hrow">${top}</div>${curve}${wet ? `<div class="hrow">${bottom}</div>` : ""}${windy ? `<div class="hrow">${wind}</div>` : ""}</div></div></div>`
  );
}
