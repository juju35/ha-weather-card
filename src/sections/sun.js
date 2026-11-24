// ── Sun: its course over the day, sunrise and sunset ──
import { wxChip, wxSectionTitle } from "./core.js";

export const WX_SUN_ARC = { P0: [24, 56], C: [200, -20], P2: [376, 56] };

// The sun's point on its arc at `frac` of the day, and the path of the course done: the card moves them in place as
// the clock turns (see _patchSun) instead of rebuilding.
export function wxSunPoint(frac) {
  const { P0, C, P2 } = WX_SUN_ARC;
  const t = wxClamp(frac, 0, 1);
  const x = ((1 - t) ** 2 * P0[0] + 2 * (1 - t) * t * C[0] + t * t * P2[0]).toFixed(1);
  const y = ((1 - t) ** 2 * P0[1] + 2 * (1 - t) * t * C[1] + t * t * P2[1]).toFixed(1);
  const mid = [(1 - t) * P0[0] + t * C[0], (1 - t) * P0[1] + t * C[1]];
  return { x, y, d: `M${P0[0]} ${P0[1]}Q${mid[0].toFixed(1)} ${mid[1].toFixed(1)} ${x} ${y}` };
}

export function wxSectionSun(card, m) {
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
    `<div class="suntimes"><span><ha-icon icon="mdi:weather-sunset-up"></ha-icon>${wxEsc(wxTime(m.fmt, s.rise, false, m.tf))}</span>` +
    `<span class="dl">${wxEsc(card._t("daylight", { h: Math.floor(dl / 60), m: String(dl % 60).padStart(2, "0") }))}</span>` +
    `<span><ha-icon icon="mdi:weather-sunset-down"></ha-icon>${wxEsc(wxTime(m.fmt, s.set, false, m.tf))}</span></div>${wxSunExtras(card, m)}</div></div>`
  );
}

// Dawn, the evening golden hour and dusk (the morning one in its tooltip).
export function wxSunExtras(card, m) {
  const t = m.sunTimes;
  if (!t) return "";
  const range = (r) => (r ? `${wxTime(m.fmt, r[0], false, m.tf)}–${wxTime(m.fmt, r[1], false, m.tf)}` : "");
  const golden = t.goldenEvening || t.goldenMorning;
  const items = [
    t.dawn ? wxChip("mdi:weather-sunset-up", `${card._t("dawn")} ${wxTime(m.fmt, t.dawn, false, m.tf)}`) : "",
    golden
      ? wxChip("mdi:camera-iris", `${card._t("golden_hour")} ${wxTime(m.fmt, golden[0], false, m.tf)}`, {
          color: "#ffb300",
          cls: "tint",
          title: [range(t.goldenMorning), range(t.goldenEvening)].filter(Boolean).join(" · "),
        })
      : "",
    t.dusk ? wxChip("mdi:weather-sunset-down", `${card._t("dusk")} ${wxTime(m.fmt, t.dusk, false, m.tf)}`) : "",
  ].filter(Boolean);
  return items.length ? `<div class="chips sunextra">${items.join("")}</div>` : "";
}
