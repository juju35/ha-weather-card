// State updates patch the cards in place: an update of an entity the card does not use changes nothing in its shadow
// DOM, an update of its own entities keeps every node (no innerHTML rebuild, so no node shows for a frame at another
// size and the Sections view does not reflow, the page jumping by itself), and the card's height does not move.
// Needs the built card and Playwright's Chromium, like layout.test.mjs; skipped without them.
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

const dist = new URL("../dist/ha-weather-card.js", import.meta.url);
let harness;
let mock;
let browser;
try {
  if (!existsSync(dist)) throw new Error("dist/ha-weather-card.js not built");
  harness = await import("../scripts/screenshots/harness.mjs");
  mock = await import("../scripts/screenshots/mock.mjs");
  browser = await harness.launch();
} catch (err) {
  browser = null;
  harness = { skip: err.message.split("\n")[0] };
}
const skip = browser ? false : `no browser: ${harness.skip}`;

test.after(() => browser?.close());

// Pushes `n` updates built by `next(hass, i)` to every card, and returns per card the nodes removed and the heights seen
// on every animation frame.
const run = (page, next, n = 8) =>
  page.evaluate(
    async ({ next, n }) => {
      const make = new Function("hass", "i", next);
      const cards = [...document.querySelectorAll("#root > *")];
      const raf = () => new Promise((r) => requestAnimationFrame(() => r()));
      const stats = cards.map(() => ({ removed: 0, mutations: 0, heights: new Set() }));
      const observers = cards.map((el, i) => {
        const o = new MutationObserver((recs) => {
          for (const r of recs) {
            stats[i].mutations++;
            if (r.type === "childList") stats[i].removed += r.removedNodes.length;
          }
        });
        o.observe(el.shadowRoot, { childList: true, subtree: true, attributes: true, characterData: true });
        return o;
      });
      let on = true;
      (async () => {
        while (on) {
          cards.forEach((el, i) => {
            stats[i].heights.add(Math.round(el.getBoundingClientRect().height));
          });
          await raf();
        }
      })();
      for (let k = 0; k < n; k++) {
        for (const el of cards) el.hass = make(el.hass, k);
        await raf();
        await raf();
      }
      on = false;
      for (const o of observers) o.disconnect();
      return stats.map((s, i) => ({ tag: cards[i].localName, removed: s.removed, mutations: s.mutations, heights: [...s.heights] }));
    },
    { next, n },
  );

const UNRELATED = `return { ...hass, states: { ...hass.states, "sensor.elsewhere": { entity_id: "sensor.elsewhere", state: String(i), attributes: {} } } };`;
const OWN = `const w = hass.states["weather.paris"];
  return { ...hass, states: { ...hass.states, "weather.paris": { ...w, attributes: { ...w.attributes, temperature: 17 + (i % 3) / 10, humidity: 70 + i } } } };`;

test("state updates: nothing moves for another entity, the card's own entities are patched in place", { skip }, async () => {
  const page = await harness.openPage(browser, { width: 400, now: harness.DAY });
  await harness.addCards(page, [
    { tag: "weather-plus-mini-card", config: {}, hass: mock.mockHass("en", {}, harness.DAY) },
    { tag: "weather-plus-card", config: {}, hass: mock.mockHass("en", {}, harness.DAY) },
  ]);
  // The other entity exists before the counts (its first appearance re-runs the discovery once).
  await run(page, UNRELATED, 1);
  await page.waitForTimeout(400);
  for (const c of await run(page, UNRELATED)) {
    assert.equal(c.mutations, 0, `${c.tag}: an update of another entity changes nothing`);
    assert.equal(c.heights.length, 1, `${c.tag}: its height holds`);
  }
  for (const c of await run(page, OWN)) {
    assert.equal(c.removed, 0, `${c.tag}: no node is replaced`);
    assert.equal(c.heights.length, 1, `${c.tag}: its height holds (${c.heights})`);
  }
  // The new values are shown.
  const val = await page.evaluate(() => document.querySelector("weather-plus-card").shadowRoot.querySelector(".hero .val")?.textContent);
  assert.match(val, /17[.,]1/);
  await page.close();
});
