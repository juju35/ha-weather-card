// ── Discovery ────────────────────────────────────────────────────────────────
// Sensors of the integrations around the weather entity: Météo-France, OpenWeatherMap, Pirate Weather, AccuWeather,
// Open-Meteo, OpenUV, Pollens / Atmo France / Google Pollen, VigiEau, Blitzortung, WAQI… Each role is looked up by its
// registry translation_key, then by the entity_id (English and French slugs), then by its attributes. Several matches:
// the one on the weather entity's device first.
import { wxNorm, wxNumber, wxUnavailable } from "./shadow-dom-patching.js";
import { wxAlertLevel, wxFindPollutants, wxPhenomenon, wxPollenLevel } from "./scales.js";

export const WX_POLLEN_SPECIES = [
  ["alder", /aulne|alder/],
  ["ash", /frene|(^|_)ash($|_)/],
  ["birch", /bouleau|birch/],
  ["chestnut", /chataign|chestnut/],
  ["cypress", /cypres|cupress|cypress/],
  ["grass", /gramin|grass|poac/],
  ["hazel", /noisetier|hazel/],
  ["hornbeam", /charme|hornbeam/],
  ["lime", /tilleul|linden|(^|_)lime/],
  ["mugwort", /armoise|mugwort/],
  ["nettle", /urtic|ortie|nettle|parietaire/],
  ["oak", /chene|(^|_)oak/],
  ["olive", /olivier|olive/],
  ["plane", /platane|(^|_)plane/],
  ["plantain", /plantain/],
  ["poplar", /peuplier|poplar/],
  ["ragweed", /ambroisie|ragweed/],
  ["sorrel", /oseille|rumex|sorrel/],
  ["willow", /saule|willow/],
  ["tree", /(^|_)trees?($|_)|arbres?($|_)/],
  ["weed", /(^|_)weeds?($|_)|herbace/],
];
export const WX_POLLEN_RISK = /risk_?level|niveau_de_risque|risque_pollinique|pollen_?(index|risk|global|risque)|qualite_globale_pollen|(^|_)pollens?( |$)/;

export const WX_ROLES = {
  uv: { keys: ["uv", "uv_index", "current_uv_index"], id: /(^|_)uv(_index|_indice)?$|indice_uv|current_uv_index/, not: /uv_max|max_uv|uv_forecast|forecast_uv/ },
  uv_max: { keys: ["max_uv_index"], id: /(max_uv|uv_max)/ },
  // Only a sensor with the minute-by-minute forecast: other integrations name a plain "rain in" duration next_rain too.
  next_rain: { id: /next_rain|prochaine_pluie/, need: (st) => st.attributes["1_hour_forecast"] != null, test: (st) => st.attributes["1_hour_forecast"] != null },
  rain_chance: { keys: ["rain_chance"], id: /rain_chance|risque_de_pluie|precipitation_probability|probabilite_de_pluie/ },
  snow_chance: { keys: ["snow_chance"], id: /snow_chance|risque_de_neige/ },
  freeze_chance: { keys: ["freeze_chance"], id: /freeze_chance|risque_de_gel/ },
  alert: {
    keys: ["weather_alert"],
    id: /weather_alert|vigilance_meteo|alerte_meteo|(^|_)vigilance($|_officielle)/,
    not: /vigieau|secheresse|drought|water|eau/,
    test: (st) =>
      wxNumber(st.state) == null &&
      wxAlertLevel(st.state) != null &&
      (typeof st.attributes.phenomenes === "object" || Object.keys(st.attributes).some((k) => wxPhenomenon(k))),
  },
  vigieau: { keys: ["alert_level"], id: /vigieau|secheresse|drought|restrictions?_(d_)?eau|water_restriction|alert_level_in/, not: /numerique|numeric/ },
  // Blitzortung's counter, or a storm sensor carrying its strikes (Niak Weather: eclairs_20_min).
  lightning_counter: {
    keys: ["lightning_counter"],
    id: /lightning_(counter|count|strikes)|nombre_d_eclairs|impacts_de_foudre/,
    test: (st) => st.attributes.eclairs_20_min != null,
  },
  moon: { keys: ["phase"], id: /(^|_)moon_phase$|phase_(de_la_)?lune/ },
  // Lunar Phase (custom lunar_phase): its phase sensor carries the age, the light, moonrise / moonset and the next
  // full and new moons in its attributes.
  lunar_phase: {
    keys: ["moon_phase"],
    id: /(^|_)moon_phase$|phase_(de_la_)?lune/,
    need: (st) => st.attributes.moon_age != null && st.attributes.illumination_fraction != null,
    test: (st) => st.attributes.moon_age != null && st.attributes.illumination_fraction != null,
  },
  cloud_cover: { keys: ["cloud_cover"], id: /cloud_cover(age)?$|couverture_nuageuse$|nebulosite$/ },
  daily_precipitation: { keys: ["daily_precipitation"], id: /daily_precipitation$|precipitation_(du_jour|today)$|cumul_de_pluie_du_jour$/ },
  // Atmospheric pressure, for its trend: the weather entity's device first.
  pressure: {
    keys: ["pressure"],
    id: /(^|_)(pressure|pression(_atmospherique)?)$/,
    need: (st) => ["atmospheric_pressure", "pressure"].includes(st.attributes.device_class),
  },
  lightning_distance: { keys: ["lightning_distance"], id: /lightning_distance|distance_(de_la_)?foudre|distance_eclair/ },
  aqi: {
    keys: ["aqi"],
    id: /(^|_)aqi$|air_quality_index|qualite_globale|indice_atmo/,
    not: /pollen|(^|_)(pm|ozone|o3|no2|so2|dioxyde)/,
    test: (st) => st.attributes.device_class === "aqi",
  },
};

