// The status pill in Chromium (needs the built card; skipped without it), in en, fr, de, hu, el and ru (their
// translation files fetched from dist/), from 190 to 500 px, on the full card (banner and classic header) and the
// mini card (compact and unfolded): on the title row only with the whole title beside it; else on its own line under
// the subtitle, its label whole; or its dot alone (always at 190 px). Nothing below the top of the banner's lawn
// strip or out of the banner.
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

const STORM = {
  "weather.paris": { state: "lightning-rainy", temperature: 21.2 },
  "sensor.75_weather_alert": { state: "Orange", Orages: "Orange" },
};
const VARIANTS = [
  { tag: "weather-plus-card" },
  { tag: "weather-plus-mini-card" },
  { tag: "weather-plus-mini-card", zoom: true },
  { tag: "weather-plus-card", config: { illustration: false } },
];

test("status pill: whole title beside it, whole label or dot alone, inside the banner", { skip }, async () => {
  const failures = [];
  for (const lang of ["en", "fr", "de", "hu", "el", "ru"]) {
    for (const width of [190, 245, 300, 400, 460, 500]) {
      const cards = [];
      for (const v of VARIANTS)
        for (const changes of [{}, STORM])
          for (const name of [undefined, "A very long name for the weather of the town"]) cards.push({ ...v, changes, name, config: { ...v.config, ...(name ? { name } : {}) } });
      const page = await harness.openPage(browser, { width, served: true });
      await harness.addCards(
        page,
        cards.map(({ tag, config, changes }) => ({ tag, config: { animations: false, ...config }, hass: mock.mockHass(lang, changes, harness.DAY) })),
      );
      // The translations come in, the cards draw again; the mini cards unfold.
      await page.waitForTimeout(400);
      await page.evaluate((cards) => [...document.getElementById("root").children].forEach((el, i) => cards[i].zoom && el._setZoom(true)), cards);
      await page.waitForTimeout(300);
      const res = await page.evaluate(
        ({ cards, width }) =>
          [...document.getElementById("root").children].map((el, i) => {
            const out = [];
            const sr = el.shadowRoot;
            const ill = cards[i].config.illustration !== false;
            const head = sr.querySelector(ill ? ".banner" : ".header");
            const pill = head?.querySelector(".st");
            if (!pill) return ["no pill"];
            const txt = pill.querySelector(".stt");
            const dotOnly = txt.getBoundingClientRect().width <= 1;
            if (width <= 200 && !dotOnly) out.push("label shown");
            if (!dotOnly && (txt.scrollWidth > txt.clientWidth + 0.5 || !txt.clientWidth)) out.push(`label "${txt.textContent}" cut`);
            const name = head.querySelector(".name");
            const nb = name.getBoundingClientRect();
            const pb = pill.getBoundingClientRect();
            const onRow = Math.abs(pb.top + pb.height / 2 - (nb.top + nb.height / 2)) < 3;
            if (onRow && !dotOnly && name.scrollWidth > name.clientWidth + 0.5) out.push("title cut beside the pill");
            if (!onRow && dotOnly) out.push("dot alone off the title row");
            if (!onRow && pb.top < nb.bottom - 0.5) out.push("pill over the title");
            const row = name.parentElement.getBoundingClientRect();
            if (!onRow && width > 200 && name.scrollWidth + 8 + pb.width <= row.right - nb.left - 1) out.push("pill under the subtitle although it fits beside the title");
            const hb = head.getBoundingClientRect();
            if (pb.right > hb.right + 0.5) out.push("pill out of the header");
            if (ill) {
              const floor = head.querySelector(".ground").getBoundingClientRect().top;
              for (const [what, e] of [["title", name], ["pill", pill], ["subtitle", head.querySelector(".sub")]]) {
                const b = e?.getBoundingClientRect();
                if (b && (b.bottom > floor + 0.5 || b.top < hb.top - 0.5)) out.push(`${what} out of the banner or over its lawn strip`);
              }
            }
            return out;
          }),
        { cards, width },
      );
      await page.close();
      res.forEach((out, i) => {
        const { tag, zoom, config, changes, name } = cards[i];
        for (const f of out)
          failures.push(`${lang} ${tag}${zoom ? " unfolded" : ""}${config.illustration === false ? " classic" : ""}${changes === STORM ? " storm" : ""} ${width}px${name ? " long title" : ""}: ${f}`);
      });
    }
  }
  assert.deepEqual(failures, []);
});
