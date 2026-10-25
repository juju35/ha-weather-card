/*
 * ha-weather-card — shared code: i18n, formatting, entity discovery (weather, forecasts and the sensors of the
 * weather integrations around it), the base element, the mini card and the editor.
 * scene.js draws the animated sky, sections.js the parts of the card, weather-plus-card.js the cards themselves.
 * https://github.com/juju35/ha-weather-card
 */
const WX_VERSION = "__VERSION__";
const WX_REPO = "https://github.com/juju35/ha-weather-card";

// ── i18n ─────────────────────────────────────────────────────────────────────
const WX_I18N = {
  en: {
    title: "Weather",
    c_clear_night: "Clear night",
    c_cloudy: "Cloudy",
    c_exceptional: "Exceptional",
    c_fog: "Fog",
    c_hail: "Hail",
    c_lightning: "Thunderstorm",
    c_lightning_rainy: "Stormy rain",
    c_partlycloudy: "Partly cloudy",
    c_pouring: "Pouring rain",
    c_rainy: "Rain",
    c_snowy: "Snow",
    c_snowy_rainy: "Sleet",
    c_sunny: "Sunny",
    c_windy: "Windy",
    c_windy_variant: "Windy and cloudy",
    unavailable: "Unavailable",
    no_weather: "No weather entity found",
    feels_like: "Feels like {v}",
    humidity: "Humidity",
    wind: "Wind",
    gusts: "gusts {v}",
    pressure: "Pressure",
    visibility: "Visibility",
    cloud_cover: "Cloud cover",
    dew_point: "Dew point",
    precipitation: "Precipitation",
    uv: "UV index",
    uv_n: "UV {v}",
    uv_0: "Low",
    uv_1: "Moderate",
    uv_2: "High",
    uv_3: "Very high",
    uv_4: "Extreme",
    uv_max: "Today's peak: {v}",
    uv_advice_0: "No protection needed",
    uv_advice_1: "Sunglasses and sunscreen around midday",
    uv_advice_2: "Seek shade around midday, wear a hat",
    uv_advice_3: "Avoid the sun between 11 a.m. and 4 p.m.",
    uv_advice_4: "Stay inside around midday",
    aqi: "Air quality",
    aqi_n: "AQI {v}",
    air_chip: "Air: {v}",
    air_index: "Air quality index",
    aq_1: "Good",
    aq_2: "Fair",
    aq_3: "Moderate",
    aq_4: "Poor",
    aq_5: "Very poor",
    aq_6: "Extremely poor",
    aq_advice_1: "Enjoy the outdoors",
    aq_advice_2: "No particular precaution",
    aq_advice_3: "Sensitive people: limit intense outdoor effort",
    aq_advice_4: "Limit intense outdoor activities",
    aq_advice_5: "Avoid outdoor effort, keep windows closed at peaks",
    aq_advice_6: "Stay inside as much as possible",
    pol_pm25: "Fine particles PM2.5",
    pol_pm10: "Particles PM10",
    pol_o3: "Ozone",
    pol_no2: "Nitrogen dioxide",
    pol_so2: "Sulphur dioxide",
    s_air: "Air quality",
    // Sections
    s_alerts: "Alerts",
    s_rain: "Rain in the next hour",
    s_hourly: "Hourly",
    s_daily: "Forecast",
    s_uv: "UV",
    s_pollen: "Pollen",
    s_sun: "Sun",
    s_moon: "Moon",
    dawn: "Dawn",
    dusk: "Dusk",
    golden_hour: "Golden hour",
    moonrise: "Moonrise",
    moonset: "Moonset",
    tomorrow_v: "Tomorrow: {v}",
    air_tomorrow: "Air tomorrow: {v}",
    pollen_tomorrow: "Pollen tomorrow: {v}",
    rain_today: "Today {v}",
    rain_next: "Next {h} h: {v}",
    clouds_n: "{v} % clouds",
    trend_up: "Rising: {v} in 3 h",
    trend_down: "Falling: {v} in 3 h",
    trend_steady: "Steady over 3 h",
    mp_new_moon: "New moon",
    mp_waxing_crescent: "Waxing crescent",
    mp_first_quarter: "First quarter",
    mp_waxing_gibbous: "Waxing gibbous",
    mp_full_moon: "Full moon",
    mp_waning_gibbous: "Waning gibbous",
    mp_last_quarter: "Last quarter",
    mp_waning_crescent: "Waning crescent",
    moon_lit: "{v} % lit · day {d} of 29",
    next_full: "Full moon",
    next_new: "New moon",
    // Rain in the next hour
    rain_none: "No rain within the hour",
    rain_now: "{v} now",
    rain_now_until: "{v} now, stopping in {n} min",
    rain_in: "{v} in {n} min",
    rain_0: "Dry",
    rain_1: "Light rain",
    rain_2: "Moderate rain",
    rain_3: "Heavy rain",
    rain_chance: "Rain {v}",
    snow_chance: "Snow {v}",
    freeze_chance: "Frost {v}",
    now: "Now",
    min_n: "{n} min",
    // Alerts
    vigilance: "Weather warning",
    vigilance_level: "{v} warning",
    lvl_1: "Green",
    lvl_2: "Yellow",
    lvl_3: "Orange",
    lvl_4: "Red",
    ph_wind: "Strong wind",
    ph_rain_flood: "Heavy rain",
    ph_thunderstorm: "Thunderstorms",
    ph_flood: "River floods",
    ph_snow_ice: "Snow and ice",
    ph_heat_wave: "Heat wave",
    ph_cold_wave: "Cold wave",
    ph_avalanche: "Avalanches",
    ph_waves: "High waves",
    ph_level: "{p} · {l}",
    lvlw_1: "green",
    lvlw_2: "yellow",
    lvlw_3: "orange",
    lvlw_4: "red",
    ph_title_wind: "Strong wind warning",
    ph_title_rain_flood: "Heavy rain and flooding warning",
    ph_title_thunderstorm: "Thunderstorm warning",
    ph_title_flood: "River flood warning",
    ph_title_snow_ice: "Snow and ice warning",
    ph_title_heat_wave: "Heat wave warning",
    ph_title_cold_wave: "Cold wave warning",
    ph_title_avalanche: "Avalanche warning",
    ph_title_waves: "High waves and coastal flooding warning",
    no_alert: "No weather warning",
    vigieau: "Drought",
    drought: "Drought: {v}",
    vg_0: "No water restriction",
    vg_1: "vigilance",
    vg_2: "alert",
    vg_3: "reinforced alert",
    vg_4: "crisis",
    lightning: "Lightning",
    strikes: "{n} strikes",
    strikes_1: "1 strike",
    lightning_count: "Lightning: {s}",
    lightning_n: "Lightning {d} away ({s})",
    lightning_near: "Lightning {d} away",
    storm_at: "Storms possible at {t}",
    // Pollen
    pollen_risk: "Pollen risk",
    pollen_none: "No pollen to report",
    pl_0: "None",
    pl_1: "Very low",
    pl_2: "Low",
    pl_3: "Moderate",
    pl_4: "High",
    pl_5: "Very high",
    pl_6: "Extremely high",
    pollen_chip: "Pollen: {v}",
    pollen_main: "mostly {v}",
    pollen_advice_0: "No pollen in the air",
    pollen_advice_1: "No discomfort expected",
    pollen_advice_2: "The most sensitive may feel it",
    pollen_advice_3: "Allergy sufferers: keep your treatment at hand",
    pollen_advice_4: "Allergy sufferers: air the house early, rinse your hair",
    pollen_advice_5: "Allergy sufferers: limit time outdoors",
    pollen_advice_6: "Allergy sufferers: avoid going out",
    p_alder: "Alder",
    p_ash: "Ash",
    p_birch: "Birch",
    p_chestnut: "Chestnut",
    p_cypress: "Cypress",
    p_grass: "Grass",
    p_hazel: "Hazel",
    p_hornbeam: "Hornbeam",
    p_lime: "Lime",
    p_mugwort: "Mugwort",
    p_nettle: "Nettle",
    p_oak: "Oak",
    p_olive: "Olive",
    p_plane: "Plane",
    p_plantain: "Plantain",
    p_poplar: "Poplar",
    p_ragweed: "Ragweed",
    p_sorrel: "Sorrel",
    p_tree: "Trees",
    p_weed: "Weeds",
    p_willow: "Willow",
    // Sun
    sunrise: "Sunrise",
    sunset: "Sunset",
    daylight: "{h} h {m} of daylight",
    // Mini card / zoom
    zoom_in: "Show the full card",
    popup_open: "Full screen",
    popup_close: "Close",
    zoom_out: "Back to the compact view",
    today: "Today",
    // Editor
    ed_entity: "Weather entity",
    ed_entity_helper: "Leave empty to use the first one found",
    ed_name: "Name",
    ed_name_helper: "Leave empty to use the weather entity's name",
    ed_sections: "Sections",
    ed_sections_helper: "Shown in this order; a section without data hides itself",
    ed_hours: "Hours",
    ed_hours_helper: "Hourly forecast length",
    ed_days: "Days",
    ed_days_helper: "Daily forecast length",
    ed_animations: "Animations",
    ed_popup: "Full screen button",
    ed_popup_helper: "Button at the top right that opens the detail over the whole screen",
    ed_zoom: "Detail button",
    ed_zoom_helper: "Button at the top right that switches the mini card to the full card and back",
    ed_language: "Language",
    ed_language_helper: "Automatic: follows the Home Assistant language",
    ed_language_auto: "Automatic",
    ed_advanced: "Advanced",
    ed_entities: "Entities",
    ed_entities_helper: "Detected automatically; set a role here, e.g. uv: sensor.paris_uv, pollen: [sensor.birch, sensor.grass]",
  },
  fr: {
    title: "Météo",
    c_clear_night: "Nuit claire",
    c_cloudy: "Nuageux",
    c_exceptional: "Exceptionnel",
    c_fog: "Brouillard",
    c_hail: "Grêle",
    c_lightning: "Orage",
    c_lightning_rainy: "Pluie orageuse",
    c_partlycloudy: "Éclaircies",
    c_pouring: "Averses",
    c_rainy: "Pluie",
    c_snowy: "Neige",
    c_snowy_rainy: "Neige fondue",
    c_sunny: "Ensoleillé",
    c_windy: "Venteux",
    c_windy_variant: "Venteux et nuageux",
    unavailable: "Indisponible",
    no_weather: "Aucune entité météo trouvée",
    feels_like: "Ressenti {v}",
    humidity: "Humidité",
    wind: "Vent",
    gusts: "rafales {v}",
    pressure: "Pression",
    visibility: "Visibilité",
    cloud_cover: "Couverture nuageuse",
    dew_point: "Point de rosée",
    precipitation: "Précipitations",
    uv: "Indice UV",
    uv_n: "UV {v}",
    uv_0: "Faible",
    uv_1: "Modéré",
    uv_2: "Élevé",
    uv_3: "Très élevé",
    uv_4: "Extrême",
    uv_max: "Pic du jour : {v}",
    uv_advice_0: "Aucune protection nécessaire",
    uv_advice_1: "Lunettes et crème solaire vers midi",
    uv_advice_2: "À l'ombre vers midi, avec un chapeau",
    uv_advice_3: "Éviter le soleil entre 11 h et 16 h",
    uv_advice_4: "Rester à l'intérieur vers midi",
    aqi: "Qualité de l'air",
    aqi_n: "IQA {v}",
    air_chip: "Air : {v}",
    air_index: "Indice de qualité de l'air",
    aq_1: "Bon",
    aq_2: "Moyen",
    aq_3: "Dégradé",
    aq_4: "Mauvais",
    aq_5: "Très mauvais",
    aq_6: "Extrêmement mauvais",
    aq_advice_1: "Profitez du plein air",
    aq_advice_2: "Pas de précaution particulière",
    aq_advice_3: "Personnes sensibles : limiter les efforts intenses dehors",
    aq_advice_4: "Limiter les activités physiques intenses dehors",
    aq_advice_5: "Éviter les efforts dehors, aérer hors des pics",
    aq_advice_6: "Rester à l'intérieur autant que possible",
    pol_pm25: "Particules fines PM2.5",
    pol_pm10: "Particules PM10",
    pol_o3: "Ozone",
    pol_no2: "Dioxyde d'azote",
    pol_so2: "Dioxyde de soufre",
    s_air: "Qualité de l'air",
    s_alerts: "Alertes",
    s_rain: "Pluie dans l'heure",
    s_hourly: "Heure par heure",
    s_daily: "Prévisions",
    s_uv: "UV",
    s_pollen: "Pollens",
    s_sun: "Soleil",
    s_moon: "Lune",
    dawn: "Aube",
    dusk: "Crépuscule",
    golden_hour: "Heure dorée",
    moonrise: "Lever",
    moonset: "Coucher",
    tomorrow_v: "Demain : {v}",
    air_tomorrow: "Air demain : {v}",
    pollen_tomorrow: "Pollens demain : {v}",
    rain_today: "Aujourd'hui {v}",
    rain_next: "{h} prochaines h : {v}",
    clouds_n: "{v} % de nuages",
    trend_up: "En hausse : {v} en 3 h",
    trend_down: "En baisse : {v} en 3 h",
    trend_steady: "Stable sur 3 h",
    mp_new_moon: "Nouvelle lune",
    mp_waxing_crescent: "Premier croissant",
    mp_first_quarter: "Premier quartier",
    mp_waxing_gibbous: "Gibbeuse croissante",
    mp_full_moon: "Pleine lune",
    mp_waning_gibbous: "Gibbeuse décroissante",
    mp_last_quarter: "Dernier quartier",
    mp_waning_crescent: "Dernier croissant",
    moon_lit: "Éclairée à {v} % · jour {d} sur 29",
    next_full: "Pleine lune",
    next_new: "Nouvelle lune",
    rain_none: "Pas de pluie dans l'heure",
    rain_now: "{v} en ce moment",
    rain_now_until: "{v} en ce moment, fin dans {n} min",
    rain_in: "{v} dans {n} min",
    rain_0: "Temps sec",
    rain_1: "Pluie faible",
    rain_2: "Pluie modérée",
    rain_3: "Pluie forte",
    rain_chance: "Pluie {v}",
    snow_chance: "Neige {v}",
    freeze_chance: "Gel {v}",
    now: "Maint.",
    min_n: "{n} min",
    vigilance: "Vigilance météo",
    vigilance_level: "Vigilance {v}",
    lvl_1: "verte",
    lvl_2: "jaune",
    lvl_3: "orange",
    lvl_4: "rouge",
    ph_wind: "Vent violent",
    ph_rain_flood: "Fortes pluies",
    ph_thunderstorm: "Orages",
    ph_flood: "Crues",
    ph_snow_ice: "Neige et verglas",
    ph_heat_wave: "Canicule",
    ph_cold_wave: "Grand froid",
    ph_avalanche: "Avalanches",
    ph_waves: "Fortes vagues",
    ph_level: "{p} · {l}",
    lvlw_1: "vert",
    lvlw_2: "jaune",
    lvlw_3: "orange",
    lvlw_4: "rouge",
    ph_title_wind: "Vigilance vent violent",
    ph_title_rain_flood: "Vigilance pluie-inondation : fortes pluies, inondations possibles",
    ph_title_thunderstorm: "Vigilance orages",
    ph_title_flood: "Vigilance crues des cours d'eau",
    ph_title_snow_ice: "Vigilance neige-verglas",
    ph_title_heat_wave: "Vigilance canicule",
    ph_title_cold_wave: "Vigilance grand froid",
    ph_title_avalanche: "Vigilance avalanches",
    ph_title_waves: "Vigilance vagues-submersion : fortes vagues, submersion du littoral possible",
    no_alert: "Pas de vigilance particulière",
    vigieau: "Sécheresse",
    drought: "Sécheresse : {v}",
    vg_0: "Pas de restriction d'eau",
    vg_1: "vigilance",
    vg_2: "alerte",
    vg_3: "alerte renforcée",
    vg_4: "crise",
    lightning: "Foudre",
    strikes: "{n} impacts",
    strikes_1: "1 impact",
    lightning_count: "Foudre : {s}",
    lightning_n: "Foudre à {d} ({s})",
    lightning_near: "Foudre à {d}",
    storm_at: "Orages possibles à {t}",
    pollen_risk: "Risque pollinique",
    pollen_none: "Aucun pollen à signaler",
    pl_0: "Nul",
    pl_1: "Très faible",
    pl_2: "Faible",
    pl_3: "Moyen",
    pl_4: "Élevé",
    pl_5: "Très élevé",
    pl_6: "Extrêmement élevé",
    pollen_chip: "Pollens : {v}",
    pollen_main: "surtout {v}",
    pollen_advice_0: "Pas de pollen dans l'air",
    pollen_advice_1: "Pas de gêne attendue",
    pollen_advice_2: "Les plus sensibles peuvent être gênés",
    pollen_advice_3: "Allergiques : garder son traitement à portée",
    pollen_advice_4: "Allergiques : aérer tôt le matin, se rincer les cheveux",
    pollen_advice_5: "Allergiques : limiter le temps dehors",
    pollen_advice_6: "Allergiques : éviter de sortir",
    p_alder: "Aulne",
    p_ash: "Frêne",
    p_birch: "Bouleau",
    p_chestnut: "Châtaignier",
    p_cypress: "Cyprès",
    p_grass: "Graminées",
    p_hazel: "Noisetier",
    p_hornbeam: "Charme",
    p_lime: "Tilleul",
    p_mugwort: "Armoise",
    p_nettle: "Urticacées",
    p_oak: "Chêne",
    p_olive: "Olivier",
    p_plane: "Platane",
    p_plantain: "Plantain",
    p_poplar: "Peuplier",
    p_ragweed: "Ambroisie",
    p_sorrel: "Oseille",
    p_tree: "Arbres",
    p_weed: "Herbacées",
    p_willow: "Saule",
    sunrise: "Lever",
    sunset: "Coucher",
    daylight: "{h} h {m} de jour",
    zoom_in: "Afficher la carte complète",
    popup_open: "Plein écran",
    popup_close: "Fermer",
    zoom_out: "Revenir à la vue compacte",
    today: "Aujourd'hui",
    ed_entity: "Entité météo",
    ed_entity_helper: "Laisser vide pour la première trouvée",
    ed_name: "Nom",
    ed_name_helper: "Laisser vide pour le nom de l'entité météo",
    ed_sections: "Sections",
    ed_sections_helper: "Affichées dans cet ordre ; une section sans données se masque",
    ed_hours: "Heures",
    ed_hours_helper: "Durée des prévisions horaires",
    ed_days: "Jours",
    ed_days_helper: "Durée des prévisions quotidiennes",
    ed_animations: "Animations",
    ed_popup: "Bouton plein écran",
    ed_popup_helper: "Bouton en haut à droite qui ouvre le détail sur tout l'écran",
    ed_zoom: "Bouton détail",
    ed_zoom_helper: "Bouton en haut à droite qui passe la mini-carte en carte complète et inversement",
    ed_language: "Langue",
    ed_language_helper: "Automatique : suit la langue de Home Assistant",
    ed_language_auto: "Automatique",
    ed_advanced: "Avancé",
    ed_entities: "Entités",
    ed_entities_helper: "Détectées automatiquement ; forcer un rôle ici, ex. uv: sensor.paris_uv, pollen: [sensor.bouleau, sensor.graminees]",
  },
};

