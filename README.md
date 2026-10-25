# ha-weather-card

[![HACS](https://img.shields.io/badge/HACS-Custom-41BDF5.svg)](https://github.com/hacs/integration)
[![HACS Validation](https://github.com/juju35/ha-weather-card/actions/workflows/hacs.yml/badge.svg)](https://github.com/juju35/ha-weather-card/actions/workflows/hacs.yml)
[![Validate](https://github.com/juju35/ha-weather-card/actions/workflows/validate.yml/badge.svg)](https://github.com/juju35/ha-weather-card/actions/workflows/validate.yml)
[![Release](https://img.shields.io/github/v/release/juju35/ha-weather-card)](https://github.com/juju35/ha-weather-card/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

An animated weather card for Home Assistant that brings together everything the weather integrations of your instance know: the weather now and its forecasts, **rain in the next hour**, **weather warnings**, **thunderstorms and lightning nearby**, **UV index**, **pollen**, **air quality** and **VigiEau drought restrictions**, with a mini card. Add it, it finds the weather entity and the sensors around it by itself. The sky comes alive: the sun turns, clouds drift, rain and snow fall, lightning flashes.

[![Open your Home Assistant instance and open a repository inside the Home Assistant Community Store.](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=juju35&repository=ha-weather-card&category=plugin)

![Animated scenes](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/scenes.gif)

| Card | Type | What it shows |
|---|---|---|
| [Weather](#weather-card) | `custom:weather-plus-card` | The weather now in an animated scene, then alerts, rain in the next hour, hourly and daily forecasts, UV, pollen and sun. |
| [Weather mini](#mini-card) | `custom:weather-plus-mini-card` | The same weather on two lines, with a zoom to the full card. |

| Weather | Storm | Mini |
|---|---|---|
| ![Weather](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/card.png) | ![Storm](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/storm.png) | ![Mini](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/mini.png) |

Like the other `ha-*` cards: header with a status pill, illustration next to the state, mini card with a detail button, a visual editor in the dashboard UI covering every option (the entity overrides in its folded **Advanced** section, as YAML), English and French labels following the Home Assistant language, light and dark themes, a single HACS download with no dependency.

## Features

### Weather card

`custom:weather-plus-card` — A `weather` entity and the sensors of the weather integrations around it.

- **Animated scene** for each condition, by day and by night (from `sun.sun`): the sun's rays turn and its glow breathes, the moon shines among twinkling stars, clouds drift, rain falls (harder when it pours), snow flutters down, hail bounces, lightning flashes over the cloud, fog rolls and the wind blows in gusts; a warning sign for exceptional weather. `animations: false` or the system's *reduce motion* setting keeps it still
- The temperature in large with today's high and low, the feels-like temperature, and chips for humidity, wind (an arrow turned to its direction, gusts on hover), pressure, UV index and air quality
- The **status pill** shows the highest weather warning (*Orange warning*), else lightning nearby (*Lightning 6 km away*), else the condition
- Every chip, row and reading opens the more-info dialog of its entity

Sections, in the order of `sections` (a section with no data hides itself):

| Section | What it shows | From |
|---|---|---|
| `alerts` | Weather warnings by phenomenon (wind, thunderstorms, rain-flood, snow-ice, heat wave…) in their colour, pulsing from orange; drought restrictions with their level and the restricted uses; lightning strikes and their distance; thunderstorms in the hourly forecast | Météo-France *weather alert*, VigiEau, Blitzortung, the forecast |
| `rain` | Rain in the next hour as a 5-minute timeline coloured by intensity, with *Heavy rain in 15 min* / *Light rain now, stopping in 10 min*; rain, snow and frost chances | Météo-France *next rain*, *rain / snow / freeze chance* |
| `hourly` | Icons by day or night, a temperature curve that draws itself, precipitation probability (or amount) bars; scrolls sideways | `weather.get_forecasts` (hourly) |
| `daily` | One row a day: icon, precipitation probability, low and high on a range bar coloured by temperature against the whole week, the current temperature on today's | `weather.get_forecasts` (daily, or twice daily folded into days) |
| `uv` | The UV index on its scale, its level and the advice that goes with it, today's peak | A UV sensor (Météo-France, OpenUV…), else the weather entity's `uv_index` |
| `pollen` | One row per species, the most present first, with its level on five dots; the overall pollen risk | Pollens (RNSA), Atmo France, Google Pollen, or any pollen sensor |
| `sun` | The sun's course over the day, sunrise, sunset and the daylight length | `sun.sun` |

### Mini card

`custom:weather-plus-mini-card` — The weather on two lines, for a compact dashboard.

- The animated scene, the temperature with today's high and low, the rain to come in the hour (or the condition and feels-like temperature), and the active warnings
- The **detail** button (top right) unfolds the full card, and back, as does a click anywhere else (`zoom: false` removes it)

| Conditions | Night |
|---|---|
| ![Conditions](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/conditions.png) | ![Night](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/night.png) |

## Supported integrations

The card works with **any weather integration** (Météo-France, Met.no, Open-Meteo, OpenWeatherMap, Pirate Weather, AccuWeather, Met Office, Environment Canada…): the current conditions come from the `weather` entity, the forecasts from its forecast subscription (`weather.get_forecasts`), with the old `forecast` attribute as a fallback.

The other sections read the sensors of these integrations, found by their translation key, their entity id (English and French) or their attributes; the ones on the weather entity's device come first:

| Data | Integrations | Role in `entities` |
|---|---|---|
| Rain in the next hour | [Météo-France](https://www.home-assistant.io/integrations/meteo_france/) (`sensor.*_next_rain`) | `next_rain` |
| Rain, snow, frost chances | Météo-France | `rain_chance`, `snow_chance`, `freeze_chance` |
| Weather warnings | Météo-France (`sensor.*_weather_alert`), or any sensor with a green / yellow / orange / red level per phenomenon | `alert` |
| Thunderstorms | [Blitzortung](https://github.com/mrk-its/homeassistant-blitzortung) (`lightning_counter`, `lightning_distance`), and the forecast | `lightning_counter`, `lightning_distance` |
| Drought restrictions | VigiEau, or any sensor with a *vigilance / alerte / alerte renforcée / crise* level | `vigieau` |
| UV index | Météo-France, [OpenUV](https://www.home-assistant.io/integrations/openuv/), OpenWeatherMap, Pirate Weather…, else the weather entity | `uv`, `uv_max` |
| Pollen | Pollens (RNSA), Atmo France, Google Pollen, any sensor named after a pollen species (levels 0–5 or 0–6, or words in French or English) | `pollen` (a list), `pollen_risk` |
| Air quality | Any `aqi` sensor (Atmo France, WAQI, AirVisual…) | `aqi` |
| Sun | `sun.sun` | `sun` |

## Installation

### HACS (recommended)

1. Open HACS → **Frontend**
2. Menu (⋮) → **Custom repositories**
3. Add `https://github.com/juju35/ha-weather-card` with category **Dashboard**
4. Search for **Weather Plus Card** and install it
5. Reload the browser

### Manual

1. Download `ha-weather-card.js` from the [latest release](https://github.com/juju35/ha-weather-card/releases/latest)
2. Copy it to `config/www/ha-weather-card.js`
3. Add the resource in **Settings → Dashboards → Resources**: URL `/local/ha-weather-card.js`, type **JavaScript module**

## Configuration

Everything is optional: with no option at all, the card takes the first weather entity and every sensor it recognizes.

```yaml
type: custom:weather-plus-card
```

```yaml
type: custom:weather-plus-card
entity: weather.paris
name: Home
sections: [alerts, rain, hourly, daily, pollen]
hours: 18
days: 7
entities:
  uv: sensor.openuv_current_uv_index
  vigieau: sensor.alert_level_in_paris
  pollen:
    - sensor.pollens_75_graminees
    - sensor.pollens_75_bouleau
```

```yaml
type: custom:weather-plus-mini-card
entity: weather.paris
```

| Option | Type | Default | Description |
|---|---|---|---|
| `entity` | string | first `weather.*` | The weather entity |
| `name` | string | its name | Card title |
| `sections` | list | `[alerts, rain, hourly, daily, uv, pollen, sun]` | Sections shown, in this order |
| `hours` | number | `12` | Hours of the hourly forecast |
| `days` | number | `5` | Days of the daily forecast |
| `animations` | boolean | `true` | Animate the scene and the sections |
| `zoom` | boolean | `true` | Mini card: detail button to unfold the full card |
| `entities` | map | detected | Overrides of the detected entities, by role (see [Supported integrations](#supported-integrations)) |
| `language` | string | HA language | `en` or `fr` |

## Screenshots

| | Light | Dark (French) |
|---|---|---|
| Weather card | ![](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/card.png) | ![](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/card-dark.png) |
| Storm, orange warning | ![](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/storm.png) | ![](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/storm-dark.png) |
| Night | ![](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/night.png) | ![](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/night-dark.png) |
| Mini card | ![](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/mini.png) | ![](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/mini-dark.png) |
| Conditions | ![](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/conditions.png) | ![](https://raw.githubusercontent.com/juju35/ha-weather-card/main/screenshots/conditions-dark.png) |

## Development

```bash
npm install
npm run build        # bundles src/*.js into dist/ha-weather-card.js and stamps the version of package.json
npm run check        # builds and checks the bundle (run in CI)
npm test             # unit tests, no browser
npm run screenshots  # renders the cards with mock data into screenshots/, and the animated scenes.gif (needs ffmpeg)
```

`src/shared.js` holds the i18n, the entity discovery, the mini card and the editor, `src/scene.js` the animated scenes, `src/sections.js` the sections and the styles, and `src/weather-plus-card.js` the cards; the build concatenates them into the single HACS file. `dist/` is not committed: `npm run build` creates it locally, CI builds it on every push, and the release workflow attaches the built file to the release, which is where HACS downloads it from.

### Releasing

1. Bump `version` in `package.json`
2. Add a `## <version>` section at the top of [CHANGELOG.md](CHANGELOG.md)
3. Push to `main`: the **Release** workflow builds the bundle, creates the tag and the GitHub release with the changelog section as notes, and attaches `ha-weather-card.js`

## Translations

The cards auto-detect the language from your Home Assistant settings. Currently supported:

| Language | Code |
|---|---|
| English | `en` |
| Français | `fr` |

Contributions for additional languages are welcome!

## License

[MIT](LICENSE)
