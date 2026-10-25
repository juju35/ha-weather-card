// Mock home for the screenshots (and the unit tests): a Météo-France weather entity and the sensors of the
// integrations around it — rain in the next hour, weather warnings, UV, Pollens, VigiEau, Blitzortung, an AQI —
// with hourly and daily forecasts. Neutral data: the city is Paris.
// mockHass(lang, changes, now) — changes: { entity_id: { state?, ...attributes } } applied on top; `now` sets the clock
// the sun and the forecasts are drawn around (default: the real time).

const at = (now, h, m = 0, dayShift = 0) => {
  const d = new Date(now);
  d.setDate(d.getDate() + dayShift);
  d.setHours(h, m, 0, 0);
  return d;
};

const HOURLY = [
  ["partlycloudy", 17, 10],
  ["partlycloudy", 18, 15],
  ["cloudy", 17, 35],
  ["rainy", 16, 70],
  ["lightning-rainy", 15, 80],
  ["rainy", 14, 60],
  ["cloudy", 13, 30],
  ["partlycloudy", 12, 10],
  ["clear-night", 11, 0],
  ["clear-night", 10, 0],
  ["partlycloudy", 10, 0],
  ["cloudy", 9, 5],
  ["cloudy", 9, 10],
  ["fog", 8, 10],
  ["fog", 8, 5],
  ["partlycloudy", 9, 0],
  ["sunny", 11, 0],
  ["sunny", 13, 0],
  ["sunny", 15, 0],
  ["partlycloudy", 16, 0],
  ["partlycloudy", 16, 10],
  ["cloudy", 15, 20],
  ["rainy", 14, 50],
  ["rainy", 13, 60],
];

const DAILY = [
  ["rainy", 18, 9, 80, 3],
  ["sunny", 16, 7, 0, 3],
  ["partlycloudy", 15, 8, 10, 2],
  ["pouring", 13, 9, 90, 1],
  ["windy-variant", 12, 6, 30, 2],
  ["snowy-rainy", 8, 2, 60, 1],
  ["partlycloudy", 11, 4, 10, 2],
];

const POLLEN = [
  ["graminees", { en: "Grass", fr: "Graminées" }, 4],
  ["armoise", { en: "Mugwort", fr: "Armoise" }, 3],
  ["urticacees", { en: "Nettle", fr: "Urticacées" }, 2],
  ["chene", { en: "Oak", fr: "Chêne" }, 2],
  ["bouleau", { en: "Birch", fr: "Bouleau" }, 1],
  ["platane", { en: "Plane", fr: "Platane" }, 1],
  ["ambroisie", { en: "Ragweed", fr: "Ambroisie" }, 0],
  ["olivier", { en: "Olive", fr: "Olivier" }, 0],
];

