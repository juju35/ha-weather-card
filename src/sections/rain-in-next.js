// ── Rain in the next hour (Météo-France), with the rain / snow / frost chances ──
// The tooltip of a cell of the rain bar, also rewritten as the minute tick counts the rain down (see _patchRain).
import { wxChip, wxSectionTitle } from "./core.js";

export function wxRainSegTitle(card, s) {
  return `${card._t("min_n", { n: s.min })} · ${card._t(`rain_${s.level}`)}`;
}

export function wxSectionRain(card, m) {
  const r = m.rain;
  const chances = [
    ["rain_chance", "mdi:umbrella-outline"],
    ["snow_chance", "mdi:snowflake"],
    ["freeze_chance", "mdi:snowflake-alert"],
  ]
    // The rain chance is always shown, even at 0 %: "Rain 0 %" answers the question this section is about.
    // Snow and frost chances only show up when above 0: at 0 they are noise for most of the year.
    .filter(([k]) => m.chances?.[k] != null && (k === "rain_chance" || m.chances[k] > 0))
    .map(([k, icon]) => wxChip(icon, card._t(k, { v: `${wxFmtNum(m.fmt, m.chances[k], 0)} %` }), { more: m.ent[k] }));
  const t = m.totals;
  const amount = (v) => `${wxFmtNum(m.fmt, v, 1)} ${t.unit}`;
  const totals = t
    ? [
        t.today != null ? wxChip("mdi:weather-rainy", card._t("rain_today", { v: amount(t.today) }), { more: m.ent.daily_precipitation }) : "",
        t.next6 != null ? wxChip("mdi:clock-outline", card._t("rain_next", { h: 6, v: amount(t.next6) })) : "",
        t.next24 != null ? wxChip("mdi:calendar-today-outline", card._t("rain_next", { h: 24, v: amount(t.next24) })) : "",
      ].filter(Boolean)
    : [];
  chances.push(...totals);
  if (!r && !chances.length) return "";
  let body = "";
  if (r) {
    const segs = r.segments
      .map((s, i) =>
        s.na
          ? `<span class="seg na" data-k="na" style="flex:${s.span}"></span>`
          : `<span class="seg l${s.level}" data-k="${s.k}" style="flex:${s.span};--d:${(i * 0.05).toFixed(2)}s" title="${wxEsc(wxRainSegTitle(card, s))}"></span>`,
      )
      .join("");
    const ticks = [0, 15, 30, 45, 60].map((n) => `<span>${wxEsc(n ? card._t("min_n", { n }) : card._t("now"))}</span>`).join("");
    body =
      `<div class="rain-head${r.raining ? " wet" : ""}" data-more="${wxEsc(m.ent.next_rain)}" role="button" tabindex="0"><ha-icon icon="${
        r.raining ? "mdi:weather-pouring" : r.next != null ? "mdi:weather-rainy" : "mdi:weather-cloudy-clock"
      }"></ha-icon><span class="rain-text">${wxEsc(r.headline)}</span></div>` +
      `<div class="rainbar">${segs}</div><div class="ticks">${ticks}</div>`;
  }
  return `<div class="section s-rain">${wxSectionTitle(card, "rain")}${body}${chances.length ? `<div class="chips">${chances.join("")}</div>` : ""}</div>`;
}
