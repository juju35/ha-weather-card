// ── Shadow DOM patching ──
// A state update rewrites the markup in place instead of replacing it (innerHTML): the nodes kept keep their size,
// their running animations, their focus and hover, so the card's height does not move for a frame and the Sections
// view does not reflow (the page jumping by itself on every sensor update). Elements with a data-key are matched by
// it, the others by position; a node of another kind is replaced.
export const wxPatchAttrs = (cur, next, own = false) => {
  if (!own) for (const { name } of [...cur.attributes]) if (!next.hasAttribute(name)) cur.removeAttribute(name);
  for (const { name, value } of next.attributes) if (cur.getAttribute(name) !== value) cur.setAttribute(name, value);
};
export const wxKeyOf = (n) => (n.nodeType === 1 ? n.getAttribute("data-key") : null);
export const wxPatchChildren = (cur, next) => {
  const old = [...cur.childNodes];
  const fresh = [...next.childNodes];
  const byKey = new Map();
  for (const o of old) {
    const k = wxKeyOf(o);
    if (k !== null && !byKey.has(k)) byKey.set(k, o);
  }
  const used = new Set();
  fresh.forEach((n, i) => {
    const k = wxKeyOf(n);
    let o = k !== null ? byKey.get(k) : old[i];
    if (!o || o.nodeType !== n.nodeType || o.nodeName !== n.nodeName || used.has(o) || (k === null && wxKeyOf(o) !== null)) o = null;
    const ref = cur.childNodes[i] ?? null;
    if (!o) {
      cur.insertBefore(n, ref);
      return;
    }
    used.add(o);
    if (o !== ref) cur.insertBefore(o, ref);
    if (n.nodeType === 1) {
      // A custom element written empty (<ha-icon>) draws its own content and may set its own attributes: left to it,
      // only the attributes the markup gives are updated.
      const own = n.localName.includes("-") && !n.firstChild;
      wxPatchAttrs(o, n, own);
      if (!own) wxPatchChildren(o, n);
    } else if (o.nodeValue !== n.nodeValue) o.nodeValue = n.nodeValue;
  });
  while (cur.childNodes.length > fresh.length) cur.removeChild(cur.lastChild);
};
export function wxMorph(root, html) {
  if (typeof document === "undefined" || !document.createElement || !root.childNodes) {
    root.innerHTML = html;
    return;
  }
  const tpl = document.createElement("template");
  tpl.innerHTML = html;
  if (!tpl.content) {
    root.innerHTML = html;
    return;
  }
  wxPatchChildren(root, tpl.content);
}
// Writes only what changed: setting an attribute or a text to the value it has is still a DOM mutation.
export const wxSetAttr = (el, name, value) => {
  if (el && (!el.getAttribute || el.getAttribute(name) !== String(value))) el.setAttribute(name, value);
};
export const wxSetText = (el, text) => {
  if (el && el.textContent !== text) el.textContent = text;
};

export const wxUnavailable = (st) => !st || st.state === "unavailable" || st.state === "unknown";
export const wxNumber = (v) => (v == null || v === "" ? null : Number.isFinite(Number(v)) ? Number(v) : null);
export const wxNum = (st) => (wxUnavailable(st) ? null : wxNumber(st.state));
export const wxClamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Lower case, accents dropped, separators as "_": the form entity ids, states and attribute names are matched in.
export const wxNorm = (v) =>
  String(v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "_");

export function wxFmtNum(lang, v, digits = 1) {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toLocaleString(lang, { maximumFractionDigits: digits, useGrouping: false });
}

// Pressures and precipitation in the units the card's scales are written in (hPa, mm), from the unit their source
// speaks; an unknown unit is taken as already in hPa / mm.
export const WX_HPA = { hpa: 1, mbar: 1, mb: 1, pa: 0.01, kpa: 10, cbar: 10, bar: 1000, inhg: 33.8639, mmhg: 1.33322, psi: 68.9476 };
export const wxToHpa = (v, unit) => v * (WX_HPA[String(unit || "").toLowerCase()] ?? 1);
export const WX_MM = { mm: 1, cm: 10, in: 25.4, inch: 25.4, inches: 25.4 };
export const wxToMm = (v, unit) => v * (WX_MM[String(unit || "").toLowerCase()] ?? 1);

