// Renders the weather cards with the mock home and saves the README screenshots.
// Usage: npm install && npm run build && node scripts/screenshots/weather.mjs
// (CHROMIUM_PATH=/path/to/chromium to use a browser of your own)
import { fileURLToPath } from "node:url";
import { DAY, NIGHT, pair, shoot } from "./harness.mjs";
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
];
const QUIET = {
  "sensor.75_weather_alert": { state: "Vert", "Vent violent": "Vert", Orages: "Vert" },
  "sensor.blitzortung_lightning_counter": { state: 0 },
  "sensor.alert_level_in_paris": { state: "aucune" },
  "sensor.paris_next_rain": { "1_hour_forecast": { "0 min": "Temps sec", "55 min": "Temps sec" } },
};
// One mini card per condition, with nothing to report but the weather.
export const conditionCards = (lang, still = true, list = CONDITIONS) =>
  list.map(([state, temperature, now]) => {
    const hass = mockHass(lang, { ...QUIET, "weather.paris": { state, temperature } }, now);
    hass.forecasts.hourly = [];
    return { tag: "weather-plus-mini-card", config: { animations: !still, zoom: false }, hass };
  });
export { CONDITIONS };

const SETUPS = {
  card: card("weather-plus-card"),
  mini: card("weather-plus-mini-card"),
  storm: card("weather-plus-card", { sections: ["alerts", "rain", "hourly"] }, STORM),
  night: card("weather-plus-card", { sections: ["hourly", "daily", "sun", "moon"] }, { "weather.paris": { state: "clear-night", temperature: 11.2 } }, NIGHT),
  conditions: (lang) => ({ cards: conditionCards(lang), cols: 2 }),
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await shoot({
    shots: [...pair("card"), ...pair("mini"), ...pair("storm"), ...pair("night", { now: NIGHT }), ...pair("conditions", { width: 640 })],
    setup: (s, lang) => SETUPS[s.file.replace(/-dark$/, "")](lang),
  });
}
