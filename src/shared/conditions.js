// ── Conditions ───────────────────────────────────────────────────────────────
import { wxT } from "./i18n-helpers.js";

export const WX_CONDITIONS = {
  "clear-night": { icon: "mdi:weather-night", color: "#5c6bc0" },
  cloudy: { icon: "mdi:weather-cloudy", color: "#78909c" },
  exceptional: { icon: "mdi:alert-circle-outline", color: "var(--error-color, #db4437)" },
  fog: { icon: "mdi:weather-fog", color: "#90a4ae" },
  hail: { icon: "mdi:weather-hail", color: "#4dd0e1" },
  lightning: { icon: "mdi:weather-lightning", color: "#7e57c2" },
  "lightning-rainy": { icon: "mdi:weather-lightning-rainy", color: "#7e57c2" },
  partlycloudy: { icon: "mdi:weather-partly-cloudy", color: "#f9a825" },
  pouring: { icon: "mdi:weather-pouring", color: "#1e88e5" },
  rainy: { icon: "mdi:weather-rainy", color: "#42a5f5" },
  snowy: { icon: "mdi:weather-snowy", color: "#4fc3f7" },
  "snowy-rainy": { icon: "mdi:weather-snowy-rainy", color: "#4fc3f7" },
  sunny: { icon: "mdi:weather-sunny", color: "#ffb300" },
  windy: { icon: "mdi:weather-windy", color: "#26a69a" },
  "windy-variant": { icon: "mdi:weather-windy-variant", color: "#26a69a" },
};
export const WX_IDLE = "var(--disabled-text-color, #9e9e9e)";

// Text in a state color (a level's label, the status pill, tinted chips, rain and wind figures): the color mixed into
// the theme's text color, so that it keeps its hue yet reads on the card in a light and a dark theme alike (WCAG AA,
// 4.5:1 for every color of the scales at 40%; the rain blue and the wind teal pass at 60%). Badges, dots, bars and
// icons keep the raw color.
export const wxInk = (color, pct = 40) => `color-mix(in srgb, ${color} ${pct}%, var(--primary-text-color))`;

export const wxCondLabel = (lang, cond) => (WX_CONDITIONS[cond] ? wxT(lang, `c_${cond.replace(/-/g, "_")}`) : cond ? String(cond) : "—");

// The condition as the sky stands: a provider's "clear-night" by day is a clear day. Météo-France, for one, keeps
// its night slot ("Nuit claire") for a while after sunrise. Only an explicit day (`night === false`) turns it.
export const wxDayCond = (cond, night) => (night === false && cond === "clear-night" ? "sunny" : cond);

// The icon of a condition; at night the sunny and partly cloudy icons become their night versions, by day a clear
// night becomes sunny.
export function wxCondIcon(cond, night) {
  cond = wxDayCond(cond, night);
  if (night && cond === "sunny") return "mdi:weather-night";
  if (night && cond === "partlycloudy") return "mdi:weather-night-partly-cloudy";
  return WX_CONDITIONS[cond]?.icon || "mdi:weather-cloudy-alert";
}

export const wxCondColor = (cond, night) => {
  cond = wxDayCond(cond, night);
  return night && (cond === "sunny" || cond === "partlycloudy") ? WX_CONDITIONS["clear-night"].color : WX_CONDITIONS[cond]?.color || WX_IDLE;
};

export const WX_STORM = new Set(["lightning", "lightning-rainy"]);

// The lightning tint everywhere (status pill, lightning and storm chips): the condition's own color.
export const WX_BOLT_COLOR = WX_CONDITIONS.lightning.color;
