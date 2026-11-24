// ── Scales: UV, pollen, warnings, drought, rain ──────────────────────────────
import { wxClamp, wxNorm, wxNum, wxNumber, wxUnavailable } from "./shadow-dom-patching.js";

export const WX_UV = [
  { max: 2, color: "#43a047" },
  { max: 5, color: "#fdd835" },
  { max: 7, color: "#fb8c00" },
  { max: 10, color: "#e53935" },
  { max: Infinity, color: "#8e24aa" },
];
export const wxUvLevel = (v) => (v == null ? null : WX_UV.findIndex((l) => v <= l.max + 0.49));

// Pollen on the Atmo scale, 0 none … 6 extremely high: RNSA and Google Pollen (0–5) share its first words, so their
// numbers read the same; words in French or English.
export function wxPollenLevel(state, attrs = {}) {
  const n = wxNumber(state);
  if (n != null) return wxClamp(Math.round(n), 0, 6);
  const s = wxNorm(attrs.libelle || attrs.Libellé || attrs.category || state);
  if (/extr/.test(s)) return 6;
  if (/tres_eleve|very_high|tres_haut/.test(s)) return 5;
  if (/eleve|high|haut|fort/.test(s)) return 4;
  if (/moyen|moder|medium/.test(s)) return 3;
  if (/tres_faible|very_low/.test(s)) return 1;
  if (/faible|low|bas/.test(s)) return 2;
  if (/nul|none|aucun|^0$/.test(s)) return 0;
  return null;
}

// Météo-France warning colours (also the words of other providers): 1 green … 4 red.
export const WX_ALERT_COLORS = ["", "#43a047", "#fdd835", "#fb8c00", "#e53935"];
export function wxAlertLevel(v) {
  const n = wxNumber(v);
  if (n != null) return n >= 1 && n <= 4 ? n : null;
  const s = wxNorm(v);
  if (/rouge|red/.test(s)) return 4;
  if (/orange/.test(s)) return 3;
  if (/jaune|yellow/.test(s)) return 2;
  if (/vert|green/.test(s)) return 1;
  return null;
}

// The phenomena of a Météo-France warning sensor, by the normalized attribute name.
export const WX_PHENOMENA = [
  { key: "wind", re: /(^|_)(vent|wind)/, icon: "mdi:weather-windy" },
  { key: "rain_flood", re: /(^|_)(pluie|rain)/, icon: "mdi:weather-pouring" },
  { key: "thunderstorm", re: /(^|_)(orage|thunder|storm)/, icon: "mdi:weather-lightning" },
  { key: "flood", re: /(^|_)(inondation|crue|flood)/, icon: "mdi:home-flood" },
  { key: "snow_ice", re: /(^|_)(neige|verglas|snow|ice)(_|$)/, icon: "mdi:weather-snowy-heavy" },
  { key: "heat_wave", re: /(^|_)(canicule|heat)/, icon: "mdi:thermometer-high" },
  { key: "cold_wave", re: /(^|_)(grand_froid|froid|cold)/, icon: "mdi:snowflake-thermometer" },
  { key: "avalanche", re: /(^|_)avalanche/, icon: "mdi:image-filter-hdr" },
  { key: "waves", re: /(^|_)(vague|submersion|wave)/, icon: "mdi:waves" },
];
export const wxPhenomenon = (name) => {
  const n = wxNorm(name);
  return WX_PHENOMENA.find((p) => p.re.test(n));
};

// A CAP severity (Meteoalarm, NWS) on the warning scale: anything reported is yellow at least.
export function wxSeverityLevel(v) {
  const s = wxNorm(v);
  if (/extreme/.test(s)) return 4;
  if (/severe/.test(s)) return 3;
  if (/moderate|minor/.test(s)) return 2;
  return null;
}

// The phenomenon of a warning's type: a Meteoalarm `awareness_type` ("1; Wind", by its number) or a GeoSphere
// Austria `type` slug (its "storm" is wind, not a thunderstorm).
export const WX_METEOALARM_TYPES = { 1: "wind", 2: "snow_ice", 3: "thunderstorm", 5: "heat_wave", 6: "cold_wave", 7: "waves", 9: "avalanche", 10: "rain_flood", 12: "flood", 13: "rain_flood" };
export const WX_GEOSPHERE_TYPES = { storm: "wind", rain: "rain_flood", snow: "snow_ice", black_ice: "snow_ice", thunderstorm: "thunderstorm", heat: "heat_wave", cold: "cold_wave" };
export function wxWarningType(v) {
  if (v == null || v === "") return null;
  const n = wxNumber(String(v).split(";")[0].trim());
  const key = n != null ? WX_METEOALARM_TYPES[n] : WX_GEOSPHERE_TYPES[wxNorm(v)];
  return key ? WX_PHENOMENA.find((p) => p.key === key) : (wxPhenomenon(String(v).split(";").pop()) ?? null);
}