// The clock of Home Assistant's profile: its 12/24 h choice (time_format "12" / "24"; "system" asks the browser,
// "language" leaves it to the language) and, with time_zone "server", the server's time zone.
export function wxTimeOpts(hass) {
  const o = {};
  const loc = hass?.locale || {};
  // hourCycle rather than hour12: hour12 false gives "24:05" after midnight in some browsers.
  let fmt = loc.time_format;
  if (fmt === "system") {
    try {
      fmt = /h1[12]/.test(new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions().hourCycle || "") ? "12" : "24";
    } catch {}
  }
  if (fmt === "12") o.hourCycle = "h12";
  else if (fmt === "24") o.hourCycle = "h23";
  const tz = hass?.config?.time_zone;
  if (loc.time_zone === "server" && tz) {
    try {
      new Intl.DateTimeFormat("en", { timeZone: tz });
      o.timeZone = tz;
    } catch {}
  }
  return o;
}

// "14:30" / "2:30 PM" in the Home Assistant time format (`tf` from wxTimeOpts); `hour` alone gives "14 h" / "2 PM".
export function wxTime(lang, date, hourOnly = false, tf = {}) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  if (hourOnly && /^fr\b/i.test(lang) && tf.hourCycle !== "h12") {
    const h = new Intl.DateTimeFormat("fr", { hour: "numeric", hourCycle: "h23", timeZone: tf.timeZone }).formatToParts(d).find((p) => p.type === "hour");
    return `${Number(h?.value ?? d.getHours())} h`;
  }
  return d.toLocaleTimeString(lang, { ...(hourOnly ? { hour: "numeric" } : { hour: "2-digit", minute: "2-digit" }), ...tf });
}

export const wxDay = (lang, date, tf = {}) => {
  const d = new Date(date);
  const s = d.toLocaleDateString(lang, { weekday: "short", timeZone: tf.timeZone }).replace(/\.$/, "");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Calendar day in `tz` (the server time zone of wxTimeOpts; undefined: the browser's), so that "today" and the
// day's midnight follow the same clock as the times shown.
export const WX_DAY_FMT = new Map();
export function wxDayParts(date, tz) {
  let f = WX_DAY_FMT.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
    WX_DAY_FMT.set(tz, f);
  }
  const p = {};
  for (const x of f.formatToParts(date)) p[x.type] = x.value;
  return p;
}
// null for a missing or invalid date (formatToParts would throw), which then matches no day.
export const wxDayKey = (date, tz) => {
  const d = new Date(date ?? Number.NaN);
  if (Number.isNaN(d.getTime())) return null;
  const p = wxDayParts(d, tz);
  return `${p.year}-${p.month}-${p.day}`;
};
export const wxSameDay = (a, b, tz) => {
  const k = wxDayKey(a, tz);
  return k !== null && k === wxDayKey(b, tz);
};
// Midnight starting the day of `date` in `tz`, corrected once for a daylight saving change during the night.
export function wxDayStart(date, tz) {
  const d = new Date(date ?? Number.NaN);
  if (Number.isNaN(d.getTime())) return d;
  const mins = (t) => {
    const p = wxDayParts(new Date(t), tz);
    return Number(p.hour) * 60 + Number(p.minute);
  };
  let t = d.getTime() - d.getSeconds() * 1000 - d.getMilliseconds();
  t -= mins(t) * 60000;
  // Now within an hour of midnight: 23:00 (the day before) moves forward, 01:00 back.
  const m = mins(t);
  t -= (m > 720 ? m - 1440 : m) * 60000;
  return new Date(t);
}
