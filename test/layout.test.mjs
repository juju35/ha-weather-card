// The cards rendered in Chromium at the phone widths of the Sections view: nothing leaves the card, the title keeps
// its 4 characters, the pill reads whole where there is room. Needs the built card (npm run build) and Playwright's
// Chromium (npm ci && npx playwright install chromium); skipped without them, like on the Validate job.
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

const UNAVAILABLE = { "weather.paris": { state: "unavailable" } };
const UNKNOWN = { "weather.paris": { state: "unknown" } };
const STORM = {
  "weather.paris": { state: "lightning-rainy", temperature: 21.2 },
  "sensor.75_weather_alert": { state: "Orange", Orages: "Orange" },
};

// Renders `cards` ([{ tag, config, changes, width, wrap, div, zoom }]) (`zoom`: the mini card unfolded) on one page, each in a box of its width (or in an
// inline-block / a grid's auto column / a 1fr 1fr grid with `wrap`), with `div` inside a plain <div> in that box (as
// hui-card or a stack card wraps it), and returns what each one measures.
const render = async ({ lang = "en", theme = "light", cards, before }) => {
  const page = await harness.openPage(browser, { theme, width: 600, now: harness.DAY });
  await harness.addCards(
    page,
    cards.map(({ tag, config = {}, changes = {} }) => ({ tag, config: { animations: false, ...config }, hass: mock.mockHass(lang, changes, harness.DAY) })),
  );
  await page.evaluate((cards) => {
    const root = document.getElementById("root");
    root.style.display = "block";
    [...root.children].forEach((el, i) => {
      const box = document.createElement("div");
      const { width, wrap, div, zoom } = cards[i];
      el.dataset.card = "";
      if (zoom) el._setZoom(true);
      box.style.cssText =
        wrap === "inline-block"
          ? "display:inline-block"
          : wrap === "grid-auto"
            ? "display:grid;grid-template-columns:auto"
            : wrap === "grid-1fr"
              ? `display:grid;grid-template-columns:1fr 1fr;gap:8px;width:${width}px`
              : `width:${width}px`;
      box.style.marginBottom = "12px";
      root.insertBefore(box, el);
      box.appendChild(div ? document.createElement("div") : el);
      if (div) box.firstChild.appendChild(el);
      // A 1fr 1fr grid (grid card, layout-card, horizontal stack): another card in the second column.
      if (wrap === "grid-1fr") box.appendChild(document.createElement("div")).className = "twin";
    });
  }, cards);
  await page.waitForTimeout(200);
  const out = await (before ? before(page) : null);
  const res = await page.evaluate(() =>
    [...document.querySelectorAll("[data-card]")].map((el) => {
      const sr = el.shadowRoot;
      const cr = sr.querySelector("ha-card").getBoundingClientRect();
      const box = el.closest("#root > div").getBoundingClientRect();
      const host = el.getBoundingClientRect();
      const outside = [];
      for (const n of sr.querySelectorAll("ha-card *")) {
        const r = n.getBoundingClientRect();
        if (!r.width || n.closest(".hscroll, .stt")) continue;
        if (r.right > cr.right + 0.5 || r.left < cr.left - 0.5) outside.push(`${n.localName}.${n.className?.baseVal ?? n.className}`);
      }
      const name = sr.querySelector(".name");
      const ctx = document.createElement("canvas").getContext("2d");
      const cs = getComputedStyle(name);
      ctx.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const need = Math.min(ctx.measureText(name.textContent).width, ctx.measureText(`${name.textContent.slice(0, 4)}…`).width);
      const stt = sr.querySelector(".st .stt");
      const shown = stt && getComputedStyle(stt).clipPath !== "inset(50%)";
      return {
        width: cr.width,
        hostOverflow: Math.max(0, host.right - box.right),
        wrapperWidth: el.parentElement.getBoundingClientRect().width,
        outside,
        title: name.getBoundingClientRect().width,
        titlesWidth: sr.querySelector(".titles").getBoundingClientRect().width,
        titlesMin: Number.parseFloat(getComputedStyle(sr.querySelector(".titles")).minWidth),
        titleNeed: need,
        pill: !stt ? null : !shown ? "dot" : stt.scrollWidth > stt.clientWidth + 1 ? "cut" : "whole",
        pillText: stt?.textContent,
      };
    }),
  );
  await page.close();
  return { res, out };
};

