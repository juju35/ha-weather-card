// ── i18n ─────────────────────────────────────────────────────────────────────
import { WX_I18N } from "./i18n/wx-i18n.js";

export function wxT(lang, key, vars) {
  const s = (WX_I18N[lang] || WX_I18N.en)[key] ?? WX_I18N.en[key] ?? key;
  return vars ? s.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "") : s;
}

export function wxLang(config, hass) {
  const raw = String(config?.language || hass?.language || globalThis.document?.documentElement?.lang || "en");
  if (Object.hasOwn(WX_I18N, raw)) return raw;
  const base = raw.split("-")[0];
  return Object.hasOwn(WX_I18N, base) ? base : "en";
}

// The locale handed to Intl / toLocale*: the full Home Assistant locale (or the card's `language:`, which comes first)
// when it is in the card's language, else that language. "pt" alone is European Portuguese, which Intl reads as Brazilian.
export function wxIntlLang(config, hass) {
  const lang = wxLang(config, hass);
  let loc = String(config?.language || hass?.locale?.language || hass?.language || "");
  if (loc.split("-")[0].toLowerCase() !== lang.split("-")[0]) loc = lang;
  if (lang === "sr-Latn" && !/-latn\b/i.test(loc)) loc = "sr-Latn";
  if (loc.toLowerCase() === "pt") loc = "pt-PT";
  try {
    Intl.getCanonicalLocales(loc);
  } catch {
    loc = lang === "pt" ? "pt-PT" : lang;
  }
  return loc;
}

export function wxEsc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
