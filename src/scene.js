/*
 * The animated sky of the cards: a scene drawn for each weather condition, by day and by night.
 * The sun's rays turn and its glow breathes, the moon shines among twinkling stars, clouds drift, rain and hail fall
 * (harder when it pours), snow flutters down, lightning flashes, fog rolls and the wind blows in gusts.
 * `animations: false` or the system's reduced motion setting keeps the scene still.
 */

// A cloud, 49 × 28 at scale 1 (x 3–52, y 4–32 before the transform); `tone` picks its gradient.
const wxCloud = (x, y, s, tone = "l", cls = "") =>
  `<g transform="translate(${x} ${y}) scale(${s})"><g class="cloud ${cls}" fill="url(#wx-c${tone})">` +
  '<circle cx="13" cy="23" r="9"/><circle cx="27" cy="16" r="12"/><circle cx="41" cy="22" r="10"/><rect x="13" y="22" width="28" height="10"/>' +
  "</g></g>";

const wxSun = (cx, cy, r) =>
  `<g transform="translate(${cx} ${cy})"><circle class="glow" r="${(r * 1.9).toFixed(1)}" fill="url(#wx-glow)"/>` +
  `<g class="rays">${Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4;
    const p = (k) => `${(r * k * Math.cos(a)).toFixed(2)} ${(r * k * Math.sin(a)).toFixed(2)}`;
    return `<path d="M${p(1.32)}L${p(1.68)}"/>`;
  }).join("")}</g><circle class="disc" r="${r}" fill="url(#wx-sun)"/></g>`;

// ── Moon ──
// The moon's age in days since the last new moon, from a reference new moon (6 Jan 2000, 18:14 UTC) and the mean
// synodic month: within a few hours of the true phase, enough to draw it and name it.
const WX_SYNODIC = 29.530588853;
const WX_NEW_MOON_REF = Date.UTC(2000, 0, 6, 18, 14);
function wxMoonAge(date = new Date()) {
  const days = (new Date(date).getTime() - WX_NEW_MOON_REF) / 864e5;
  return ((days % WX_SYNODIC) + WX_SYNODIC) % WX_SYNODIC;
}
const WX_MOON_PHASES = ["new_moon", "waxing_crescent", "first_quarter", "waxing_gibbous", "full_moon", "waning_gibbous", "last_quarter", "waning_crescent"];
// The Moon integration's bins, on its 0–28 scale: new, quarters and full last about a day, the others the days between.
const WX_MOON_BINS = [0.5, 6.5, 7.5, 13.5, 14.5, 20.5, 21.5, 27.5];
function wxMoonPhase(age) {
  const d = (age / WX_SYNODIC) * 28;
  const i = WX_MOON_BINS.findIndex((b) => d < b);
  return i < 0 ? "new_moon" : WX_MOON_PHASES[i];
}
const wxMoonLight = (age) => (1 - Math.cos((2 * Math.PI * age) / WX_SYNODIC)) / 2;

// The lit part of the moon at `age`: a half disc on the lit side closed by the terminator, an ellipse whose width
// follows the phase. Northern hemisphere: lit on the right while waxing; `flip` mirrors it for the southern one.
function wxMoonLit(cx, cy, r, age, flip = false) {
  const p = age / WX_SYNODIC;
  const k = Math.cos(2 * Math.PI * p);
  const rx = Math.abs(k * r).toFixed(2);
  const waxing = p < 0.5;
  const outer = waxing ? 1 : 0;
  const term = waxing === k > 0 ? 0 : 1;
  const d = `M${cx} ${cy - r}A${r} ${r} 0 0 ${outer} ${cx} ${cy + r}A${rx} ${r} 0 0 ${term} ${cx} ${cy - r}Z`;
  return `<path d="${d}"${flip ? ` transform="translate(${2 * cx} 0) scale(-1 1)"` : ""}/>`;
}

const wxMoon = (cx, cy, r, moon = {}) => {
  const age = moon.age ?? wxMoonAge();
  return (
    `<g class="moon"><circle class="halo" cx="${cx}" cy="${cy}" r="${(r * 1.7).toFixed(1)}" fill="url(#wx-mglow)" opacity="${(0.25 + 0.75 * wxMoonLight(age)).toFixed(2)}"/>` +
    `<circle class="earthshine" cx="${cx}" cy="${cy}" r="${r}"/>` +
    `<g fill="url(#wx-moonf)">${wxMoonLit(cx, cy, r, age, moon.flip)}</g></g>`
  );
};