// A local weather station's wind (Netatmo, Ecowitt, WeatherFlow, Davis…), for the wind rose: resolved only when the
// `wind` section is shown, so that a station updating every minute does not touch the other cards.
export const WX_WIND_ROLES = {
  wind_direction: {
    keys: ["wind_direction", "wind_bearing", "wind_angle"],
    id: /wind_?(direction|bearing|angle|dir)|direction_(du_)?vent|(^|_)winddir/,
    not: /forecast|prevision|gust|rafale|cardinal|max|_j_?\d/,
    test: (st) => st.attributes.device_class === "wind_direction",
  },
  wind_speed: {
    keys: ["wind_speed", "wind_strength", "wind_speed_avg"],
    id: /wind_?(speed|strength)(_avg|_average|_mean)?$|vitesse_(moyenne_)?(du_)?vent$|(^|_)windspeed(avg)?$/,
    not: /forecast|prevision|gust|rafale|max/,
    test: (st, id) => st.attributes.device_class === "wind_speed" && !/gust|rafale|max/.test(id),
  },
  wind_gust: { keys: ["gust_speed", "wind_gust", "gust_strength", "wind_gust_speed"], id: /(wind_)?gust(_speed|_strength)?$|rafales?(_de_vent|_max)?$/, not: /forecast|prevision|daily|max_daily/ },
};

// Registry entries grouped by device, built once per `hass.entities` object (it only changes with the registry).
export const wxRegistryIndex = new WeakMap();
export function wxByDevice(reg) {
  let index = wxRegistryIndex.get(reg);
  if (!index) {
    index = new Map();
    for (const e of Object.values(reg)) {
      if (!e.device_id) continue;
      if (!index.has(e.device_id)) index.set(e.device_id, new Set());
      index.get(e.device_id).add(e.entity_id);
    }
    wxRegistryIndex.set(reg, index);
  }
  return index;
}

// Sensor ids of the instance, without the hidden or disabled ones.
// The day-ahead copy of a sensor (Atmo's "-J+1", "_tomorrow"), for tomorrow's level.
export const wxAheadOf = (hass, id) =>
  id ? [`${id}_j_1`, `${id}_tomorrow`, `${id}_demain`].find((x) => hass.states[x] && !wxUnavailable(hass.states[x])) : undefined;

// Day-ahead copies (Atmo's "-J+1", "_tomorrow") are forecasts, not the current reading.
export const WX_AHEAD = /(_j_?\d|_demain|_tomorrow|_day_?\d)$/;
export function wxSensors(hass) {
  return Object.keys(hass?.states || {})
    .filter((id) => id.startsWith("sensor.") || id.startsWith("binary_sensor."))
    .filter((id) => !WX_AHEAD.test(id))
    .filter((id) => !hass.entities?.[id]?.hidden)
    .sort();
}