// The warnings of the `warning_entities`, yellow (2) and up, the highest first: each { entity, level, title, icon };
// `ph` its phenomenon, which names it in the card's language when it has no title (Météo-France, GeoSphere Austria).
// - Meteoalarm: a binary_sensor, on while there is a warning; `awareness_level` "3; orange; Severe", `headline` / `event`.
// - DWD (Deutscher Wetterdienst): `warning_count`, then `warning_<n>_level` (1 … 4) and `warning_<n>_headline` / `_name`.
// - NWS alerts: an `Alerts` list of { Event, Headline, Severity }.
// - Météo-France: one attribute per phenomenon with its colour.
// - GeoSphere Austria Warnings: a level sensor ("none", "yellow"…) with the featured warning's `type` (storm, rain…);
//   its warning counts are no level and are skipped.
// - Anything else: on, or a level / severity, with a headline, title or event.
// The same warning from two entities (Meteoalarm and its national service) is shown once.
export function wxWarnings(hass, ids) {
  const out = [];
  const add = (entity, level, title, ph) => {
    if (!level || level < 2) return;
    const p = ph || wxPhenomenon(title);
    const w = { entity, level: Math.min(4, level), title: title ? String(title) : "", ph: p?.key, icon: p?.icon || "mdi:alert" };
    if (out.some((x) => x.entity !== entity && x.level === w.level && (w.ph ? x.ph === w.ph : x.title === w.title))) return;
    out.push(w);
  };
  const levelOf = (x) => wxAlertLevel(String(x?.awareness_level ?? "").split(";")[0]) ?? wxAlertLevel(x?.awareness_level) ?? wxSeverityLevel(x?.severity ?? x?.Severity);
  for (const id of [].concat(ids || [])) {
    const st = typeof id === "string" ? hass?.states[id] : null;
    if (wxUnavailable(st) || st.state === "off") continue;
    const a = st.attributes;
    const list = [a.Alerts, a.alerts, a.warnings].find(Array.isArray);
    if (list) {
      for (const x of list) {
        if (x && typeof x === "object") add(id, levelOf(x) ?? wxNumber(x.level) ?? wxAlertLevel(x.level), x.Event ?? x.event ?? x.Headline ?? x.headline ?? x.title ?? x.name);
      }
    } else if (a.warning_count != null || a.warning_1_level != null) {
      // DWD: 1 weather warning (yellow) … 4 extreme weather.
      for (let i = 1; i <= (wxNumber(a.warning_count) ?? 9) && a[`warning_${i}_level`] != null; i++) {
        const lvl = wxNumber(a[`warning_${i}_level`]);
        add(id, lvl ? lvl + 1 : null, a[`warning_${i}_headline`] ?? a[`warning_${i}_name`]);
      }
    } else if (Object.keys(a).some((k) => wxPhenomenon(k) && wxAlertLevel(a[k]))) {
      for (const [k, v] of Object.entries(a)) {
        const p = wxPhenomenon(k);
        if (p && !out.some((w) => w.entity === id && w.ph === p.key)) add(id, wxAlertLevel(v), "", p);
      }
    } else {
      // A count (GeoSphere's active / advance warnings, a unit or a state class) is no level.
      const count = a.unit_of_measurement != null || a.state_class != null;
      const lvl = levelOf(a) ?? wxAlertLevel(a.level) ?? (count ? null : wxAlertLevel(st.state)) ?? (st.state === "on" ? 2 : null);
      add(id, lvl, a.headline ?? a.event ?? a.title ?? "", wxWarningType(a.awareness_type) ?? wxWarningType(a.type));
    }
  }
  return out.sort((x, y) => y.level - x.level);
}

