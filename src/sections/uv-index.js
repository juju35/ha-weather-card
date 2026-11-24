// ── UV index: a gauge with the current value, today's peak and the advice of its level ──
import { wxSectionTitle } from "./core.js";

export function wxSectionUv(card, m) {
  const u = m.uv;
  if (!u) return "";
  const lvl = u.level;
  const pos = Math.min(100, (u.v / 11) * 100);
  const peak = u.max != null && u.max > u.v ? card._t("uv_max", { v: wxFmtNum(m.fmt, u.max, 0) }) : "";
  return (
    `<div class="section s-uv">${wxSectionTitle(card, "uv")}` +
    `<div class="uvhead"${u.entity ? ` data-more="${wxEsc(u.entity)}" role="button" tabindex="0"` : ""}><span class="uvval" style="--k:${WX_UV[lvl].color}">${wxFmtNum(m.fmt, u.v, 0)}</span>` +
    `<div class="uvtxt"><b style="color:${wxInk(WX_UV[lvl].color)}">${wxEsc(card._t(`uv_${lvl}`))}</b><span>${wxEsc(card._t(`uv_advice_${lvl}`))}${peak ? ` · ${wxEsc(peak)}` : ""}</span></div></div>` +
    `<div class="uvbar"><span class="mark" style="left:${pos.toFixed(1)}%;--k:${WX_UV[lvl].color}"></span></div></div>`
  );
}
