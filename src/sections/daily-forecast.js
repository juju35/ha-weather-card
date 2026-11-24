// ── Daily forecast: one row a day, with its temperature range against the whole week ──
import { wxSectionTitle, wxTempColor, wxToC } from "./core.js";

export function wxSectionDaily(card, m) {
  const days = m.daily;
  if (!days?.length) return "";
  const lows = days.map((d) => d.templow ?? d.temperature).filter((t) => t != null);
  const highs = days.map((d) => d.temperature).filter((t) => t != null);
  if (!highs.length) return "";
  const min = Math.min(...lows, ...(m.temp != null ? [m.temp] : []));
  const max = Math.max(...highs, ...(m.temp != null ? [m.temp] : []));
  const span = max - min || 1;
  const unit = m.tempUnit;
  const rows = days
    .map((d, i) => {
      const lo = d.templow ?? d.temperature;
      const hi = d.temperature;
      // A day without a high (or a low) gets no bar rather than one at NaN %.
      const bar = lo != null && hi != null;
      const left = bar ? ((lo - min) / span) * 100 : 0;
      const width = bar ? Math.max(4, ((hi - lo) / span) * 100) : 0;
      const grad = bar ? `linear-gradient(90deg, ${wxTempColor(wxToC(lo, unit))}, ${wxTempColor(wxToC(hi, unit))})` : "";
      const today = i === 0 && wxSameDay(d.datetime, new Date(), m.tf.timeZone);
      const now = today && m.temp != null ? `<span class="nowdot" style="left:${(((m.temp - min) / span) * 100).toFixed(1)}%"></span>` : "";
      const p = d.precipitation_probability;
      return (
        `<div class="drow" style="--d:${(i * 0.06).toFixed(2)}s"><span class="day">${wxEsc(today ? card._t("today") : wxDay(m.fmt, d.datetime, m.tf))}</span>` +
        `<ha-icon icon="${wxCondIcon(d.condition, false)}" style="color:${wxCondColor(d.condition, false)}"></ha-icon>` +
        `<span class="pp">${p ? `${wxFmtNum(m.fmt, p, 0)} %` : ""}</span>` +
        `<span class="lo">${wxFmtNum(m.fmt, lo, 0)}°</span>` +
        `<span class="range">${bar ? `<span class="fill" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%;background:${grad}"></span>` : ""}${now}</span>` +
        `<span class="hi">${wxFmtNum(m.fmt, hi, 0)}°</span></div>`
      );
    })
    .join("");
  return `<div class="section s-daily">${wxSectionTitle(card, "daily")}<div class="daily">${rows}</div></div>`;
}