// VigiEau / Propluvia drought levels: 0 none … 4 crisis.
export const WX_VG_COLORS = ["#43a047", "#fdd835", "#fb8c00", "#e53935", "#8e24aa"];
export function wxDroughtLevel(v) {
  const n = wxNumber(v);
  if (n != null) return wxClamp(Math.round(n), 0, 4);
  const s = wxNorm(v);
  if (/crise|crisis/.test(s)) return 4;
  if (/renforc|reinforced|enhanced/.test(s)) return 3;
  if (/alerte|alert/.test(s)) return 2;
  if (/vigilance/.test(s)) return 1;
  if (/aucun|pas_de|none|no_|normal/.test(s)) return 0;
  return null;
}

// Air quality on the European / Atmo index: 1 good … 6 extremely poor. An index sensor gives it directly (Atmo 1–6,
// or a US AQI 0–500 mapped onto it); a concentration in µg/m³ is placed on the EAQI thresholds of its pollutant.
export const WX_AQ_COLORS = ["", "#50f0e6", "#50ccaa", "#f0e641", "#ff5050", "#960032", "#872181"];
export const WX_EAQI = { pm25: [10, 20, 25, 50, 75], pm10: [20, 40, 50, 100, 150], o3: [50, 100, 130, 240, 380], no2: [40, 90, 120, 230, 340], so2: [100, 200, 350, 500, 750] };
export const wxStep = (v, limits) => 1 + limits.filter((l) => v > l).length;
export function wxAirLevel(st, pollutant) {
  const v = wxNum(st);
  if (v == null) return null;
  const a = st.attributes;
  const index = a.device_class === "aqi" || a.Libellé != null || a.libelle != null || !a.unit_of_measurement;
  if (index) return v <= 6 ? wxClamp(Math.round(v), 1, 6) : wxStep(v, [50, 100, 150, 200, 300]);
  return pollutant && WX_EAQI[pollutant] ? wxStep(v, WX_EAQI[pollutant]) : null;
}

// Outdoor pollutants, by entity id or device class; indoor sensors (an air purifier's PM2.5) are left out by requiring an
// air quality integration (Atmo France, WAQI, AirVisual, Google Air Quality, Airly, sensor.community…).
export const WX_POLLUTANTS = [
  ["pm25", /(^|_)(pm_?2_?5|pm25)(_|$)/, "pm25"],
  ["pm10", /(^|_)pm_?10(_|$)/, "pm10"],
  ["o3", /(^|_)(ozone|o3)(_|$)/, "ozone"],
  ["no2", /(^|_)(dioxyde_d_azote|no2|nitrogen_dioxide)(_|$)/, "nitrogen_dioxide"],
  ["so2", /(^|_)(dioxyde_de_soufre|so2|sulphur_dioxide|sulfur_dioxide)(_|$)/, "sulphur_dioxide"],
];
export const WX_AIR_SOURCE = /atmo|waqi|airvisual|air_quality|airparif|airly|openaq|google_air|qualite_de_l_air|luftdaten|sensor_community|nam_/;
export const WX_AIR_PLATFORMS = /atmo|waqi|airvisual$|google_air|airly|openaq|luftdaten|nam$|accuweather|openweathermap|pirateweather/;

export function wxFindPollutants(hass, sensors) {
  const out = new Map();
  for (const id of sensors) {
    if (!id.startsWith("sensor.")) continue;
    const st = hass.states[id];
    const oid = wxNorm(id.split(".")[1]);
    if (/pollen|concentration_(ambroisie|armoise|aulne|bouleau|gramin|olivier)/.test(oid)) continue;
    const outdoor = WX_AIR_SOURCE.test(oid) || WX_AIR_PLATFORMS.test(hass.entities?.[id]?.platform || "");
    if (!outdoor) continue;
    const dc = st.attributes.device_class;
    const hit = WX_POLLUTANTS.find(([, re, d]) => re.test(oid) || dc === d);
    if (hit && !out.has(hit[0])) out.set(hit[0], id);
  }
  return Object.fromEntries(out);
}

// Météo-France "rain in the next hour" words, and other providers' intensities.
export const WX_RAIN_COLORS = ["transparent", "#90caf9", "#42a5f5", "#1565c0"];
export function wxRainLevel(v) {
  const n = wxNumber(v);
  if (n != null) return n <= 0 ? 0 : n < 1 ? 1 : n < 4 ? 2 : 3;
  const s = wxNorm(v);
  if (/forte|heavy|fort/.test(s)) return 3;
  if (/moder|medium/.test(s)) return 2;
  if (/faible|light|pluie|rain/.test(s)) return 1;
  return 0;
}
