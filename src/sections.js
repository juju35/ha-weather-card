/*
 * The sections of the weather card, in the order of `sections`: each one draws itself from the card's model and
 * returns nothing when it has no data, so that a missing integration simply hides its section.
 */

const WX_CARDINALS = {
  en: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  fr: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
  de: ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  es: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
};

// A wind bearing in degrees, or already a cardinal point ("NW"), as { deg, label }.
function wxBearing(lang, b) {
  const n = wxNumber(b);
  const en = WX_CARDINALS.en;
  if (n == null) {
    const i = en.indexOf(String(b ?? "").toUpperCase());
    return i < 0 ? null : { deg: i * 22.5, label: (WX_CARDINALS[lang] || en)[i] };
  }
  const i = Math.round((((n % 360) + 360) % 360) / 22.5) % 16;
  return { deg: n, label: (WX_CARDINALS[lang] || en)[i] };
}

// A colour for a temperature in °C (cold blue → mild green → hot red), for the daily range bars.
const WX_TEMP_STOPS = [
  [-10, [92, 107, 192]],
  [0, [41, 182, 246]],
  [10, [38, 198, 218]],
  [16, [102, 187, 106]],
  [22, [255, 202, 40]],
  [28, [251, 140, 0]],
  [35, [229, 57, 53]],
];
function wxTempColor(c) {
  const s = WX_TEMP_STOPS;
  if (c <= s[0][0]) return `rgb(${s[0][1]})`;
  for (let i = 1; i < s.length; i++) {
    if (c <= s[i][0]) {
      const k = (c - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
      return `rgb(${s[i][1].map((v, j) => Math.round(s[i - 1][1][j] + (v - s[i - 1][1][j]) * k)).join(",")})`;
    }
  }
  return `rgb(${s.at(-1)[1]})`;
}
const wxToC = (t, unit) => (/F/.test(unit || "") ? ((t - 32) * 5) / 9 : t);

// The icon in front of each section heading.
const WX_SECTION_ICONS = {
  alerts: "mdi:alert-outline",
  rain: "mdi:weather-rainy",
  hourly: "mdi:clock-outline",
  daily: "mdi:calendar-range",
  uv: "mdi:sun-wireless-outline",
  air: "mdi:air-filter",
  pollen: "mdi:flower-pollen",
  sun: "mdi:weather-sunset",
  moon: "mdi:moon-waning-crescent",
};

const wxSectionTitle = (card, key, extra = "") =>
  `<div class="section-title"><ha-icon icon="${WX_SECTION_ICONS[key]}"></ha-icon><span>${wxEsc(card._t(`s_${key}`))}</span>${extra}</div>`;

const wxChip = (icon, text, { color, cls = "", more, title, style } = {}) =>
  `<span class="chip ${cls}"${color ? ` style="--k:${color}${style ? `;${style}` : ""}"` : style ? ` style="${style}"` : ""}${
    more ? ` data-more="${wxEsc(more)}" role="button" tabindex="0"` : ""
  }${title ? ` title="${wxEsc(title)}"` : ""}><ha-icon icon="${icon}"></ha-icon>${wxEsc(text)}</span>`;

// ── Alerts: weather warnings, drought restrictions, lightning nearby, storms in the forecast ──
const wxStrikes = (card, n) => (n === 1 ? card._t("strikes_1") : card._t("strikes", { n: wxFmtNum(card._lang(), n, 0) }));

function wxAlertChips(card, m, { onlyActive = false } = {}) {
  const out = [];
  const al = m.alerts;
  if (al) {
    const active = al.phenomena.filter((p) => p.level >= 2).sort((a, b) => b.level - a.level);
    for (const p of active) {
      out.push(
        wxChip(p.icon, card._t("ph_level", { p: card._t(`ph_${p.key}`), l: card._t(`lvlw_${p.level}`) }), {
          color: WX_ALERT_COLORS[p.level],
          cls: `tint lvl${p.level}${p.level >= 3 ? " pulse" : ""}`,
          more: al.entity,
          title: `${card._t(`ph_title_${p.key}`)} · ${card._t("vigilance_level", { v: card._t(`lvl_${p.level}`) })}`,
        }),
      );
    }
    if (!active.length && !onlyActive) out.push(wxChip("mdi:shield-check-outline", card._t("no_alert"), { color: WX_ALERT_COLORS[1], cls: "tint", more: al.entity }));
  }
  const vg = m.vigieau;
  if (vg && (vg.level >= 1 || !onlyActive)) {
    out.push(
      wxChip(vg.level >= 1 ? "mdi:water-alert-outline" : "mdi:water-check-outline", vg.level ? card._t("drought", { v: card._t(`vg_${vg.level}`) }) : card._t("vg_0"), {
        color: WX_VG_COLORS[vg.level],
        cls: `tint${vg.level >= 3 ? " pulse" : ""}`,
        more: vg.entity,
      }),
    );
  }
  const lt = m.lightning;
  if (lt?.count > 0) {
    const d = lt.dist != null ? `${wxFmtNum(m.lang, lt.dist, 0)} ${lt.unit}` : "";
    out.push(
      wxChip("mdi:flash", card._t(d ? "lightning_n" : "lightning_count", { d, s: wxStrikes(card, lt.count) }), {
        color: WX_BOLT_COLOR,
        cls: "tint pulse bolt",
        more: lt.entity,
      }),
    );
  }
  if (m.air?.level >= 4) {
    out.push(
      wxChip("mdi:air-filter", card._t("air_chip", { v: card._t(`aq_${m.air.level}`).toLowerCase() }), {
        color: WX_AQ_COLORS[m.air.level],
        cls: "tint pulse",
        more: m.air.entity,
      }),
    );
  }
  if (m.pollen?.level >= 4) {
    out.push(
      wxChip("mdi:flower-pollen", card._t("pollen_chip", { v: card._t(`pl_${m.pollen.level}`).toLowerCase() }), {
        color: WX_LEVEL_COLORS[m.pollen.level],
        cls: "tint pulse",
        more: m.pollen.entity,
      }),
    );
  }
  if (m.air?.tomorrow >= 4 && m.air.level < 4) {
    out.push(wxChip("mdi:calendar-alert", card._t("air_tomorrow", { v: card._t(`aq_${m.air.tomorrow}`).toLowerCase() }), { color: WX_AQ_COLORS[m.air.tomorrow], cls: "tint" }));
  }
  if (m.pollen?.tomorrow >= 4 && m.pollen.level < 4) {
    out.push(
      wxChip("mdi:calendar-alert", card._t("pollen_tomorrow", { v: card._t(`pl_${m.pollen.tomorrow}`).toLowerCase() }), {
        color: WX_LEVEL_COLORS[m.pollen.tomorrow],
        cls: "tint",
      }),
    );
  }
  if (m.storm) out.push(wxChip("mdi:weather-lightning", card._t("storm_at", { t: m.storm }), { color: WX_BOLT_COLOR, cls: "tint" }));
  return out;
}

function wxSectionAlerts(card, m) {
  const chips = wxAlertChips(card, m);
  if (!chips.length) return "";
  const restrictions = m.vigieau?.restrictions?.length
    ? `<ul class="restrictions">${m.vigieau.restrictions
        .slice(0, 4)
        .map((r) => `<li><b>${wxEsc(r.usage)}</b>${r.text ? ` · ${wxEsc(r.text)}` : ""}</li>`)
        .join("")}</ul>`
    : "";
  return `<div class="section s-alerts">${wxSectionTitle(card, "alerts")}<div class="chips">${chips.join("")}</div>${restrictions}</div>`;
}

// ── Rain in the next hour (Météo-France), with the rain / snow / frost chances ──
// The tooltip of a cell of the rain bar, also rewritten as the minute tick counts the rain down (see _patchRain).
function wxRainSegTitle(card, s) {
  return `${card._t("min_n", { n: s.min })} · ${card._t(`rain_${s.level}`)}`;
}

function wxSectionRain(card, m) {
  const r = m.rain;
  const chances = [
    ["rain_chance", "mdi:umbrella-outline"],
    ["snow_chance", "mdi:snowflake"],
    ["freeze_chance", "mdi:snowflake-alert"],
  ]
    // The rain chance is always shown, even at 0 %: "Rain 0 %" answers the question this section is about.
    // Snow and frost chances only show up when above 0: at 0 they are noise for most of the year.
    .filter(([k]) => m.chances?.[k] != null && (k === "rain_chance" || m.chances[k] > 0))
    .map(([k, icon]) => wxChip(icon, card._t(k, { v: `${wxFmtNum(m.lang, m.chances[k], 0)} %` }), { more: m.ent[k] }));
  const t = m.totals;
  const amount = (v) => `${wxFmtNum(m.lang, v, 1)} ${t.unit}`;
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

// ── Hourly forecast: icons, a temperature curve and the precipitation ──
const WX_COL = 52;
function wxSectionHourly(card, m) {
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
        : `<div class="pt" style="--y:${p[1].toFixed(1)}px"><span>${wxFmtNum(m.lang, h[i].temperature, 0)}°</span><i></i></div>`,
    )
    .join("");
  const curve =
    `<div class="curve"><svg viewBox="0 0 ${W} 48" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="wx-area" x1="0" y1="0" x2="0" y2="1">` +
    '<stop offset="0" stop-color="var(--wx-color)" stop-opacity=".28"/><stop offset="1" stop-color="var(--wx-color)" stop-opacity="0"/></linearGradient></defs>' +
    `<path class="area" d="${area}" fill="url(#wx-area)"/><path class="line" d="${d}" pathLength="100"/></svg><div class="hrow pts">${labels}</div></div>`;
  const top = h
    .map(
      (x, i) =>
        `<div class="hcol${i === 0 ? " now" : ""}"><span class="t">${wxEsc(i === 0 ? card._t("now") : wxTime(m.lang, x.datetime, true))}</span>` +
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
          const title = [b?.label, x.wind_speed != null ? `${wxFmtNum(m.lang, x.wind_speed, 0)} ${wunit}` : "", gust ? card._t("gusts", { v: `${wxFmtNum(m.lang, gust, 0)} ${wunit}` }) : ""]
            .filter(Boolean)
            .join(" · ");
          const strong = (gust ?? x.wind_speed ?? 0) >= strongAt;
          return (
            `<div class="wcol${strong ? " strong" : ""}" title="${wxEsc(title)}">${b ? `<span class="arrow" style="transform:rotate(${(b.deg + 180) % 360}deg)"><ha-icon icon="mdi:navigation"></ha-icon></span>` : ""}` +
            `<span>${x.wind_speed != null ? wxFmtNum(m.lang, x.wind_speed, 0) : ""}</span></div>`
          );
        })
        .join("")
    : "";
  const bottom = h
    .map((x) => {
      const p = x.precipitation_probability;
      const amount = x.precipitation;
      const pct = p != null ? p : amount != null ? Math.min(100, amount * 25) : 0;
      const txt = p != null ? (p ? `${wxFmtNum(m.lang, p, 0)} %` : "") : amount ? `${wxFmtNum(m.lang, amount, 1)}` : "";
      return `<div class="pcol"><div class="pbar"><span style="height:${Math.max(0, Math.min(100, pct))}%"></span></div><span class="pv">${wxEsc(txt)}</span></div>`;
    })
    .join("");
  return (
    `<div class="section s-hourly">${wxSectionTitle(card, "hourly")}<div class="hscroll"><div class="track" style="min-width:${W}px">` +
    `<div class="hrow">${top}</div>${curve}${wet ? `<div class="hrow">${bottom}</div>` : ""}${windy ? `<div class="hrow">${wind}</div>` : ""}</div></div></div>`
  );
}

