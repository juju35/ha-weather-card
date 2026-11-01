// The screenshot scripts draw the mock home of Paris: whatever the machine's time zone (UTC on the CI runners), the
// mock's sunrise and sunset must agree with the dawn, dusk and golden hour the card computes from Paris' coordinates.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));

// Runs in a process of its own: the time zone is read when the process starts.
const probe = `
  import { DAY } from "./scripts/screenshots/clock.mjs";
  import { mockHass } from "./scripts/screenshots/mock.mjs";
  import { load } from "./test/load.mjs";
  const lib = load(DAY);
  const hass = mockHass("en", {}, DAY);
  const t = lib.wxSunTimes(DAY, hass.config.latitude, hass.config.longitude);
  const sun = hass.states["sun.sun"].attributes;
  const fmt = (d) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  console.log(JSON.stringify({
    set: Date.parse(sun.next_setting), computedSet: +t.goldenEvening[1], dusk: +t.dusk, dawn: +t.dawn,
    day: fmt(DAY), shownSet: fmt(sun.next_setting), shownDusk: fmt(t.dusk), shownDawn: fmt(t.dawn),
  }));
`;

for (const tz of ["UTC", "America/New_York", "Europe/Paris"]) {
  test(`screenshots: sunset, dawn and dusk agree in the shots, whatever the machine's time zone (${tz})`, () => {
    const out = execFileSync(process.execPath, ["--input-type=module", "-e", probe], { cwd: root, env: { ...process.env, TZ: tz }, encoding: "utf8" });
    const r = JSON.parse(out);
    // The mock's sunset is the one the card computes for Paris on that day (± 10 min), dusk comes after it.
    assert.ok(Math.abs(r.set - r.computedSet) < 10 * 60000, `mock sunset ${r.shownSet}, Paris sunset ${new Date(r.computedSet).toISOString()}`);
    assert.ok(r.dusk > r.set, `dusk ${r.shownDusk} after sunset ${r.shownSet}`);
    // And the shots read in Paris time: the afternoon of the README, dawn before 8 o'clock.
    assert.equal(r.day, "14:10");
    assert.equal(r.shownDawn, "07:47");
  });
}
