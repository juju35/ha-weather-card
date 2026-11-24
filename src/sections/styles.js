// ── Styles ───────────────────────────────────────────────────────────────────
import { WX_COL } from "./hourly-forecast.js";

export const WX_STYLES = `${WX_SCENE_STYLES}
  :host { display: block; height: 100%; min-width: 0; }
  /* The card is a size container (below): on a narrow card (Sections view, 6 to 9 columns) its parts follow the
     card's width, not the window's. Sized by its content (an inline-block, a grid's auto column, layout-card), a size
     container counts as 0px wide: this empty, 0px high grid gives the card 326px there (206px for the mini card, 326px
     again once unfolded: it then shows the full card).
     Its track is minmax(0, …): that width is the card's preferred width only, never its minimum, so the card (or the
     div that wraps it, whose min-width stays auto) still shrinks to its column in a 1fr 1fr grid or a stack. */
  :host::before { content: ""; display: grid; grid-template-columns: minmax(0, 326px); height: 0; }
  :host(weather-plus-mini-card:not([zoomed]))::before { grid-template-columns: minmax(0, 206px); }
  ha-card { height: 100%; box-sizing: border-box; padding: 12px; display: flex; flex-direction: column; gap: 12px; overflow: hidden;
            container-type: inline-size; }
  ha-card > *, .section, .info, .hero > div { min-width: 0; }
  .empty { display: flex; align-items: center; gap: 10px; color: var(--secondary-text-color); }
  /* The body starts 8px under the header, like the other ha-* cards (the card's gap is 12px, 8px on the mini card). */
  .header { display: flex; align-items: center; gap: 10px; margin-bottom: -4px; }
  ha-card.mini .header, ha-card.mini .banner { margin-bottom: 0; }
  .badge { flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center;
           background: color-mix(in srgb, var(--wx-color) 16%, transparent); color: var(--wx-color); transition: background .4s, color .4s; }
  .badge ha-icon { --mdc-icon-size: 24px; }
  /* The title takes the room the pill leaves (base 0, so the pill keeps its whole text while there is room for both),
     and keeps 4 characters and its ellipsis whatever the pill's length. */
  .titles { flex: 1 1 0; min-width: 5ch; cursor: pointer; display: flex; flex-direction: column; }
  /* The title row: the name, then the status pill 8px after it, centred on it, only when the whole name and the
     pill's whole label fit there (measured by the card, see wxPlacePill). Otherwise the pill goes on its own line
     under the subtitle (one line then), the name whole on its row; when even that cuts its label or leaves the
     banner, the pill keeps its dot alone, back on the title row. */
  .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .trow .name { flex: 0 1 auto; min-width: 0; }
  [data-wrap] .trow { display: contents; }
  [data-wrap] .titles > .sub { order: 2; }
  [data-wrap] .titles .st { order: 3; align-self: flex-start; max-width: 100%; margin-top: 2px; }
  /* On its own line, under the subtitle, the banner's pill may run a little over the scene's lower left corner. */
  .banner[data-wrap] .titles .st { max-width: calc(100% + var(--wx-sw) / 2); }
  [data-dot] .st { padding: 4px; }
  [data-dot] .st .stt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  :host([hide-title]) .titles .name, :host([hide-subtitle]) .titles > .sub { display: none; }
  .name { font-size: 16px; font-weight: 500; line-height: 1.25; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .sub { font-size: 12px; color: var(--secondary-text-color); margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  /* The pill gives way only when the title is down to its 4 characters: then it ellipsizes its text, and on the
     narrowest cards shows its dot only (see @container). */
  .st { position: relative; display: inline-flex; align-items: center; gap: 4px; flex: none; min-width: 0; box-sizing: border-box; overflow: hidden; padding: 1px 8px;
        border-radius: 12px; font-size: 11px; font-weight: 500; white-space: nowrap; background: color-mix(in srgb, var(--st-color, var(--wx-color)) 18%, transparent);
        color: ${wxInk("var(--st-color, var(--wx-color))")}; }
  .st .dot { flex: none; background: var(--st-color, var(--wx-color)); }
  .st .stt { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
  .st.alert .dot { animation: wx-blink 1.4s ease-in-out infinite; }
  button { font: inherit; cursor: pointer; border: none; }
  .zoom { all: unset; flex: none; cursor: pointer; width: 24px; height: 24px; margin: -4px -4px -4px 0; border-radius: 50%;
          display: grid; place-items: center; color: var(--secondary-text-color); }
  .zoom ha-icon { --mdc-icon-size: 16px; }
  .refresh[data-busy] { cursor: progress; color: var(--primary-color, #03a9f4); }
  .refresh[data-busy] ha-icon { animation: wx-spin 1s linear infinite; }
  .zoom:hover { background: color-mix(in srgb, var(--secondary-text-color) 16%, transparent); color: var(--primary-text-color); }
  .zoom:focus-visible, [role=button]:focus-visible { outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 1px; }
  [data-more] { cursor: pointer; }

  /* Illustrated header (illustration: true, the default): a 90px banner edge to edge, the title on the sky at the
     left, the card's animated scene at the right (up to 108 × 86, its top inside the banner, its bottom on the lawn),
     a 10px lawn strip under the whole width, the buttons in a column at the right edge. Day or night sky. */
  .banner { position: relative; flex: none; height: 90px; margin: -12px -12px -2px; overflow: hidden; color: #0d2a45;
            background: linear-gradient(90deg, #f1f8ff 0%, #e2f1fd 34%, #b9def8 70%, #9fd0f3 100%); }
  .banner.night { color: #fff; background: linear-gradient(90deg, #1b2f52 0%, #15284a 36%, #0f1f3d 72%, #0a1830 100%); }
  .banner .ground { position: absolute; left: 0; right: 0; bottom: 0; height: 10px; z-index: 1;
                    background: repeating-linear-gradient(90deg, #5aa83d 0 22px, #6cbb4c 22px 44px); }
  .banner.night .ground { background: repeating-linear-gradient(90deg, #1f4a2a 0 22px, #245433 22px 44px); }
  .banner { --wx-sw: min(108px, 34cqw); --wx-br: 8px; }
  /* Narrower cards: the weather scene is drawn smaller (60 px, then 48 px wide), so that the title stays whole and the
     status pill keeps its label beside it. */
  @container (max-width: 280px) { .banner { --wx-sw: 60px; } }
  @container (max-width: 240px) { .banner { --wx-sw: 48px; } }
  .bscene { position: absolute; right: var(--wx-br); bottom: 4px; width: var(--wx-sw); aspect-ratio: 5 / 4; }
  .banner .bscene > .scene { width: 100%; height: 100%; border-radius: 0; background: none; }
  .htext { position: absolute; left: 12px; top: 0; bottom: 10px; right: calc(var(--wx-sw) + var(--wx-br) + 4px); z-index: 2;
           display: flex; align-items: center; gap: 10px; min-width: 0; }
  .banner .badge { background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px rgba(47,128,237,.18); color: var(--wx-icon); }
  .banner.night .badge { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14);
                         color: color-mix(in srgb, var(--wx-icon) 70%, #fff); }
  .banner .name { color: inherit; }
  .banner .sub { font-size: 13px; color: #3b5b78; }
  .banner.night .sub { color: rgba(255,255,255,.78); }
  .banner .st { background: color-mix(in srgb, var(--st-color) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--st-color) 45%, #0d2a45); }
  .banner.night .st { background: color-mix(in srgb, var(--st-color) 30%, rgba(8,18,38,.55)); color: color-mix(in srgb, var(--st-color) 35%, #ffffff); }
  /* The buttons on one line in the top right corner: the detail button at the corner, the others at its left. */
  .hbtns { position: absolute; top: 5px; right: 5px; z-index: 3; display: flex; flex-direction: row; gap: 4px; }
  .banner .zoom { margin: 0; width: 24px; height: 24px; color: #33506b; background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7);
                  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
  .banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
  .banner .zoom:hover { background: rgba(255,255,255,.75); color: #33506b; }
  .banner.night .zoom:hover { background: rgba(255,255,255,.22); color: #fff; }

  .hero { display: flex; align-items: center; gap: 14px; }
  .info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
  .big { display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; cursor: pointer; }
  .big .val { font-size: 30px; font-weight: 400; line-height: 1; color: var(--primary-text-color); white-space: nowrap; font-variant-numeric: tabular-nums; }
  .big .val small { font-size: 14px; color: var(--secondary-text-color); font-weight: 400; }
  .big .hilo { font-size: 13px; color: var(--secondary-text-color); white-space: nowrap; }
  .big .hilo b { font-weight: 500; color: var(--primary-text-color); }
  .feels { font-size: 12px; color: var(--secondary-text-color); }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 1px 8px 1px 5px; border-radius: 12px;
          background: var(--secondary-background-color, rgba(128,128,128,.12)); color: var(--secondary-text-color); white-space: nowrap;
          max-width: 100%; min-width: 0; box-sizing: border-box; }
  .chip ha-icon { --mdc-icon-size: 13px; flex: none; }
  .chip .ct { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
  .chip.tint { background: color-mix(in srgb, var(--k) 20%, transparent); color: ${wxInk("var(--k)")}; }
  .chip.tint ha-icon { color: var(--k); }
  .chip.pulse { animation: wx-chip 2s ease-in-out infinite; }
  .chip.bolt ha-icon { animation: wx-blink 1.2s steps(2) infinite; }
  .chip .arrow { display: inline-flex; flex: none; transition: transform .6s; }

  /* The warning banner (warning_entities): a row per warning in its level's colour, its title on one line. */
  .warnings { display: flex; flex-direction: column; gap: 4px; }
  .warning { display: flex; align-items: center; gap: 8px; min-width: 0; padding: 6px 10px; border-radius: 10px; border-left: 4px solid var(--k);
             font-size: 13px; font-weight: 500; background: color-mix(in srgb, var(--k) 20%, transparent); color: ${wxInk("var(--k)")}; }
  .warning ha-icon { --mdc-icon-size: 18px; flex: none; color: var(--k); }
  .warning .wt { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .warning.lvl3 ha-icon, .warning.lvl4 ha-icon { animation: wx-blink 1.4s ease-in-out infinite; }
  .warnings-more { font-size: 11px; color: var(--secondary-text-color); padding-left: 14px; }

  .section { display: flex; flex-direction: column; gap: 8px; }
  .section-title { display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; text-transform: uppercase;
                   letter-spacing: .04em; color: var(--secondary-text-color); }
  .section-title > ha-icon { --mdc-icon-size: 16px; flex-shrink: 0; }
  .section-title .chip { margin-left: auto; text-transform: none; letter-spacing: 0; }
  .empty-line { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--secondary-text-color); }
  .empty-line ha-icon { --mdc-icon-size: 16px; }

  .restrictions { margin: 0; padding-left: 18px; font-size: 12px; color: var(--secondary-text-color); display: flex; flex-direction: column; gap: 2px; }
  .restrictions b { font-weight: 500; color: var(--primary-text-color); }

  .rain-head { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--primary-text-color); }
  .rain-head ha-icon { --mdc-icon-size: 18px; color: #42a5f5; }
  .rain-head.wet ha-icon { animation: wx-bob-icon 1.6s ease-in-out infinite; }
  .rainbar { display: flex; gap: 2px; height: 14px; border-radius: 7px; overflow: hidden; background: var(--secondary-background-color, rgba(128,128,128,.12)); }
  .rainbar .seg { min-width: 2px; transform-origin: bottom; }
  .enter .rainbar .seg { animation: wx-rise .5s ease-out both; animation-delay: var(--d, 0s); }
  .rainbar .seg.l0 { background: color-mix(in srgb, var(--secondary-text-color) 10%, transparent); }
  .rainbar .seg.l1 { background: ${WX_RAIN_COLORS[1]}; }
  .rainbar .seg.l2 { background: ${WX_RAIN_COLORS[2]}; }
  .rainbar .seg.l3 { background: ${WX_RAIN_COLORS[3]}; }
  .rainbar .seg.na { background: none; }
  .ticks { display: flex; justify-content: space-between; font-size: 10px; color: var(--secondary-text-color); margin-top: -4px; }

  .hscroll { overflow-x: auto; overflow-y: hidden; margin: 0 -12px; padding: 0 12px; scrollbar-width: thin; }
  .track { display: flex; flex-direction: column; width: 100%; }
  .hrow { display: flex; }
  .hcol, .pcol, .pt { flex: 1 1 ${WX_COL}px; min-width: ${WX_COL}px; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .hcol .t { font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; }
  .hcol.now .t { color: var(--primary-text-color); font-weight: 500; }
  .hcol ha-icon { --mdc-icon-size: 22px; }
  .curve { position: relative; height: 48px; }
  .curve svg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; }
  .curve .line { fill: none; stroke: var(--wx-color); stroke-width: 2; stroke-linecap: round; stroke-dasharray: 100; vector-effect: non-scaling-stroke; }
  .curve .pts { position: absolute; inset: 0; }
  .pt { position: relative; }
  .pt i { position: absolute; left: 50%; top: var(--y); width: 5px; height: 5px; transform: translate(-50%, -50%); border-radius: 50%;
          background: var(--card-background-color, #fff); border: 1.6px solid var(--wx-color); }
  .pt span { position: absolute; left: 50%; top: calc(var(--y) - 7px); transform: translate(-50%, -100%); font-size: 11px; font-weight: 500;
             color: var(--primary-text-color); white-space: nowrap; }
  .enter .curve .line { animation: wx-draw 1.2s ease-out both; }
  .enter .curve .area { animation: wx-fade 1.2s ease-out both; }
  .pbar { width: 6px; height: 22px; border-radius: 3px; background: color-mix(in srgb, var(--secondary-text-color) 14%, transparent); display: flex; align-items: flex-end; overflow: hidden; }
  .pbar span { width: 100%; background: #42a5f5; border-radius: 3px; transform-origin: bottom; }
  .enter .pbar span { animation: wx-rise .6s ease-out both; }
  .pv { font-size: 10px; color: ${wxInk("#42a5f5", 60)}; min-height: 12px; font-variant-numeric: tabular-nums; }

  .wcol { flex: 1 1 ${WX_COL}px; min-width: ${WX_COL}px; display: flex; align-items: center; justify-content: center; gap: 2px; margin-top: 4px;
          font-size: 11px; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
  .wcol .arrow { display: inline-flex; }
  .wcol ha-icon { --mdc-icon-size: 12px; }
  .wcol.strong { color: ${wxInk("#26a69a", 60)}; font-weight: 600; }
  .daily { display: flex; flex-direction: column; gap: 4px; }
  .drow { display: grid; grid-template-columns: minmax(0, 84px) 24px 38px 30px 1fr 30px; align-items: center; gap: 8px; font-size: 13px; }
  .enter .drow, .enter .prow { animation: wx-slide .45s ease-out both; animation-delay: var(--d, 0s); }
  .drow .day { color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .drow ha-icon { --mdc-icon-size: 22px; }
  .drow .pp { font-size: 11px; color: ${wxInk("#42a5f5", 60)}; text-align: right; font-variant-numeric: tabular-nums; }
  .drow .lo { color: var(--secondary-text-color); text-align: right; font-variant-numeric: tabular-nums; }
  .drow .hi { color: var(--primary-text-color); font-weight: 500; font-variant-numeric: tabular-nums; }
  .range { position: relative; height: 6px; border-radius: 3px; background: var(--secondary-background-color, rgba(128,128,128,.15)); }
  .range .fill { position: absolute; top: 0; bottom: 0; border-radius: 3px; transform-origin: left; }
  .enter .range .fill { animation: wx-grow .7s ease-out both; animation-delay: calc(var(--d, 0s) + .1s); }
  .range .nowdot { position: absolute; top: 50%; width: 8px; height: 8px; margin: -5px 0 0 -5px; border-radius: 50%; background: var(--card-background-color, #fff);
                   border: 1px solid var(--primary-text-color); }

  .uvhead { display: flex; align-items: center; gap: 10px; }
  .uvval { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; font-size: 17px; font-weight: 500; flex: none;
           background: color-mix(in srgb, var(--k) 18%, transparent); color: ${wxInk("var(--k)")}; }
  .uvtxt { display: flex; flex-direction: column; font-size: 12px; color: var(--secondary-text-color); min-width: 0; }
  .uvtxt b { font-size: 14px; font-weight: 500; }
  .uvbar { position: relative; height: 6px; border-radius: 3px; margin: 2px 4px;
           background: linear-gradient(90deg, #43a047 0%, #43a047 18%, #fdd835 27%, #fdd835 45%, #fb8c00 55%, #fb8c00 64%, #e53935 73%, #e53935 91%, #8e24aa 100%); }
  .uvbar .mark { position: absolute; top: 50%; width: 12px; height: 12px; margin: -8px 0 0 -8px; border-radius: 50%; background: var(--card-background-color, #fff);
                 border: 2px solid var(--k); box-shadow: 0 1px 3px rgba(0,0,0,.3); }
  .enter .uvbar .mark { animation: wx-pop .6s ease-out both; }

  .aqbar { display: flex; align-items: center; gap: 3px; height: 10px; margin: 2px 4px; }
  .aqbar i { flex: 1; height: 6px; border-radius: 3px; opacity: .3; }
  .aqbar i.on { height: 10px; border-radius: 5px; opacity: 1; }
  .enter .aqbar i.on { animation: wx-pop .6s ease-out both; }
  .pollen { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 12px; }
  .prow { display: flex; align-items: center; gap: 6px; font-size: 13px; min-width: 0; }
  .prow ha-icon { --mdc-icon-size: 16px; color: var(--k); flex: none; }
  .pname { flex: 1; min-width: 0; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .dots { display: inline-flex; gap: 2px; flex: none; }
  .dots i { width: 6px; height: 6px; border-radius: 50%; background: color-mix(in srgb, var(--secondary-text-color) 22%, transparent); }
  .dots i.on { background: var(--k); }

  .sun svg { width: 100%; height: 64px; overflow: visible; }
  .sun .horizon { stroke: var(--divider-color, rgba(128,128,128,.25)); stroke-width: 1; }
  .sun .arc { fill: none; stroke: color-mix(in srgb, var(--secondary-text-color) 45%, transparent); stroke-width: 1.4; stroke-dasharray: 3 4; }
  .sun .done { fill: none; stroke: #ffb300; stroke-width: 2.4; stroke-linecap: round; }
  .sun .sundot { fill: #ffca28; stroke: #fff8e1; stroke-width: 1.5; }
  .sun .sunglow { fill: #ffca28; opacity: .3; transform-box: fill-box; transform-origin: center; animation: wx-breathe 3s ease-in-out infinite; }
  .suntimes { display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--secondary-text-color); margin-top: -4px; }
  .suntimes span { display: inline-flex; align-items: center; gap: 4px; }
  .suntimes ha-icon { --mdc-icon-size: 16px; color: #ffb300; }
  .suntimes .dl { font-size: 11px; }

  .sunextra { justify-content: center; margin-top: 6px; }
  .mtimes { display: flex; gap: 10px; margin-top: 2px; white-space: nowrap; }
  .mtimes > span { display: inline-flex; align-items: center; }
  .mtimes ha-icon { --mdc-icon-size: 14px; }
  .chip.trend.up ha-icon { color: #ef6c00; }
  .chip.trend.down ha-icon { color: #1e88e5; }
  .moonrow { display: flex; align-items: center; gap: 12px; }
  .mdisc { width: 48px; height: 48px; flex: none; }
  .mdisc svg { width: 100%; height: 100%; overflow: visible; }
  .mdisc .mglow { fill: #fff8e1; opacity: .12; transform-box: fill-box; transform-origin: center; animation: wx-breathe 6s ease-in-out infinite; }
  .mdisc .mdark { fill: color-mix(in srgb, var(--secondary-text-color) 22%, transparent); }
  .moonrow .uvtxt { flex: 1; }
  .moonrow .uvtxt b { color: var(--primary-text-color); }
  .mnexts { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
  .mnext { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--secondary-text-color); white-space: nowrap; }
  .mnext ha-icon { --mdc-icon-size: 14px; }
  .mnext b { font-weight: 500; color: var(--primary-text-color); }
  .windrose { display: grid; grid-template-columns: minmax(150px, 46%) 1fr; align-items: center; gap: 16px; cursor: pointer; }
  .rose { width: 100%; aspect-ratio: 1; max-width: 240px; overflow: visible; display: block; }
  .rose .ring { fill: none; stroke: var(--divider-color, rgba(128,128,128,.25)); stroke-width: 1; stroke-dasharray: 2 3; }
  .rose .axis { stroke: var(--divider-color, rgba(128,128,128,.25)); stroke-width: 1; }
  .rose .tick { stroke: var(--secondary-text-color); stroke-width: 1.2; stroke-linecap: round; opacity: .6; }
  .rose .hub { fill: var(--card-background-color, #fff); stroke: var(--divider-color, rgba(128,128,128,.25)); }
  .rose .petal { stroke: var(--card-background-color, #fff); stroke-width: 1; stroke-linejoin: round; transform-box: view-box; transform-origin: 110px 110px; }
  .enter .rose .petal { animation: wx-bloom .6s ease-out both; animation-delay: var(--d, 0s); }
  .rose text { fill: var(--secondary-text-color); text-anchor: middle; dominant-baseline: central; }
  .rose .cp { font-size: 14px; font-weight: 600; fill: var(--primary-text-color); }
  .rose .rl { font-size: 10px; paint-order: stroke; stroke: var(--card-background-color, #fff); stroke-width: 3px; stroke-linejoin: round; }
  .rose .wmark { color: var(--primary-text-color); }
  .rose .wmark path { fill: currentColor; transform-box: view-box; transform-origin: 110px 110px; animation: wx-sway 3.5s ease-in-out infinite; }
  .rose .wmark .wline { fill: none; stroke: currentColor; stroke-width: 1.5; stroke-dasharray: 3 3; opacity: .55; }
  .wtxt { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
  .wnowrow { display: flex; align-items: baseline; flex-wrap: wrap; gap: 4px 12px; }
  .wspeed { font-size: 32px; font-weight: 400; line-height: 1; color: var(--primary-text-color); white-space: nowrap; }
  .wspeed small { font-size: 14px; margin-left: 3px; color: var(--secondary-text-color); }
  .wdir { display: inline-flex; align-items: center; gap: 4px; font-size: 16px; color: var(--primary-text-color); }
  .wdir .arrow { display: inline-flex; color: var(--wx-color); transition: transform .6s; }
  .wdir ha-icon { --mdc-icon-size: 18px; }
  .wdir b { font-weight: 500; }
  .section-title .wper { margin-left: auto; text-transform: none; letter-spacing: 0; font-weight: 400; }
  .wunit { font-size: 11px; color: var(--secondary-text-color); margin-bottom: -4px; }
  .wlegend { display: grid; grid-template-columns: repeat(3, minmax(0, auto)); justify-content: start; gap: 4px 12px; font-size: 11px; color: var(--secondary-text-color); }
  .wlegend span { display: inline-flex; align-items: center; gap: 5px; white-space: nowrap; }
  .wlegend i { width: 10px; height: 10px; border-radius: 3px; flex: none; }
  @container (max-width: 340px) { .windrose { grid-template-columns: 1fr; justify-items: center; } .wtxt { width: 100%; } }
  @keyframes wx-bloom { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  @keyframes wx-sway { 0%, 100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
  ha-card.mini { gap: 8px; }
  .content { display: flex; align-items: center; gap: 12px; }
  ha-card.mini .scene { width: 88px; height: 70px; border-radius: 12px; }
  ha-card.mini .big .val { font-size: 24px; }
  .line { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--secondary-text-color); min-width: 0; }
  .line ha-icon { --mdc-icon-size: 14px; flex-shrink: 0; }
  .line span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  @keyframes wx-blink { 0%, 100% { opacity: 1; } 50% { opacity: .3; } }
  @keyframes wx-chip { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--k) 45%, transparent); } 50% { box-shadow: 0 0 0 4px color-mix(in srgb, var(--k) 0%, transparent); } }
  @keyframes wx-bob-icon { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(2px); } }
  @keyframes wx-rise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
  @keyframes wx-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
  @keyframes wx-draw { from { stroke-dashoffset: 100; } to { stroke-dashoffset: 0; } }
  @keyframes wx-fade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes wx-slide { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
  @keyframes wx-pop { 0% { transform: scale(0); } 70% { transform: scale(1.25); } 100% { transform: scale(1); } }
  /* animations: false stops everything but the busy refresh icon, the only sign that a refresh is under way. */
  ha-card.still *:not(.refresh > ha-icon), ha-card.still *::before { animation: none !important; }
  @media (prefers-reduced-motion: reduce) { ha-card * { animation: none !important; transition: none !important; } }
  /* Off-screen or in a hidden tab ([paused], set by the card), the animations stop where they are. */
  :host([paused]) ha-card *, :host([paused]) ha-card *::before { animation-play-state: paused !important; }
  @media (max-width: 420px) { .pollen { grid-template-columns: 1fr; } }

  /* Narrow cards (the content box of the card: a 6-column card in a Sections view is 156 to 246px wide, 9 columns 238 to 370px). */
  @container (max-width: 300px) {
    .hero { gap: 10px; }
    .scene { width: 88px; height: 70px; border-radius: 12px; }
    .pollen { grid-template-columns: 1fr; }
  }
  @container (max-width: 280px) {
    .drow { grid-template-columns: minmax(0, 1fr) 24px 38px 30px 30px; }
    .drow .range { display: none; }
  }
  /* A card of 200 px or less (its content box: 176 px): the pill shows its dot only, its text in its title. */
  @container (max-width: 176px) {
    .st { padding: 4px; }
    .st .stt { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
  }
  @container (max-width: 220px) {
    ha-card.mini .scene { width: 64px; height: 52px; border-radius: 10px; }
    .content { gap: 8px; }
  }
  @container (max-width: 190px) {
    .header { gap: 6px; }
    /* The rain in the next hour wraps rather than losing its time. */
    .line .rain-text { white-space: normal; }
    ha-card.mini .badge { display: none; }
    ha-card.mini .content > div:first-child, .hero > div:first-child { display: none; }
    /* Under the illustrated header the body has no scene: its first child is the temperature, which stays. */
    ha-card .hero > div.info, ha-card.mini .content > div.info { display: flex; }
  }
`;