// ── Daily forecast: one row a day, with its temperature range against the whole week ──
function wxSectionDaily(card, m) {
  const days = m.daily;
  if (!days?.length) return "";
  const lows = days.map((d) => d.templow ?? d.temperature).filter((t) => t != null);
  const highs = days.map((d) => d.temperature).filter((t) => t != null);
  if (!highs.length) return "";
  const min = Math.min(...lows, ...(m.temp != null ? [m.temp] : []));
  const max = Math.max(...highs, ...(m.temp != null ? [m.temp] : []));
  const span = max - min || 1;
  const unit = m.tempUnit;
  const rows = days
    .map((d, i) => {
      const lo = d.templow ?? d.temperature;
      const hi = d.temperature;
      // A day without a high (or a low) gets no bar rather than one at NaN %.
      const bar = lo != null && hi != null;
      const left = bar ? ((lo - min) / span) * 100 : 0;
      const width = bar ? Math.max(4, ((hi - lo) / span) * 100) : 0;
      const grad = bar ? `linear-gradient(90deg, ${wxTempColor(wxToC(lo, unit))}, ${wxTempColor(wxToC(hi, unit))})` : "";
      const today = i === 0 && wxSameDay(new Date(d.datetime), new Date());
      const now = today && m.temp != null ? `<span class="nowdot" style="left:${(((m.temp - min) / span) * 100).toFixed(1)}%"></span>` : "";
      const p = d.precipitation_probability;
      return (
        `<div class="drow" style="--d:${(i * 0.06).toFixed(2)}s"><span class="day">${wxEsc(today ? card._t("today") : wxDay(m.lang, d.datetime))}</span>` +
        `<ha-icon icon="${wxCondIcon(d.condition, false)}" style="color:${wxCondColor(d.condition, false)}"></ha-icon>` +
        `<span class="pp">${p ? `${wxFmtNum(m.lang, p, 0)} %` : ""}</span>` +
        `<span class="lo">${wxFmtNum(m.lang, lo, 0)}°</span>` +
        `<span class="range">${bar ? `<span class="fill" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background:${grad}"></span>` : ""}${now}</span>` +
        `<span class="hi">${wxFmtNum(m.lang, hi, 0)}°</span></div>`
      );
    })
    .join("");
  return `<div class="section s-daily">${wxSectionTitle(card, "daily")}<div class="daily">${rows}</div></div>`;
}

