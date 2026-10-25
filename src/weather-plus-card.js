/*
 * weather-plus-card and its mini card: the weather now in an animated scene, then the sections of `sections`
 * (alerts, rain in the next hour, hourly and daily forecasts, UV, pollen, sun), each from the integration that has it.
 */

// AQI colour: the European / Atmo 1–6 scale, or the US 0–500 one.
function wxAqiColor(v) {
  const eu = ["#43a047", "#43a047", "#9ccc65", "#fdd835", "#fb8c00", "#e53935", "#8e24aa"];
  if (v <= 6) return eu[Math.max(0, Math.round(v))];
  return v <= 50 ? "#43a047" : v <= 100 ? "#fdd835" : v <= 150 ? "#fb8c00" : v <= 200 ? "#e53935" : "#8e24aa";
}

const WX_FC_DAILY = 1;
const WX_FC_HOURLY = 2;
const WX_FC_TWICE = 4;

// A twice-daily forecast folded into days: the day's high, the night's low, the daytime condition.
function wxFoldTwiceDaily(list) {
  const days = [];
  for (const f of list || []) {
    const d = new Date(f.datetime);
    let day = days.find((x) => wxSameDay(new Date(x.datetime), d));
    if (!day) {
      day = { ...f, templow: f.templow ?? f.temperature };
      days.push(day);
    }
    if (f.is_daytime !== false) {
      day.condition = f.condition;
      day.temperature = Math.max(day.temperature ?? -Infinity, f.temperature ?? -Infinity);
    }
    const lo = f.templow ?? f.temperature;
    if (lo != null) day.templow = Math.min(day.templow ?? Infinity, lo);
    day.precipitation_probability = Math.max(day.precipitation_probability ?? 0, f.precipitation_probability ?? 0) || day.precipitation_probability;
  }
  return days;
}

class WeatherPlusCard extends WxElement {
  static get defaults() {
    return WX_DEFAULTS;
  }

  static getConfigElement() {
    // biome-ignore lint/complexity/noThisInStatic: each card class has its own tag, set by wxRegister
    return document.createElement(`${this.tag}-editor`);
  }

  static getStubConfig(hass) {
    const id = wxFindWeather(hass);
    return id ? { entity: id } : {};
  }

  setConfig(config) {
    if (!config) throw new Error("Invalid configuration");
    if (config.sections != null && !Array.isArray(config.sections)) throw new Error("sections must be a list");
    this._config = { ...this.constructor.defaults, ...config };
    if (!this.shadowRoot) {
      this.attachShadow({ mode: "open" });
      this.shadowRoot.addEventListener("click", (ev) => this._onClick(ev));
      this.shadowRoot.addEventListener("keydown", (ev) => {
        if ((ev.key === "Enter" || ev.key === " ") && ev.target?.dataset?.more) {
          ev.preventDefault();
          this._onClick(ev);
        }
      });
    }
    this._sig = null;
    this._ent = null;
    this._update();
  }

  set hass(hass) {
    const prev = this._hass;
    this._hass = hass;
    // The detected entities only change with the registry or the set of states.
    if (!prev || prev.entities !== hass.entities || Object.keys(prev.states).length !== Object.keys(hass.states).length) this._ent = null;
    this._subscribe();
    this._update();
  }

  get hass() {
    return this._hass;
  }

  connectedCallback() {
    this._subscribe();
    // The sun's course, the "in N min" of the rain and the current hour move with the clock.
    this._tick = setInterval(() => this._update(), 60000);
  }

  disconnectedCallback() {
    clearInterval(this._tick);
    this._unsubscribe();
  }

  getCardSize() {
    return 3 + 2 * (this._config?.sections?.length || 0);
  }

  _compact() {
    return false;
  }

  _zoomButton() {
    return "";
  }

  _weatherId() {
    return this._config.entity || wxFindWeather(this._hass);
  }

  _entities() {
    if (!this._ent || this._ent.weather !== this._weatherId()) this._ent = wxResolve(this._hass, this._weatherId(), this._config.entities);
    return this._ent;
  }

