// Evaluates the sources in a sandbox with minimal DOM stand-ins, the way scripts/build.mjs concatenates them, and
// returns the names the tests need. No dependency, no browser.
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { CARDS, PARTS } from "../scripts/build.mjs";

const root = new URL("../src/", import.meta.url);
const read = (name) => readFileSync(new URL(`${name}.js`, root), "utf8");

// Shadow root / element stand-in: enough for the cards' render and event wiring.
export const fakeNode = () => ({
  innerHTML: "",
  children: [],
  activeElement: null,
  querySelector() {
    return null;
  },
  addEventListener() {},
  appendChild(el) {
    this.children.push(el);
  },
});

// `now` freezes the sandbox's clock (Date.now() and new Date()), so that the tests do not depend on the time of day.
export const load = (now = null) => {
  const registry = new Map();
  class HTMLElement {
    constructor() {
      this.style = {};
      this.events = [];
    }
    attachShadow() {
      this.shadowRoot = fakeNode();
      return this.shadowRoot;
    }
    appendChild() {}
    dispatchEvent(ev) {
      this.events.push(ev);
    }
  }
  const sandbox = {
    HTMLElement,
    CustomEvent: class {
      constructor(type, init) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
    console: { info() {} },
    customElements: { get: (t) => registry.get(t), define: (t, c) => registry.set(t, c) },
    document: {
      createElement: (t) => (registry.has(t) ? new (registry.get(t))() : fakeNode()),
      addEventListener() {},
      removeEventListener() {},
    },
    setInterval: () => 0,
    clearInterval: () => {},
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  const clock = now
    ? `{ const R = Date; const T = ${now.getTime()};
         globalThis.Date = class extends R { constructor(...a) { super(...(a.length ? a : [T])); } static now() { return T; } }; }\n`
    : "";
  const code = clock + [...PARTS.map(read), ...CARDS.map((c) => `{\n${read(c)}}\n`)].join("\n");
  const tags = ["weather-plus-card", "weather-plus-mini-card"];
  return vm.runInContext(
    `${code}
    ({ wxResolve, wxFindWeather, wxPollenLevel, wxAlertLevel, wxDroughtLevel, wxRainLevel, wxUvLevel, wxBearing, wxCleanConfig,
       wxSceneSvg, wxTempColor, WX_CONDITIONS, customElements, window,
       cards: Object.fromEntries(${JSON.stringify(tags)}.map((t) => [t, customElements.get(t)])) })`,
    ctx,
  );
};

// A card of `tag` set up with `config` and `hass`, rendered once.
export const mount = (lib, tag, config, hass) => {
  const el = new lib.cards[tag]();
  el.setConfig({ type: `custom:${tag}`, ...config });
  el.hass = hass;
  return el;
};