// ── UV index: a gauge with the current value, today's peak and the advice of its level ──
function wxSectionUv(card, m) {
  const u = m.uv;
  if (!u) return "";
  const lvl = u.level;
  const pos = Math.min(100, (u.v / 11) * 100);
  const peak = u.max != null && u.max > u.v ? card._t("uv_max", { v: wxFmtNum(m.lang, u.max, 0) }) : "";
  return (
    `<div class="section s-uv">${wxSectionTitle(card, "uv")}` +
    `<div class="uvhead"${u.entity ? ` data-more="${wxEsc(u.entity)}" role="button" tabindex="0"` : ""}><span class="uvval" style="--k:${WX_UV[lvl].color}">${wxFmtNum(m.lang, u.v, 0)}</span>` +
    `<div class="uvtxt"><b style="color:${WX_UV[lvl].color}">${wxEsc(card._t(`uv_${lvl}`))}</b><span>${wxEsc(card._t(`uv_advice_${lvl}`))}${peak ? ` · ${wxEsc(peak)}` : ""}</span></div></div>` +
    `<div class="uvbar"><span class="mark" style="left:${pos.toFixed(1)}%;--k:${WX_UV[lvl].color}"></span></div></div>`
  );
}

// ── Index sections (air, pollen): the level in a round badge with its label and advice, the scale, then one row per
// pollutant or species on the six levels, the highest first ──
const WX_LEVEL_COLORS = ["#9e9e9e", ...WX_AQ_COLORS.slice(1)];

function wxIndexHead(level, label, sub, entity) {
  const color = WX_LEVEL_COLORS[level];
  return (
    `<div class="uvhead"${entity ? ` data-more="${wxEsc(entity)}" role="button" tabindex="0"` : ""}><span class="uvval" style="--k:${color}">${level}</span>` +
    `<div class="uvtxt"><b style="color:color-mix(in srgb, ${color} 75%, var(--primary-text-color))">${wxEsc(label)}</b><span>${wxEsc(sub)}</span></div></div>` +
    `<div class="aqbar">${[1, 2, 3, 4, 5, 6].map((n) => `<i style="background:${WX_LEVEL_COLORS[n]}"${n === level ? ' class="on"' : ""}></i>`).join("")}</div>`
  );
}

// Tomorrow's level next to the section title (Atmo's "-J+1" sensors), with an arrow when it changes.
function wxTomorrowChip(card, level, prefix) {
  if (level == null) return "";
  return wxChip("mdi:calendar-arrow-right", card._t("tomorrow_v", { v: card._t(`${prefix}_${level}`).toLowerCase() }), {
    color: WX_LEVEL_COLORS[level],
    cls: "tint",
  });
}

