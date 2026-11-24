// ── Index sections (air, pollen): the level in a round badge with its label and advice, the scale, then one row per
// pollutant or species on the six levels, the highest first ──
import { wxChip } from "./core.js";

export const WX_LEVEL_COLORS = ["#9e9e9e", ...WX_AQ_COLORS.slice(1)];

export function wxIndexHead(level, label, sub, entity) {
  const color = WX_LEVEL_COLORS[level];
  return (
    `<div class="uvhead"${entity ? ` data-more="${wxEsc(entity)}" role="button" tabindex="0"` : ""}><span class="uvval" style="--k:${color}">${level}</span>` +
    `<div class="uvtxt"><b style="color:${wxInk(color)}">${wxEsc(label)}</b><span>${wxEsc(sub)}</span></div></div>` +
    `<div class="aqbar">${[1, 2, 3, 4, 5, 6].map((n) => `<i style="background:${WX_LEVEL_COLORS[n]}"${n === level ? ' class="on"' : ""}></i>`).join("")}</div>`
  );
}

// Tomorrow's level next to the section title (Atmo's "-J+1" sensors), with an arrow when it changes.
export function wxTomorrowChip(card, level, prefix) {
  if (level == null) return "";
  return wxChip("mdi:calendar-arrow-right", card._t("tomorrow_v", { v: card._t(`${prefix}_${level}`).toLowerCase() }), {
    color: WX_LEVEL_COLORS[level],
    cls: "tint",
  });
}

// rows: [{ entity, level, icon, name, title }]
export const wxLevelRows = (rows) =>
  rows
    .map(
      (x, i) =>
        `<div class="prow" data-more="${wxEsc(x.entity)}" role="button" tabindex="0" style="--k:${WX_LEVEL_COLORS[x.level]};--d:${(i * 0.05).toFixed(2)}s" title="${wxEsc(x.title)}">` +
        `<ha-icon icon="${x.icon}"></ha-icon><span class="pname">${wxEsc(x.name)}</span>` +
        `<span class="dots">${[1, 2, 3, 4, 5, 6].map((n) => `<i class="${n <= x.level ? "on" : ""}"></i>`).join("")}</span></div>`,
    )
    .join("");

// Short pollutant names for the rows; the full name is in the row's tooltip.
export const WX_POL_SHORT = { pm25: "PM2.5", pm10: "PM10", o3: "O₃", no2: "NO₂", so2: "SO₂" };
