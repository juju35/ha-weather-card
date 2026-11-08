// Units of the pressure trend and the hourly precipitation, the Home Assistant clock (12/24 h, server time zone), the
// full screen detail's focus trap and the card picker's names.
import assert from "node:assert/strict";
import { test } from "node:test";
import { makeHass, NOON } from "./hass.mjs";
import { load, mount } from "./load.mjs";

const lib = load(NOON);
const html = (el) => el.shadowRoot.innerHTML.replace(/<style>[\s\S]*?<\/style>/g, "");
const card = (config = {}, hass = makeHass()) => mount(lib, "weather-plus-card", config, hass);
const tick = () => new Promise((r) => setTimeout(r, 0));
const pressureChip = (el) => html(el).match(/<span class="chip[^>]*title="Pressure[^>]*>/)?.[0] || "";

test("units: pressure to hPa and precipitation to mm", () => {
  assert.equal(lib.wxToHpa(1, "hPa"), 1);
  assert.equal(lib.wxToHpa(1, "mbar"), 1);
  assert.equal(lib.wxToHpa(100, "Pa"), 1);
  assert.equal(lib.wxToHpa(0.1, "kPa"), 1);
  assert.ok(Math.abs(lib.wxToHpa(0.03, "inHg") - 1.016) < 0.001);
  assert.ok(Math.abs(lib.wxToHpa(1, "mmHg") - 1.333) < 0.001);
  assert.equal(lib.wxToHpa(2, undefined), 2, "an unknown unit is taken as hPa");
  assert.equal(lib.wxToMm(0.1, "in"), 2.54);
  assert.equal(lib.wxToMm(1, "cm"), 10);
  assert.equal(lib.wxToMm(3, "mm"), 3);
});

test("pressure trend: a sensor in inHg rises past 1 hPa and is labelled in inHg", async () => {
  const h = makeHass("en", { "sensor.paris_pressure": { state: 29.95, unit_of_measurement: "inHg" } });
  h.callApi = () => Promise.resolve([[{ state: "29.90" }, { state: "29.95" }]]);
  const el = card({}, h);
  await tick();
  const chip = pressureChip(el);
  assert.match(chip, /class="chip trend up"/, chip);
  assert.match(chip, /\+0\.05 inHg/, "the delta in the sensor's own unit");
});

test("pressure trend: 0.5 hPa reported in Pa is steady, not falling", async () => {
  const h = makeHass("en", { "sensor.paris_pressure": { state: 101350, unit_of_measurement: "Pa" } });
  h.callApi = () => Promise.resolve([[{ state: "101400" }, { state: "101350" }]]);
  const el = card({}, h);
  await tick();
  const chip = pressureChip(el);
  assert.match(chip, /class="chip trend steady"/, chip);
});

test("pressure trend: the weather entity's history is read in its pressure_unit (0.02 inHg: steady)", async () => {
  const h = makeHass("en", { "weather.paris": { pressure: 29.95, pressure_unit: "inHg" } });
  delete h.states["sensor.paris_pressure"];
  h.callApi = () => Promise.resolve([[{ attributes: { pressure: 29.97 } }, { attributes: { pressure: 29.95 } }]]);
  const el = card({}, h);
  await tick();
  const chip = pressureChip(el);
  assert.match(chip, /class="chip trend steady"/, chip);
});

test("hourly precipitation: amounts in inches fill the bar like the same amount in mm", () => {
  const bars = (unit) => {
    const h = makeHass("en", { "weather.paris": { precipitation_unit: unit } });
    h.forecasts.hourly = h.forecasts.hourly.map((x) => ({ ...x, precipitation_probability: undefined, precipitation: 0.1 }));
    return [...html(card({ sections: ["hourly"] }, h)).matchAll(/class="pbar"><span style="height:([\d.]+)%"/g)].map((m) => Number(m[1]));
  };
  const inches = bars("in");
  const mm = bars("mm");
  assert.ok(inches.length > 0);
  assert.ok(Math.abs(inches[0] - 63.5) < 0.01, `${inches[0]}`);
  assert.ok(Math.abs(mm[0] - 2.5) < 0.01, `${mm[0]}`);
});