// rows: [{ entity, level, icon, name, title }]
const wxLevelRows = (rows) =>
  rows
    .map(
      (x, i) =>
        `<div class="prow" data-more="${wxEsc(x.entity)}" role="button" tabindex="0" style="--k:${WX_LEVEL_COLORS[x.level]};--d:${(i * 0.05).toFixed(2)}s" title="${wxEsc(x.title)}">` +
        `<ha-icon icon="${x.icon}"></ha-icon><span class="pname">${wxEsc(x.name)}</span>` +
        `<span class="dots">${[1, 2, 3, 4, 5, 6].map((n) => `<i class="${n <= x.level ? "on" : ""}"></i>`).join("")}</span></div>`,
    )
    .join("");

// Short pollutant names for the rows; the full name is in the row's tooltip.
const WX_POL_SHORT = { pm25: "PM2.5", pm10: "PM10", o3: "O₃", no2: "NO₂", so2: "SO₂" };

// ── Air quality: the index with its advice, then each pollutant on the six levels of the index ──
function wxSectionAir(card, m) {
  const a = m.air;
  if (!a) return "";
  const rows = wxLevelRows(
    [...a.pollutants]
      .sort((x, y) => y.level - x.level)
      .map((p) => ({
        entity: p.entity,
        level: p.level,
        icon: p.key.startsWith("pm") ? "mdi:blur" : "mdi:molecule",
        name: WX_POL_SHORT[p.key],
        title: `${card._t(`pol_${p.key}`)} · ${card._t(`aq_${p.level}`)}${p.value ? ` · ${p.value}` : ""}`,
      })),
  );
  const sub = [card._t(`aq_advice_${a.level}`), a.zone].filter(Boolean).join(" · ");
  return (
    `<div class="section s-air">${wxSectionTitle(card, "air", wxTomorrowChip(card, a.tomorrow, "aq"))}${wxIndexHead(a.level, card._t(`aq_${a.level}`), sub, a.entity)}` +
    `${rows ? `<div class="pollen">${rows}</div>` : ""}</div>`
  );
}

// ── Pollen: one row per species, the most present first ──
function wxSectionPollen(card, m) {
  const p = m.pollen;
  if (!p) return "";
  const items = p.items.filter((x) => x.level >= 1).slice(0, 10);
  const main = items[0] ? card._t("pollen_main", { v: card._t(`p_${items[0].species}`).toLowerCase() }) : "";
  const sub = [card._t(`pollen_advice_${p.level}`), main].filter(Boolean).join(" · ");
  const rows = wxLevelRows(
    items.map((x) => ({
      entity: x.entity,
      level: x.level,
      icon: /grass|weed|ragweed|mugwort|plantain|sorrel|nettle/.test(x.species) ? "mdi:grass" : "mdi:tree-outline",
      name: card._t(`p_${x.species}`),
      title: `${card._t(`p_${x.species}`)} · ${card._t(`pl_${x.level}`)}`,
    })),
  );
  return (
    `<div class="section s-pollen">${wxSectionTitle(card, "pollen", wxTomorrowChip(card, p.tomorrow, "pl"))}${wxIndexHead(p.level, card._t(`pl_${p.level}`), sub, p.entity)}` +
    `${rows ? `<div class="pollen">${rows}</div>` : ""}</div>`
  );
}

// ── Sun: its course over the day, sunrise and sunset ──
const WX_SUN_ARC = { P0: [24, 56], C: [200, -20], P2: [376, 56] };

