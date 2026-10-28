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
  assert.equal(ent.aqi, "sensor.atmo_france_qualite_globale_paris");
  assert.deepEqual(JSON.parse(JSON.stringify(ent.air)), {
    no2: "sensor.atmo_france_dioxyde_d_azote_paris",
    so2: "sensor.atmo_france_dioxyde_de_soufre_paris",
    o3: "sensor.atmo_france_ozone_paris",
    pm10: "sensor.atmo_france_pm10_paris",
    pm25: "sensor.atmo_france_pm25_paris",
  });
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
  assert.equal(lib.wxPollenLevel("6"), 6);
  assert.equal(lib.wxPollenLevel("x", { Libellé: "Extrêmement élevé" }), 6);
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
  assert.match(out, /Air: fair/);
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
  assert.match(out, /Vent violent · jaune</);
  assert.match(out, /Orages · jaune</);
  assert.doesNotMatch(out, /Canicule/);
    assert.match(out, /<b>Arrosage<\/b> · Interdit de 9 h à 20 h/);
  assert.match(out, /Foudre à 18 km \(12 impacts\)/);
  assert.match(out, /Sécheresse : alerte</);
  // Pollen: most present first, the absent ones left out.
  const pollen = out.slice(out.indexOf('class="pollen"'));
  assert.ok(pollen.indexOf("Graminées") < pollen.indexOf("Armoise"));
  assert.doesNotMatch(pollen, /Ambroisie/);
  const pol = out.slice(out.indexOf("s-pollen"));
  assert.match(pol, /<span class="uvval" style="--k:#f0e641">3<\/span>.*<b[^>]*>Moyen<\/b><span>Allergiques : garder son traitement à portée · surtout graminées/);
  assert.equal((pol.match(/class="prow"/g) || []).length, 6);
  assert.match(out, /class="chip tint"[^>]*title="Risque pollinique"><ha-icon icon="mdi:flower-pollen"><\/ha-icon>Pollens : moyen/);
  assert.match(out, /Modéré.*Lunettes et crème solaire/);
  assert.match(out, /class="sun up"/);
  assert.match(out, /10 h 28 de jour/);
});