  // ── Forecasts (weather/subscribe_forecast; the legacy `forecast` attribute otherwise) ──
  _subscribe() {
    const hass = this._hass;
    const id = this._config && hass ? this._weatherId() : null;
    const st = id && hass.states[id];
    if (!st || !hass.connection?.subscribeMessage || this.isConnected === false) return;
    const f = st.attributes.supported_features || 0;
    const key = `${id}:${f}`;
    if (this._subKey === key) return;
    this._unsubscribe();
    this._subKey = key;
    this._fc = {};
    const types = [];
    if (f & WX_FC_HOURLY) types.push("hourly");
    if (f & WX_FC_DAILY) types.push("daily");
    else if (f & WX_FC_TWICE) types.push("twice_daily");
    this._subs = types.map((type) =>
      Promise.resolve(
        hass.connection.subscribeMessage(
          (ev) => {
            this._fc[type] = ev?.forecast || [];
            this._fcv = (this._fcv || 0) + 1;
            this._update();
          },
          { type: "weather/subscribe_forecast", forecast_type: type, entity_id: id },
        ),
      ).catch(() => null),
    );
  }

  _unsubscribe() {
    for (const p of this._subs || []) p.then((u) => typeof u === "function" && u()).catch(() => {});
    this._subs = [];
    this._subKey = null;
  }

