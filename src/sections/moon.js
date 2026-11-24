// ── Moon: today's phase drawn as it looks, its name and light, and the next full and new moons ──
import { wxSectionTitle } from "./core.js";

export function wxSectionMoon(card, m) {
  const mo = m.moon;
  if (!mo) return "";
  const date = (d) => d.toLocaleDateString(m.fmt, { weekday: "short", day: "numeric", month: "short", timeZone: m.tf.timeZone });
  const next = [
    ["next_full", mo.nextFull, "mdi:moon-full"],
    ["next_new", mo.nextNew, "mdi:moon-new"],
  ]
    .sort((a, b) => a[1] - b[1])
    .map(([k, d, icon]) => `<span class="mnext"><ha-icon icon="${icon}"></ha-icon><span>${wxEsc(card._t(k))}</span><b>${wxEsc(date(d))}</b></span>`)
    .join("");
  const svg =
    `<svg viewBox="0 0 48 48" aria-hidden="true"><defs><radialGradient id="wx-mf2" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fffde7"/>` +
    '<stop offset="1" stop-color="#ffe082"/></radialGradient></defs><circle class="mglow" cx="24" cy="24" r="23"/><circle class="mdark" cx="24" cy="24" r="17"/>' +
    `<g fill="url(#wx-mf2)">${wxMoonLit(24, 24, 17, mo.age, mo.flip)}</g></svg>`;
  return (
    `<div class="section s-moon">${wxSectionTitle(card, "moon")}<div class="moonrow"${mo.entity ? ` data-more="${wxEsc(mo.entity)}" role="button" tabindex="0"` : ""}>` +
    `<div class="mdisc">${svg}</div><div class="uvtxt"><b>${wxEsc(card._t(`mp_${mo.phase}`))}</b>` +
    `<span>${wxEsc(card._t("moon_lit", { v: Math.round(mo.light * 100), d: Math.floor(mo.age) + 1 }))}</span>${
      mo.times
        ? `<span class="mtimes"><span title="${wxEsc(card._t("moonrise"))}"><ha-icon icon="mdi:arrow-up-thin"></ha-icon>${wxEsc(mo.times.rise ? wxTime(m.fmt, mo.times.rise, false, m.tf) : "—")}</span>` +
          `<span title="${wxEsc(card._t("moonset"))}"><ha-icon icon="mdi:arrow-down-thin"></ha-icon>${wxEsc(mo.times.set ? wxTime(m.fmt, mo.times.set, false, m.tf) : "—")}</span></span>`
        : ""
    }</div>` +
    `<div class="mnexts">${next}</div></div></div>`
  );
}