test.after(() => browser?.close());

const LANGS = ["en", "pl", "sr-Latn"];
const PHONE = [156, 178, 245];

test("layout: the mini card, unavailable or unknown, keeps its buttons inside at 6 columns of a phone", { skip }, async () => {
  for (const lang of LANGS) {
    const cards = [];
    for (const changes of [UNAVAILABLE, UNKNOWN, {}]) for (const width of PHONE) cards.push({ tag: "weather-plus-mini-card", changes, width });
    const { res } = await render({ lang, cards });
    res.forEach((r, i) => {
      const at = `${lang} ${JSON.stringify(cards[i].changes)} ${cards[i].width}px`;
      assert.deepEqual(r.outside, [], `${at}: out of the card`);
      assert.ok(r.title + 0.5 >= r.titleNeed, `${at}: title ${r.title}px, 4 characters need ${r.titleNeed}px`);
    });
  }
});

test("layout: the full card fits 9 columns of a phone, in every state", { skip }, async () => {
  for (const lang of LANGS) {
    const cards = [];
    for (const changes of [UNAVAILABLE, STORM, {}]) for (const width of [234, 245, 273]) cards.push({ tag: "weather-plus-card", changes, width });
    const { res } = await render({ lang, theme: "dark", cards });
    res.forEach((r, i) => {
      const at = `${lang} ${JSON.stringify(cards[i].changes)} ${cards[i].width}px`;
      assert.deepEqual(r.outside, [], `${at}: out of the card`);
      assert.ok(r.title + 0.5 >= r.titleNeed, `${at}: title ${r.title}px, 4 characters need ${r.titleNeed}px`);
    });
  }
});

test("layout: from 245px the pill reads its whole label, cut only when the title is down to its 4 characters", { skip }, async () => {
  for (const lang of LANGS) {
    const cards = [];
    for (const width of [245, 260, 280, 300, 320, 420, 500]) {
      cards.push({ tag: "weather-plus-mini-card", width });
      cards.push({ tag: "weather-plus-mini-card", changes: UNAVAILABLE, width });
      cards.push({ tag: "weather-plus-card", width });
      cards.push({ tag: "weather-plus-card", changes: UNAVAILABLE, width });
    }
    const { res } = await render({ lang, cards });
    res.forEach((r, i) => {
      const { tag, changes, width } = cards[i];
      const at = `${lang} ${tag} ${JSON.stringify(changes || {})} ${width}px: "${r.pillText}" (title ${r.title}px)`;
      // From 300px every card reads the whole label.
      if (width >= 300) assert.equal(r.pill, "whole", at);
      // Below, the badge and the two buttons can leave the pill less than its label: it gives way, but only once the
      // title is down to its minimum (dot only below 220px of content, where the label could not fit, its text then
      // in its title).
      else if (r.pill !== "whole") assert.ok(r.pill === "dot" || r.titlesWidth <= r.titlesMin + 0.5, at);
    });
  }
});

// The six layouts of the brief: sized by its content (inline-block, a grid's auto column) or in a 1fr 1fr grid at
// 320, 360 and 500px, the card itself or in a plain <div>; full card and mini, normal and unavailable.
const STATES = [{}, UNAVAILABLE];
// The mini card folded and unfolded (zoom: the full card in it).
const TAGS = [{ tag: "weather-plus-card" }, { tag: "weather-plus-mini-card" }, { tag: "weather-plus-mini-card", zoom: true }];
const label = ({ tag, zoom }) => `${tag}${zoom ? " unfolded" : ""}`;

