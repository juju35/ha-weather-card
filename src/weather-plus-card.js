/*
 * weather-plus-card and its mini card: the weather now in an animated scene, then the sections of `sections`
 * (alerts, rain in the next hour, hourly and daily forecasts, UV, pollen, sun), each from the integration that has it.
 */

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

// The number of entities of a `hass.states` object, counted once per object (every state change replaces it):
// the hass setter runs on each update, and Object.keys() over a large instance allocates a lot for nothing.
const WX_STATE_COUNTS = new WeakMap();
function wxStatesCount(states) {
  let n = WX_STATE_COUNTS.get(states);
  if (n === undefined) {
    n = Object.keys(states).length;
    WX_STATE_COUNTS.set(states, n);
  }
  return n;
}

// Every entity id the card tracks.
const wxEntIds = (ent) => [...Object.values(ent), ...Object.values(ent.air || {})].flat().filter((id) => typeof id === "string");

// Runs `write` (which replaces the markup under `scope`) keeping what the viewer was doing: the scroll of `scope`, of
// the hourly strips, and the focused control (found again by its action or entity).
function wxKeepView(root, scope, write) {
  const top = scope.scrollTop;
  const strips = [...(root.querySelectorAll?.(".hscroll") || [])].map((el) => el.scrollLeft);
  const a = root.activeElement;
  const key = a?.dataset && (a.dataset.action || a.dataset.more) ? [a.localName, a.className, a.dataset.action, a.dataset.more] : null;
  write();
  if (top) scope.scrollTop = top;
  [...(root.querySelectorAll?.(".hscroll") || [])].forEach((el, i) => {
    if (strips[i]) el.scrollLeft = strips[i];
  });
  if (key && !(root.activeElement?.isConnected ?? false)) {
    const el = [...(root.querySelectorAll?.("[data-action], [data-more]") || [])].find(
      (n) => n.localName === key[0] && n.className === key[1] && n.dataset.action === key[2] && n.dataset.more === key[3],
    );
    el?.focus?.({ preventScroll: true });
  }
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
    // The detected entities only change with the registry or the set of states; a swap that keeps the count
    // (one entity added, another removed in the same update) shows as a tracked id disappearing. Only the ids that
    // existed when they were resolved count: a configured entity that does not exist must not re-run the discovery
    // on every update.
    const gone = () => this._ent && (this._entPresent || []).some((id) => !(id in hass.states));
    if (!prev || prev.entities !== hass.entities || wxStatesCount(prev.states) !== wxStatesCount(hass.states) || gone()) this._ent = null;
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
    this._closePopup();
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
    if (!this._ent || this._ent.weather !== this._weatherId()) {
      this._ent = wxResolve(this._hass, this._weatherId(), this._config.entities);
      this._entPresent = wxEntIds(this._ent).filter((id) => id in this._hass.states);
    }
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
    // Each subscription writes to its own object: a late event of the previous one (unsubscribing is asynchronous)
    // cannot land in the forecasts of the new entity.
    const fc = {};
    this._fc = fc;
    const types = [];
    if (f & WX_FC_HOURLY) types.push("hourly");
    if (f & WX_FC_DAILY) types.push("daily");
    else if (f & WX_FC_TWICE) types.push("twice_daily");
    this._subs = types.map((type) =>
      Promise.resolve(
        hass.connection.subscribeMessage(
          (ev) => {
            if (this._fc !== fc) return;
            fc[type] = ev?.forecast || [];
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

  // ── Sun and moon events of the day, for Home Assistant's location (computed once a day) ──
  _astro() {
    const lat = Number(this._hass.config?.latitude);
    const lon = Number(this._hass.config?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || (lat === 0 && lon === 0)) return null;
    const now = new Date();
    const key = `${now.toDateString()}:${lat}:${lon}`;
    if (this._astroKey !== key) {
      this._astroKey = key;
      this._astroCache = { sun: wxSunTimes(now, lat, lon), moon: wxMoonTimes(now, lat, lon) };
    }
    return this._astroCache;
  }

  // ── Pressure trend over 3 hours, from the recorder's history (fetched every 15 minutes) ──
  _fetchTrend(id) {
    if (!id || !this._hass.callApi || (this._trendFor === id && Date.now() - this._trendAt < 15 * 60000)) return;
    this._trendFor = id;
    this._trendAt = Date.now();
    const start = new Date(Date.now() - 3 * 3600000).toISOString();
    const weather = id.startsWith("weather.");
    const path = `history/period/${start}?filter_entity_id=${id}${weather ? "&significant_changes_only=0" : "&minimal_response&no_attributes"}`;
    Promise.resolve(this._hass.callApi("GET", path))
      .then((res) => {
        const pts = (res?.[0] || []).map((x) => wxNumber(weather ? x.attributes?.pressure : x.state)).filter((v) => v != null);
        const prev = this._trend;
        this._trend = pts.length >= 2 ? { delta: pts.at(-1) - pts[0], id } : null;
        // The trend is not in the signature: rebuild only when it changed, so the 15-minute refresh does not restart
        // every animation and rewrite the full screen detail for nothing.
        if (prev?.delta !== this._trend?.delta || prev?.id !== this._trend?.id) {
          this._sig = null;
          this._update();
        }
      })
      .catch(() => {});
  }

  // ── Model ──
  _update() {
    if (!this._config || !this._hass || !this.shadowRoot) return;
    const ent = this._entities();
    const hass = this._hass;
    // sun.sun: only what the card shows of it. Its elevation and azimuth change every few minutes and would rebuild
    // the card (restarting every animation) for nothing.
    const states = wxEntIds(ent).map((id) => {
      const s = hass.states[id];
      if (!s) return null;
      if (id === ent.sun) return [id, s.state, s.attributes.next_rising, s.attributes.next_setting];
      return [id, s.state, s.attributes];
    });
    this._fetchTrend(ent.pressure || ent.weather);
    // The clock only enters the signature through the hourly/daily rollover (and the astro day) on the hour, so the
    // minute tick does not rebuild the shadow root (restarting every animation); the sun moves along its arc in place.
    const sig = JSON.stringify([this._lang(), this._zoomed, !!this._popup, this._fcv, Math.floor(Date.now() / 3600000), states]);
    if (sig === this._sig) {
      this._patchSun(this._sunModel(ent));
      return;
    }
    this._sig = sig;
    this._render();
  }

  // Moves the sun's dot and the course done on the sun section of the card and of the full screen detail.
  _patchSun(sun) {
    if (!sun?.up) return;
    const { x, y, d } = wxSunPoint(sun.frac);
    for (const root of [this.shadowRoot, this._popup?.shadowRoot]) {
      const svg = root?.querySelector?.(".sun svg");
      if (!svg) continue;
      svg.querySelector(".done")?.setAttribute("d", d);
      for (const c of svg.querySelectorAll("circle")) {
        c.setAttribute("cx", x);
        c.setAttribute("cy", y);
      }
    }
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
    // Météo-France: one attribute per phenomenon; Niak Weather: a `phenomenes` map.
    const ph = st.attributes.phenomenes && typeof st.attributes.phenomenes === "object" ? st.attributes.phenomenes : st.attributes;
    for (const [k, v] of Object.entries(ph)) {
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

  // The moon: its phase drawn from its age, named by the Moon integration when it is there (same phase, its words);
  // mirrored in the southern hemisphere.
  _moonModel(ent) {
    const now = new Date();
    const age = wxMoonAge(now);
    const st = this._st(ent.moon);
    const named = wxUnavailable(st) ? null : wxNorm(st.state);
    const phase = WX_MOON_PHASES.includes(named) ? named : wxMoonPhase(age);
    const inDays = (d) => new Date(now.getTime() + d * 864e5);
    return {
      age,
      phase,
      light: wxMoonLight(age),
      flip: Number(this._hass.config?.latitude) < 0,
      nextFull: inDays((WX_SYNODIC / 2 - age + WX_SYNODIC) % WX_SYNODIC),
      nextNew: inDays(WX_SYNODIC - age),
      entity: ent.moon,
      times: this._astro()?.moon || null,
    };
  }

  // Precipitation: today's total from the provider, and the sums of the hourly forecast over the next 6 and 24 hours.
  _rainTotals(ent, hourly, unit) {
    // From the start of the current hour: the next 6 hours are this one and the 5 after it.
    const from = new Date();
    from.setMinutes(0, 0, 0);
    const sum = (h) =>
      hourly
        .filter((x) => {
          const t = new Date(x.datetime).getTime();
          return t >= from.getTime() && t < from.getTime() + h * 3600000;
        })
        .reduce((acc, x) => acc + (wxNumber(x.precipitation) || 0), 0);
    const hasAmounts = hourly.some((x) => x.precipitation != null);
    const today = this._num(ent.daily_precipitation);
    // A forecast sum of 0 is no rain: null, so the chips and this gate agree on hiding it.
    const next = (h) => (hasAmounts ? sum(h) || null : null);
    const out = {
      unit: this._st(ent.daily_precipitation)?.attributes.unit_of_measurement || unit,
      today,
      next6: next(6),
      next24: next(24),
    };
    return out.today != null || out.next6 != null || out.next24 != null ? out : null;
  }

  _airModel(ent) {
    const pollutants = Object.entries(ent.air || {})
      .map(([key, id]) => {
        const st = this._st(id);
        if (wxUnavailable(st)) return null;
        const level = wxAirLevel(st, key);
        if (level == null) return null;
        const unit = st.attributes.unit_of_measurement;
        return { key, entity: id, level, value: unit && unit !== "AQI" ? `${wxFmtNum(this._lang(), wxNum(st), 0)} ${unit}` : null };
      })
      .filter(Boolean);
    const st = this._st(ent.aqi);
    let level = wxUnavailable(st) ? null : wxAirLevel(st);
    if (level == null && pollutants.length) level = Math.max(...pollutants.map((p) => p.level));
    if (level == null) return null;
    const zone = st?.attributes["Nom de la zone"] || st?.attributes.zone || "";
    const ahead = this._st(wxAheadOf(this._hass, ent.aqi));
    return { level, value: wxNum(st), entity: ent.aqi || pollutants[0]?.entity, zone, pollutants, tomorrow: ahead ? wxAirLevel(ahead) : null };
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
    if (!items.length && risk == null) return null;
    // The overall risk when a sensor gives it, else the most present species.
    const level = risk ?? Math.max(0, ...items.map((x) => x.level));
    const ahead = this._st(wxAheadOf(this._hass, ent.pollen_risk));
    return { items, level, entity: risk != null ? ent.pollen_risk : items[0]?.entity, tomorrow: ahead ? wxPollenLevel(ahead.state, ahead.attributes) : null };
  }

  // `wide`: the full screen detail, which shows more hours and days.
  _model(wide = false) {
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
      .slice(0, Math.max(0, Number(this._config.hours) || 0, wide ? 24 : 0))
      .map((x) => ({ ...x, night: x.is_daytime != null ? !x.is_daytime : isNight(new Date(x.datetime)) }));
    const dailyAll = fc.daily || (fc.twice_daily ? wxFoldTwiceDaily(fc.twice_daily) : a.forecast || []);
    // From today's local midnight: a provider serving yesterday's entry (a legacy `forecast` attribute, for one)
    // must not show it next to "Today".
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const daily = dailyAll
      .filter((x) => {
        const d = new Date(x.datetime);
        return d.getTime() >= dayStart.getTime() || wxSameDay(d, new Date());
      })
      .slice(0, Math.max(0, Number(this._config.days) || 0, wide ? 10 : 0));
    const today = dailyAll.find((x) => wxSameDay(new Date(x.datetime), new Date()));

    const uvSensor = this._num(ent.uv);
    const uvV = uvSensor ?? wxNumber(a.uv_index);
    const hourlyUv = (fc.hourly || []).filter((x) => wxSameDay(new Date(x.datetime), new Date())).map((x) => x.uv_index);
    const uvMax = this._num(ent.uv_max) ?? wxNumber(today?.uv_index) ?? (hourlyUv.some((v) => v != null) ? Math.max(...hourlyUv.filter((v) => v != null)) : null);
    const uv = uvV != null ? { v: uvV, level: wxUvLevel(uvV), max: uvMax, entity: uvSensor != null ? ent.uv : ent.weather } : null;

    const lst = this._st(ent.lightning_counter);
    const ldist = this._st(ent.lightning_distance);
    let lightning = null;
    if (lst?.attributes.eclairs_20_min != null) {
      // A storm sensor carrying its own strikes and the nearest one's distance (Niak Weather).
      lightning = {
        count: wxNumber(lst.attributes.eclairs_20_min),
        dist: wxNumber(lst.attributes.eclair_le_plus_proche_km),
        unit: "km",
        entity: ent.lightning_counter,
      };
    } else if (wxNum(lst) != null) {
      lightning = { count: wxNum(lst), dist: wxNum(ldist), unit: ldist?.attributes.unit_of_measurement || "km", entity: ent.lightning_counter };
    }
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
      air: this._airModel(ent),
      rain: this._rainModel(ent),
      chances,
      alerts: this._alertModel(ent),
      vigieau: this._droughtModel(ent),
      lightning,
      storm: storm ? wxTime(lang, storm.datetime, true) : null,
      pollen: this._pollenModel(ent),
      sun,
      moon: this._moonModel(ent),
      totals: this._rainTotals(ent, fc.hourly || [], a.precipitation_unit || "mm"),
      clouds: this._num(ent.cloud_cover) ?? wxNumber(a.cloud_coverage),
      trend: this._trend?.id === (ent.pressure || ent.weather) ? this._trend.delta : null,
      sunTimes: this._astro()?.sun || null,
    };
  }

  // The status pill: the highest weather warning, else lightning nearby, else the condition.
  _status(m) {
    const top = Math.max(0, ...(m.alerts?.phenomena || []).map((p) => p.level));
    if (top >= 2) return { text: this._t("vigilance_level", { v: this._t(`lvl_${top}`) }), color: WX_ALERT_COLORS[top], alert: true };
    if (m.lightning?.count > 0 && m.lightning.dist != null) {
      return { text: this._t("lightning_near", { d: `${wxFmtNum(m.lang, m.lightning.dist, 0)} ${m.lightning.unit}` }), color: WX_BOLT_COLOR, alert: true };
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
        `<span class="st"><span class="dot"></span><span class="stt">${wxEsc(this._t("unavailable"))}</span></span>${this._zoomButton()}</div></ha-card>`;
      this._closePopup();
      return;
    }
    const m = this._model();
    m.name = c.name || wxWeatherName(st) || this._t("title");
    m.status = this._status(m);
    m.still = still;
    const head =
      `<style>${WX_STYLES}</style><style>:host{--wx-color:${m.color}}</style>` +
      `<ha-card class="${[this._compact() ? "mini" : "", still ? "still" : ""].filter(Boolean).join(" ")}">` +
      this._header(m, { sub: m.status.alert && !this._compact(), buttons: `${this._popupButton()}${this._zoomButton()}` });
    const body = `${head}${this._compact() ? this._miniBody(m) : this._fullBody(m)}</ha-card>`;
    wxKeepView(this.shadowRoot, this.shadowRoot, () => {
      this.shadowRoot.innerHTML = body;
    });
    if (this._popup) this._renderPopup();
  }

  // The header shared by the card and its full screen detail: badge, titles (the condition as a subtitle when
  // `sub`), the status pill, then the caller's buttons (popup/zoom, or close).
  _header(m, { sub = false, buttons = "" } = {}) {
    return (
      `<div class="header"><div class="badge" data-more="${wxEsc(m.ent.weather)}"><ha-icon icon="${wxCondIcon(m.cond, m.night)}"></ha-icon></div>` +
      `<div class="titles" data-more="${wxEsc(m.ent.weather)}"><div class="name">${wxEsc(m.name)}</div>${sub ? `<div class="sub">${wxEsc(wxCondLabel(m.lang, m.cond))}</div>` : ""}</div>` +
      `<span class="st${m.status.alert ? " alert" : ""}" style="--st-color:${m.status.color}" title="${wxEsc(m.status.text)}"><span class="dot"></span><span class="stt">${wxEsc(m.status.text)}</span></span>${buttons}</div>`
    );
  }

  // The hero shared by the card and its full screen detail: the scene, the big temperature, the feels-like
  // (always in the detail; only when it differs on the card) and the chips.
  _hero(m, { feelsAlways = false } = {}) {
    const show = m.feels != null && (feelsAlways || Math.round(m.feels) !== Math.round(m.temp ?? m.feels));
    const feels = show ? `<div class="feels">${wxEsc(this._t("feels_like", { v: this._fmtTemp(m, m.feels, 0) }))}</div>` : "";
    const chips = this._heroChips(m);
    return (
      `<div class="hero"><div data-more="${wxEsc(m.ent.weather)}">${wxScene(m.cond, m.night, m.still, m.moon)}</div>` +
      `<div class="info">${this._bigTemp(m)}${feels}${chips.length ? `<div class="chips">${chips.join("")}</div>` : ""}</div></div>`
    );
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
    if (a.pressure != null) {
      const unit = a.pressure_unit || "hPa";
      const d = m.trend;
      const dir = d == null ? null : d >= 1 ? "up" : d <= -1 ? "down" : "steady";
      const delta = d == null ? "" : `${d > 0 ? "+" : d < 0 ? "−" : ""}${wxFmtNum(m.lang, Math.abs(d), 1)} ${unit}`;
      const icon = { up: "mdi:trending-up", down: "mdi:trending-down", steady: "mdi:trending-neutral" }[dir] || "mdi:gauge";
      out.push(
        wxChip(icon, `${wxFmtNum(m.lang, Number(a.pressure), 0)} ${unit}`, {
          title: `${this._t("pressure")}${dir ? ` · ${this._t(`trend_${dir}`, { v: delta })}` : ""}`,
          cls: dir ? `trend ${dir}` : "",
          more: m.ent.pressure,
        }),
      );
    }
    if (m.clouds != null) out.push(wxChip("mdi:cloud-percent-outline", this._t("clouds_n", { v: wxFmtNum(m.lang, m.clouds, 0) }), { title: this._t("cloud_cover"), more: m.ent.cloud_cover }));
    if (m.uv) out.push(wxChip("mdi:sun-wireless-outline", this._t("uv_n", { v: wxFmtNum(m.lang, m.uv.v, 0) }), { color: WX_UV[m.uv.level].color, cls: "tint", more: m.uv.entity, title: this._t(`uv_${m.uv.level}`) }));
    if (m.pollen?.level >= 1) {
      out.push(
        wxChip("mdi:flower-pollen", this._t("pollen_chip", { v: this._t(`pl_${m.pollen.level}`).toLowerCase() }), {
          color: WX_LEVEL_COLORS[m.pollen.level],
          cls: "tint",
          more: m.pollen.entity,
          title: this._t("pollen_risk"),
        }),
      );
    }
    if (m.air) {
      out.push(
        wxChip("mdi:air-filter", this._t("air_chip", { v: this._t(`aq_${m.air.level}`).toLowerCase() }), {
          color: WX_AQ_COLORS[m.air.level],
          cls: "tint",
          more: m.air.entity,
          title: this._t("air_index"),
        }),
      );
    }
    return out;
  }

  _fullBody(m) {
    this._shown ||= new Set();
    return this._hero(m) + this._sections(m, this._shown);
  }

  // A section's entry animations (bars growing, the curve drawing itself) play when it first shows in `shown`, not
  // on every update: the forecasts, for one, arrive after the first render.
  _sections(m, shown, names = this._config.sections || WX_SECTIONS) {
    return names
      .map((s) => {
        const out = WX_SECTION_RENDER[s]?.(this, m) || "";
        if (!out || shown.has(s)) return out;
        shown.add(s);
        return out.replace('class="section ', 'class="section enter ');
      })
      .join("");
  }

  // ── Full screen detail ──
  // A layer over the whole window, appended to the page's body so that no card container clips it: the card's header,
  // a larger scene, then the sections side by side as the width allows, with 24 hours and 10 days of forecast.
  // It closes with its button, Escape, or the browser's back button on a phone.
  // Shown on every layout, including the compact mini card (beside its detail button), so full screen is one click away.
  _popupButton() {
    if (this._config.popup === false) return "";
    const label = wxEsc(this._t("popup_open"));
    return `<button class="zoom" data-action="popup" title="${label}" aria-label="${label}"><ha-icon icon="mdi:fullscreen"></ha-icon></button>`;
  }

  _openPopup() {
    // A popup left behind (its host already gone from the page) does not block a new one.
    if (this._popup?.isConnected) return;
    if (this._popup) this._closePopup(true);
    const host = document.createElement("div");
    host.className = "weather-plus-popup";
    const root = host.attachShadow({ mode: "open" });
    root.addEventListener("click", (ev) => {
      const path = ev.composedPath();
      if (path.some((n) => n.dataset?.action === "close") || !path.some((n) => n.classList?.contains?.("sheet"))) {
        this._closePopup();
        return;
      }
      this._onClick(ev);
    });
    this._onPopupKey = (ev) => {
      if (ev.key === "Escape") this._closePopup();
      else if ((ev.key === "Enter" || ev.key === " ") && ev.composedPath?.()[0]?.dataset?.more) this._onClick(ev);
    };
    // A popstate that lands back on its own entry comes from a dialog opened over it and closed (Home Assistant's
    // dialogs go back on close): the popup stays.
    this._onPopupBack = (ev) => {
      if (!ev?.state?.weatherPlusPopup) this._closePopup(true);
    };
    document.addEventListener("keydown", this._onPopupKey);
    window.addEventListener?.("popstate", this._onPopupBack);
    window.history?.pushState?.({ weatherPlusPopup: true }, "");
    this._bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.body.appendChild(host);
    this._popup = host;
    this._popupShown = new Set();
    this._popupParts = null;
    this._renderPopup();
    root.querySelector?.(".close")?.focus?.();
  }

  // `fromBack`: the back button already left the history entry the popup added.
  _closePopup(fromBack = false) {
    if (!this._popup) return;
    const host = this._popup;
    this._popup = null;
    this._popupParts = null;
    host.remove();
    document.removeEventListener("keydown", this._onPopupKey);
    window.removeEventListener?.("popstate", this._onPopupBack);
    document.body.style.overflow = this._bodyOverflow || "";
    if (!fromBack && window.history?.state?.weatherPlusPopup) window.history.back();
    this.shadowRoot?.querySelector?.('[data-action="popup"]')?.focus?.();
  }

  _renderPopup() {
    const st = this._st(this._entities().weather);
    if (!st || wxUnavailable(st)) return;
    const m = this._model(true);
    m.name = this._config.name || wxWeatherName(st) || this._t("title");
    m.status = this._status(m);
    m.still = this._config.animations === false;
    const close = wxEsc(this._t("popup_close"));
    // Alerts and rain beside the weather now, the hourly forecast across, the other sections in columns; in the
    // order of `sections`.
    const names = this._config.sections || WX_SECTIONS;
    const side = names.filter((n) => n === "alerts" || n === "rain");
    const across = names.filter((n) => n === "hourly");
    const rest = names.filter((n) => !side.includes(n) && !across.includes(n));
    const color = `:host{--wx-color:${m.color}}`;
    const cls = `popup${m.still ? " still" : ""}`;
    const content =
      this._header(m, { sub: true, buttons: `<button class="close" data-action="close" title="${close}" aria-label="${close}"><ha-icon icon="mdi:close"></ha-icon></button>` }) +
      `<div class="top">${this._hero(m, { feelsAlways: true })}` +
      `<div class="side">${this._sections(m, this._popupShown, side)}</div></div>` +
      this._sections(m, this._popupShown, across) +
      `<div class="flow">${this._sections(m, this._popupShown, rest)}</div>`;
    const root = this._popup.shadowRoot;
    const p = this._popupParts;
    if (p) {
      // Updates rewrite the card inside the sheet only: the sheet keeps its scroll position and does not replay its
      // entry animation, the hourly strip keeps its scroll, the focused control gets its focus back.
      p.color.textContent = color;
      p.sheet.setAttribute("aria-label", m.name);
      p.card.className = cls;
      wxKeepView(root, p.sheet, () => {
        p.card.innerHTML = content;
      });
      return;
    }
    root.innerHTML =
      `<style>${WX_STYLES}${WX_POPUP_STYLES}</style><style class="wx-color">${color}</style>` +
      `<div class="backdrop"><div class="sheet" role="dialog" aria-modal="true" aria-label="${wxEsc(m.name)}">` +
      `<ha-card class="${cls}">${content}</ha-card></div></div>`;
    const parts = { color: root.querySelector?.("style.wx-color"), sheet: root.querySelector?.(".sheet"), card: root.querySelector?.("ha-card.popup") };
    this._popupParts = parts.color && parts.sheet && parts.card ? parts : null;
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
      `<div class="content"><div data-more="${wxEsc(m.ent.weather)}">${wxScene(m.cond, m.night, m.still, m.moon)}</div>` +
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
    if (el.dataset.action === "popup") {
      this._openPopup();
      return;
    }
    if (el.dataset.more) this._moreInfo(el.dataset.more);
  }

  // From the full screen, the popup closes first: it would cover Home Assistant's more-info on versions where that is
  // not a top-layer dialog, and the more-info's history entry must not sit on top of the popup's. It opens once the
  // back() of the close has left the popup's entry, so that it goes back to the dashboard when closed.
  _moreInfo(entityId) {
    const fire = () => this.dispatchEvent(new CustomEvent("hass-more-info", { detail: { entityId }, bubbles: true, composed: true }));
    if (!this._popup) {
      fire();
      return;
    }
    const goesBack = !!window.history?.state?.weatherPlusPopup;
    this._closePopup();
    if (!goesBack) {
      fire();
      return;
    }
    const once = () => {
      window.removeEventListener("popstate", once);
      fire();
    };
    window.addEventListener("popstate", once);
  }
}

class WeatherPlusMiniCard extends wxMini(WeatherPlusCard) {}

wxRegister("weather-plus-card", WeatherPlusCard, "Weather Plus Card", "Animated weather with forecasts, rain in the next hour, alerts, UV, pollen and drought restrictions");
wxRegister("weather-plus-mini-card", WeatherPlusMiniCard, "Weather Plus Mini Card", "Compact animated weather that unfolds into the full card");
