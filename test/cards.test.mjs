import assert from "node:assert/strict";
import { test } from "node:test";
import { makeHass, NOON } from "./hass.mjs";
import { load, mount } from "./load.mjs";

const lib = load(NOON);
const html = (el) => el.shadowRoot.innerHTML.replace(/<style>[\s\S]*?<\/style>/g, "");
const card = (config = {}, hass = makeHass()) => mount(lib, "weather-plus-card", config, hass);

test("both cards and their editors are registered", () => {
  for (const [tag, cls] of Object.entries(lib.cards)) {
    assert.ok(cls, tag);
    assert.ok(lib.customElements.get(`${tag}-editor`), `${tag}-editor`);
  }
  assert.equal(lib.window.customCards.length, 2);
});

test("discovery: every integration's sensors around the weather entity", () => {
  const ent = lib.wxResolve(makeHass(), "weather.paris");
  assert.equal(ent.uv, "sensor.paris_uv");
  assert.equal(ent.next_rain, "sensor.paris_next_rain");
  assert.equal(ent.alert, "sensor.75_weather_alert");
  assert.equal(ent.vigieau, "sensor.alert_level_in_paris");
  assert.equal(ent.lightning_counter, "sensor.blitzortung_lightning_counter");
  assert.equal(ent.lightning_distance, "sensor.blitzortung_lightning_distance");
  assert.equal(ent.aqi, "sensor.paris_air_quality_index");
  assert.equal(ent.pollen_risk, "sensor.pollens_75_risklevel");
  assert.equal(ent.pollen.length, 8);
  assert.ok(!ent.pollen.includes("sensor.pollens_75_risklevel"));
});

test("discovery: overrides win, a single pollen sensor becomes a list", () => {
  const ent = lib.wxResolve(makeHass(), "weather.paris", { uv: "sensor.other_uv", pollen: "sensor.pollens_75_bouleau" });
  assert.equal(ent.uv, "sensor.other_uv");
  assert.deepEqual([...ent.pollen], ["sensor.pollens_75_bouleau"]);
});

test("discovery: the weather alert is not mistaken for the drought level", () => {
  const h = makeHass("en", { "sensor.75_weather_alert": { state: undefined } });
  delete h.states["sensor.75_weather_alert"];
  const ent = lib.wxResolve(h, "weather.paris");
  assert.equal(ent.alert, undefined);
  assert.equal(ent.vigieau, "sensor.alert_level_in_paris");
});

test("scales: pollen, warnings, drought, rain, UV", () => {
  assert.equal(lib.wxPollenLevel("4"), 4);
  assert.equal(lib.wxPollenLevel("6"), 5);
  assert.equal(lib.wxPollenLevel("Très faible"), 1);
  assert.equal(lib.wxPollenLevel("Faible"), 2);
  assert.equal(lib.wxPollenLevel("Very High"), 5);
  assert.equal(lib.wxPollenLevel("x", { Libellé: "Moyen" }), 3);
  assert.equal(lib.wxAlertLevel("Orange"), 3);
  assert.equal(lib.wxAlertLevel("Vert"), 1);
  assert.equal(lib.wxAlertLevel("whatever"), null);
  assert.equal(lib.wxDroughtLevel("alerte_renforcee"), 3);
  assert.equal(lib.wxDroughtLevel("Crise"), 4);
  assert.equal(lib.wxDroughtLevel("Aucune restriction"), 0);
  assert.equal(lib.wxRainLevel("Temps sec"), 0);
  assert.equal(lib.wxRainLevel("Pluie modérée"), 2);
  assert.equal(lib.wxRainLevel("Pluie forte"), 3);
  assert.deepEqual([0, 2, 3, 6, 8, 11].map(lib.wxUvLevel), [0, 0, 1, 2, 3, 4]);
  assert.deepEqual(JSON.parse(JSON.stringify(lib.wxBearing("fr", 225))), { deg: 225, label: "SO" });
  assert.equal(lib.wxBearing("en", "NW").deg, 315);
});

test("every condition has a scene, by day and by night", () => {
  for (const cond of Object.keys(lib.WX_CONDITIONS)) {
    for (const night of [false, true]) {
      const svg = lib.wxSceneSvg(cond, night);
      assert.match(svg, /^<svg viewBox="0 0 100 80"/, cond);
      assert.doesNotMatch(svg, /undefined|NaN/, cond);
    }
  }
  assert.match(lib.wxSceneSvg("sunny", false), /class="rays"/);
  assert.match(lib.wxSceneSvg("sunny", true), /class="moon"/);
  assert.match(lib.wxSceneSvg("pouring", false), /class="rain heavy"/);
  assert.match(lib.wxSceneSvg("lightning-rainy", false), /class="bolt".*|class="flash"/);
  assert.match(lib.wxSceneSvg("snowy", false), /class="snow"/);
});

