// The scene GIFs are stepped frame by frame: seeking the animations to a time must give the same picture whatever
// was shown before (else every run of the screenshot job commits new GIFs). Needs the built card and Playwright's
// Chromium; skipped without them, like on the Validate job.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

let harness;
let weather;
let browser;
try {
  if (!existsSync(new URL("../dist/ha-weather-card.js", import.meta.url))) throw new Error("dist/ha-weather-card.js not built");
  harness = await import("../scripts/screenshots/harness.mjs");
  weather = await import("../scripts/screenshots/weather.mjs");
  browser = await harness.launch();
} catch (err) {
  browser = null;
  harness = { skip: err.message.split("\n")[0] };
}
const skip = browser ? false : `no browser: ${harness.skip}`;
test.after(() => browser?.close());

test("screenshots: a frame of the animated scenes is the same whatever came before it", { skip }, async () => {
  const { DAY } = harness;
  const page = await harness.openPage(browser, { theme: "dark", width: 900, now: DAY });
  await harness.addCards(page, weather.conditionCards("en", false, [["sunny", 24, DAY], ["pouring", 12, DAY], ["lightning-rainy", 21, DAY]]), 3);
  await page.waitForTimeout(300);
  const shot = async (t) => {
    assert.ok((await harness.seekAnimations(page, t)) > 0, "the scenes' animations are found, in the cards' shadow roots");
    return (await page.screenshot({ clip: { x: 0, y: 0, width: 932, height: 220 } })).toString("base64");
  };
  const times = [5000, 5350, 5700, 6050, 6400, 7900];
  const forward = [];
  for (const t of times) forward.push(await shot(t));
  await page.waitForTimeout(250);
  const backward = [];
  for (const t of [...times].reverse()) backward.unshift(await shot(t));
  for (const [i, t] of times.entries()) assert.equal(forward[i], backward[i], `frame at ${t} ms`);
  // And the frames do move.
  assert.notEqual(forward[0], forward[1]);
  await page.close();
});
