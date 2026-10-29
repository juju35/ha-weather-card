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
  style: {},
  activeElement: null,
  attachShadow() {
    this.shadowRoot = fakeNode();
    return this.shadowRoot;
  },
  remove() {
    this.removed = true;
  },
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
  const winListeners = {};
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
      body: {
        ...fakeNode(),
        appendChild(el) {
          this.children.push(el);
          el.isConnected = true;
          el.remove = () => {
            this.removeChild(el);
          };
        },
        // Like the browser: removing a node that is not a child throws.
        removeChild(el) {
          if (!this.children.includes(el)) throw new Error("NotFoundError");
          this.children = this.children.filter((x) => x !== el);
          el.isConnected = false;
        },
      },
      listeners: {},
      addEventListener(type, fn) {
        this.listeners[type] = fn;
      },
      removeEventListener(type) {
        delete this.listeners[type];
      },
    },
    // A stack of entries like the browser's: back() traverses later, with its popstate, when the test calls flush().
    history: {
      entries: [null],
      index: 0,
      pending: 0,
      get state() {
        return this.entries[this.index];
      },
      pushState(state) {
        this.entries.splice(this.index + 1, Infinity, state);
        this.index++;
      },
      replaceState(state) {
        this.entries[this.index] = state;
      },
      back() {
        this.pending++;
      },
      flush() {
        for (; this.pending > 0; this.pending--) {
          if (this.index === 0) continue;
          this.index--;
          for (const fn of [...(winListeners.popstate || [])]) fn({ type: "popstate", state: this.state });
        }
      },
    },
    setInterval: () => 0,
    clearInterval: () => {},
  };
  sandbox.window = sandbox;
  sandbox.addEventListener = (type, fn) => (winListeners[type] ||= new Set()).add(fn);
  sandbox.removeEventListener = (type, fn) => winListeners[type]?.delete(fn);
  const ctx = vm.createContext(sandbox);
  const clock = now
    ? `{ const R = Date; const T = ${now.getTime()};
         globalThis.Date = class extends R { constructor(...a) { super(...(a.length ? a : [T])); } static now() { return T; } }; }\n`
    : "";
  const code = clock + [...PARTS.map(read), ...CARDS.map((c) => `{\n${read(c)}}\n`)].join("\n");
  const tags = ["weather-plus-card", "weather-plus-mini-card"];
  return vm.runInContext(
    `${code}
    ({ WX_I18N, WX_CARDINALS, wxResolve, wxFindWeather, wxPollenLevel, wxAlertLevel, wxDroughtLevel, wxRainLevel, wxUvLevel, wxBearing, wxCleanConfig,
       wxSceneSvg, wxTempColor, document, wxSunTimes, wxMoonTimes, wxAltitude, wxMoonAge, wxMoonPhase, wxMoonLight, wxMoonLit, wxWeatherName, WX_CONDITIONS, customElements, window,
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
