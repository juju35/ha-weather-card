// ── Base element ─────────────────────────────────────────────────────────────
import { wxIntlLang, wxLang, wxT } from "./i18n-helpers.js";

export class WxElement extends HTMLElement {
  // 9 columns at least: narrower (156px in the narrowest section), the scene, the temperature and the daily rows no
  // longer fit. The mini card goes down to 6.
  getGridOptions() {
    // A section on its own (no weather now: no scene, no big temperature) fits half a section.
    if (!this.constructor.mini && this._config?.show_current === false) return { columns: 12, min_columns: 6 };
    return { columns: 12, min_columns: 9 };
  }

  _lang() {
    return wxLang(this._config, this._hass);
  }

  _fmtLang() {
    return wxIntlLang(this._config, this._hass);
  }

  _t(k, vars) {
    return wxT(this._lang(), k, vars);
  }
}
