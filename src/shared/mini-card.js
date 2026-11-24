// ── Mini card ────────────────────────────────────────────────────────────────
// Like the ha-climate-air-card mini cards: the detail button (top right, `zoom: false` removes it) switches the mini
// card to the full card and back, and a click anywhere else on the page (but in its full screen detail) folds it again.
import { wxEsc } from "./i18n-helpers.js";

export const wxInDialog = (ev) => ev.composedPath().some((n) => ["ha-more-info-dialog", "ha-dialog", "dialog"].includes(n.localName));

// "A click elsewhere" is caught on the pointer, not only on the click event: on iOS (Safari and the companion app)
// a tap on something that is not clickable (the background, an empty spot, a card with no action) sends no click to
// the page. It counts when the press and the release are both outside the card (`isOutside`), and a scroll does not
// count (the browser cancels the pointer). Keyboard clicks still go through the click event.
export const wxWatchOutside = (isOutside, handler) => {
  let downOutside = false;
  const onDown = (ev) => {
    downOutside = isOutside(ev);
  };
  const onUp = (ev) => {
    if (downOutside && isOutside(ev)) handler(ev);
    downOutside = false;
  };
  const onClick = (ev) => {
    if (ev.detail === 0 && isOutside(ev)) handler(ev);
  };
  return {
    on() {
      document.addEventListener("pointerdown", onDown, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("click", onClick, true);
    },
    // A tap (press and release at the same spot), for the tests.
    tap(ev) {
      onDown(ev);
      onUp(ev);
    },
    off() {
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("click", onClick, true);
    },
  };
};

export const wxMini = (Base) =>
  class extends Base {
    static get mini() {
      return true;
    }

    constructor() {
      super();
      const outside = (ev) => {
        const path = ev.composedPath();
        return !path.includes(this) && !(this._popup && path.includes(this._popup)) && !wxInDialog(ev);
      };
      this._onUnzoom = (ev) => {
        if (this._zoomed && outside(ev)) this._setZoom(false);
      };
      this._unzoom = wxWatchOutside(outside, (ev) => this._onUnzoom(ev));
    }

    connectedCallback() {
      super.connectedCallback?.();
      this._unzoom.on();
    }

    disconnectedCallback() {
      super.disconnectedCallback?.();
      this._unzoom.off();
      // Left (another dashboard view, a conditional card hidden): back to the compact view, not unfolded on return.
      if (this._zoomed) {
        this._zoomed = false;
        this.toggleAttribute("zoomed", false);
        this._update();
      }
    }

    getCardSize() {
      return this._zoomed ? super.getCardSize() : 2;
    }

    // Its height follows its content, folded or unfolded.
    getGridOptions() {
      return this._zoomed ? { ...super.getGridOptions(), rows: "auto" } : { columns: 6, min_columns: 6, rows: "auto" };
    }

    _compact() {
      return !this._zoomed;
    }

    _zoomButton() {
      if (this._config.zoom === false) return "";
      const z = !!this._zoomed;
      const label = wxEsc(this._t(z ? "zoom_out" : "zoom_in"));
      return `<button class="zoom" data-action="zoom" title="${label}" aria-label="${label}"><ha-icon icon="${z ? "mdi:arrow-collapse" : "mdi:arrow-expand"}"></ha-icon></button>`;
    }

    // The host carries the state ([zoomed]): unfolded, its preferred width (sections.js, :host::before) is the full card's.
    _setZoom(on) {
      this._zoomed = on;
      this.toggleAttribute("zoomed", !!on);
      this._update();
    }

    // From the keyboard (Enter / Space: no click count), the focus follows to the button that replaced this one.
    _toggleZoom(ev) {
      this._setZoom(!this._zoomed);
      if (ev.detail === 0) this.shadowRoot.querySelector(".zoom")?.focus({ preventScroll: true });
    }
  };
