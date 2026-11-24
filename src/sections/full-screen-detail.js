// ── Full screen detail ───────────────────────────────────────────────────────
export const WX_POPUP_STYLES = `
  :host { all: initial; display: block; font-family: var(--paper-font-body1_-_font-family, var(--ha-font-family-body, Roboto, sans-serif));
          color: var(--primary-text-color); -webkit-font-smoothing: antialiased; }
  /* The theme's card colour may be translucent: a blurred, darkened page behind and a solid colour under it keep it opaque. */
  .backdrop { position: fixed; inset: 0; z-index: 9999; background: rgba(0,0,0,.6); -webkit-backdrop-filter: blur(24px); backdrop-filter: blur(24px);
              animation: wx-fade .2s ease-out both; }
  .sheet { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; animation: wx-sheet .28s cubic-bezier(.2,.8,.2,1) both;
           background: linear-gradient(var(--card-background-color, #fff), var(--card-background-color, #fff)), var(--primary-background-color, #fafafa); }
  ha-card.popup { --ha-card-border-radius: 0; --ha-card-box-shadow: none; border-radius: 0; box-shadow: none; background: transparent; border: none;
                  min-height: 100%; height: auto; overflow: visible; gap: 16px; box-sizing: border-box; max-width: 1800px; margin: 0 auto;
                  padding: 0 max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left)); }
  .popup .header { position: sticky; top: 0; z-index: 2; padding: max(10px, env(safe-area-inset-top)) 0 10px; margin: 0 -2px;
                   background: linear-gradient(var(--card-background-color, #fff), var(--card-background-color, #fff)), var(--primary-background-color, #fafafa); }
  .popup .name { font-size: 18px; }
  /* The full screen detail keeps its larger, lighter temperature. */
  .popup .big .val { font-size: 40px; font-weight: 300; }
  .popup .big .val small { font-size: 18px; }
  .close { flex: none; width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; margin-left: 4px;
           background: var(--secondary-background-color, rgba(128,128,128,.12)); color: var(--primary-text-color); }
  .close:hover { background: color-mix(in srgb, var(--primary-text-color) 14%, transparent); }
  .close:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 2px; }
  .popup .section { gap: 8px; }
  /* The full screen detail gives the weather scene more room than the card's 120×96 (ratio kept at 1.25). */
  .popup .scene { width: 160px; height: 128px; border-radius: 20px; }

  /* Phone: one column, as in the card. */
  .popup .top, .popup .side { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .popup .flow { display: flex; flex-direction: column; gap: 16px; }
  .popup .hscroll { margin: 0 -16px; padding: 0 16px 4px; }

  /* Wider: the weather now next to the alerts and the rain, the hourly forecast across, the rest in balanced columns. */
  @media (min-width: 760px) {
    ha-card.popup { gap: 22px; padding-left: max(24px, env(safe-area-inset-left)); padding-right: max(24px, env(safe-area-inset-right)); }
    .popup .top { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 20px 40px; align-items: start; }
    .popup .scene { width: 280px; height: 224px; border-radius: 28px; }
    .popup .big .val { font-size: 56px; }
    .popup .big .val small { font-size: 22px; }
    .popup .flow { display: block; columns: 2 340px; column-gap: 40px; }
    .popup .flow > .section { break-inside: avoid; margin-bottom: 24px; }
    .popup .hscroll { margin: 0; padding: 0 0 4px; }
  }
  @media (min-width: 1200px) { .popup .flow { columns: 3 340px; } }
  @keyframes wx-sheet { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .backdrop, .sheet { animation: none !important; } }
`;
