// Shared by the screenshot scripts: theme variables, <ha-card> / <ha-icon> stand-ins, a fixed clock, the forecast
// subscription, and the render loop.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as mdi from "@mdi/js";
import { chromium } from "playwright";

export const root = fileURLToPath(new URL("../..", import.meta.url));
const cardJs = readFileSync(`${root}dist/ha-weather-card.js`, "utf8");

// The clock of every shot: an October afternoon (or `night`), the forecasts drawn around it.
export const DAY = new Date(2026, 9, 21, 14, 10);
export const NIGHT = new Date(2026, 9, 21, 22, 40);

// Every mdi:* icon the cards can use, as SVG paths for the <ha-icon> stand-in.
const iconsFor = (extra) => {
  const icons = {};
  for (const name of new Set([...cardJs.match(/mdi:[a-z0-9-]+/g), ...extra])) {
    const key = `mdi${name.slice(4).replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase())}`;
    if (mdi[key]) icons[name.slice(4)] = mdi[key];
  }
  return icons;
};

const THEMES = {
  light: {
    "--primary-background-color": "#e8eaed", "--secondary-background-color": "#ececec", "--card-background-color": "#ffffff",
    "--primary-text-color": "#212121", "--secondary-text-color": "#727272", "--divider-color": "rgba(0,0,0,.12)",
  },
  dark: {
    "--primary-background-color": "#111111", "--secondary-background-color": "#282828", "--card-background-color": "#1c1c1c",
    "--primary-text-color": "#e1e1e1", "--secondary-text-color": "#9b9b9b", "--divider-color": "rgba(225,225,225,.12)",
  },
};
const COMMON = {
  "--primary-color": "#03a9f4", "--info-color": "#039be5", "--success-color": "#43a047", "--warning-color": "#ffa600", "--error-color": "#db4437",
  "--text-primary-color": "#ffffff",
};

const haElements = (icons) => `
const ICONS = ${JSON.stringify(icons)};
customElements.define("ha-card", class extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" }).innerHTML =
      "<style>:host{display:block;background:var(--card-background-color);border-radius:12px;" +
      "border:1px solid var(--divider-color);color:var(--primary-text-color);overflow:hidden}</style><slot></slot>";
  }
});
customElements.define("ha-icon", class extends HTMLElement {
  static get observedAttributes() { return ["icon"]; }
  connectedCallback() { this._draw(); }
  attributeChangedCallback() { this._draw(); }
  _draw() {
    const path = ICONS[(this.getAttribute("icon") || "").replace("mdi:", "")] || "";
    this.style.display = "inline-flex";
    this.innerHTML = '<svg viewBox="0 0 24 24" style="width:var(--mdc-icon-size,24px);height:var(--mdc-icon-size,24px);fill:currentColor"><path d="' + path + '"/></svg>';
  }
});`;

const pageHtml = (theme, width) => `<!doctype html><html><head><meta charset="utf-8">
<style>
  :root { ${Object.entries({ ...THEMES[theme], ...COMMON }).map(([k, v]) => `${k}:${v};`).join("")} }
  body { margin: 0; padding: 16px; background: var(--primary-background-color); color: var(--primary-text-color);
         font-family: Roboto, "Segoe UI", Helvetica, Arial, sans-serif; width: ${width}px; }
  #root { display: grid; gap: 12px; grid-template-columns: repeat(var(--cols, 1), minmax(0, 1fr)); }
</style></head><body><div id="root"></div></body></html>`;

export const launch = () =>
  chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH, args: ["--no-sandbox", "--disable-gpu"] } : {});

// A page with the theme, the stand-ins and the card script, its clock set to `now`.
export const openPage = async (browser, { theme = "light", width = 460, now = DAY, icons = [] } = {}) => {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: width + 32, height: 2400 } });
  page.on("pageerror", (err) => console.error(`pageerror: ${err.message}`));
  await page.clock.setFixedTime(now);
  await page.setContent(pageHtml(theme, width));
  await page.addScriptTag({ content: haElements(iconsFor(icons)) });
  await page.addScriptTag({ content: cardJs });
  return page;
};

// Saves `png` (a full-viewport capture, `width` × `height` CSS pixels) framed like the card shots: on the theme
// background with a 16px margin, in a card-like box (12px radius, divider border).
export const saveFramed = async (browser, { theme, png, width, height, path }) => {
  const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: width + 34, height: height + 34 } });
  await page.setContent(pageHtml(theme, width + 2));
  await page.evaluate(
    ({ src, width, height }) => {
      const box = document.createElement("div");
      box.style.cssText = "border:1px solid var(--divider-color);border-radius:12px;overflow:hidden;line-height:0";
      box.innerHTML = `<img src="${src}" style="width:${width}px;height:${height}px;display:block">`;
      document.getElementById("root").appendChild(box);
      return box.querySelector("img").decode();
    },
    { src: `data:image/png;base64,${png.toString("base64")}`, width, height },
  );
  await page.screenshot({ path, clip: { x: 0, y: 0, width: width + 34, height: height + 34 } });
  await page.close();
};

// Adds cards to the page: [{ tag, config, hass }]; the forecasts of each mock are served by a subscription stand-in.
export const addCards = (page, cards, cols = 1) =>
  page.evaluate(
    ({ cards, cols }) => {
      const root = document.getElementById("root");
      root.style.setProperty("--cols", cols);
      for (const { tag, config, hass, open } of cards) {
        const el = document.createElement(tag);
        el.setConfig({ type: `custom:${tag}`, ...config });
        root.appendChild(el);
        el.hass = {
          ...hass,
          callService: async () => {},
          // The pressure 3 hours ago, then now: a rising trend.
          callApi: async () => [[{ state: "1011.2" }, { state: String(hass.states["sensor.paris_pressure"]?.state ?? 1014) }]],
          connection: {
            subscribeMessage: async (cb, msg) => {
              cb({ type: msg.forecast_type, forecast: hass.forecasts?.[msg.forecast_type] || [] });
              return () => {};
            },
          },
        };
        if (open) el.shadowRoot.querySelector(open).dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, detail: 1 }));
      }
    },
    { cards, cols },
  );

// A light shot and its dark twin, both in English: pair("card", { ... }).
export const pair = (file, extra = {}) => [
  { file, theme: "light", ...extra },
  { file: `${file}-dark`, theme: "dark", ...extra },
];

// Renders each shot of `shots` ({ file, theme, now?, ... }) into screenshots/<file>.png.
// `setup(shot, lang)` returns { cards: [{ tag, config, hass }], cols? }; every shot is in English.
// Widths: 460px for the full card, 380px for the mini card (`width` on the shot).
export const shoot = async ({ shots, setup, width = 460 }) => {
  const browser = await launch();
  for (const s of shots) {
    // A new page per shot: the card's script declares top-level names, which cannot be evaluated twice in one page.
    const w = s.width || width;
    const page = await openPage(browser, { theme: s.theme, width: w, now: s.now || DAY });
    const lang = "en";
    const { cards, cols = 1 } = setup(s, lang);
    await addCards(page, cards, cols);
    await page.waitForTimeout(300);
    const out = `screenshots/${s.file}.png`;
    // The cards on the theme background, with the body's 16px padding around them.
    const box = await page.locator("#root").boundingBox();
    await page.screenshot({
      path: `${root}${out}`,
      clip: { x: 0, y: 0, width: w + 32, height: Math.ceil(box.height) + 32 },
      animations: "disabled",
    });
    console.log(out);
    await page.close();
  }
  await browser.close();
};
