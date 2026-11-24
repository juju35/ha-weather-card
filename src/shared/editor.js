// ── Editor (built on Home Assistant's ha-form) ───────────────────────────────
import { pickerDefine } from "./card-picker.js";
import { WX_REPO, WX_VERSION } from "./core.js";
import { wxLang, wxT } from "./i18n-helpers.js";

export const WX_SECTIONS = ["alerts", "rain", "hourly", "daily", "air", "uv", "pollen", "sun", "moon"];
// Every section the editor offers: the wind rose is off by default (it reads the history of a weather station).
export const WX_SECTIONS_ALL = ["alerts", "rain", "hourly", "daily", "wind", "air", "uv", "pollen", "sun", "moon"];
export const WX_WIND_HOURS = 24;
export const WX_DEFAULTS = { show_header: true, show_current: true, show_title: true, show_subtitle: true, sections: WX_SECTIONS, hours: 12, days: 5, wind_hours: WX_WIND_HOURS, animations: true, illustration: true, illustration_theme: "auto", popup: true, refresh: true };

export class WxCardEditor extends HTMLElement {
  static mini = false;

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    const prev = this._hass?.language;
    this._hass = hass;
    if (this._form && prev === hass?.language) this._form.hass = hass;
    else this._render();
  }

  _defaults() {
    return { ...WX_DEFAULTS, ...(this.constructor.mini ? { zoom: true } : {}) };
  }

  _schema(lang) {
    return [
      { name: "entity", selector: { entity: { domain: "weather" } } },
      { name: "name", selector: { text: {} } },
      {
        name: "sections",
        selector: { select: { multiple: true, reorder: true, mode: "list", options: WX_SECTIONS_ALL.map((s) => ({ value: s, label: wxT(lang, `s_${s}`) })) } },
      },
      { name: "warning_entities", selector: { entity: { multiple: true, domain: ["sensor", "binary_sensor"] } } },
      {
        type: "grid",
        name: "",
        schema: [
          { name: "hours", selector: { number: { min: 0, max: 48, mode: "box" } } },
          { name: "days", selector: { number: { min: 0, max: 10, mode: "box" } } },
          ...((this._config.sections || []).includes("wind") ? [{ name: "wind_hours", selector: { number: { min: 1, max: 168, mode: "box" } } }] : []),
        ],
      },
      {
        type: "grid",
        name: "",
        schema: [
          // A section on its own (#59): the full card without its header or the weather now.
          ...(this.constructor.mini
            ? []
            : [
                { name: "show_header", selector: { boolean: {} } },
                { name: "show_current", selector: { boolean: {} } },
              ]),
          { name: "show_title", selector: { boolean: {} } },
          { name: "show_subtitle", selector: { boolean: {} } },
          { name: "animations", selector: { boolean: {} } },
          { name: "illustration", selector: { boolean: {} } },
          { name: "popup", selector: { boolean: {} } },
          { name: "refresh", selector: { boolean: {} } },
          ...(this.constructor.mini ? [{ name: "zoom", selector: { boolean: {} } }] : []),
        ],
      },
      // The banner's sky: by the sun (or Home Assistant's dark theme without one), or always day / night.
      {
        name: "illustration_theme",
        selector: { select: { mode: "dropdown", options: ["auto", "day", "night"].map((v) => ({ value: v, label: wxT(lang, `ed_theme_${v}`) })) } },
      },
      {
        name: "advanced",
        type: "expandable",
        flatten: true,
        schema: [
          {
            name: "language",
            selector: {
              select: {
                mode: "dropdown",
                options: [
                  { value: "", label: wxT(lang, "ed_language_auto") },
                  { value: "en", label: "English" },
                  { value: "fr", label: "Français" },
                  { value: "de", label: "Deutsch" },
                  { value: "es", label: "Español" },
                  { value: "sr", label: "Српски" },
                  { value: "sr-Latn", label: "Srpski (latinica)" },
                  { value: "it", label: "Italiano" },
                  { value: "nl", label: "Nederlands" },
                  { value: "pt", label: "Português (Portugal)" },
                  { value: "pl", label: "Polski" },
                  { value: "ro", label: "Română" },
                  { value: "da", label: "Dansk" },
                  { value: "sv", label: "Svenska" },
                  { value: "bg", label: "Български" },
                  { value: "ru", label: "Русский" },
                  { value: "uk", label: "Українська" },
                  { value: "hu", label: "Magyar" },
                  { value: "sk", label: "Slovenčina" },
                  { value: "cs", label: "Čeština" },
                  { value: "sl", label: "Slovenščina" },
                  { value: "lv", label: "Latviešu" },
                  { value: "el", label: "Ελληνικά" },
                ],
              },
            },
          },
          { name: "entities", selector: { object: {} } },
        ],
      },
    ];
  }

  _render() {
    if (!this._config || !this._hass) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.addEventListener("value-changed", (ev) => this._valueChanged(ev));
      this.appendChild(this._form);
    }
    const lang = wxLang(this._config, this._hass);
    this._form.hass = this._hass;
    this._form.schema = this._schema(lang);
    this._form.computeLabel = (s) => wxT(lang, `ed_${s.name}`);
    this._form.computeHelper = (s) => {
      const key = `ed_${s.name}_helper`;
      const txt = wxT(lang, key);
      return txt === key ? undefined : txt;
    };
    this._form.data = { ...this._defaults(), ...this._config };
  }

  _valueChanged(ev) {
    ev.stopPropagation();
    const lang = wxLang(this._config, this._hass);
    const wind = (this._config.sections || []).includes("wind");
    this._config = wxCleanConfig(ev.detail.value, this._defaults(), this._config.type);
    // The wind rose's hours show with the wind section only.
    if (lang !== wxLang(this._config, this._hass) || wind !== (this._config.sections || []).includes("wind")) this._render();
    this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config }, bubbles: true, composed: true }));
  }
}

// Keeps the YAML short: options left empty or at their default are dropped.
export function wxCleanConfig(value, defaults, type) {
  const out = { ...value };
  for (const k of Object.keys(out)) {
    const v = out[k];
    const same = Array.isArray(v) && Array.isArray(defaults[k]) ? v.join() === defaults[k].join() : v === defaults[k];
    // An empty list without a default (warning_entities) is no option at all.
    if (v === "" || v == null || same || (Array.isArray(v) && !v.length && !(k in defaults))) delete out[k];
  }
  if (out.entities && typeof out.entities === "object" && !Array.isArray(out.entities)) {
    const e = Object.fromEntries(Object.entries(out.entities).filter(([, v]) => v && (!Array.isArray(v) || v.length)));
    if (Object.keys(e).length) out.entities = e;
    else delete out.entities;
  }
  return type ? { type, ...out } : out;
}

// Defines a card and its editor (`<type>-editor`) and lists the card in the card picker.
// The card picker's name and description, in the language of the page (Home Assistant sets it on <html>).
export function wxRegister(type, cls, key) {
  if (customElements.get(type)) return;
  const lang = wxLang(null, null);
  const editor = class extends WxCardEditor {
    static mini = !!cls.mini;
  };
  pickerDefine(type, cls);
  pickerDefine(`${type}-editor`, editor);
  cls.tag = type;
  window.customCards = window.customCards || [];
  window.customCards.push({ type, name: wxT(lang, key), description: wxT(lang, `${key}_desc`), preview: true, documentationURL: WX_REPO });
}

if (!customElements.get("weather-plus-card")) {
  console.info(`%c HA-WEATHER-CARD %c v${WX_VERSION} `, "background:#f9a825;color:#fff;font-weight:700", "");
}