const WX_STAR_POS = [
  [16, 16, 1],
  [78, 12, 0.8],
  [86, 34, 1.1],
  [24, 44, 0.7],
  [70, 50, 0.9],
  [10, 30, 0.6],
];
const wxStars = (n = 6) =>
  `<g class="stars">${WX_STAR_POS.slice(0, n)
    .map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M0 -3L.8 -.8L3 0L.8 .8L0 3L-.8 .8L-3 0L-.8 -.8Z"/></g>`)
    .join("")}</g>`;

// Rain, snow and hail fall from y0, spread over the given x positions.
const wxDrops = (xs, y0, cls) => `<g class="${cls}">${xs.map((x) => `<path d="M${x} ${y0}l-1.6 6"/>`).join("")}</g>`;
const wxFlakes = (xs, y0) => `<g class="snow">${xs.map((x, i) => `<circle cx="${x}" cy="${y0 + (i % 2) * 3}" r="${i % 3 ? 1.8 : 2.2}"/>`).join("")}</g>`;
const wxHail = (xs, y0) => `<g class="hail">${xs.map((x, i) => `<circle cx="${x}" cy="${y0 + (i % 2) * 2}" r="1.9"/>`).join("")}</g>`;

const WX_BOLT = '<g class="bolt"><path d="M53 40L44 56H51L46 70L61 51H54L58 40Z" fill="url(#wx-bolt)" stroke="#f57f17" stroke-width=".6" stroke-linejoin="round"/></g>';
const WX_FLASH = '<ellipse class="flash" cx="50" cy="30" rx="34" ry="20" fill="#fffde7"/>';

const wxFog = (ys) =>
  `<g class="fog">${ys.map((y, i) => `<path d="M${16 + (i % 2) * 6} ${y}H${82 - (i % 2) * 8}"/>`).join("")}</g>`;

const WX_WIND =
  '<g class="wind">' +
  '<path d="M8 34H58C66 34 70 28 66 23C62 18 55 21 56 26"/>' +
  '<path d="M14 46H76C84 46 88 52 84 57C80 62 73 59 74 54"/>' +
  '<path d="M4 58H44"/>' +
  "</g>";

const WX_EXCEPTIONAL =
  '<g class="warn"><path d="M50 14L80 66H20Z" fill="url(#wx-warn)" stroke="#b71c1c" stroke-width="1.5" stroke-linejoin="round"/>' +
  '<path d="M50 32V50" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="50" cy="58" r="3" fill="#fff"/></g>';

const WX_DEFS =
  "<defs>" +
  '<radialGradient id="wx-sun" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#fffde7"/><stop offset=".45" stop-color="#ffd54f"/><stop offset="1" stop-color="#ffa000"/></radialGradient>' +
  '<radialGradient id="wx-glow"><stop offset=".45" stop-color="#ffca28" stop-opacity=".45"/><stop offset="1" stop-color="#ffca28" stop-opacity="0"/></radialGradient>' +
  '<radialGradient id="wx-mglow"><stop offset=".5" stop-color="#fff9c4" stop-opacity=".35"/><stop offset="1" stop-color="#fff9c4" stop-opacity="0"/></radialGradient>' +
  '<linearGradient id="wx-moonf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fffde7"/><stop offset="1" stop-color="#ffe082"/></linearGradient>' +
  '<linearGradient id="wx-cl" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="32"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d3dbe4"/></linearGradient>' +
  '<linearGradient id="wx-cb" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="32"><stop offset="0" stop-color="#e6ebf0"/><stop offset="1" stop-color="#b2bfcc"/></linearGradient>' +
  '<linearGradient id="wx-cd" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="32"><stop offset="0" stop-color="#a9b4c0"/><stop offset="1" stop-color="#5c6875"/></linearGradient>' +
  // Night clouds: blue-grey, lit from above by the moon.
  '<linearGradient id="wx-cn" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="32"><stop offset="0" stop-color="#dfe3f3"/><stop offset="1" stop-color="#8e99bd"/></linearGradient>' +
  '<linearGradient id="wx-cm" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="32"><stop offset="0" stop-color="#b3bbd6"/><stop offset="1" stop-color="#5f6a8c"/></linearGradient>' +
  '<linearGradient id="wx-ck" gradientUnits="userSpaceOnUse" x1="0" y1="4" x2="0" y2="32"><stop offset="0" stop-color="#7c86a6"/><stop offset="1" stop-color="#363e57"/></linearGradient>' +
  '<linearGradient id="wx-bolt" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff59d"/><stop offset="1" stop-color="#ffb300"/></linearGradient>' +
  '<linearGradient id="wx-warn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ef5350"/><stop offset="1" stop-color="#c62828"/></linearGradient>' +
  "</defs>";

// The pieces of each condition's scene; `night` swaps the sun for the moon and adds the stars.
const WX_RAIN_X = [30, 40, 50, 60, 70, 35, 55, 65];
const WX_POUR_X = [28, 34, 40, 46, 52, 58, 64, 70, 76, 31, 43, 55, 67];
// `moon`: { age, flip } of the night scenes' moon, today's phase by default.
// At night every scene keeps the moon, in today's phase, peeking above its clouds, and the clouds take night tones.
const WX_NIGHT_TONES = { l: "n", b: "m", d: "k" };
function wxSceneSvg(cond, night, moon = {}) {
  const body = night ? wxStars() + wxMoon(50, 38, 15, moon) : wxSun(50, 40, 16);
  const smallBody = night ? wxStars(4) + wxMoon(36, 28, 11, moon) : wxSun(36, 28, 12);
  const tone = (t) => (night ? WX_NIGHT_TONES[t] : t);
  // The moon behind the top cloud: its upper half shows above the cloud's left lobe.
  const peek = night ? wxStars(3) + wxMoon(31, 15, 10, moon) : "";
  const top = (t, cls) => peek + wxCloud(22, 8, 1.05, tone(t), cls);
  const parts = {
    sunny: body,
    "clear-night": wxStars() + wxMoon(50, 38, 15, moon),
    partlycloudy: smallBody + wxCloud(30, 30, 1.05, tone("l"), "front"),
    cloudy: (night ? wxStars(3) + wxMoon(66, 20, 11, moon) : "") + wxCloud(10, 14, 0.85, tone("b"), "back") + wxCloud(30, 30, 1.05, tone("l"), "front"),
    fog: (night ? wxMoon(30, 14, 10, moon) : "") + wxCloud(22, 6, 1, tone("b"), "back") + wxFog([48, 56, 64, 72]),
    rainy: top("b") + wxDrops(WX_RAIN_X.slice(0, 6), 46, "rain"),
    pouring: top("d") + wxDrops(WX_POUR_X, 45, "rain heavy"),
    lightning: WX_FLASH + top("d") + WX_BOLT,
    "lightning-rainy": WX_FLASH + top("d") + wxDrops([30, 38, 64, 70, 34, 67], 46, "rain") + WX_BOLT,
    snowy: top("l") + wxFlakes([30, 40, 50, 60, 70, 35, 55, 65], 46),
    "snowy-rainy": top("b") + wxDrops([32, 48, 64], 46, "rain") + wxFlakes([40, 56, 72, 36, 60], 46),
    hail: top("d") + wxHail([32, 42, 52, 62, 70, 37, 57], 46),
    windy: (night ? wxStars(3) + wxMoon(76, 14, 9, moon) : "") + WX_WIND,
    "windy-variant": (night ? wxMoon(26, 14, 9, moon) : "") + wxCloud(30, 4, 0.95, tone("b"), "back") + WX_WIND,
    exceptional: WX_EXCEPTIONAL,
  };
  return `<svg viewBox="0 0 100 80" aria-hidden="true">${WX_DEFS}${parts[cond] ?? wxCloud(22, 20, 1.05, tone("b"), "front")}</svg>`;
}

// The scene in its frame; `still` turns the animations off.
function wxScene(cond, night, still, moon) {
  const cls = ["scene", `c-${wxEsc(cond || "unknown")}`, night ? "night" : "day", still ? "still" : ""].filter(Boolean).join(" ");
  return `<div class="${cls}">${wxSceneSvg(cond, night, moon)}</div>`;
}

const WX_SCENE_STYLES = `
  .scene { position: relative; flex-shrink: 0; width: 120px; height: 96px; border-radius: 16px;
           background: radial-gradient(circle at 50% 45%, color-mix(in srgb, var(--wx-color) 22%, transparent), transparent 70%); }
  .scene.night { background: radial-gradient(circle at 50% 40%, color-mix(in srgb, #3949ab 34%, transparent), transparent 72%); }
  .scene svg { width: 100%; height: 100%; overflow: visible; filter: drop-shadow(0 3px 5px rgba(0,0,0,.16)); }
  .scene .rays { stroke: #ffb300; stroke-width: 2.6; stroke-linecap: round; transform-box: fill-box; transform-origin: center;
                 animation: wx-spin 30s linear infinite; }
  .scene .glow { transform-box: fill-box; transform-origin: center; animation: wx-breathe 4s ease-in-out infinite; }
  .scene .halo { transform-box: fill-box; transform-origin: center; animation: wx-breathe 6s ease-in-out infinite; }
  .scene .moon { animation: wx-bob 8s ease-in-out infinite; }
  .scene .earthshine { fill: #b0bec5; opacity: .18; }
  .scene .stars path { fill: #fff8e1; transform-box: fill-box; transform-origin: center; animation: wx-twinkle 3s ease-in-out infinite; }
  .scene .stars g:nth-child(2n) path { animation-delay: -1.1s; animation-duration: 2.4s; }
  .scene .stars g:nth-child(3n) path { animation-delay: -2s; animation-duration: 3.6s; }
  .scene .cloud { animation: wx-drift 9s ease-in-out infinite; }
  .scene .cloud.back { animation-duration: 13s; animation-direction: reverse; opacity: .92; }
  .scene .rain path { stroke: #42a5f5; stroke-width: 1.8; stroke-linecap: round; opacity: 0; animation: wx-fall 1.1s linear infinite; }
  .scene .rain.heavy path { stroke: #1e88e5; stroke-width: 2; animation-duration: .65s; }
  .scene .rain path:nth-child(2n) { animation-delay: -.35s; }
  .scene .rain path:nth-child(3n) { animation-delay: -.7s; }
  .scene .rain path:nth-child(5n) { animation-delay: -.2s; }
  .scene .snow circle { fill: #fff; stroke: #4fc3f7; stroke-width: .8; opacity: 0; animation: wx-snow 3.4s linear infinite; }
  .scene .snow circle:nth-child(2n) { animation-delay: -1.2s; animation-duration: 4s; }
  .scene .snow circle:nth-child(3n) { animation-delay: -2.4s; }
  .scene .hail circle { fill: #e0f7fa; stroke: #4dd0e1; stroke-width: .7; opacity: 0; animation: wx-hail 1.2s cubic-bezier(.5,0,1,1) infinite; }
  .scene .hail circle:nth-child(2n) { animation-delay: -.4s; }
  .scene .hail circle:nth-child(3n) { animation-delay: -.8s; }
  .scene .bolt { opacity: 0; animation: wx-flash 4.2s linear infinite; }
  .scene .flash { opacity: 0; animation: wx-flash-sky 4.2s linear infinite; }
  .scene .fog path { stroke: #b0bec5; stroke-width: 3.4; stroke-linecap: round; animation: wx-fog 6s ease-in-out infinite; }
  .scene .fog path:nth-child(2n) { animation-direction: reverse; animation-duration: 7.5s; }
  .scene .wind path { fill: none; stroke: #4db6ac; stroke-width: 2.4; stroke-linecap: round; stroke-dasharray: 60 140;
                      animation: wx-gust 2.6s ease-in-out infinite; }
  .scene .wind path:nth-child(2) { animation-delay: -.9s; }
  .scene .wind path:nth-child(3) { animation-delay: -1.7s; stroke-dasharray: 26 140; }
  .scene .warn { transform-box: fill-box; transform-origin: center; animation: wx-pulse 1.6s ease-in-out infinite; }
  @keyframes wx-spin { to { transform: rotate(360deg); } }
  @keyframes wx-breathe { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(.86); opacity: .75; } }
  @keyframes wx-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-1.5px); } }
  @keyframes wx-twinkle { 0%, 100% { opacity: .25; transform: scale(.6); } 50% { opacity: 1; transform: scale(1.1); } }
  @keyframes wx-drift { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(3.5px); } }
  @keyframes wx-fall { 0% { opacity: 0; transform: translate(0, -4px); } 15% { opacity: 1; } 85% { opacity: .9; } 100% { opacity: 0; transform: translate(-4px, 22px); } }
  @keyframes wx-snow { 0% { opacity: 0; transform: translate(0, -3px); } 15% { opacity: 1; } 50% { transform: translate(2.5px, 10px); }
                       85% { opacity: .9; } 100% { opacity: 0; transform: translate(-1.5px, 24px); } }
  @keyframes wx-hail { 0% { opacity: 0; transform: translateY(-4px); } 15% { opacity: 1; } 70% { transform: translateY(22px); }
                       82% { transform: translateY(18px); } 92% { opacity: .9; transform: translateY(22px); } 100% { opacity: 0; transform: translateY(22px); } }
  @keyframes wx-flash { 0%, 70%, 100% { opacity: 0; } 72% { opacity: 1; } 75% { opacity: .2; } 78%, 84% { opacity: 1; } 88% { opacity: 0; } }
  @keyframes wx-flash-sky { 0%, 70%, 100% { opacity: 0; } 72% { opacity: .55; } 75% { opacity: 0; } 78% { opacity: .4; } 84% { opacity: 0; } }
  @keyframes wx-fog { 0%, 100% { transform: translateX(-4px); opacity: .7; } 50% { transform: translateX(5px); opacity: 1; } }
  @keyframes wx-gust { 0% { stroke-dashoffset: 120; opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { stroke-dashoffset: -80; opacity: 0; } }
  @keyframes wx-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(.92); } }
  .scene.still *, .scene.still { animation: none !important; }
  .scene.still .rain path, .scene.still .snow circle, .scene.still .hail circle { opacity: 1; transform: translateY(6px); }
  .scene.still .bolt { opacity: 1; }
  @media (prefers-reduced-motion: reduce) {
    .scene * { animation: none !important; }
    .scene .rain path, .scene .snow circle, .scene .hail circle { opacity: 1; transform: translateY(6px); }
    .scene .bolt { opacity: 1; }
  }
`;
