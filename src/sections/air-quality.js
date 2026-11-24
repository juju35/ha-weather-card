// ── Air quality: the index with its advice, then each pollutant on the six levels of the index ──
import { wxSectionTitle } from "./core.js";
import { WX_POL_SHORT, wxIndexHead, wxLevelRows, wxTomorrowChip } from "./index-sections.js";

export function wxSectionAir(card, m) {
  const a = m.air;
  if (!a) return "";
  const rows = wxLevelRows(
    [...a.pollutants]
      .sort((x, y) => y.level - x.level)
      .map((p) => ({
        entity: p.entity,
        level: p.level,
        icon: p.key.startsWith("pm") ? "mdi:blur" : "mdi:molecule",
        name: WX_POL_SHORT[p.key],
        title: `${card._t(`pol_${p.key}`)} · ${card._t(`aq_${p.level}`)}${p.value ? ` · ${p.value}` : ""}`,
      })),
  );
  const sub = [card._t(`aq_advice_${a.level}`), a.zone].filter(Boolean).join(" · ");
  return (
    `<div class="section s-air">${wxSectionTitle(card, "air", wxTomorrowChip(card, a.tomorrow, "aq"))}${wxIndexHead(a.level, card._t(`aq_${a.level}`), sub, a.entity)}` +
    `${rows ? `<div class="pollen">${rows}</div>` : ""}</div>`
  );
}