  // ── Model ──
  _update() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    const ent = this._entities();
    const hass = this._hass;
    const ids = Object.values(ent).flat().filter(Boolean);
    const states = ids.map((id) => {
      const s = hass.states[id];
      return s ? [id, s.state, s.attributes] : null;
    });
    const sig = JSON.stringify([this._lang(), this._zoomed, this._fcv, Math.floor(Date.now() / 60000), states]);
    if (sig === this._sig) return;
    this._sig = sig;
    this._render();
  }

  _st(id) {
    return id ? this._hass.states[id] : undefined;
  }

  _num(id) {
    return wxNum(this._st(id));
  }

  _sunModel(ent) {
    const sun = this._st(ent.sun);
    if (!sun?.attributes.next_rising || !sun.attributes.next_setting) return null;
    const nr = new Date(sun.attributes.next_rising);
    const ns = new Date(sun.attributes.next_setting);
    const up = sun.state === "above_horizon";
    // Up: next_rising is tomorrow's, so today's is about the same time a calendar day earlier.
    const rise = new Date(nr);
    if (up) rise.setDate(rise.getDate() - 1);
    const set = ns;
    const now = Date.now();
    return { up, rise, set, frac: (now - rise) / (set - rise || 1) };
  }

  _rainModel(ent) {
    const f = this._st(ent.next_rain)?.attributes["1_hour_forecast"];
    if (!f || typeof f !== "object") return null;
    const pts = Object.entries(f)
      .map(([k, v]) => ({ min: Number.parseInt(k, 10), level: wxRainLevel(v) }))
      .filter((p) => Number.isFinite(p.min))
      .sort((a, b) => a.min - b.min);
    if (!pts.length) return null;
    const segments = pts.map((p, i) => ({ ...p, span: Math.max(1, (pts[i + 1]?.min ?? 60) - p.min) }));
    const runLevel = (from) => {
      let lvl = 0;
      for (let i = from; i < pts.length && pts[i].level > 0; i++) lvl = Math.max(lvl, pts[i].level);
      return lvl;
    };
    const raining = pts[0].level > 0;
    let headline;
    let next = null;
    if (raining) {
      const v = this._t(`rain_${runLevel(0)}`);
      const stop = pts.find((p) => p.level === 0);
      headline = stop ? this._t("rain_now_until", { v, n: stop.min }) : this._t("rain_now", { v });
    } else {
      const i = pts.findIndex((p) => p.level > 0);
      if (i >= 0) {
        next = pts[i].min;
        headline = this._t("rain_in", { v: this._t(`rain_${runLevel(i)}`), n: next });
      } else headline = this._t("rain_none");
    }
    return { segments, raining, next, headline };
  }

  _alertModel(ent) {
    const st = this._st(ent.alert);
    if (wxUnavailable(st)) return null;
    const byKey = new Map();
    for (const [k, v] of Object.entries(st.attributes)) {
      const p = wxPhenomenon(k);
      const level = wxAlertLevel(v);
      if (!p || !level) continue;
      if ((byKey.get(p.key)?.level || 0) < level) byKey.set(p.key, { key: p.key, icon: p.icon, level });
    }
    return { entity: ent.alert, level: wxAlertLevel(st.state) || 1, phenomena: [...byKey.values()] };
  }

  _droughtModel(ent) {
    const st = this._st(ent.vigieau);
    if (wxUnavailable(st)) return null;
    const a = st.attributes;
    const level = wxDroughtLevel(st.state) ?? wxDroughtLevel(a.niveau ?? a.level ?? a.alert_level ?? a.niveau_gravite);
    if (level == null) return null;
    let list = a.restrictions ?? a.usages ?? [];
    if (list && !Array.isArray(list) && typeof list === "object") list = Object.entries(list).map(([usage, text]) => ({ usage, text }));
    const restrictions = (Array.isArray(list) ? list : [])
      .map((r) =>
        typeof r === "string"
          ? { usage: r }
          : { usage: r.usage ?? r.thematique ?? r.categorie ?? r.nom ?? r.name ?? "", text: r.text ?? r.restriction ?? r.description ?? r.niveau ?? "" },
      )
      .filter((r) => r.usage);
    return { entity: ent.vigieau, level, restrictions };
  }

  _pollenModel(ent) {
    const ids = ent.pollen || [];
    const riskSt = this._st(ent.pollen_risk);
    const risk = wxUnavailable(riskSt) ? null : wxPollenLevel(riskSt.state, riskSt.attributes);
    const items = ids
      .map((id) => {
        const st = this._st(id);
        if (wxUnavailable(st)) return null;
        const level = wxPollenLevel(st.state, st.attributes);
        if (level == null) return null;
        const species = wxSpecies(wxNorm(id.split(".")[1])) || wxSpecies(wxNorm(st.attributes.friendly_name)) || "tree";
        return { entity: id, species, level };
      })
      .filter(Boolean)
      .sort((a, b) => b.level - a.level);
    return items.length || risk != null ? { items, risk } : null;
  }

  _model() {
    const hass = this._hass;
    const ent = this._entities();
    const lang = this._lang();
    const st = this._st(ent.weather);
    const a = st.attributes;
    const sun = this._sunModel(ent);
    const cond = st.state;
    const night = sun ? !sun.up : cond === "clear-night";
    const tempUnit = a.temperature_unit || hass.config?.unit_system?.temperature || "°C";
    const fc = this._fc || {};
    const now = Date.now();

    // Daylight hours of the day, to draw the hourly icons by day or by night.
    const tod = (d) => d.getHours() * 60 + d.getMinutes();
    const isNight = (d) => (sun ? tod(d) < tod(sun.rise) || tod(d) >= tod(sun.set) : d.getHours() < 7 || d.getHours() >= 21);
    const hourly = (fc.hourly || [])
      .filter((x) => new Date(x.datetime).getTime() > now - 3600000)
      .slice(0, Math.max(0, Number(this._config.hours) || 0))
      .map((x) => ({ ...x, night: x.is_daytime != null ? !x.is_daytime : isNight(new Date(x.datetime)) }));
    const dailyAll = fc.daily || (fc.twice_daily ? wxFoldTwiceDaily(fc.twice_daily) : a.forecast || []);
    const daily = dailyAll
      .filter((x) => {
        const d = new Date(x.datetime);
        return d.getTime() > now - 864e5 || wxSameDay(d, new Date());
      })
      .slice(0, Math.max(0, Number(this._config.days) || 0));
    const today = dailyAll.find((x) => wxSameDay(new Date(x.datetime), new Date()));

    const uvSensor = this._num(ent.uv);
    const uvV = uvSensor ?? wxNumber(a.uv_index);
    const hourlyUv = (fc.hourly || []).filter((x) => wxSameDay(new Date(x.datetime), new Date())).map((x) => x.uv_index);
    const uvMax = this._num(ent.uv_max) ?? wxNumber(today?.uv_index) ?? (hourlyUv.some((v) => v != null) ? Math.max(...hourlyUv.filter((v) => v != null)) : null);
    const uv = uvV != null ? { v: uvV, level: wxUvLevel(uvV), max: uvMax, entity: uvSensor != null ? ent.uv : ent.weather } : null;

    const lcount = this._num(ent.lightning_counter);
    const ldist = this._st(ent.lightning_distance);
    const lightning =
      lcount != null ? { count: lcount, dist: wxNum(ldist), unit: ldist?.attributes.unit_of_measurement || "km", entity: ent.lightning_counter } : null;
    const storm = WX_STORM.has(cond) ? null : hourly.find((x, i) => i > 0 && WX_STORM.has(x.condition));

    const chances = {};
    for (const k of ["rain_chance", "snow_chance", "freeze_chance"]) {
      const v = this._num(ent[k]);
      if (v != null) chances[k] = v;
    }

    return {
      lang,
      ent,
      st,
      a,
      cond,
      night,
      color: wxCondColor(cond, night),
      temp: wxNumber(a.temperature),
      feels: wxNumber(a.apparent_temperature),
      tempUnit,
      hi: wxNumber(today?.temperature),
      lo: wxNumber(today?.templow),
      hourly,
      daily,
      uv,
      aqi: this._num(ent.aqi),
      rain: this._rainModel(ent),
      chances,
      alerts: this._alertModel(ent),
      vigieau: this._droughtModel(ent),
      lightning,
      storm: storm ? wxTime(lang, storm.datetime, true) : null,
      pollen: this._pollenModel(ent),
      sun,
    };
  }

  // The status pill: the highest weather warning, else lightning nearby, else the condition.
  _status(m) {
    const top = Math.max(0, ...(m.alerts?.phenomena || []).map((p) => p.level));
    if (top >= 2) return { text: this._t("vigilance_level", { v: this._t(`lvl_${top}`) }), color: WX_ALERT_COLORS[top], alert: true };
    if (m.lightning?.count > 0 && m.lightning.dist != null) {
      return { text: this._t("lightning_near", { d: `${wxFmtNum(m.lang, m.lightning.dist, 0)} ${m.lightning.unit}` }), color: "#7e57c2", alert: true };
    }
    return { text: wxCondLabel(m.lang, m.cond), color: m.color, alert: false };
  }

  _fmtTemp(m, t, digits = 1) {
    return `${wxFmtNum(m.lang, t, digits)}°`;
  }

  // ── Render ──
  _render() {
    const c = this._config;
    const ent = this._entities();
    const st = this._st(ent.weather);
    const still = c.animations === false;
    if (!st) {
      this.shadowRoot.innerHTML = `<style>${WX_STYLES}</style><ha-card><div class="empty"><ha-icon icon="mdi:weather-cloudy-alert"></ha-icon>${wxEsc(
        c.entity ? `${this._t("no_weather")} (${c.entity})` : this._t("no_weather"),
      )}</div></ha-card>`;
      return;
    }
    if (wxUnavailable(st)) {
      this.shadowRoot.innerHTML =
        `<style>${WX_STYLES}</style><style>:host{--wx-color:${WX_IDLE}}</style><ha-card><div class="header"><div class="badge"><ha-icon icon="mdi:weather-cloudy-alert"></ha-icon></div>` +
        `<div class="titles" data-more="${wxEsc(ent.weather)}"><div class="name">${wxEsc(c.name || wxWeatherName(st) || this._t("title"))}</div></div>` +
        `<span class="st"><span class="dot"></span>${wxEsc(this._t("unavailable"))}</span>${this._zoomButton()}</div></ha-card>`;
      return;
    }
    const m = this._model();
    m.name = c.name || wxWeatherName(st) || this._t("title");
    m.status = this._status(m);
    m.still = still;
    const head =
      `<style>${WX_STYLES}</style><style>:host{--wx-color:${m.color}}</style>` +
      `<ha-card class="${[this._compact() ? "mini" : "", still ? "still" : ""].filter(Boolean).join(" ")}">` +
      `<div class="header"><div class="badge" data-more="${wxEsc(ent.weather)}"><ha-icon icon="${wxCondIcon(m.cond, m.night)}"></ha-icon></div>` +
      `<div class="titles" data-more="${wxEsc(ent.weather)}"><div class="name">${wxEsc(m.name)}</div>${
        m.status.alert && !this._compact() ? `<div class="sub">${wxEsc(wxCondLabel(m.lang, m.cond))}</div>` : ""
      }</div>` +
      `<span class="st${m.status.alert ? " alert" : ""}" style="--st-color:${m.status.color}"><span class="dot"></span>${wxEsc(m.status.text)}</span>${this._zoomButton()}</div>`;
    this.shadowRoot.innerHTML = `${head}${this._compact() ? this._miniBody(m) : this._fullBody(m)}</ha-card>`;
  }

  _bigTemp(m) {
    const hilo =
      m.hi != null
        ? `<span class="hilo">↑<b>${this._fmtTemp(m, m.hi, 0)}</b>${m.lo != null ? ` ↓<b>${this._fmtTemp(m, m.lo, 0)}</b>` : ""}</span>`
        : "";
    return `<div class="big" data-more="${wxEsc(m.ent.weather)}"><span class="val">${wxFmtNum(m.lang, m.temp, 1)}<small>${wxEsc(m.tempUnit)}</small></span>${hilo}</div>`;
  }

  _heroChips(m) {
    const a = m.a;
    const out = [];
    if (a.humidity != null) out.push(wxChip("mdi:water-percent", `${wxFmtNum(m.lang, Number(a.humidity), 0)} %`, { title: this._t("humidity") }));
    if (a.wind_speed != null) {
      const b = wxBearing(m.lang, a.wind_bearing);
      const unit = a.wind_speed_unit || "km/h";
      const gust = wxNumber(a.wind_gust_speed);
      const title = `${this._t("wind")}${gust != null ? ` · ${this._t("gusts", { v: `${wxFmtNum(m.lang, gust, 0)} ${unit}` })}` : ""}`;
      const arrow = b ? `<span class="arrow" style="transform:rotate(${(b.deg + 180) % 360}deg)"><ha-icon icon="mdi:navigation"></ha-icon></span>` : '<ha-icon icon="mdi:weather-windy"></ha-icon>';
      out.push(
        `<span class="chip" title="${wxEsc(title)}">${arrow}${wxEsc(`${wxFmtNum(m.lang, Number(a.wind_speed), 0)} ${unit}${b ? ` ${b.label}` : ""}`)}</span>`,
      );
    }
    if (a.pressure != null) out.push(wxChip("mdi:gauge", `${wxFmtNum(m.lang, Number(a.pressure), 0)} ${a.pressure_unit || "hPa"}`, { title: this._t("pressure") }));
    if (m.uv) out.push(wxChip("mdi:sun-wireless-outline", this._t("uv_n", { v: wxFmtNum(m.lang, m.uv.v, 0) }), { color: WX_UV[m.uv.level].color, cls: "tint", more: m.uv.entity, title: this._t(`uv_${m.uv.level}`) }));
    if (m.aqi != null) out.push(wxChip("mdi:air-filter", this._t("aqi_n", { v: wxFmtNum(m.lang, m.aqi, 0) }), { color: wxAqiColor(m.aqi), cls: "tint", more: m.ent.aqi, title: this._t("aqi") }));
    return out;
  }

  _fullBody(m) {
    const feels = m.feels != null && Math.round(m.feels) !== Math.round(m.temp ?? m.feels) ? `<div class="feels">${wxEsc(this._t("feels_like", { v: this._fmtTemp(m, m.feels, 0) }))}</div>` : "";
    const chips = this._heroChips(m);
    const hero =
      `<div class="hero"><div data-more="${wxEsc(m.ent.weather)}">${wxScene(m.cond, m.night, m.still)}</div>` +
      `<div class="info">${this._bigTemp(m)}${feels}${chips.length ? `<div class="chips">${chips.join("")}</div>` : ""}</div></div>`;
    // A section's entry animations (bars growing, the curve drawing itself) play when it first shows, not on every
    // update: the forecasts, for one, arrive after the first render.
    this._shown ||= new Set();
    const sections = (this._config.sections || WX_SECTIONS)
      .map((s) => {
        const out = WX_SECTION_RENDER[s]?.(this, m) || "";
        if (!out || this._shown.has(s)) return out;
        this._shown.add(s);
        return out.replace('class="section ', 'class="section enter ');
      })
      .join("");
    return hero + sections;
  }

  _miniBody(m) {
    const lines = [];
    if (m.rain && (m.rain.raining || m.rain.next != null)) lines.push(`<div class="line"><ha-icon icon="mdi:weather-rainy"></ha-icon><span>${wxEsc(m.rain.headline)}</span></div>`);
    else {
      const feels = m.feels != null ? ` · ${this._t("feels_like", { v: this._fmtTemp(m, m.feels, 0) })}` : "";
      lines.push(`<div class="line"><ha-icon icon="${wxCondIcon(m.cond, m.night)}"></ha-icon><span>${wxEsc(wxCondLabel(m.lang, m.cond) + feels)}</span></div>`);
    }
    const chips = wxAlertChips(this, m, { onlyActive: true }).slice(0, 2);
    return (
      `<div class="content"><div data-more="${wxEsc(m.ent.weather)}">${wxScene(m.cond, m.night, m.still)}</div>` +
      `<div class="info">${this._bigTemp(m)}${lines.join("")}${chips.length ? `<div class="chips">${chips.join("")}</div>` : ""}</div></div>`
    );
  }

  // ── Actions ──
  _onClick(ev) {
    const el = ev.composedPath().find((n) => n.dataset && (n.dataset.action || n.dataset.more));
    if (!el) return;
    if (el.dataset.action === "zoom") {
      this._toggleZoom(ev);
      return;
    }
    if (el.dataset.more) this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId: el.dataset.more }, bubbles: true, composed: true }));
  }
}

class WeatherPlusMiniCard extends wxMini(WeatherPlusCard) {}

wxRegister("weather-plus-card", WeatherPlusCard, "Weather Plus Card", "Animated weather with forecasts, rain in the next hour, alerts, UV, pollen and drought restrictions");
wxRegister("weather-plus-mini-card", WeatherPlusMiniCard, "Weather Plus Mini Card", "Compact animated weather that unfolds into the full card");