test("card: the weather now, the warning in the status pill, the hero chips", () => {
  const out = html(card());
  assert.match(out, /class="scene c-partlycloudy day"/);
  assert.match(out, /<span class="val">17\.4<small>°C<\/small>/);
  assert.match(out, /↑<b>18°<\/b> ↓<b>9°<\/b>/);
  assert.match(out, /Feels like 16°/);
  assert.match(out, /class="st alert" style="--st-color:#fdd835"><span class="dot"><\/span>Yellow warning/);
  assert.match(out, /<div class="sub">Partly cloudy<\/div>/);
  assert.match(out, /rotate\(45deg\).*18 km\/h SW/);
  assert.match(out, /1014 hPa/);
  assert.match(out, /UV 3/);
  assert.match(out, /AQI 2/);
});

test("card: forecasts come from weather/subscribe_forecast", () => {
  const h = makeHass();
  const out = html(card({}, h));
  assert.deepEqual(
    h.subscriptions.map((s) => s.forecast_type),
    ["hourly", "daily"],
  );
  assert.equal((out.match(/class="hcol/g) || []).length, 12);
  assert.equal((out.match(/class="drow"/g) || []).length, 5);
  assert.match(out, /<span class="day">Today<\/span>/);
  assert.match(out, /class="nowdot"/);
  assert.match(out, /class="curve"/);
  // The thunderstorm in the hourly forecast is announced.
  assert.match(out, /Storms possible at 6 PM/);
});

test("card: rain in the next hour, alerts, VigiEau, lightning, pollen, UV and sun", () => {
  const out = html(card({}, makeHass("fr")));
  assert.match(out, /Pluie forte dans 15 min/);
  assert.match(out, /class="seg l3" style="flex:10/);
  assert.match(out, /Pluie 60 %/);
  assert.doesNotMatch(out, /Neige 0/);
  assert.match(out, /Vent violent/);
  assert.match(out, /Orages/);
  assert.doesNotMatch(out, /Canicule/);
    assert.match(out, /<b>Arrosage<\/b> · Interdit de 9 h à 20 h/);
  assert.match(out, /Foudre à 18 km \(12 impacts\)/);
  assert.match(out, /Sécheresse : alerte</);
  // Pollen: most present first, the absent ones left out.
  const pollen = out.slice(out.indexOf('class="pollen"'));
  assert.ok(pollen.indexOf("Graminées") < pollen.indexOf("Armoise"));
  assert.doesNotMatch(pollen, /Ambroisie/);
  assert.match(out, /Pollens<\/span><span class="chip tint"[^>]*>.*Moyen/);
  assert.match(out, /Modéré.*Lunettes et crème solaire/);
  assert.match(out, /class="sun up"/);
  assert.match(out, /10 h 27 de jour/);
});

test("card: sections follow `sections`, and hide without data", () => {
  const out = html(card({ sections: ["pollen", "daily"] }));
  assert.ok(out.indexOf("s-pollen") < out.indexOf("s-daily"));
  assert.doesNotMatch(out, /s-alerts|s-rain|s-hourly|s-uv|s-sun/);
  const h = makeHass();
  for (const id of Object.keys(h.states)) if (id.startsWith("sensor.")) delete h.states[id];
  const bare = html(card({}, h));
  assert.doesNotMatch(bare, /s-rain|s-pollen/);
  // Only the storm of the hourly forecast is left in the alerts.
  assert.match(bare, /s-alerts.*Storms possible at 6 PM<\/span><\/div><\/div>/);
  assert.match(bare, /s-daily/);
  assert.match(bare, /s-uv/); // from the weather entity's uv_index
});

test("card: red warning, VigiEau crisis and an orange phenomenon pulse", () => {
  const out = html(
    card(
      {},
      makeHass("en", {
        "sensor.75_weather_alert": { state: "Rouge", "Vent violent": "Rouge", Orages: "Orange" },
        "sensor.alert_level_in_paris": { state: "crise" },
      }),
    ),
  );
  assert.match(out, /Red warning/);
  assert.match(out, /chip tint lvl4 pulse[^>]*>.*Strong wind/);
  assert.ok(out.indexOf("Strong wind") < out.indexOf("Thunderstorms"));
  assert.match(out, /Drought: crisis/);
});

test("card: no warning, rain now, clear night, no animation", () => {
  const out = html(
    card(
      { animations: false },
      makeHass("en", {
        "weather.paris": { state: "clear-night" },
        "sensor.75_weather_alert": { state: "Vert", "Vent violent": "Vert", Orages: "Vert" },
        "sensor.blitzortung_lightning_counter": { state: 0 },
        "sensor.paris_next_rain": { "1_hour_forecast": { "0 min": "Pluie faible", "5 min": "Pluie faible", "10 min": "Temps sec" } },
      }),
    ),
  );
  assert.match(out, /class="scene c-clear-night day still"/);
  assert.match(out, /No weather warning/);
  assert.match(out, /Light rain now, stopping in 10 min/);
  assert.match(out, /class="st" style="--st-color:#5c6bc0"><span class="dot"><\/span>Clear night/);
  assert.match(out, /<ha-card class="still">/);
});

test("card: lightning nearby goes to the status pill when there is no warning", () => {
  const out = html(card({}, makeHass("en", { "sensor.75_weather_alert": { state: "Vert", "Vent violent": "Vert", Orages: "Vert" } })));
  assert.match(out, /class="st alert" style="--st-color:#7e57c2"><span class="dot"><\/span>Lightning 18 km away/);
});

test("card: a section's entry animations play when it first shows only", () => {
  const h = makeHass();
  h.connection = null;
  const el = card({}, h);
  assert.match(html(el), /class="section enter s-rain"/);
  assert.doesNotMatch(html(el), /s-daily/);
  const later = makeHass("en", { "weather.paris": { temperature: 18 } });
  el.hass = later;
  assert.match(html(el), /class="section s-rain"/);
  assert.match(html(el), /class="section enter s-daily"/);
  assert.match(html(el), /<span class="val">18<small>/);
});

test("card: twice-daily forecasts are folded into days", () => {
  const h = makeHass("en", { "weather.paris": { supported_features: 4 } });
  const base = new Date(NOON);
  h.forecasts.twice_daily = [
    { datetime: new Date(base.setHours(12)).toISOString(), is_daytime: true, condition: "sunny", temperature: 19, precipitation_probability: 10 },
    { datetime: new Date(base.setHours(23)).toISOString(), is_daytime: false, condition: "clear-night", temperature: 8 },
  ];
  const out = html(card({}, h));
  assert.deepEqual(
    h.subscriptions.map((s) => s.forecast_type),
    ["twice_daily"],
  );
  assert.match(out, /<span class="lo">8°<\/span>.*<span class="hi">19°<\/span>/);
});

test("unavailable or missing weather entity", () => {
  assert.match(html(card({}, makeHass("en", { "weather.paris": { state: "unavailable" } }))), /Unavailable/);
  assert.match(html(card({ entity: "weather.nowhere" })), /No weather entity found \(weather\.nowhere\)/);
});

test("clicks open the more-info dialog of the entity", () => {
  const el = card();
  el._onClick({ composedPath: () => [{ dataset: { more: "sensor.paris_uv" } }] });
  const ev = el.events.at(-1);
  assert.equal(ev.type, "hass-more-info");
  assert.equal(ev.detail.entityId, "sensor.paris_uv");
});

test("mini card: compact, unfolds into the full card", () => {
  const el = mount(lib, "weather-plus-mini-card", {}, makeHass());
  let out = html(el);
  assert.match(out, /<ha-card class="mini">/);
  assert.match(out, /Heavy rain in 15 min/);
  assert.match(out, /data-action="zoom"/);
  assert.match(out, /Strong wind/);
  assert.doesNotMatch(out, /s-daily/);
  el._onClick({ detail: 1, composedPath: () => [{ dataset: { action: "zoom" } }] });
  out = html(el);
  assert.match(out, /class="section enter s-daily"/);
  assert.match(out, /mdi:arrow-collapse/);
  assert.doesNotMatch(html(mount(lib, "weather-plus-mini-card", { zoom: false }, makeHass())), /data-action="zoom"/);
});

test("editor: defaults are dropped from the YAML", () => {
  const out = lib.wxCleanConfig(
    { entity: "weather.paris", sections: ["alerts", "rain", "hourly", "daily", "uv", "pollen", "sun"], hours: 12, days: 3, name: "", entities: { uv: "" } },
    { sections: ["alerts", "rain", "hourly", "daily", "uv", "pollen", "sun"], hours: 12, days: 5, animations: true },
    "custom:weather-plus-card",
  );
  assert.deepEqual(JSON.parse(JSON.stringify(out)), { type: "custom:weather-plus-card", entity: "weather.paris", days: 3 });
});

test("labels: lightning without distance, a single strike, no water restriction", () => {
  const out = html(
    card(
      {},
      makeHass("en", {
        "sensor.blitzortung_lightning_counter": { state: 1 },
        "sensor.blitzortung_lightning_distance": { state: "unknown" },
        "sensor.alert_level_in_paris": { state: "aucune" },
      }),
    ),
  );
  assert.match(out, /Lightning: 1 strike</);
  assert.match(out, /No water restriction/);
});

test("name: the provider's boilerplate is left out", () => {
  const n = (friendly_name) => lib.wxWeatherName({ attributes: { friendly_name } });
  assert.equal(n("Météo-France forecast for city Rennes"), "Rennes");
  assert.equal(n("Forecast Home"), "Home");
  assert.equal(n("Prévisions Météo pour Rennes"), "Rennes");
  assert.equal(n("Paris"), "Paris");
});

test("scene: the stars keep their place while they twinkle", () => {
  assert.match(lib.wxSceneSvg("clear-night", true), /<g transform="translate\(16 16\) scale\(1\)"><path d=/);
});

test("hourly: no precipitation row when no hour has any", () => {
  const h = makeHass();
  for (const x of h.forecasts.hourly) {
    x.precipitation_probability = 0;
    x.precipitation = 0;
  }
  assert.doesNotMatch(html(card({}, h)), /class="pcol"/);
});
