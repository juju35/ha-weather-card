// ── Alerts: weather warnings, drought restrictions, lightning nearby, storms in the forecast ──
// "strikes_one" where the language's plural rule says "one" (1, and 21, 31… in Serbian), else "strikes".
import { wxChip, wxSectionTitle } from "./core.js";
import { WX_LEVEL_COLORS } from "./index-sections.js";

export const wxStrikes = (card, n) => {
  const shown = Math.round(n);
  let one = shown === 1;
  try {
    one = new Intl.PluralRules(card._lang()).select(shown) === "one";
  } catch {}
  return card._t(one ? "strikes_one" : "strikes", { n: wxFmtNum(card._fmtLang(), shown, 0) });
};

export function wxAlertChips(card, m, { onlyActive = false } = {}) {
  const out = [];
  const al = m.alerts;
  if (al) {
    const active = al.phenomena.filter((p) => p.level >= 2).sort((a, b) => b.level - a.level);
    for (const p of active) {
      out.push(
        wxChip(p.icon, card._t("ph_level", { p: card._t(`ph_${p.key}`), l: card._t(`lvlw_${p.level}`) }), {
          color: WX_ALERT_COLORS[p.level],
          cls: `tint lvl${p.level}${p.level >= 3 ? " pulse" : ""}`,
          more: al.entity,
          title: `${card._t(`ph_title_${p.key}`)} · ${card._t("vigilance_level", { v: card._t(`lvl_${p.level}`) })}`,
        }),
      );
    }
    // No "no warning" chip while the warning banner (warning_entities) shows one.
    if (!active.length && !onlyActive && !m.warnings?.length) out.push(wxChip("mdi:shield-check-outline", card._t("no_alert"), { color: WX_ALERT_COLORS[1], cls: "tint", more: al.entity }));
  }
  const vg = m.vigieau;
  if (vg && (vg.level >= 1 || !onlyActive)) {
    out.push(
      wxChip(vg.level >= 1 ? "mdi:water-alert-outline" : "mdi:water-check-outline", vg.level ? card._t("drought", { v: card._t(`vg_${vg.level}`) }) : card._t("vg_0"), {
        color: WX_VG_COLORS[vg.level],
        cls: `tint${vg.level >= 3 ? " pulse" : ""}`,
        more: vg.entity,
      }),
    );
  }
  const lt = m.lightning;
  if (lt?.count > 0) {
    const d = lt.dist != null ? `${wxFmtNum(m.fmt, lt.dist, 0)} ${lt.unit}` : "";
    out.push(
      wxChip("mdi:flash", card._t(d ? "lightning_n" : "lightning_count", { d, s: wxStrikes(card, lt.count) }), {
        color: WX_BOLT_COLOR,
        cls: "tint pulse bolt",
        more: lt.entity,
      }),
    );
  }
  if (m.air?.level >= 4) {
    out.push(
      wxChip("mdi:air-filter", card._t("air_chip", { v: card._t(`aq_${m.air.level}`).toLowerCase() }), {
        color: WX_AQ_COLORS[m.air.level],
        cls: "tint pulse",
        more: m.air.entity,
      }),
    );
  }
  if (m.pollen?.level >= 4) {
    out.push(
      wxChip("mdi:flower-pollen", card._t("pollen_chip", { v: card._t(`pl_${m.pollen.level}`).toLowerCase() }), {
        color: WX_LEVEL_COLORS[m.pollen.level],
        cls: "tint pulse",
        more: m.pollen.entity,
      }),
    );
  }
  if (m.air?.tomorrow >= 4 && m.air.level < 4) {
    out.push(wxChip("mdi:calendar-alert", card._t("air_tomorrow", { v: card._t(`aq_${m.air.tomorrow}`).toLowerCase() }), { color: WX_AQ_COLORS[m.air.tomorrow], cls: "tint" }));
  }
  if (m.pollen?.tomorrow >= 4 && m.pollen.level < 4) {
    out.push(
      wxChip("mdi:calendar-alert", card._t("pollen_tomorrow", { v: card._t(`pl_${m.pollen.tomorrow}`).toLowerCase() }), {
        color: WX_LEVEL_COLORS[m.pollen.tomorrow],
        cls: "tint",
      }),
    );
  }
  if (m.storm) out.push(wxChip("mdi:weather-lightning", card._t("storm_at", { t: m.storm }), { color: WX_BOLT_COLOR, cls: "tint" }));
  return out;
}

export function wxSectionAlerts(card, m) {
  const chips = wxAlertChips(card, m);
  if (!chips.length) return "";
  const restrictions = m.vigieau?.restrictions?.length
    ? `<ul class="restrictions">${m.vigieau.restrictions
        .slice(0, 4)
        .map((r) => `<li><b>${wxEsc(r.usage)}</b>${r.text ? ` · ${wxEsc(r.text)}` : ""}</li>`)
        .join("")}</ul>`
    : "";
  return `<div class="section s-alerts">${wxSectionTitle(card, "alerts")}<div class="chips">${chips.join("")}</div>${restrictions}</div>`;
}