export const mockHass = (lang = "en", changes = {}, now = new Date()) => {
  const L = (o) => o[lang] ?? o.en;
  const rise = at(now, 7, 52);
  const set = at(now, 18, 21);
  const up = now >= rise && now < set;
  const nextRise = now < rise ? rise : at(now, 7, 54, 1);
  const nextSet = now < set ? set : at(now, 18, 19, 1);
  const hour0 = at(now, now.getHours());
  const hourly = HOURLY.map(([condition, temperature, precipitation_probability], i) => ({
    datetime: new Date(hour0.getTime() + i * 3600000).toISOString(),
    condition,
    temperature,
    precipitation_probability,
    precipitation: precipitation_probability > 40 ? 1.2 : 0,
  }));
  const daily = DAILY.map(([condition, temperature, templow, precipitation_probability, uv_index], i) => ({
    datetime: at(now, 12, 0, i).toISOString(),
    condition,
    temperature,
    templow,
    precipitation_probability,
    uv_index,
  }));
  const states = {
    "weather.paris": [
      "partlycloudy",
      {
        friendly_name: "Paris",
        temperature: 17.4,
        apparent_temperature: 15.6,
        temperature_unit: "°C",
        humidity: 72,
        pressure: 1014,
        pressure_unit: "hPa",
        wind_speed: 18,
        wind_gust_speed: 34,
        wind_bearing: 225,
        wind_speed_unit: "km/h",
        uv_index: 3,
        supported_features: 3,
        attribution: "Data provided by Météo-France",
      },
    ],
    "sun.sun": [up ? "above_horizon" : "below_horizon", { next_rising: nextRise.toISOString(), next_setting: nextSet.toISOString(), friendly_name: "Sun" }],
    "sensor.paris_next_rain": [
      new Date(now.getTime() + 15 * 60000).toISOString(),
      {
        device_class: "timestamp",
        friendly_name: L({ en: "Paris Next rain", fr: "Paris Prochaine pluie" }),
        forecast_time_ref: now.toISOString(),
        "1_hour_forecast": {
          "0 min": "Temps sec",
          "5 min": "Temps sec",
          "10 min": "Temps sec",
          "15 min": "Pluie faible",
          "20 min": "Pluie modérée",
          "25 min": "Pluie forte",
          "35 min": "Pluie modérée",
          "45 min": "Pluie faible",
          "55 min": "Temps sec",
        },
      },
    ],
    "sensor.paris_rain_chance": [60, { unit_of_measurement: "%", friendly_name: L({ en: "Paris Rain chance", fr: "Paris Risque de pluie" }) }],
    "sensor.paris_snow_chance": [0, { unit_of_measurement: "%", friendly_name: L({ en: "Paris Snow chance", fr: "Paris Risque de neige" }) }],
    "sensor.paris_freeze_chance": [0, { unit_of_measurement: "%", friendly_name: L({ en: "Paris Freeze chance", fr: "Paris Risque de gel" }) }],
    "sensor.paris_uv": [3, { unit_of_measurement: "UV index", friendly_name: "Paris UV" }],
    "sensor.75_weather_alert": [
      "Jaune",
      {
        friendly_name: "75 Weather alert",
        "Vent violent": "Jaune",
        "Pluie-inondation": "Vert",
        Orages: "Jaune",
        Inondation: "Vert",
        "Neige-verglas": "Vert",
        Canicule: "Vert",
        "Grand-froid": "Vert",
        Avalanches: "Vert",
        "Vagues-submersion": "Vert",
      },
    ],
    "sensor.blitzortung_lightning_counter": [12, { unit_of_measurement: "↯", friendly_name: "Lightning counter" }],
    "sensor.blitzortung_lightning_distance": [18, { unit_of_measurement: "km", friendly_name: "Lightning distance" }],
    "sensor.alert_level_in_paris": [
      "alerte",
      {
        friendly_name: L({ en: "Alert level in Paris", fr: "Niveau d'alerte à Paris" }),
        restrictions: [
          { thematique: L({ en: "Garden watering", fr: "Arrosage" }), restriction: L({ en: "Banned 9 a.m.–8 p.m.", fr: "Interdit de 9 h à 20 h" }) },
          { thematique: L({ en: "Car washing", fr: "Lavage des véhicules" }), restriction: L({ en: "Only in car washes", fr: "En station uniquement" }) },
          { thematique: L({ en: "Swimming pools", fr: "Piscines" }), restriction: L({ en: "No filling", fr: "Remplissage interdit" }) },
        ],
      },
    ],
    "sensor.pollens_75_risklevel": [3, { friendly_name: L({ en: "Pollens 75 Risk level", fr: "Pollens 75 Niveau de risque" }) }],
    // Atmo France: the index and each pollutant on the 1–6 scale, plus the day-ahead copies the card leaves out.
    "sensor.atmo_france_qualite_globale_paris": [2, { Libellé: "Moyen", "Nom de la zone": "Métropole du Grand Paris", friendly_name: "Atmo France Qualité globale-Paris" }],
    "sensor.atmo_france_qualite_globale_paris_j_1": [4, { Libellé: "Mauvais", friendly_name: "Atmo France Qualité globale-Paris-J+1" }],
    "sensor.atmo_france_pm25_paris": [2, { device_class: "aqi", Libellé: "Moyen", friendly_name: "Atmo France PM25-Paris" }],
    "sensor.atmo_france_pm10_paris": [1, { device_class: "aqi", Libellé: "Bon", friendly_name: "Atmo France PM10-Paris" }],
    "sensor.atmo_france_ozone_paris": [2, { device_class: "aqi", Libellé: "Moyen", friendly_name: "Atmo France Ozone-Paris" }],
    "sensor.atmo_france_dioxyde_d_azote_paris": [3, { device_class: "aqi", Libellé: "Dégradé", friendly_name: "Atmo France Dioxyde d'azote-Paris" }],
    "sensor.atmo_france_dioxyde_de_soufre_paris": [1, { device_class: "aqi", Libellé: "Bon", friendly_name: "Atmo France Dioxyde de soufre-Paris" }],
    "sensor.atmo_france_pm25_paris_j_1": [5, { device_class: "aqi", friendly_name: "Atmo France PM25-Paris-J+1" }],
    // An indoor air purifier's PM2.5: not outdoor air.
    "sensor.living_room_purifier_pm2_5": [3, { device_class: "pm25", unit_of_measurement: "µg/m³", friendly_name: "Living room purifier PM2.5" }],
  };
  for (const [slug, names, level] of POLLEN) states[`sensor.pollens_75_${slug}`] = [level, { friendly_name: `Pollens 75 ${L(names)}` }];

  for (const [id, ch] of Object.entries(changes)) {
    const { state, ...attrs } = ch;
    const cur = states[id] || [state, {}];
    states[id] = [state ?? cur[0], { ...cur[1], ...attrs }];
  }

  const entities = {};
  const out = {};
  for (const [id, [state, attributes]] of Object.entries(states)) {
    if (state === undefined) continue;
    out[id] = { entity_id: id, state: String(state), attributes };
    const mf = /paris|75_weather/.test(id);
    entities[id] = { entity_id: id, device_id: mf ? "dev_mf" : id.includes("pollens") ? "dev_pollens" : undefined };
  }
  return {
    language: lang,
    states: out,
    entities,
    devices: { dev_mf: { name: "Paris" }, dev_pollens: { name: "Pollens 75" } },
    areas: {},
    config: { unit_system: { temperature: "°C" } },
    forecasts: { hourly, daily },
  };
};