// The sun's point on its arc at `frac` of the day, and the path of the course done: the card moves them in place as
// the clock turns (see _patchSun) instead of rebuilding.
function wxSunPoint(frac) {
  const { P0, C, P2 } = WX_SUN_ARC;
  const t = wxClamp(frac, 0, 1);
  const x = ((1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * C[0] + t * t * P2[0]).toFixed(1);
  const y = ((1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * C[1] + t * t * P2[1]).toFixed(1);
  const mid = [(1 - t) * P0[0] + t * C[0], (1 - t) * P0[1] + t * C[1]];
  return { x, y, d: `M${P0[0]} ${P0[1]}Q${mid[0].toFixed(1)} ${mid[1].toFixed(1)} ${x} ${y}` };
}

function wxSectionSun(card, m) {
  const s = m.sun;
  if (!s) return "";
  const { P0, C, P2 } = WX_SUN_ARC;
  const arc = `M${P0[0]} ${P0[1]}Q${C[0]} ${C[1]} ${P2[0]} ${P2[1]}`;
  let done = "";
  let dot = "";
  if (s.up) {
    const { x, y, d } = wxSunPoint(s.frac);
    done = `<path class="done" d="${d}"/>`;
    dot = `<circle class="sunglow" cx="${x}" cy="${y}" r="9"/><circle class="sundot" cx="${x}" cy="${y}" r="5"/>`;
  }
  const dl = Math.max(0, Math.round((s.set - s.rise) / 60000));
  return (
    `<div class="section s-sun">${wxSectionTitle(card, "sun")}<div class="sun${s.up ? " up" : ""}" data-more="${wxEsc(m.ent.sun)}" role="button" tabindex="0">` +
    `<svg viewBox="0 0 400 64" preserveAspectRatio="xMidYMid meet"><path class="horizon" d="M0 56H400"/><path class="arc" d="${arc}"/>${done}${dot}</svg>` +
    `<div class="suntimes"><span><ha-icon icon="mdi:weather-sunset-up"></ha-icon>${wxEsc(wxTime(m.lang, s.rise))}</span>` +
    `<span class="dl">${wxEsc(card._t("daylight", { h: Math.floor(dl / 60), m: String(dl % 60).padStart(2, "0") }))}</span>` +
    `<span><ha-icon icon="mdi:weather-sunset-down"></ha-icon>${wxEsc(wxTime(m.lang, s.set))}</span></div>${wxSunExtras(card, m)}</div></div>`
  );
}

// Dawn, the evening golden hour and dusk (the morning one in its tooltip).
function wxSunExtras(card, m) {
  const t = m.sunTimes;
  if (!t) return "";
  const range = (r) => (r ? `${wxTime(m.lang, r[0])}–${wxTime(m.lang, r[1])}` : "");
  const golden = t.goldenEvening || t.goldenMorning;
  const items = [
    t.dawn ? wxChip("mdi:weather-sunset-up", `${card._t("dawn")} ${wxTime(m.lang, t.dawn)}`) : "",
    golden
      ? wxChip("mdi:camera-iris", `${card._t("golden_hour")} ${wxTime(m.lang, golden[0])}`, {
          color: "#ffb300",
          cls: "tint",
          title: [range(t.goldenMorning), range(t.goldenEvening)].filter(Boolean).join(" · "),
        })
      : "",
    t.dusk ? wxChip("mdi:weather-sunset-down", `${card._t("dusk")} ${wxTime(m.lang, t.dusk)}`) : "",
  ].filter(Boolean);
  return items.length ? `<div class="chips sunextra">${items.join("")}</div>` : "";
}

// ── Moon: today's phase drawn as it looks, its name and light, and the next full and new moons ──
function wxSectionMoon(card, m) {
  const mo = m.moon;
  if (!mo) return "";
  const date = (d) => d.toLocaleDateString(m.lang, { weekday: "short", day: "numeric", month: "short" });
  const next = [
    ["next_full", mo.nextFull, "mdi:moon-full"],
    ["next_new", mo.nextNew, "mdi:moon-new"],
  ]
    .sort((a, b) => a[1] - b[1])
    .map(([k, d, icon]) => `<span class="mnext"><ha-icon icon="${icon}"></ha-icon><span>${wxEsc(card._t(k))}</span><b>${wxEsc(date(d))}</b></span>`)
    .join("");
  const svg =
    `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><radialGradient id="wx-mf2" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fffde7"/>` +
    '<stop offset="1" stop-color="#ffe082"/></radialGradient></defs><circle class="mglow" cx="24" cy="24" r="23"/><circle class="mdark" cx="24" cy="24" r="17"/>' +
    `<g fill="url(#wx-mf2)">${wxMoonLit(24, 24, 17, mo.age, mo.flip)}</g></svg>`;
  return (
    `<div class="section s-moon">${wxSectionTitle(card, "moon")}<div class="moonrow"${mo.entity ? ` data-more="${wxEsc(mo.entity)}" role="button" tabindex="0"` : ""}>` +
    `<div class="mdisc">${svg}</div><div class="uvtxt"><b>${wxEsc(card._t(`mp_${mo.phase}`))}</b>` +
    `<span>${wxEsc(card._t("moon_lit", { v: Math.round(mo.light * 100), d: Math.floor(mo.age) + 1 }))}</span>${
      mo.times
        ? `<span class="mtimes"><span title="${wxEsc(card._t("moonrise"))}"><ha-icon icon="mdi:arrow-up-thin"></ha-icon>${wxEsc(mo.times.rise ? wxTime(m.lang, mo.times.rise) : "—")}</span>` +
          `<span title="${wxEsc(card._t("moonset"))}"><ha-icon icon="mdi:arrow-down-thin"></ha-icon>${wxEsc(mo.times.set ? wxTime(m.lang, mo.times.set) : "—")}</span></span>`
        : ""
    }</div>` +
    `<div class="mnexts">${next}</div></div></div>`
  );
}

const WX_SECTION_RENDER = {
  alerts: wxSectionAlerts,
  rain: wxSectionRain,
  hourly: wxSectionHourly,
  daily: wxSectionDaily,
  air: wxSectionAir,
  uv: wxSectionUv,
  pollen: wxSectionPollen,
  sun: wxSectionSun,
  moon: wxSectionMoon,
};

// ── Styles ───────────────────────────────────────────────────────────────────
const WX_STYLES = `${WX_SCENE_STYLES}
  :host { display: block; height: 100%; }
  ha-card { height: 100%; box-sizing: border-box; padding: 12px; display: flex; flex-direction: column; gap: 12px; overflow: hidden; }
  ha-card > *, .section, .info, .hero > div { min-width: 0; }
  .empty { display: flex; align-items: center; gap: 10px; color: var(--secondary-text-color); }
  /* The body starts 8px under the header, like the other ha-* cards (the card's gap is 12px, 8px on the mini card). */
  .header { display: flex; align-items: center; gap: 10px; margin-bottom: -4px; }
  ha-card.mini .header { margin-bottom: 0; }
  .badge { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
           background: color-mix(in srgb, var(--wx-color) 16%, transparent); color: var(--wx-color); transition: background .4s, color .4s; }
  .badge ha-icon { --mdc-icon-size: 24px; }
  .titles { flex: 1; min-width: 0; cursor: pointer; }
  .name { font-size: 16px; font-weight: 500; line-height: 1.25; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 12px; color: var(--secondary-text-color); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* The pill gives way to the title on a narrow card: it shrinks down to its dot and ellipsizes its text. */
  .st { display: inline-flex; align-items: center; gap: 4px; flex: 0 1 auto; min-width: 0; max-width: 50%; overflow: hidden; padding: 1px 8px;
        border-radius: 12px; font-size: 11px; font-weight: 500; white-space: nowrap; background: color-mix(in srgb, var(--st-color, var(--wx-color)) 18%, transparent);
        color: color-mix(in srgb, var(--st-color, var(--wx-color)) 72%, var(--primary-text-color)); }
  .st .dot { flex: none; background: var(--st-color, var(--wx-color)); }
  .st .stt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  /* With a subtitle the titles span two lines: the pill stays on the title's line, not centred over both. */
  .header:has(.sub) .st { align-self: flex-start; margin-top: 4px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .st.alert .dot { animation: wx-blink 1.4s ease-in-out infinite; }
  button { font: inherit; cursor: pointer; border: none; }
  .zoom { all: unset; flex-shrink: 0; cursor: pointer; width: 24px; height: 24px; margin: -4px -4px -4px 0; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom ha-icon { --mdc-icon-size: 16px; }
  .refresh[data-busy] { cursor: progress; color: var(--primary-color, #03a9f4); }
  .refresh[data-busy] ha-icon { animation: wx-spin 1s linear infinite; }
  .zoom:hover { background: color-mix(in srgb, var(--secondary-text-color) 16%, transparent); color: var(--primary-text-color); }
  .zoom:focus-visible, [role=button]:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 1px; }
  [data-more] { cursor: pointer; }

  .hero { display: flex; align-items: center; gap: 14px; }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .big { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; cursor: pointer; }
  .big .val { font-size: 30px; font-weight: 400; line-height: 1; color: var(--primary-text-color); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .big .val small { font-size: 14px; color: var(--secondary-text-color); font-weight: 400; }
  .big .hilo { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; }
  .big .hilo b { font-weight: 500; color: var(--primary-text-color); }
  .feels { font-size: 12px; color: var(--secondary-text-color); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 1px 8px 1px 5px; border-radius: 12px;
          background: var(--secondary-background-color, rgba(128,128,128,.12)); color: var(--secondary-text-color); white-space: nowrap; }
  .chip ha-icon { --mdc-icon-size: 13px; }
  .chip.tint { background: color-mix(in srgb, var(--k) 20%, transparent); color: color-mix(in srgb, var(--k) 72%, var(--primary-text-color)); }
  .chip.tint ha-icon { color: var(--k); }
  .chip.pulse { animation: wx-chip 2s ease-in-out infinite; }
  .chip.bolt ha-icon { animation: wx-blink 1.2s steps(2) infinite; }
  .chip .arrow { display: inline-flex; transition: transform .6s; }

  .section { display: flex; flex-direction: column; gap: 8px; }
  .section-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; text-transform: uppercase;
                   letter-spacing: .04em; color: var(--secondary-text-color); }
  .section-title > ha-icon { --mdc-icon-size: 16px; flex-shrink: 0; }
  .section-title .chip { margin-left: auto; text-transform: none; letter-spacing: 0; }
  .empty-line { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--secondary-text-color); }
  .empty-line ha-icon { --mdc-icon-size: 16px; }

  .restrictions { margin: 0; padding-left: 18px; font-size: 12px; color: var(--secondary-text-color); display: flex; flex-direction: column; gap: 2px; }
  .restrictions b { font-weight: 500; color: var(--primary-text-color); }

  .rain-head { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--primary-text-color); }
  .rain-head ha-icon { --mdc-icon-size: 18px; color: #42a5f5; }
  .rain-head.wet ha-icon { animation: wx-bob-icon 1.6s ease-in-out infinite; }
  .rainbar { display: flex; gap: 2px; height: 14px; border-radius: 7px; overflow: hidden; background: var(--secondary-background-color, rgba(128,128,128,.12)); }
  .rainbar .seg { min-width: 2px; transform-origin: bottom; }
  .enter .rainbar .seg { animation: wx-rise .5s ease-out both; animation-delay: var(--d, 0s); }
  .rainbar .seg.l0 { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); }
  .rainbar .seg.l1 { background: ${WX_RAIN_COLORS[1]}; }
  .rainbar .seg.l2 { background: ${WX_RAIN_COLORS[2]}; }
  .rainbar .seg.l3 { background: ${WX_RAIN_COLORS[3]}; }
  .rainbar .seg.na { background: none; }
  .ticks { display: flex; justify-content: space-between; font-size: 10px; color: var(--secondary-text-color); margin-top: -4px; }

  .hscroll { overflow-x: auto; overflow-y: hidden; margin: 0 -12px; padding: 0 12px; scrollbar-width: thin; }
  .track { display: flex; flex-direction: column; width: 100%; }
  .hrow { display: flex; }
  .hcol, .pcol, .pt { flex: 1 1 ${WX_COL}px; min-width: ${WX_COL}px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .hcol .t { font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; }
  .hcol.now .t { color: var(--primary-text-color); font-weight: 500; }
  .hcol ha-icon { --mdc-icon-size: 22px; }
  .curve { position: relative; height: 48px; }
  .curve svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .curve .line { fill: none; stroke: var(--wx-color); stroke-width: 2; stroke-linecap: round; stroke-dasharray: 100; vector-effect: non-scaling-stroke; }
  .curve .pts { position: absolute; inset: 0; }
  .pt { position: relative; }
  .pt i { position: absolute; left: 50%; top: var(--y); width: 5px; height: 5px; transform: translate(-50%, -50%); border-radius: 50%;
          background: var(--card-background-color, #fff); border: 1.6px solid var(--wx-color); }
  .pt span { position: absolute; left: 50%; top: calc(var(--y) - 7px); transform: translate(-50%, -100%); font-size: 11px; font-weight: 500;
             color: var(--primary-text-color); white-space: nowrap; }
  .enter .curve .line { animation: wx-draw 1.2s ease-out both; }
  .enter .curve .area { animation: wx-fade 1.2s ease-out both; }
  .pbar { width: 6px; height: 22px; border-radius: 3px; background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); display: flex; align-items: flex-end; overflow: hidden; }
  .pbar span { width: 100%; background: #42a5f5; border-radius: 3px; transform-origin: bottom; }
  .enter .pbar span { animation: wx-rise .6s ease-out both; }
  .pv { font-size: 10px; color: #42a5f5; min-height: 12px; font-variant-numeric: tabular-nums; }

  .wcol { flex: 1 1 ${WX_COL}px; min-width: ${WX_COL}px; display: flex; align-items: center; justify-content: center; gap: 2px; margin-top: 4px;
          font-size: 11px; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
  .wcol .arrow { display: inline-flex; }
  .wcol ha-icon { --mdc-icon-size: 12px; }
  .wcol.strong { color: #26a69a; font-weight: 600; }
  .daily { display: flex; flex-direction: column; gap: 4px; }
  .drow { display: grid; grid-template-columns: 84px 24px 38px 30px 1fr 30px; align-items: center; gap: 8px; font-size: 13px; }
  .enter .drow, .enter .prow { animation: wx-slide .45s ease-out both; animation-delay: var(--d, 0s); }
  .drow .day { color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .drow ha-icon { --mdc-icon-size: 22px; }
  .drow .pp { font-size: 11px; color: #42a5f5; text-align: right; font-variant-numeric: tabular-nums; }
  .drow .lo { color: var(--secondary-text-color); text-align: right; font-variant-numeric: tabular-nums; }
  .drow .hi { color: var(--primary-text-color); font-weight: 500; font-variant-numeric: tabular-nums; }
  .range { position: relative; height: 6px; border-radius: 3px; background: var(--secondary-background-color, rgba(128,128,128,.15)); }
  .range .fill { position: absolute; top: 0; bottom: 0; border-radius: 3px; transform-origin: left; }
  .enter .range .fill { animation: wx-grow .7s ease-out both; animation-delay: calc(var(--d, 0s) + .1s); }
  .range .nowdot { position: absolute; top: 50%; width: 8px; height: 8px; margin: -5px 0 0 -5px; border-radius: 50%; background: var(--card-background-color, #fff);
                   border: 1px solid var(--primary-text-color); }

  .uvhead { display: flex; align-items: center; gap: 10px; }
  .uvval { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-size: 17px; font-weight: 500; flex: none;
           background: color-mix(in srgb, var(--k) 18%, transparent); color: var(--k); }
  .uvtxt { display: flex; flex-direction: column; font-size: 12px; color: var(--secondary-text-color); min-width: 0; }
  .uvtxt b { font-size: 14px; font-weight: 500; }
  .uvbar { position: relative; height: 6px; border-radius: 3px; margin: 2px 4px;
           background: linear-gradient(90deg, #43a047 0%, #43a047 18%, #fdd835 27%, #fdd835 45%, #fb8c00 55%, #fb8c00 64%, #e53935 73%, #e53935 91%, #8e24aa 100%); }
  .uvbar .mark { position: absolute; top: 50%; width: 12px; height: 12px; margin: -8px 0 0 -8px; border-radius: 50%; background: var(--card-background-color, #fff);
                 border: 2px solid var(--k); box-shadow: 0 1px 3px rgba(0,0,0,.3); }
  .enter .uvbar .mark { animation: wx-pop .6s ease-out both; }

  .aqbar { display: flex; align-items: center; gap: 3px; height: 10px; margin: 2px 4px; }
  .aqbar i { flex: 1; height: 6px; border-radius: 3px; opacity: .3; }
  .aqbar i.on { height: 10px; border-radius: 5px; opacity: 1; }
  .enter .aqbar i.on { animation: wx-pop .6s ease-out both; }
  .pollen { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
  .prow { display: flex; align-items: center; gap: 6px; font-size: 13px; min-width: 0; }
  .prow ha-icon { --mdc-icon-size: 16px; color: var(--k); flex: none; }
  .pname { flex: 1; min-width: 0; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dots { display: inline-flex; gap: 2px; flex: none; }
  .dots i { width: 6px; height: 6px; border-radius: 50%; background: color-mix(in srgb, var(--secondary-text-color) 22%, transparent); }
  .dots i.on { background: var(--k); }

  .sun svg { width: 100%; height: 64px; overflow: visible; }
  .sun .horizon { stroke: var(--divider-color, rgba(128,128,128,.25)); stroke-width: 1; }
  .sun .arc { fill: none; stroke: color-mix(in srgb, var(--secondary-text-color) 45%, transparent); stroke-width: 1.4; stroke-dasharray: 3 4; }
  .sun .done { fill: none; stroke: #ffb300; stroke-width: 2.4; stroke-linecap: round; }
  .sun .sundot { fill: #ffca28; stroke: #fff8e1; stroke-width: 1.5; }
  .sun .sunglow { fill: #ffca28; opacity: .3; transform-box: fill-box; transform-origin: center; animation: wx-breathe 3s ease-in-out infinite; }
  .suntimes { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--secondary-text-color); margin-top: -4px; }
  .suntimes span { display: inline-flex; align-items: center; gap: 4px; }
  .suntimes ha-icon { --mdc-icon-size: 16px; color: #ffb300; }
  .suntimes .dl { font-size: 11px; }

  .sunextra { justify-content: center; margin-top: 6px; }
  .mtimes { display: flex; gap: 10px; margin-top: 2px; white-space: nowrap; }
  .mtimes > span { display: inline-flex; align-items: center; }
  .mtimes ha-icon { --mdc-icon-size: 14px; }
  .chip.trend.up ha-icon { color: #ef6c00; }
  .chip.trend.down ha-icon { color: #1e88e5; }
  .moonrow { display: flex; align-items: center; gap: 12px; }
  .mdisc { width: 48px; height: 48px; flex: none; }
  .mdisc svg { width: 100%; height: 100%; overflow: visible; }
  .mdisc .mglow { fill: #fff8e1; opacity: .12; transform-box: fill-box; transform-origin: center; animation: wx-breathe 6s ease-in-out infinite; }
  .mdisc .mdark { fill: color-mix(in srgb, var(--secondary-text-color) 22%, transparent); }
  .moonrow .uvtxt { flex: 1; }
  .moonrow .uvtxt b { color: var(--primary-text-color); }
  .mnexts { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
  .mnext { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; }
  .mnext ha-icon { --mdc-icon-size: 14px; }
  .mnext b { font-weight: 500; color: var(--primary-text-color); }
  ha-card.mini { gap: 8px; }
  ha-card.mini .badge { width: 32px; height: 32px; }
  ha-card.mini .badge ha-icon { --mdc-icon-size: 20px; }
  .content { display: flex; align-items: center; gap: 12px; }
  ha-card.mini .scene { width: 88px; height: 70px; border-radius: 12px; }
  ha-card.mini .big .val { font-size: 24px; }
  .line { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--secondary-text-color); min-width: 0; }
  .line ha-icon { --mdc-icon-size: 14px; flex-shrink: 0; }
  .line span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  @keyframes wx-blink { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
  @keyframes wx-chip { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--k) 45%, transparent); } 50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--k) 0%, transparent); } }
  @keyframes wx-bob-icon { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
  @keyframes wx-rise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @keyframes wx-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes wx-draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
  @keyframes wx-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes wx-slide { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
  @keyframes wx-pop { 0% { transform: scale(0); } 70% { transform: scale(1.25); } 100% { transform: scale(1); } }
  /* animations: false stops everything but the busy refresh icon, the only sign that a refresh is under way. */
  ha-card.still *:not(.refresh > ha-icon), ha-card.still *::before { animation: none !important; }
  @media (prefers-reduced-motion: reduce) { ha-card * { animation: none !important; } }
  @media (max-width: 420px) { .pollen { grid-template-columns: 1fr; } }
`;

// ── Full screen detail ───────────────────────────────────────────────────────
const WX_POPUP_STYLES = `
  :host { all: initial; display: block; font-family: var(--paper-font-body1_-_font-family, var(--ha-font-family-body, Roboto, sans-serif));
          color: var(--primary-text-color); -webkit-font-smoothing: antialiased; }
  /* The theme's card colour may be translucent: a blurred, darkened page behind and a solid colour under it keep it opaque. */
  .backdrop { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.6); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px);
              animation: wx-fade .2s ease-out both; }
  .sheet { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; animation: wx-sheet .28s cubic-bezier(.2,.8,.2,1) both;
           background: linear-gradient(var(--card-background-color, #fff), var(--card-background-color, #fff)), var(--primary-background-color, #fafafa); }
  ha-card.popup { --ha-card-border-radius: 0; --ha-card-box-shadow: none; border-radius: 0; box-shadow: none; background: transparent; border: none;
                  min-height: 100%; height: auto; overflow: visible; gap: 16px; box-sizing: border-box; max-width: 1800px; margin: 0 auto;
                  padding: 0 max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
  .popup .header { position: sticky; top: 0; z-index: 2; padding: max(10px, env(safe-area-inset-top)) 0 10px; margin: 0 -2px;
                   background: linear-gradient(var(--card-background-color, #fff), var(--card-background-color, #fff)), var(--primary-background-color, #fafafa); }
  .popup .name { font-size: 18px; }
  /* The full screen detail keeps its larger, lighter temperature. */
  .popup .big .val { font-size: 40px; font-weight: 300; }
  .popup .big .val small { font-size: 18px; }
  .close { flex-shrink: 0; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; margin-left: 4px;
           background: var(--secondary-background-color, rgba(128,128,128,.12)); color: var(--primary-text-color); }
  .close:hover { background: color-mix(in srgb, var(--primary-text-color) 14%, transparent); }
  .close:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }
  .popup .section { gap: 8px; }

  /* Phone: one column, as in the card. */
  .popup .top, .popup .side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .popup .flow { display: flex; flex-direction: column; gap: 16px; }
  .popup .hscroll { margin: 0 -16px; padding: 0 16px 4px; }

  /* Wider: the weather now next to the alerts and the rain, the hourly forecast across, the rest in balanced columns. */
  @media (min-width: 760px) {
    ha-card.popup { gap: 22px; padding-left: max(24px, env(safe-area-inset-left)); padding-right: max(24px, env(safe-area-inset-right)); }
    .popup .top { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 20px 40px; align-items: start; }
    .popup .scene { width: 160px; height: 128px; border-radius: 20px; }
    .popup .big .val { font-size: 56px; }
    .popup .big .val small { font-size: 22px; }
    .popup .flow { display: block; columns: 2 340px; column-gap: 40px; }
    .popup .flow > .section { break-inside: avoid; margin-bottom: 24px; }
    .popup .hscroll { margin: 0; padding: 0 0 4px; }
  }
  @media (min-width: 1200px) { .popup .flow { columns: 3 340px; } }
  @keyframes wx-sheet { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .backdrop, .sheet { animation: none !important; } }
`;