test("time: the Home Assistant 12/24 h choice and the server time zone", () => {
  const d = new Date(Date.UTC(2026, 9, 25, 13, 5));
  const opts = (locale, config = {}) => JSON.parse(JSON.stringify(lib.wxTimeOpts({ locale, config })));
  assert.deepEqual(opts({ time_format: "12" }), { hourCycle: "h12" });
  assert.deepEqual(opts({ time_format: "24" }), { hourCycle: "h23" });
  assert.deepEqual(opts({ time_format: "language" }), {});
  assert.deepEqual(opts({ time_format: "24", time_zone: "server" }, { time_zone: "Asia/Tokyo" }), { hourCycle: "h23", timeZone: "Asia/Tokyo" });
  assert.deepEqual(opts({ time_zone: "local" }, { time_zone: "Asia/Tokyo" }), {});
  assert.deepEqual(opts({ time_zone: "server" }, { time_zone: "Not/AZone" }), {}, "an unknown zone is left out");
  assert.match(lib.wxTime("en-GB", d, false, { hourCycle: "h12", timeZone: "UTC" }), /^0?1:05\s?pm$/i);
  assert.equal(lib.wxTime("en-US", d, false, { hourCycle: "h23", timeZone: "UTC" }), "13:05");
  assert.equal(lib.wxTime("en-US", d, false, { hourCycle: "h23", timeZone: "Asia/Tokyo" }), "22:05");
  assert.equal(lib.wxTime("fr", d, true, { timeZone: "Asia/Tokyo" }), "22 h");
  assert.match(lib.wxTime("fr", d, true, { hourCycle: "h12", timeZone: "UTC" }), /^1\s?PM$/i);
});

test("time: the hourly forecast follows a 12 h profile", () => {
  const h = makeHass("en");
  h.locale = { language: "en-GB", time_format: "12" };
  const out = html(card({ sections: ["hourly"] }, h));
  assert.match(out, /<span class="t">\d{1,2}\s?(am|pm)<\/span>/i);
  h.locale = { language: "en-US", time_format: "24" };
  const out24 = html(card({ sections: ["hourly"] }, h));
  assert.doesNotMatch(out24, /<span class="t">[^<]*(AM|PM)<\/span>/);
});

test("full screen detail: Tab goes round its controls, never out to the page", () => {
  const el = card({}, makeHass());
  el._openPopup();
  const root = el._popup.shadowRoot;
  const focused = [];
  const item = (name) => ({ name, getClientRects: () => [1], focus: () => focused.push(name) });
  const [first, mid, last] = [item("first"), item("mid"), item("last")];
  root.querySelectorAll = () => [first, mid, last];
  const key = (shiftKey) => {
    let prevented = false;
    lib.document.listeners.keydown({ key: "Tab", shiftKey, preventDefault: () => (prevented = true) });
    return prevented;
  };
  root.activeElement = last;
  assert.equal(key(false), true);
  assert.deepEqual(focused, ["first"]);
  root.activeElement = first;
  assert.equal(key(true), true);
  assert.deepEqual(focused, ["first", "last"]);
  root.activeElement = mid;
  assert.equal(key(false), false, "inside, the browser moves the focus");
  root.activeElement = null;
  assert.equal(key(false), true, "from outside the detail, into it");
  assert.deepEqual(focused, ["first", "last", "first"]);
  lib.document.listeners.keydown({ key: "Escape" });
  assert.equal(el._popup, null);
});

test("card picker: names and descriptions come from the dictionaries", () => {
  const picker = Object.fromEntries(lib.window.customCards.map((c) => [c.type, c]));
  assert.equal(picker["weather-plus-card"].name, lib.WX_I18N.en.picker_card);
  assert.equal(picker["weather-plus-card"].description, lib.WX_I18N.en.picker_card_desc);
  assert.equal(picker["weather-plus-mini-card"].name, lib.WX_I18N.en.picker_mini);
  assert.equal(picker["weather-plus-mini-card"].description, lib.WX_I18N.en.picker_mini_desc);
  const fr = load(NOON, { lang: "fr" });
  const frPicker = Object.fromEntries(fr.window.customCards.map((c) => [c.type, c]));
  assert.equal(frPicker["weather-plus-card"].name, "Carte Weather Plus");
  assert.equal(frPicker["weather-plus-mini-card"].name, "Mini carte Weather Plus");
});