function wxT(lang, key, vars) {
  const s = (WX_I18N[lang] || WX_I18N.en)[key] ?? WX_I18N.en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "") : s;
}

function wxLang(config, hass) {
  const l = (config?.language || hass?.language || globalThis.document?.documentElement?.lang || "en").split("-")[0];
  return WX_I18N[l] ? l : "en";
}

function wxEsc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

const wxUnavailable = (st) => !st || st.state === "unavailable" || st.state === "unknown";
const wxNumber = (v) => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const wxNum = (st) => (wxUnavailable(st) ? null : wxNumber(st.state));
const wxClamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Lower case, accents dropped, separators as "_": the form entity ids, states and attribute names are matched in.
const wxNorm = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_");

function wxFmtNum(lang, v, digits = 1) {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString(lang, { maximumFractionDigits: digits, useGrouping: false });
}

// "14:30" / "2 p.m." in the Home Assistant time format; `hour` alone gives "14 h" / "2 PM".
function wxTime(lang, date, hourOnly = false) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  if (hourOnly && lang === "fr") return `${d.getHours()} h`;
  return d.toLocaleTimeString(lang, hourOnly ? { hour: "numeric" } : { hour: "2-digit", minute: "2-digit" });
}

const wxDay = (lang, date) => {
  const d = new Date(date);
  const s = d.toLocaleDateString(lang, { weekday: "short" }).replace(/\.$/, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const wxSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

// ── Conditions ───────────────────────────────────────────────────────────────
const WX_CONDITIONS = {
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
const WX_IDLE = "var(--disabled-text-color, #9e9e9e)";

const wxCondLabel = (lang, cond) => (WX_CONDITIONS[cond] ? wxT(lang, `c_${cond.replace(/-/g, "_")}`) : cond ? String(cond) : "—");

// The icon of a condition; at night the sunny and partly cloudy icons become their night versions.
function wxCondIcon(cond, night) {
  if (night && cond === "sunny") return "mdi:weather-night";
  if (night && cond === "partlycloudy") return "mdi:weather-night-partly-cloudy";
  return WX_CONDITIONS[cond]?.icon || "mdi:weather-cloudy-alert";
}

const wxCondColor = (cond, night) => (night && (cond === "sunny" || cond === "partlycloudy") ? WX_CONDITIONS["clear-night"].color : WX_CONDITIONS[cond]?.color || WX_IDLE);

const WX_STORM = new Set(["lightning", "lightning-rainy"]);

// ── Scales: UV, pollen, warnings, drought, rain ──────────────────────────────
const WX_UV = [
  { max: 2, color: "#43a047" },
  { max: 5, color: "#fdd835" },
  { max: 7, color: "#fb8c00" },
  { max: 10, color: "#e53935" },
  { max: Infinity, color: "#8e24aa" },
];
const wxUvLevel = (v) => (v == null ? null : WX_UV.findIndex((l) => v <= l.max + 0.49));

// Pollen on the Atmo scale, 0 none … 6 extremely high: RNSA and Google Pollen (0–5) share its first words, so their
// numbers read the same; words in French or English.
function wxPollenLevel(state, attrs = {}) {
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
const WX_ALERT_COLORS = ["", "#43a047", "#fdd835", "#fb8c00", "#e53935"];
function wxAlertLevel(v) {
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
const WX_PHENOMENA = [
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
const wxPhenomenon = (name) => {
  const n = wxNorm(name);
  return WX_PHENOMENA.find((p) => p.re.test(n));
};

// VigiEau / Propluvia drought levels: 0 none … 4 crisis.
const WX_VG_COLORS = ["#43a047", "#fdd835", "#fb8c00", "#e53935", "#8e24aa"];
function wxDroughtLevel(v) {
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
const WX_AQ_COLORS = ["", "#50f0e6", "#50ccaa", "#f0e641", "#ff5050", "#960032", "#872181"];
const WX_EAQI = { pm25: [10, 20, 25, 50, 75], pm10: [20, 40, 50, 100, 150], o3: [50, 100, 130, 240, 380], no2: [40, 90, 120, 230, 340], so2: [100, 200, 350, 500, 750] };
const wxStep = (v, limits) => 1 + limits.filter((l) => v > l).length;
function wxAirLevel(st, pollutant) {
  const v = wxNum(st);
  if (v == null) return null;
  const a = st.attributes;
  const index = a.device_class === "aqi" || a.Libellé != null || a.libelle != null || !a.unit_of_measurement;
  if (index) return v <= 6 ? wxClamp(Math.round(v), 1, 6) : wxStep(v, [50, 100, 150, 200, 300]);
  return pollutant && WX_EAQI[pollutant] ? wxStep(v, WX_EAQI[pollutant]) : null;
}

// Outdoor pollutants, by entity id or device class; indoor sensors (an air purifier's PM2.5) are left out by requiring an
// air quality integration (Atmo France, WAQI, AirVisual, Google Air Quality, Airly, sensor.community…).
const WX_POLLUTANTS = [
  ["pm25", /(^|_)(pm_?2_?5|pm25)(_|$)/, "pm25"],
  ["pm10", /(^|_)pm_?10(_|$)/, "pm10"],
  ["o3", /(^|_)(ozone|o3)(_|$)/, "ozone"],
  ["no2", /(^|_)(dioxyde_d_azote|no2|nitrogen_dioxide)(_|$)/, "nitrogen_dioxide"],
  ["so2", /(^|_)(dioxyde_de_soufre|so2|sulphur_dioxide|sulfur_dioxide)(_|$)/, "sulphur_dioxide"],
];
const WX_AIR_SOURCE = /atmo|waqi|airvisual|air_quality|airparif|airly|openaq|google_air|qualite_de_l_air|luftdaten|sensor_community|nam_/;
const WX_AIR_PLATFORMS = /atmo|waqi|airvisual$|google_air|airly|openaq|luftdaten|nam$|accuweather|openweathermap|pirateweather/;

function wxFindPollutants(hass, sensors) {
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
const WX_RAIN_COLORS = ["transparent", "#90caf9", "#42a5f5", "#1565c0"];
function wxRainLevel(v) {
  const n = wxNumber(v);
  if (n != null) return n <= 0 ? 0 : n < 1 ? 1 : n < 4 ? 2 : 3;
  const s = wxNorm(v);
  if (/forte|heavy|fort/.test(s)) return 3;
  if (/moder|medium/.test(s)) return 2;
  if (/faible|light|pluie|rain/.test(s)) return 1;
  return 0;
}

// ── Discovery ────────────────────────────────────────────────────────────────
// Sensors of the integrations around the weather entity: Météo-France, OpenWeatherMap, Pirate Weather, AccuWeather,
// Open-Meteo, OpenUV, Pollens / Atmo France / Google Pollen, VigiEau, Blitzortung, WAQI… Each role is looked up by its
// registry translation_key, then by the entity_id (English and French slugs), then by its attributes. Several matches:
// the one on the weather entity's device first.
const WX_POLLEN_SPECIES = [
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
const WX_POLLEN_RISK = /risk_?level|niveau_de_risque|risque_pollinique|pollen_?(index|risk|global|risque)|qualite_globale_pollen|(^|_)pollens?( |$)/;

const WX_ROLES = {
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

// Registry entries grouped by device, built once per `hass.entities` object (it only changes with the registry).
const wxRegistryIndex = new WeakMap();
function wxByDevice(reg) {
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
const wxAheadOf = (hass, id) =>
  id ? [`${id}_j_1`, `${id}_tomorrow`, `${id}_demain`].find((x) => hass.states[x] && !wxUnavailable(hass.states[x])) : undefined;

// Day-ahead copies (Atmo's "-J+1", "_tomorrow") are forecasts, not the current reading.
const WX_AHEAD = /(_j_?\d|_demain|_tomorrow|_day_?\d)$/;
function wxSensors(hass) {
  return Object.keys(hass?.states || {})
    .filter((id) => id.startsWith("sensor.") || id.startsWith("binary_sensor."))
    .filter((id) => !WX_AHEAD.test(id))
    .filter((id) => !hass.entities?.[id]?.hidden)
    .sort();
}

function wxFindRole(hass, role, sensors, near) {
  const m = WX_ROLES[role];
  const ok = (id) => !m.not?.test(id) && (!m.need || (hass.states[id] && m.need(hass.states[id])));
  const pick = (list) => list.find((id) => near.has(id)) || list[0];
  const tk = m.keys ? sensors.filter((id) => ok(id) && m.keys.includes(hass.entities?.[id]?.translation_key)) : [];
  if (tk.length) return pick(tk);
  const byId = m.id ? sensors.filter((id) => ok(id) && m.id.test(id.split(".")[1])) : [];
  if (byId.length) return pick(byId);
  const byTest = m.test ? sensors.filter((id) => ok(id) && hass.states[id] && m.test(hass.states[id], id)) : [];
  return byTest.length ? pick(byTest) : undefined;
}

const wxSpecies = (text) => WX_POLLEN_SPECIES.find(([, re]) => re.test(text))?.[0];

// Every pollen sensor of the instance (one per species, the nearest first), and the overall risk sensor.
function wxFindPollen(hass, sensors) {
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
function wxWeatherName(st) {
  const n = String(st?.attributes.friendly_name || "").trim();
  const short = n
    .replace(/^.*\bforecast\s+for\s+(the\s+)?(city\s+(of\s+)?)?/i, "")
    .replace(/^.*\bpr[ée]visions?\s+(m[ée]t[ée]o\s+)?pour\s+(la\s+ville\s+de\s+)?/i, "")
    .replace(/^(forecast|pr[ée]visions?)\s+/i, "")
    .trim();
  return short || n;
}

function wxFindWeather(hass) {
  return Object.keys(hass?.states || {})
    .filter((id) => id.startsWith("weather.") && !hass.entities?.[id]?.hidden)
    .sort()[0];
}

// The entities the card reads around `weatherId`, `over`riding the detected ones.
function wxResolve(hass, weatherId, over = {}) {
  const sensors = wxSensors(hass);
  const dev = hass.entities?.[weatherId]?.device_id;
  const near = (dev && hass.entities && wxByDevice(hass.entities).get(dev)) || new Set();
  const ent = { weather: weatherId, sun: hass.states["sun.sun"] ? "sun.sun" : undefined };
  for (const role of Object.keys(WX_ROLES)) ent[role] = wxFindRole(hass, role, sensors, near);
  Object.assign(ent, wxFindPollen(hass, sensors));
  ent.air = wxFindPollutants(hass, sensors);
  for (const [k, v] of Object.entries(over || {})) {
    if (v == null || v === "") continue;
    if (k === "pollen") ent[k] = [].concat(v);
    else if (k === "air" && typeof v === "object") ent.air = { ...ent.air, ...v };
    else ent[k] = v;
  }
  return ent;
}

// ── Base element ─────────────────────────────────────────────────────────────
class WxElement extends HTMLElement {
  getGridOptions() {
    return { columns: 12, min_columns: 6 };
  }

  _lang() {
    return wxLang(this._config, this._hass);
  }

  _t(k, vars) {
    return wxT(this._lang(), k, vars);
  }
}

// ── Mini card ────────────────────────────────────────────────────────────────
// Like the ha-climate-air-card mini cards: the detail button (top right, `zoom: false` removes it) switches the mini
// card to the full card and back, and a click anywhere else on the page folds it again.
const wxInDialog = (ev) => ev.composedPath().some((n) => ["ha-more-info-dialog", "ha-dialog", "dialog"].includes(n.localName));

const wxMini = (Base) =>
  class extends Base {
    static get mini() {
      return true;
    }

    constructor() {
      super();
      this._onUnzoom = (ev) => {
        if (this._zoomed && !ev.composedPath().includes(this) && !wxInDialog(ev)) this._setZoom(false);
      };
    }

    connectedCallback() {
      super.connectedCallback?.();
      document.addEventListener("click", this._onUnzoom, true);
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      document.removeEventListener("click", this._onUnzoom, true);
    }

    getCardSize() {
      return this._zoomed ? super.getCardSize() : 2;
    }

    getGridOptions() {
      return this._zoomed ? super.getGridOptions() : { columns: 6, min_columns: 6 };
    }

    _compact() {
      return !this._zoomed;
    }

    _zoomButton() {
      if (this._config.zoom === false) return "";
      const z = !!this._zoomed;
      const label = wxEsc(this._t(z ? "zoom_out" : "zoom_in"));
      return `<button class="zoom" data-action="zoom" title="${label}" aria-label="${label}"><ha-icon icon="${z ? "mdi:arrow-collapse" : "mdi:arrow-expand"}"></ha-icon></button>`;
    }

    _setZoom(on) {
      this._zoomed = on;
      this._update();
    }

    // From the keyboard (Enter / Space: no click count), the focus follows to the button that replaced this one.
    _toggleZoom(ev) {
      this._setZoom(!this._zoomed);
      if (ev.detail === 0) this.shadowRoot.querySelector(".zoom")?.focus();
    }
  };

// ── Editor (built on Home Assistant's ha-form) ───────────────────────────────
const WX_SECTIONS = ["alerts", "rain", "hourly", "daily", "air", "uv", "pollen", "sun", "moon"];
const WX_DEFAULTS = { sections: WX_SECTIONS, hours: 12, days: 5, animations: true, popup: true };

class WxCardEditor extends HTMLElement {
  static mini = false;

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    const prev = this._hass?.language;
    this._hass = hass;
    if (this._form && prev === hass?.language) this._form.hass = hass;
    else this._render();
  }

  _defaults() {
    return { ...WX_DEFAULTS, ...(this.constructor.mini ? { zoom: true } : {}) };
  }

  _schema(lang) {
    return [
      { name: "entity", selector: { entity: { domain: "weather" } } },
      { name: "name", selector: { text: {} } },
      {
        name: "sections",
        selector: { select: { multiple: true, reorder: true, mode: "list", options: WX_SECTIONS.map((s) => ({ value: s, label: wxT(lang, `s_${s}`) })) } },
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "hours", selector: { number: { min: 0, max: 48, mode: "box" } } },
          { name: "days", selector: { number: { min: 0, max: 10, mode: "box" } } },
        ],
      },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "animations", selector: { boolean: {} } },
          { name: "popup", selector: { boolean: {} } },
          ...(this.constructor.mini ? [{ name: "zoom", selector: { boolean: {} } }] : []),
        ],
      },
      {
        name: "advanced",
        type: "expandable",
        flatten: true,
        schema: [
          {
            name: "language",
            selector: {
              select: {
                mode: "dropdown",
                options: [
                  { value: "", label: wxT(lang, "ed_language_auto") },
                  { value: "en", label: "English" },
                  { value: "fr", label: "Français" },
                ],
              },
            },
          },
          { name: "entities", selector: { object: {} } },
        ],
      },
    ];
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) => this._valueChanged(ev));
      this.appendChild(this._form);
    }
    const lang = wxLang(this._config, this._hass);
    this._form.hass = this._hass;
    this._form.schema = this._schema(lang);
    this._form.computeLabel = (s) => wxT(lang, `ed_${s.name}`);
    this._form.computeHelper = (s) => {
      const key = `ed_${s.name}_helper`;
      const txt = wxT(lang, key);
      return txt === key ? undefined : txt;
    };
    this._form.data = { ...this._defaults(), ...this._config };
  }

  _valueChanged(ev) {
    ev.stopPropagation();
    const lang = wxLang(this._config, this._hass);
    this._config = wxCleanConfig(ev.detail.value, this._defaults(), this._config.type);
    if (lang !== wxLang(this._config, this._hass)) this._render();
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

// Keeps the YAML short: options left empty or at their default are dropped.
function wxCleanConfig(value, defaults, type) {
  const out = { ...value };
  for (const k of Object.keys(out)) {
    const v = out[k];
    const same = Array.isArray(v) && Array.isArray(defaults[k]) ? v.join() === defaults[k].join() : v === defaults[k];
    if (v === "" || v == null || same) delete out[k];
  }
  if (out.entities && typeof out.entities === "object" && !Array.isArray(out.entities)) {
    const e = Object.fromEntries(Object.entries(out.entities).filter(([, v]) => v && (!Array.isArray(v) || v.length)));
    if (Object.keys(e).length) out.entities = e;
    else delete out.entities;
  }
  return type ? { type, ...out } : out;
}

// Defines a card and its editor (`<type>-editor`) and lists the card in the card picker.
function wxRegister(type, cls, name, description) {
  if (customElements.get(type)) return;
  const editor = class extends WxCardEditor {
    static mini = !!cls.mini;
  };
  customElements.define(type, cls);
  customElements.define(`${type}-editor`, editor);
  cls.tag = type;
  window.customCards = window.customCards || [];
  window.customCards.push({ type, name, description, preview: true, documentationURL: WX_REPO });
}

if (!customElements.get("weather-plus-card")) {
  console.info(`%c HA-WEATHER-CARD %c v${WX_VERSION} `, "background:#f9a825;color:#fff;font-weight:700", "");
}