test("layout: sized by its content (inline-block, grid auto column), the card keeps a usable width, in a div too", { skip }, async (t) => {
  const cards = [];
  for (const kind of TAGS)
    for (const changes of STATES)
      for (const wrap of ["inline-block", "grid-auto"]) for (const div of [false, true]) cards.push({ ...kind, changes, wrap, div });
  const { res } = await render({ cards });
  res.forEach((r, i) => {
    const { tag, zoom, changes, wrap, div } = cards[i];
    const at = `${label(cards[i])} ${JSON.stringify(changes)} in ${wrap}${div ? " in a div" : ""}`;
    t.diagnostic(`${at}: ${r.width}px`);
    // Unfolded, the mini card shows the full card: it takes the full card's width (its dates no longer cut).
    assert.ok(r.width >= (tag === "weather-plus-card" || zoom ? 240 : 156), `${at}: ${r.width}px`);
    assert.deepEqual(r.outside, [], at);
  });
});

test("layout: in an inline-block, the mini card folded again takes back the mini card's width", { skip }, async () => {
  const { out } = await render({
    cards: [{ tag: "weather-plus-mini-card", wrap: "inline-block", zoom: true }],
    before: (page) =>
      page.evaluate(async () => {
        const el = document.querySelector("[data-card]");
        const width = () => el.shadowRoot.querySelector("ha-card").getBoundingClientRect().width;
        const unfolded = width();
        el._setZoom(false);
        await new Promise((r) => setTimeout(r, 100));
        return { unfolded, folded: width(), attr: el.hasAttribute("zoomed") };
      }),
  });
  assert.deepEqual(out, { unfolded: 326, folded: 206, attr: false });
});

test("layout: in a 1fr 1fr grid (grid card, layout-card, horizontal stack) the card shrinks to its column, in a div too", { skip }, async () => {
  const cards = [];
  for (const kind of TAGS)
    for (const changes of STATES) for (const width of [320, 360, 500]) for (const div of [false, true]) cards.push({ ...kind, changes, wrap: "grid-1fr", width, div });
  const { res } = await render({ cards });
  // Every layout that fails, so a failure lists them all.
  const bad = [];
  res.forEach((r, i) => {
    const { changes, width, div } = cards[i];
    const at = `${label(cards[i])} ${JSON.stringify(changes)} in a ${width}px 1fr 1fr grid${div ? " in a div" : ""}`;
    const column = (width - 8) / 2;
    if (Math.abs(r.width - column) > 1) bad.push(`${at}: ${r.width}px, its column ${column}px`);
    if (div && Math.abs(r.wrapperWidth - column) > 1) bad.push(`${at}: its div ${r.wrapperWidth}px, its column ${column}px`);
    if (r.hostOverflow) bad.push(`${at}: overflows its grid by ${r.hostOverflow}px`);
  });
  assert.deepEqual(bad, []);
});

test("layout: an update of hass with the focus in the card does not scroll the page", { skip }, async () => {
  const { out } = await render({
    cards: [{ tag: "weather-plus-card", width: 360 }],
    before: async (page) => {
      await page.evaluate(() => {
        document.body.style.paddingBottom = "3000px";
        const el = document.querySelector("[data-card]");
        el.shadowRoot.querySelector('[data-action="refresh"]').focus();
        // The card scrolled half out of view: a focus() that scrolls would bring it back.
        window.scrollTo(0, 400);
      });
      const y0 = await page.evaluate(() => window.scrollY);
      await page.evaluate(() => {
        const el = document.querySelector("[data-card]");
        const h = el.hass;
        el.hass = { ...h, states: { ...h.states, "weather.paris": { ...h.states["weather.paris"], state: "rainy" } } };
      });
      await page.waitForTimeout(100);
      return page.evaluate((y0) => {
        const el = document.querySelector("[data-card]");
        return { y0, y1: window.scrollY, focused: el.shadowRoot.activeElement?.dataset.action, rainy: el.shadowRoot.innerHTML.includes("rain") };
      }, y0);
    },
  });
  assert.equal(out.focused, "refresh", "the focus is back on the refresh button");
  assert.equal(out.y1, out.y0, "the page did not scroll");
});
