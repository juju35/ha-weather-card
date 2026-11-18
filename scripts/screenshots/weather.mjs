// Renders the weather cards with the mock home and saves the README screenshots.
// Usage: npm install && npm run build && node scripts/screenshots/weather.mjs
// (CHROMIUM_PATH=/path/to/chromium to use a browser of your own)
import { realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { addCards, DAY, launch, NIGHT, openPage, pair, root, saveFramed, shoot } from "./harness.mjs";
import { mockHass } from "./mock.mjs";

// The screenshots are still: the scene drawn without its animations, rain and snow in place.
const config = { animations: false };
const card = (tag, extra = {}, changes = {}, now = DAY) => (lang) => ({
  cards: [{ tag, config: { ...config, ...extra }, hass: mockHass(lang, changes, now) }],
});

const STORM = {
  "weather.paris": { state: "lightning-rainy", temperature: 21.2, apparent_temperature: 23, wind_speed: 46, wind_gust_speed: 88, wind_bearing: 250 },
  "sensor.75_weather_alert": { state: "Orange", Orages: "Orange", "Vent violent": "Jaune", "Pluie-inondation": "Jaune" },
  "sensor.blitzortung_lightning_counter": { state: 37 },
  "sensor.blitzortung_lightning_distance": { state: 6 },
  "sensor.paris_next_rain": {
    "1_hour_forecast": { "0 min": "Pluie forte", "5 min": "Pluie forte", "10 min": "Pluie modérée", "15 min": "Pluie modérée", "20 min": "Pluie faible",
      "25 min": "Pluie faible", "35 min": "Temps sec", "45 min": "Temps sec", "55 min": "Temps sec" },
  },
};

const CONDITIONS = [
  ["sunny", 24, DAY],
  ["partlycloudy", 19, DAY],
  ["cloudy", 15, DAY],
  ["fog", 9, DAY],
  ["rainy", 13, DAY],
  ["pouring", 12, DAY],
  ["lightning-rainy", 21, DAY],
  ["snowy", -1, DAY],
  ["hail", 8, DAY],
  ["windy", 14, DAY],
  ["clear-night", 11, NIGHT],
  ["partlycloudy", 12, NIGHT],
  ["rainy", 10, NIGHT],
  ["lightning-rainy", 14, NIGHT],
];
const QUIET = {
  "sensor.75_weather_alert": { state: "Vert", "Vent violent": "Vert", Orages: "Vert" },
  "sensor.blitzortung_lightning_counter": { state: 0 },
  "sensor.alert_level_in_paris": { state: "aucune" },
  "sensor.paris_next_rain": { "1_hour_forecast": { "0 min": "Temps sec", "55 min": "Temps sec" } },
};
// One mini card per condition, with nothing to report but the weather. A catalogue of the day and night scenes: each
// keeps its own picture in the dark theme too (illustration_theme), where `auto` would turn every banner to night.
export const conditionCards = (lang, still = true, list = CONDITIONS) =>
  list.map(([state, temperature, now]) => {
    const hass = mockHass(lang, { ...QUIET, "weather.paris": { state, temperature } }, now);
    hass.forecasts.hourly = [];
    const illustration_theme = now === NIGHT ? "night" : "day";
    return { tag: "weather-plus-mini-card", config: { animations: !still, zoom: false, illustration_theme }, hass };
  });
export { CONDITIONS };

// Lunar Phase (custom lunar_phase): its phase sensor, with the moon's age, light, moonrise / moonset and the next
// full and new moons in its attributes, kept out of the mock home so that the other captures stay as they are.
const at = (now, h, m, days = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};
const LUNAR = "sensor.home_moon_phase";
const lunar = (now) => ({
  [LUNAR]: {
    state: "waxing_gibbous",
    friendly_name: "Home Moon phase",
    device_class: "enum",
    moon_age: 10.4,
    illumination_fraction: 78.6,
    moonrise: at(now, 14, 32),
    moonset: at(now, 3, 18),
    next_full_moon: at(now, 15, 51, 4),
    next_new_moon: at(now, 23, 47, 19),
  },
});

// A weather station's wind (Netatmo-like) and its last 24 hours, every 10 minutes: mostly from the south-west and the
// west, freshening in the afternoon, a calm spell at night, a north-easterly breeze in the morning. Deterministic.
const STATION = {
  "sensor.garden_wind_direction": { state: "245", friendly_name: "Garden Wind direction", device_class: "wind_direction", unit_of_measurement: "°" },
  "sensor.garden_wind_speed": { state: "19", friendly_name: "Garden Wind speed", device_class: "wind_speed", unit_of_measurement: "km/h" },
  "sensor.garden_gust_speed": { state: "37", friendly_name: "Garden Gust speed", device_class: "wind_speed", unit_of_measurement: "km/h" },
};
const windHistory = (now) => {
  const dirs = [];
  const speeds = [];
  for (let i = 0; i <= 144; i++) {
    const t = new Date(now.getTime() - (144 - i) * 600000).toISOString();
    const h = i / 6;
    const wave = Math.sin(i * 1.7) * 18 + Math.sin(i * 0.37) * 12;
    const dir = h < 5 ? 225 + wave : h < 9 ? (h < 7 ? 270 + wave : 0) : h < 13 ? 40 + wave : 250 + wave * 1.4;
    const speed = h >= 7 && h < 9 ? 0.4 : Math.max(2, (h < 9 ? 14 : h < 13 ? 9 : 22) + Math.sin(i * 2.3) * 7 + Math.sin(i * 0.5) * 6 + (h > 18 ? 14 : 0));
    dirs.push({ state: String(Math.round((dir + 360) % 360)), last_changed: t });
    speeds.push({ state: speed.toFixed(1), last_changed: t });
  }
  dirs[0].entity_id = "sensor.garden_wind_direction";
  speeds[0].entity_id = "sensor.garden_wind_speed";
  return [dirs, speeds];
};
const windCard = (lang) => {
  const hass = mockHass(lang, STATION, DAY);
  hass.windHistory = windHistory(DAY);
  return { cards: [{ tag: "weather-plus-card", config: { ...config, sections: ["wind", "sun"] }, hass }] };
};

const SETUPS = {
  wind: windCard,
  card: card("weather-plus-card"),
  mini: card("weather-plus-mini-card"),
  // The mini card expanded with its top right button: the full card, at the full card's width.
  "mini-zoom": (lang) => ({ cards: card("weather-plus-mini-card")(lang).cards.map((c) => ({ ...c, open: '[data-action="zoom"]' })) }),
  storm: card("weather-plus-card", { sections: ["alerts", "rain", "hourly"] }, STORM),
  night: card("weather-plus-card", { sections: ["hourly", "daily", "sun", "moon"] }, { "weather.paris": { state: "clear-night", temperature: 11.2 } }, NIGHT),
  conditions: (lang) => ({ cards: conditionCards(lang), cols: 2 }),
  "lunar-phase": card("weather-plus-card", { sections: ["sun", "moon"], entities: { lunar_phase: LUNAR } }, lunar(NIGHT), NIGHT),
};

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  await shoot({
    shots: [...pair("card"), ...pair("mini", { width: 380 }), ...pair("mini-zoom"), ...pair("storm"), ...pair("night", { now: NIGHT }), ...pair("conditions", { width: 640 }), ...pair("lunar-phase", { now: NIGHT }), ...pair("wind")],
    setup: (s, lang) => SETUPS[s.file.replace(/-dark$/, "")](lang),
  });

  // The full screen detail, on a desktop and on a phone: captured at the screen's size (its layout follows the
  // viewport), then framed like the other shots.
  const browser = await launch();
  for (const [file, theme, width, height] of [
    ["popup", "light", 1600, 1000],
    ["popup-dark", "dark", 1600, 1000],
    ["popup-phone", "light", 390, 844],
    ["popup-phone-dark", "dark", 390, 844],
  ]) {
    const page = await openPage(browser, { theme, width: 360 });
    await page.setViewportSize({ width, height });
    const lang = "en";
    await addCards(page, [{ tag: "weather-plus-card", config, hass: mockHass(lang, {}, DAY), open: '[data-action="popup"]' }]);
    await page.waitForTimeout(500);
    const png = await page.screenshot({ animations: "disabled" });
    const written = await saveFramed(browser, { theme, png, width, height, path: `${root}screenshots/${file}.png` });
    console.log(`screenshots/${file}.png${written ? "" : " (unchanged)"}`);
    await page.close();
  }
  await browser.close();
}