export function wxFindRole(hass, role, sensors, near, roles = WX_ROLES) {
  const m = roles[role];
  const ok = (id) => !m.not?.test(id) && (!m.need || (hass.states[id] && m.need(hass.states[id])));
  const pick = (list) => list.find((id) => near.has(id)) || list[0];
  const tk = m.keys ? sensors.filter((id) => ok(id) && m.keys.includes(hass.entities?.[id]?.translation_key)) : [];
  if (tk.length) return pick(tk);
  const byId = m.id ? sensors.filter((id) => ok(id) && m.id.test(id.split(".")[1])) : [];
  if (byId.length) return pick(byId);
  const byTest = m.test ? sensors.filter((id) => ok(id) && hass.states[id] && m.test(hass.states[id], id)) : [];
  return byTest.length ? pick(byTest) : undefined;
}

export const wxSpecies = (text) => WX_POLLEN_SPECIES.find(([, re]) => re.test(text))?.[0];

// Every pollen sensor of the instance (one per species, the nearest first), and the overall risk sensor.
export function wxFindPollen(hass, sensors) {
  const out = new Map();
  let risk;
  for (const id of sensors) {
    if (!id.startsWith("sensor.")) continue;
    const st = hass.states[id];
    const oid = wxNorm(id.split(".")[1]);
    const text = `${oid} ${wxNorm(st.attributes.friendly_name)}`;
    if (WX_POLLEN_RISK.test(text)) {
      risk ||= id;
      continue;
    }
    if (/concentration/.test(oid)) continue;
    const pollenish = /pollen|allerg|rnsa|atmo|niveau_/.test(text) || hass.entities?.[id]?.platform?.match?.(/pollen/);
    const species = wxSpecies(oid) || (pollenish ? wxSpecies(text) : undefined);
    if (!species || !pollenish) continue;
    if (wxPollenLevel(st.state, st.attributes) == null && !wxUnavailable(st)) continue;
    if (!out.has(species)) out.set(species, id);
  }
  return { pollen: [...out.values()], pollen_risk: risk };
}

// The name of a weather entity without the provider's boilerplate: Météo-France names its entity
// "Météo-France forecast for city Rennes", other providers "Forecast Home" / "Prévisions Maison".
export function wxWeatherName(st) {
  const n = String(st?.attributes.friendly_name || "").trim();
  const short = n
    .replace(/^.*\bforecast\s+for\s+(the\s+)?(city\s+(of\s+)?)?/i, "")
    .replace(/^.*\bpr[ée]visions?\s+(m[ée]t[ée]o\s+)?pour\s+(la\s+ville\s+de\s+)?/i, "")
    .replace(/^(forecast|pr[ée]visions?)\s+/i, "")
    .trim();
  return short || n;
}

export function wxFindWeather(hass) {
  return Object.keys(hass?.states || {})
    .filter((id) => id.startsWith("weather.") && !hass.entities?.[id]?.hidden)
    .sort()[0];
}

// The entities the card reads around `weatherId`, `over`riding the detected ones; `wind`: the station's wind too
// (ent.wind, kept apart from the signature: see the card's _update).
export function wxResolve(hass, weatherId, over = {}, { wind = false } = {}) {
  const sensors = wxSensors(hass);
  const dev = hass.entities?.[weatherId]?.device_id;
  const near = (dev && hass.entities && wxByDevice(hass.entities).get(dev)) || new Set();
  const ent = { weather: weatherId, sun: hass.states["sun.sun"] ? "sun.sun" : undefined };
  for (const role of Object.keys(WX_ROLES)) ent[role] = wxFindRole(hass, role, sensors, near);
  Object.assign(ent, wxFindPollen(hass, sensors));
  ent.air = wxFindPollutants(hass, sensors);
  if (wind) {
    const w = {};
    for (const role of Object.keys(WX_WIND_ROLES)) {
      const id = over?.[role] || wxFindRole(hass, role, sensors.filter((x) => x.startsWith("sensor.")), near, WX_WIND_ROLES);
      if (id) w[role.slice(5)] = id;
    }
    ent.wind = w;
  }
  for (const [k, v] of Object.entries(over || {})) {
    if (v == null || v === "" || k in WX_WIND_ROLES) continue;
    if (k === "pollen") ent[k] = [].concat(v);
    else if (k === "air" && typeof v === "object") ent.air = { ...ent.air, ...v };
    else ent[k] = v;
  }
  return ent;
}
