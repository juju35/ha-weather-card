// ── Pollen: one row per species, the most present first ──
import { wxSectionTitle } from "./core.js";
import { wxIndexHead, wxLevelRows, wxTomorrowChip } from "./index-sections.js";

export function wxSectionPollen(card, m) {
  const p = m.pollen;
  if (!p) return "";
  const items = p.items.filter((x) => x.level >= 1).slice(0, 10);
  const main = items[0] ? card._t("pollen_main", { v: card._t(`p_${items[0].species}`).toLowerCase() }) : "";
  const sub = [card._t(`pollen_advice_${p.level}`), main].filter(Boolean).join(" · ");
  const rows = wxLevelRows(
    items.map((x) => ({
      entity: x.entity,
      level: x.level,
      icon: /grass|weed|ragweed|mugwort|plantain|sorrel|nettle/.test(x.species) ? "mdi:grass" : "mdi:tree-outline",
      name: card._t(`p_${x.species}`),
      title: `${card._t(`p_${x.species}`)} · ${card._t(`pl_${x.level}`)}`,
    })),
  );
  return (
    `<div class="section s-pollen">${wxSectionTitle(card, "pollen", wxTomorrowChip(card, p.tomorrow, "pl"))}${wxIndexHead(p.level, card._t(`pl_${p.level}`), sub, p.entity)}` +
    `${rows ? `<div class="pollen">${rows}</div>` : ""}</div>`
  );
}