test("card: sections follow `sections`, and hide without data", () => {
  const out = html(card({ sections: ["pollen", "daily"] }));
  assert.ok(out.indexOf("s-pollen") < out.indexOf("s-daily"));
  assert.doesNotMatch(out, /s-alerts|s-rain|s-hourly|s-uv|s-sun/);
  const h = makeHass();
  for (const id of Object.keys(h.states)) if (id.startsWith("sensor.")) delete h.states[id];
  const bare = html(card({}, h));
  assert.doesNotMatch(bare, /s-pollen|rainbar/);
  // The rain section is left with the totals of the hourly forecast.
  assert.match(bare, /s-rain.*Next 6 h: /);
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
  // Two buttons on the compact card: the full screen one and the detail one.
  assert.equal((out.match(/<button /g) || []).length, 2);
  assert.match(out, /data-action="popup"/);
  assert.match(out, /Strong wind/);
  assert.doesNotMatch(out, /s-daily/);
  el._onClick({ detail: 1, composedPath: () => [{ dataset: { action: "zoom" } }] });
  out = html(el);
  assert.match(out, /class="section enter s-daily"/);
  assert.match(out, /mdi:arrow-collapse/);
  assert.match(out, /data-action="popup".*data-action="zoom"/);
  // A click in the full screen detail opened from the zoomed view leaves the card zoomed.
  el._onClick({ composedPath: () => [{ dataset: { action: "popup" } }] });
  el._onUnzoom({ composedPath: () => [lib.document.body.children[0]] });
  assert.equal(el._zoomed, true);
  el._onUnzoom({ composedPath: () => [] });
  assert.equal(el._zoomed, false);
  el._closePopup();
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

test("air quality: the Atmo index, its advice and every pollutant", () => {
  const out = html(card({}, makeHass("fr")));
  assert.match(out, /Air : moyen/);
  const air = out.slice(out.indexOf("s-air"), out.indexOf("s-uv"));
  assert.match(air, /<span class="uvval" style="--k:#50ccaa">2<\/span>/);
  assert.match(air, /Pas de précaution particulière · Métropole du Grand Paris/);
  // The most degraded pollutant first, on six dots.
  assert.ok(air.indexOf("NO₂") < air.indexOf("PM2.5"));
  assert.match(air, /title="Dioxyde d&#39;azote · Dégradé"/);
  assert.equal((air.match(/class="prow"/g) || []).length, 5);
  assert.doesNotMatch(out, /Air : mauvais/); // the J+1 copy is not today's index
});

test("air quality: concentrations on the EAQI thresholds, a poor air in the alerts", () => {
  const h = makeHass("en");
  for (const id of Object.keys(h.states)) if (id.includes("atmo_france")) delete h.states[id];
  h.states["sensor.waqi_paris_pm2_5"] = { entity_id: "sensor.waqi_paris_pm2_5", state: "60", attributes: { device_class: "pm25", unit_of_measurement: "µg/m³" } };
  h.states["sensor.waqi_paris_ozone"] = { entity_id: "sensor.waqi_paris_ozone", state: "70", attributes: { device_class: "ozone", unit_of_measurement: "µg/m³" } };
  const out = html(card({}, h));
  assert.match(out, /s-air.*>5<\/span>.*Very poor/);
  assert.match(out, /chip tint pulse[^>]*>.*Air: very poor/);
  assert.match(out, /title="Fine particles PM2.5 · Very poor · 60 µg\/m³"/);
  assert.doesNotMatch(out, /purifier/);
});

test("Niak Weather: official warning, water restrictions and storm sensor", () => {
  const h = makeHass("fr");
  for (const id of ["sensor.75_weather_alert", "sensor.alert_level_in_paris", "sensor.blitzortung_lightning_counter", "sensor.blitzortung_lightning_distance"]) {
    delete h.states[id];
  }
  const add = (id, state, attributes) => (h.states[id] = { entity_id: id, state, attributes });
  add("sensor.niak_weather_vigilance", "orange", { options: ["verte", "jaune", "orange", "rouge"], phenomenes: { "Vagues-submersion": "jaune", Orages: "orange" } });
  add("sensor.niak_weather_restrictions_eau", "crise", { niveau: 4, usages: ["Arrosage des pelouses", "Piscines familiales privées"] });
  add("binary_sensor.niak_weather_orage", "on", { eclairs_20_min: 7, eclair_le_plus_proche_km: 11 });
  add("sensor.niak_weather_pluie_dans", "unknown", { device_class: "duration", minutes: null });
  const ent = lib.wxResolve(h, "weather.paris");
  assert.equal(ent.alert, "sensor.niak_weather_vigilance");
  assert.equal(ent.vigieau, "sensor.niak_weather_restrictions_eau");
  assert.equal(ent.lightning_counter, "binary_sensor.niak_weather_orage");
  assert.equal(ent.next_rain, "sensor.paris_next_rain");
  // Météo-France names its UV sensor "…_forecast_for_city_…_uv".
  h.states["sensor.meteo_france_forecast_for_city_paris_uv"] = { entity_id: "x", state: "4", attributes: {} };
  delete h.states["sensor.paris_uv"];
  assert.equal(lib.wxResolve(h, "weather.paris").uv, "sensor.meteo_france_forecast_for_city_paris_uv");
  const out = html(card({}, h));
  assert.match(out, /Vigilance orange/);
  assert.match(out, /chip tint lvl3 pulse[^>]*>.*Orages/);
  assert.match(out, /Fortes vagues · jaune</);
  assert.match(out, /title="Vigilance vagues-submersion : fortes vagues, submersion du littoral possible · Vigilance jaune"/);
  assert.match(out, /Sécheresse : crise/);
  assert.match(out, /<li><b>Arrosage des pelouses<\/b><\/li>/);
  assert.match(out, /Foudre à 11 km \(7 impacts\)/);
});

test("pollen: Atmo's top level, a high risk in the alerts, the risk from the species without a risk sensor", () => {
  const high = html(card({}, makeHass("en", { "sensor.pollens_75_risklevel": { state: 4 }, "sensor.pollens_75_graminees": { state: 6 } })));
  assert.match(high, /chip tint pulse[^>]*>.*Pollen: high/);
  assert.match(high, /title="Grass · Extremely high"/);
  const h = makeHass("en");
  delete h.states["sensor.pollens_75_risklevel"];
  const out = html(card({}, h));
  assert.match(out, /s-pollen.*<span class="uvval" style="--k:#ff5050">4<\/span>.*High<\/b><span>Allergy sufferers: air the house early, rinse your hair · mostly grass/);
});

test("moon: phase from the date, matching known moons", () => {
  // Full moon on 26 Oct 2026, new moon on 9 Nov 2026 (UTC, ± half a day).
  assert.equal(lib.wxMoonPhase(lib.wxMoonAge(new Date(Date.UTC(2026, 9, 26, 12)))), "full_moon");
  assert.equal(lib.wxMoonPhase(lib.wxMoonAge(new Date(Date.UTC(2026, 10, 9, 12)))), "new_moon");
  assert.equal(lib.wxMoonPhase(lib.wxMoonAge(new Date(Date.UTC(2026, 9, 23, 12)))), "waxing_gibbous");
  assert.equal(lib.wxMoonPhase(lib.wxMoonAge(new Date(Date.UTC(2026, 10, 2, 14)))), "last_quarter");
  assert.ok(lib.wxMoonLight(lib.wxMoonAge(new Date(Date.UTC(2026, 9, 26, 12)))) > 0.98);
  // Waxing crescent: lit on the right, a thin terminator bulging right.
  assert.match(lib.wxMoonLit(24, 24, 17, 4), /A17 17 0 0 1 24 41A\d+\.\d+ 17 0 0 0 24 7Z/);
});

test("moon: section and night scene follow today's phase; the Moon integration names it", () => {
  const h = makeHass("fr", { "sensor.moon_phase": { state: "waxing_gibbous" } });
  h.entities["sensor.moon_phase"] = { entity_id: "sensor.moon_phase", translation_key: "phase" };
  const out = html(card({}, h));
  const moon = out.slice(out.indexOf("s-moon"));
  assert.match(moon, /<b>Gibbeuse croissante<\/b><span>Éclairée à \d+ % · jour \d+ sur 29/);
  assert.match(moon, /data-more="sensor.moon_phase"/);
  assert.ok(moon.indexOf("Pleine lune") < moon.indexOf("Nouvelle lune"));
  const night = html(card({}, makeHass("en", { "weather.paris": { state: "clear-night" } })));
  assert.match(night, /class="earthshine"/);
});

const tick = () => new Promise((r) => setTimeout(r, 0));

test("hourly wind: arrow, speed, gusts on hover, strong gusts highlighted", () => {
  const out = html(card());
  assert.equal((out.match(/class="wcol/g) || []).length, 12);
  assert.match(out, /<div class="wcol" title="SW · 18 km\/h · gusts 34 km\/h"><span class="arrow" style="transform:rotate\(45deg\)">/);
  assert.match(out, /<div class="wcol strong" title="W · 38 km\/h · gusts 68 km\/h">/);
});

test("rain totals: today from the provider, the next 6 and 24 hours from the forecast", () => {
  const out = html(card({}, makeHass("fr")));
  assert.match(out, /Aujourd&#39;hui 6,6 mm/);
  assert.match(out, /6 prochaines h : 3,6 mm/);
  assert.match(out, /24 prochaines h : 6 mm/);
});

test("cloud cover and pressure trend from the history", async () => {
  const h = makeHass("en");
  const el = card({}, h);
  assert.match(html(el), /40 % clouds/);
  assert.match(h.apiCalls[0][1], /^history\/period\/.*filter_entity_id=sensor\.paris_pressure&minimal_response&no_attributes$/);
  await tick();
  assert.match(html(el), /class="chip trend up"[^>]*title="Pressure · Rising: \+2\.8 hPa in 3 h"><ha-icon icon="mdi:trending-up">/);
});

test("tomorrow: Atmo's J+1 air and pollen levels next to the titles, a worse tomorrow in the alerts", () => {
  const out = html(card({}, makeHass("fr")));
  assert.match(out, /Qualité de l&#39;air<\/span><span class="chip tint"[^>]*>.*Demain : mauvais/);
  assert.match(out, /Pollens<\/span><span class="chip tint"[^>]*>.*Demain : élevé/);
  assert.match(out, /s-alerts.*Air demain : mauvais.*Pollens demain : élevé/);
});

test("astro: sunrise, sunset, dawn, dusk and golden hour in Paris, moonrise and moonset", () => {
  const f = (d) => d.toISOString().slice(11, 16);
  const day = new Date(Date.UTC(2026, 5, 21, 10));
  const s = lib.wxSunTimes(day, 48.8566, 2.3522);
  // Paris, 21 June: sunrise 03:47 UTC, sunset 19:58 UTC, civil twilight 03:04 / 20:41 UTC (± 3 min).
  const near = (d, hhmm) => Math.abs(d - new Date(`2026-06-21T${hhmm}:00Z`)) < 3 * 60000;
  assert.ok(near(s.goldenMorning[0], "03:47"), f(s.goldenMorning[0]));
  assert.ok(near(s.goldenEvening[1], "19:58"), f(s.goldenEvening[1]));
  assert.ok(near(s.dawn, "03:04"), f(s.dawn));
  assert.ok(near(s.dusk, "20:41"), f(s.dusk));
  assert.ok(s.goldenEvening[0] < s.goldenEvening[1]);
  const mo = lib.wxMoonTimes(day, 48.8566, 2.3522);
  assert.ok(mo.rise || mo.set);
});

test("sun and moon sections: dawn, golden hour, dusk; moonrise and moonset", () => {
  const out = html(card({}, makeHass("fr")));
  assert.match(out, /sunextra.*Aube \d\d:\d\d.*Heure dorée \d\d:\d\d.*Crépuscule \d\d:\d\d/);
  assert.match(out, /class="mtimes"><span title="Lever"><ha-icon icon="mdi:arrow-up-thin"><\/ha-icon>(\d\d:\d\d|—)<\/span><span title="Coucher">/);
});

test("full screen detail: opens over the page with 24 hours and 10 days, closes with its button or Escape", () => {
  const h = makeHass("fr");
  h.forecasts.daily = [...h.forecasts.daily, ...h.forecasts.daily.map((d, i) => ({ ...d, datetime: new Date(new Date(d.datetime).getTime() + (i + 7) * 864e5).toISOString() }))];
  const el = card({}, h);
  assert.match(html(el), /data-action="popup" title="Plein écran"/);
  el._onClick({ composedPath: () => [{ dataset: { action: "popup" } }] });
  const doc = lib.document;
  assert.equal(doc.body.children.length, 1);
  assert.equal(doc.body.style.overflow, "hidden");
  assert.equal(lib.window.history.state.weatherPlusPopup, true);
  const pop = doc.body.children[0].shadowRoot.innerHTML;
  assert.match(pop, /class="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="Paris">/);
  assert.match(pop, /data-action="close" title="Fermer"/);
  assert.equal((pop.match(/class="hcol/g) || []).length, 24);
  assert.equal((pop.match(/class="drow"/g) || []).length, 10);
  assert.match(pop, /class="section enter s-daily"/);
  // The card keeps its own lengths.
  assert.equal((html(el).match(/class="drow"/g) || []).length, 5);
  // Updates reach the open popup.
  el.hass = makeHass("fr", { "weather.paris": { temperature: 19 } });
  assert.match(doc.body.children[0].shadowRoot.innerHTML, /<span class="val">19<small>/);
  doc.listeners.keydown({ key: "Escape", composedPath: () => [] });
  assert.equal(doc.body.children.length, 0);
  assert.equal(doc.body.style.overflow, "");
  assert.equal(lib.window.history.state, null);
  assert.doesNotMatch(html(card({ popup: false })), /data-action="popup"/);
});

test("full screen detail: opens again after being closed, by its button or Escape", () => {
  const el = card();
  const doc = lib.document;
  const open = () => el._onClick({ composedPath: () => [{ dataset: { action: "popup" } }] });
  for (let i = 0; i < 3; i++) {
    open();
    assert.equal(doc.body.children.length, 1, `open #${i + 1}`);
    if (i % 2) doc.listeners.keydown({ key: "Escape", composedPath: () => [] });
    else el._closePopup();
    assert.equal(doc.body.children.length, 0, `closed #${i + 1}`);
    assert.equal(el._popup, null);
  }
  // Hourly forecast across, alerts and rain beside the weather now, the rest in columns.
  open();
  const pop = doc.body.children[0].shadowRoot.innerHTML;
  assert.match(pop, /<div class="top"><div class="hero">.*<div class="side"><div class="section enter s-alerts">.*s-rain.*<\/div><\/div><div class="section enter s-hourly">.*<div class="flow"><div class="section enter s-daily">/);
  el._closePopup();
});

test("night scenes: the moon with every condition, night-toned clouds", () => {
  for (const cond of ["rainy", "pouring", "lightning-rainy", "snowy", "hail", "cloudy", "fog", "windy", "windy-variant"]) {
    const night = lib.wxSceneSvg(cond, true, { age: 10 });
    assert.match(night, /class="moon"/, cond);
    assert.doesNotMatch(lib.wxSceneSvg(cond, false), /class="moon"/, cond);
  }
  // Rain at night: the moon behind the top cloud, drawn before it, and the cloud in a night tone.
  const rain = lib.wxSceneSvg("rainy", true, { age: 10 });
  assert.ok(rain.indexOf('class="moon"') < rain.indexOf('class="cloud'));
  assert.match(rain, /fill="url\(#wx-cm\)"/);
  assert.match(lib.wxSceneSvg("lightning-rainy", true), /fill="url\(#wx-ck\)"/);
  assert.doesNotMatch(lib.wxSceneSvg("rainy", false), /#wx-c[nmk]\)/);
});

test("minute tick: a rebuild only when something displayed moved, not sixty times an hour", () => {
  const D = lib.window.Date;
  const shift = (ms) => {
    const T = NOON.getTime() + ms;
    lib.window.Date = class extends D {
      constructor(...a) {
        super(...(a.length ? a : [T]));
      }
      static now() {
        return T;
      }
    };
  };
  try {
    const el = card();
    let renders = 0;
    const render = el._render.bind(el);
    el._render = () => {
      renders++;
      render();
    };
    // An hour of ticks: the sun's 1% arc steps and the hour rollover re-render, the other minutes do not.
    for (let min = 1; min <= 60; min++) {
      shift(min * 60000);
      el._update();
    }
    assert.ok(renders >= 1, "the hour rollover re-renders");
    assert.ok(renders < 15, `rebuilt ${renders} times in an hour`);
  } finally {
    lib.window.Date = D;
  }
});

test("discovery: invalidated when a tracked entity disappears, even with the state count unchanged", () => {
  const h = makeHass();
  const el = card({}, h);
  assert.equal(el._entities().uv, "sensor.paris_uv");
  // One entity removed, another added in the same update: same count, same registry object.
  const h2 = { ...h, states: { ...h.states } };
  delete h2.states["sensor.paris_uv"];
  h2.states["sensor.somewhere_else"] = { entity_id: "sensor.somewhere_else", state: "1", attributes: {} };
  el.hass = h2;
  assert.notEqual(el._entities().uv, "sensor.paris_uv");
});