test("time: days and midnight in the server time zone, across a daylight saving change", () => {
  const t = new Date("2026-10-25T23:30:00Z");
  assert.equal(lib.wxDayKey(t, "Asia/Tokyo"), "2026-10-26");
  assert.equal(lib.wxDayKey(t, "America/New_York"), "2026-10-25");
  assert.equal(lib.wxSameDay(t, new Date("2026-10-25T16:00:00Z"), "Asia/Tokyo"), true);
  assert.equal(lib.wxSameDay(t, new Date("2026-10-25T14:00:00Z"), "Asia/Tokyo"), false);
  assert.equal(lib.wxDayStart(t, "Asia/Tokyo").toISOString(), "2026-10-25T15:00:00.000Z");
  // Paris leaves summer time at 3:00 on 25 October and enters it at 2:00 on 29 March: midnight is still 00:00 local.
  assert.equal(lib.wxDayStart(new Date("2026-10-25T13:10:00Z"), "Europe/Paris").toISOString(), "2026-10-24T22:00:00.000Z");
  assert.equal(lib.wxDayStart(new Date("2026-03-29T10:00:00Z"), "Europe/Paris").toISOString(), "2026-03-28T23:00:00.000Z");
});

test("time: Today, the daily list and the sun's day follow the server time zone", () => {
  // 23:30 UTC: already the 26th in Tokyo, still the 25th at UTC−12.
  const now = new Date("2026-10-25T23:30:00Z");
  const zlib = load(now);
  // Daily entries at the server's noon, from the 24th; `noon`: the 24th's noon in UTC hours (Tokyo 03:00, UTC−12 24:00).
  const render = (tz, noon) => {
    const h = makeHass("en", {}, now);
    h.locale = { language: "en-GB", time_format: "24", time_zone: "server" };
    h.config = { ...h.config, time_zone: tz };
    h.forecasts.daily = h.forecasts.daily.slice(0, 4).map((d, i) => ({ ...d, datetime: new Date(Date.UTC(2026, 9, 24 + i, noon)).toISOString() }));
    const el = mount(zlib, "weather-plus-card", { sections: ["daily", "sun"], days: 5 }, h);
    return { days: [...html(el).matchAll(/<span class="day">([^<]*)<\/span>/g)].map((m) => m[1]), astro: el._astro() };
  };
  const tokyo = render("Asia/Tokyo", 3);
  assert.deepEqual(tokyo.days, ["Today", "Tue"], "the 24th and the 25th, before today in Tokyo, are dropped");
  const west = render("Etc/GMT+12", 24);
  assert.deepEqual(west.days, ["Today", "Mon", "Tue"], "the 24th is dropped, the 25th is today at UTC−12");
  // Dawn of the server's day (Paris coordinates): the 26th in Tokyo, the 25th at UTC−12.
  assert.equal(lib.wxDayKey(tokyo.astro.sun.dawn, "Asia/Tokyo"), "2026-10-26");
  assert.equal(lib.wxDayKey(west.astro.sun.dawn, "Etc/GMT+12"), "2026-10-25");
});

test("time: an entry without a valid datetime matches no day and does not break the card", () => {
  assert.equal(lib.wxDayKey(undefined, "Asia/Tokyo"), null);
  assert.equal(lib.wxDayKey("not a date"), null);
  assert.equal(lib.wxSameDay(undefined, undefined, "Asia/Tokyo"), false);
  assert.ok(Number.isNaN(lib.wxDayStart(undefined, "Asia/Tokyo").getTime()));
  for (const tz of [undefined, "Asia/Tokyo"]) {
    const h = makeHass("en");
    if (tz) {
      h.locale = { language: "en-GB", time_format: "24", time_zone: "server" };
      h.config = { ...h.config, time_zone: tz };
    }
    h.forecasts.daily = [{ ...h.forecasts.daily[0], datetime: undefined }, ...h.forecasts.daily.slice(1)];
    h.forecasts.hourly = [{ ...h.forecasts.hourly[0], datetime: undefined }, ...h.forecasts.hourly.slice(1)];
    const out = html(card({ sections: ["daily", "hourly", "uv"] }, h));
    assert.match(out, /class="drow"/, "the other days still render");
  }
});
