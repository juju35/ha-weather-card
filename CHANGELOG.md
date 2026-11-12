# Changelog

## 1.12.0 - 2026-11-12

### Features
- `show_title` and `show_subtitle` options (also in the visual editor) hide the header's title and its subtitle (the condition), separately, for a card placed under a section heading of its own (asked in juju35/ha-vehicle-card#72).

## 1.11.1 - 2026-11-09

### Fixes
- Translations: the cards are defined once the page's language file has arrived (at most 1.5 s; Home Assistant builds a card when its element gets defined), so the first render is already translated instead of English then redrawn; until a language file is in, a missing text reads the English one wherever the card has no fallback of its own.

## 1.11.0 - 2026-11-09

### Performance
- **Translations load on demand**: the bundle keeps English only (324 KB → 163 KB) and each other language is its own `ha-weather-card.i18n.<lang>.js` file next to it, fetched the first time a card needs it. Home Assistant loads every dashboard resource on every dashboard, so each page used to download and parse all 22 languages to use one. Until a language file has arrived (a few milliseconds), texts fall back to English, and the cards redraw once it is there.

### Maintenance
- Build: `scripts/i18n-split.mjs` splits the built bundle and rebuilds every table from the split files to check them (the build fails on any difference); `src/` keeps every language as before.
- Release: every file of `dist/` is attached. Manual installation copies the translation files too.

## 1.10.2 - 2026-11-08

### Fixes
- When the Home Assistant profile uses the server time zone, "Today" in the daily forecast, the day the daily list starts from and the day of dawn, dusk, golden hour and moonrise follow that time zone too, instead of the browser's.
- A forecast entry without a valid `datetime` is left out of the daily forecast instead of stopping the card from rendering.

## 1.10.1 - 2026-11-07

### Fixes
- The pressure trend reads its 1 hPa threshold in the unit of its source (a pressure sensor in inHg, Pa or mmHg, or the weather entity's own unit), and its tooltip shows the change in that unit. The hourly precipitation bars read amounts in inches or centimetres as their millimetre equivalent.
- Times (hourly forecast, sunrise and sunset, twilight, moonrise and moonset, the next storm) follow the 12/24 h format of the Home Assistant profile and, when the profile uses the server time zone, that time zone.
- Full screen detail: Tab and Shift+Tab stay inside it, going round its controls instead of reaching the page behind.
- The card picker shows the cards' name and description in the Home Assistant language.

## 1.10.0 - 2026-11-07

### New
- Weather warning banner: the new `warning_entities` option shows the warnings of Meteoalarm, DWD, NWS alerts or Météo-France sensors under the header, with their title in their level's colour, and hides itself when there is none.
- The animations pause while the card is off-screen or the browser tab is hidden, and go on when it shows again.
- Mini card: its height follows its content in a Sections view (`rows: auto`).

### Fixes
- The minute timer is cleared before it is started again, so a card attached again without being detached keeps a single timer.

## 1.9.9 - 2026-11-04

### Documentation
- README: images and links use absolute URLs, so the screenshots, icons, badges and links display in HACS (relative paths broke there).
- README: screenshots get a display size, so cards no longer show oversized in HACS and on GitHub.

## 1.9.8 - 2026-11-04

### New
- Added Romanian, Danish, Swedish, Bulgarian, Russian, Ukrainian, Hungarian, Slovak, Czech, Slovenian, Latvian and Greek translations (`ro`, `da`, `sv`, `bg`, `ru`, `uk`, `hu`, `sk`, `cs`, `sl`, `lv`, `el`), with their wind directions and in the editor's language list.

## 1.9.7 - 2026-11-02

### Fixes
- Mini card: the header badge keeps its full size (40px, a 24px icon) in the compact view, like the full card. It still steps aside on the narrowest cards.

## 1.9.6 - 2026-11-02

### Fixes
- A clear night reported while the sun is up now shows as sunny: the sun, the day scene, the "Sunny" label and pill, the sunny icon. Météo-France keeps its "Nuit claire" for a while after sunrise; `sun.sun` now decides day or night, as it already did for the other conditions. The hourly and daily forecasts do the same with a daytime "clear-night". Without `sun.sun` the provider's condition is kept as is.

## 1.9.5 - 2026-11-01

### Fixes
- Narrow cards in a Sections view: the mini card at its default size (6 columns) no longer loses its title. The title keeps at least a few letters, the status pill shows its coloured dot only (its text stays in the tooltip), and on the narrowest cards the badge and then the scene step aside so the temperature stays whole. This holds when the weather entity is unavailable or unknown too: the refresh and detail buttons stay inside the card.
- The status pill reads its whole label wherever there is room for it (no more "Yellow w…" next to a long title on a normal-width card); it is shortened only once the title is down to a few letters.
- In a card sized by its content (layout-card, a grid column set to `auto`, an inline block) the card keeps a usable width instead of collapsing to a sliver, and in a two-column grid, a grid card or a horizontal stack it still shrinks to its column instead of overflowing it, also when the card is wrapped in another element there (it took 326px, 206px for the mini card, whatever its column). The mini card unfolded in such a container takes the full card's width again, so its moon phase dates are no longer cut.
- On a narrow card the pollen and air quality names are no longer cut (one column), and on the mini card the rain in the next hour wraps rather than losing its time.
- Opening or closing the full screen detail, or unfolding the mini card from the keyboard, no longer scrolls the page.
- The full card at its narrowest no longer cuts the daily highs or the chips: the scene gets smaller, the daily rows drop their range bar, and a chip too long for the card ends with "…" instead of being cut off. The full card now asks for 9 columns at least (12 by default); the mini card keeps 6.
- Serbian: the status pill now reads "Žuto upozorenje" / "Жуто упозорење" (and orange, red) instead of a masculine colour.
- The number of lightning strikes follows each language's plural rules: "21 udar" in Serbian, as "1 udar".

## 1.9.4 - 2026-11-01

### New
- Added Italian, Dutch, European Portuguese and Polish translations (`it`, `nl`, `pt`, `pl`), with their wind directions and in the editor's language list. Brazilian Portuguese (`pt-BR`) falls back on European Portuguese.

## 1.9.3 - 2026-11-01

### New
- Serbian translations, Cyrillic (`sr`) and Latin (`sr-Latn`), with their wind directions. Serbian translations by @cpmarexel2f (#15).
- Language: a Home Assistant language with a region or script now uses its own dictionary when the card has one (`sr-Latn`), before the base language (`fr-FR` still gives French) and English.

## 1.9.2 - 2026-11-01

### Fixes
- Text drawn in a level colour is now readable on light themes as well as dark ones: the UV level and its figure (yellow "Moderate" was barely visible on white), the air quality and pollen levels, the tinted chips, the status pill, the rain chances and strong wind figures now reach the WCAG AA contrast. The badges, dots, bars and icons keep their level colours.
- With the system's reduce motion setting, the card's colour and arrow transitions no longer play either.

## 1.9.1 - 2026-10-31

### Fixes
- With `animations: false`, the refresh button's icon now turns while the integrations answer, on the card and in the full screen detail, instead of only changing colour; the rest of the card stays still. The system's reduce motion setting still keeps it still.

## 1.9.0 - 2026-10-30

### New
- Refresh button at the top right of the card, of the unfolded mini card and of the full screen detail: it asks every integration behind the card (weather, rain in the next hour, alerts, sensors) for fresh data at once, and its icon turns until they have answered. It also shows when the weather is unavailable, to retry. `refresh: false` (or the editor's "Refresh button" switch) removes it.

## 1.8.5 - 2026-10-29

### Fixes
- Rain in the next hour: "Heavy rain in N min" and "stopping in N min" now count from now instead of from the time Météo-France issued its forecast, and keep counting down every minute between two forecast updates, on the card, the mini card and the full screen detail. The bar drops the minutes already gone, and a forecast more than an hour old is no longer shown.

## 1.8.4 - 2026-10-29

### Fixes
- The full screen detail no longer closes when the dashboard rearranges its columns — turning a phone to landscape or resizing the window in a masonry view; it still closes when the card is removed.

## 1.8.3 - 2026-10-29

### Fixes
- An entity opened from the full screen detail (a chip, a section or the title) now shows its details over the dashboard: the full screen closes first, so the details are no longer hidden behind it on older Home Assistant releases, and the back button no longer needs an extra press once they are closed.
- Closing any Home Assistant dialog opened over the full screen detail no longer closes the full screen too; the back button still does.

## 1.8.2 - 2026-10-29

### Fixes
- The card no longer rebuilds itself — restarting its animations and rewriting the open full screen detail — every 15 minutes when the pressure history is refreshed: it only updates when the pressure trend actually changed.

## 1.8.1 - 2026-10-29

### Fixes
- The full screen detail no longer jumps back to the top (nor replays its opening animation or loses the focus) when a sensor updates; the hourly forecast keeps its horizontal scroll, on the card too.
- The card no longer rebuilds itself — restarting its animations — every few minutes as the sun moves: the sun's dot slides along its arc in place.
- A configured entity that does not exist no longer makes the card search the whole instance again on every update.
- On a narrow card, a long status (German or Spanish labels, lightning distance) is shortened with an ellipsis instead of hiding the title and pushing the buttons out of the card.
- Wind in Beaufort: strong hours are highlighted from force 7.
- A forecast day without temperatures shows no broken range bar.
- Forecasts arriving late from a previous weather entity no longer mix into the current one.
- Spanish: *Sensación térmica* for the feels-like temperature; German: *Stabil seit 3 h* for a steady pressure.

## 1.8.0 - 2026-10-28

### Changes
- German and Spanish translations: every label of the card, the mini card, the full screen detail and the visual editor, picked from the Home Assistant language or the `language` option (`de`, `es`), with the compass points of the wind in each language.

## 1.7.1 - 2026-10-28

### Fixes
- Scene animations no longer restart every minute: the card stopped rebuilding itself on each minute tick, which also dropped open tooltips.
- An entity replaced by another in the same update (one removed, one added) is detected again instead of the card reading an entity that no longer exists.
- The daily forecast no longer shows yesterday next to Today with providers that still serve the previous day.
- Zero rain totals are hidden consistently (*Next 6 h: 0 mm* showed only when a today total existed).
- An hour without a temperature no longer makes the hourly curve dive to the minimum: its point is interpolated between its neighbours.
- The strong-wind highlight of the hourly forecast follows the wind unit (about 50 km/h whatever the unit, instead of 50 in the raw unit).
- Lighter updates on large instances: the states are counted once per change.

## 1.7.0 - 2026-10-26

### Changes
- **Mini card**: the full-screen button now shows directly on the compact mini card, beside the detail button — no need to expand it first.

## 1.6.0 - 2026-10-26
### Changes
- Header icon sized like the other ha-* cards: 24px in the 40px round badge (card and full screen detail), 20px in the mini card's 32px badge.
- Mini card: the title is 16px like the full card's (it was 14px), and the compact view has a single button at the top right, the detail one. The **Full screen** button shows once the card is unfolded, like on the full card, and a click in the full screen detail no longer folds the card behind it.
- Section headings get the shared look of the ha-* cards: a 16px icon in front (alerts, rain, hourly, forecast, air quality, UV, pollen, sun, moon), the *tomorrow* chip staying on the right.
- The temperature is 30px / 400 with a 14px unit like the main value of the other ha-* cards (it was 40px / 300 with an 18px unit), 24px on the mini card (it was 30px). The full screen detail keeps its larger temperature.
- The body starts 8px under the header (it was 12px), like the other ha-* cards.

## 1.5.0 - 2026-10-25

### Changes
- Night scenes for every condition: the moon, in today's phase, peeks above the clouds of rain, showers, storms, snow and hail, sits beside the clouds when cloudy and above the fog or the wind; the clouds take blue-grey night tones and the sky a night-blue halo. Still animated: the moon floats and its halo breathes, stars twinkle, clouds drift past it, rain and snow fall, lightning flashes.

## 1.4.1 - 2026-10-25

### Fixes
- The full screen detail opened only once: closing it removed it from the page twice, the second removal failed and left it marked as open.
- Full screen detail on a wide screen, without lost space: the weather now beside the alerts and the rain, the hourly forecast across the whole width, the other sections in balanced columns (two, three from 1200 px). On a phone it stays in one column.
- The full screen detail stays opaque with a translucent theme: the page behind is blurred and darkened.
- The hourly forecast fills the width it is given, the temperature curve stretching with it.

## 1.4.0 - 2026-10-25

### Changes
- **Full screen detail**: a button at the top right of the card and the mini card opens the detail over the whole screen and its width — a larger scene, the sections side by side as the width allows, 24 hours and 10 days of forecast. It closes with its button, Escape, a click outside, or the back button on a phone. `popup: false` removes the button.
- Hourly forecast: the wind of each hour, an arrow pointing where it blows with its speed, the gusts on hover, strong gusts (50 km/h and up) highlighted.
- Rain: today's rainfall (Météo-France *daily precipitation*) and the forecast totals for the next 6 and 24 hours.
- Pressure trend over 3 hours from the recorder's history, on the pressure chip (rising, falling or steady, the change on hover); cloud cover chip.
- Air quality and pollen: tomorrow's level next to the section title from Atmo France's *-J+1* sensors, and in the alerts when tomorrow gets poor or high.
- Sun: dawn, golden hour and dusk; moon: moonrise and moonset. Computed for Home Assistant's location, no integration needed.

### Fixes
- The status pill stays readable in a light theme (a yellow warning was yellow on pale yellow).

## 1.3.0 - 2026-10-25

### Changes
- New **moon** section (`moon`, in the default sections): today's moon drawn in its real phase, its name (*Gibbeuse croissante*), how much of it is lit and its day in the cycle, and the dates of the next full and new moons. The phase is computed from the date, so no integration is needed; the Moon integration's `sensor.moon_phase` names it when it is there. Mirrored in the southern hemisphere.
- The night scenes draw the moon in today's phase, with its unlit part faintly visible and a halo as bright as the moon is full.

## 1.2.0 - 2026-10-25

### Changes
- **Pollen** section laid out like the air quality one: the overall risk in a round badge with its level, advice and main species, the scale, then each species on six levels. Atmo France's top level (*extremely high*, 6) is no longer folded into 5. Without a risk sensor, the most present species gives the risk.
- Hero chip *Pollen: low* / *Pollens : faible* in the colour of the level; a high risk (4 and up) also shows in the alerts and on the mini card.
- Weather warnings in plain words with their colour: *Fortes vagues · jaune*, *Fortes pluies · orange*, *Neige et verglas · jaune*… The official name and what it means are in the chip's tooltip (*Vigilance vagues-submersion : fortes vagues, submersion du littoral possible*).
- Niak Weather's pollen sensor is read as the overall pollen risk when no other one is found.

## 1.1.0 - 2026-10-25

### Changes
- New **air quality** section (`air`, in the default sections): the index with its level, advice and zone, then PM2.5, PM10, ozone, NO₂ and SO₂ on the six levels of the index, the most degraded first. Atmo France levels are read as they are; WAQI, AirVisual, Google Air Quality, Airly or sensor.community concentrations are placed on the European EAQI thresholds. Override them with `entities: { air: { pm25: …, o3: … } }`.
- The hero chip reads *Air: fair* / *Air : moyen* in the colour of the level, instead of *AQI 2*; a poor air (level 4 and up) also shows in the alerts and on the mini card.
- Niak Weather: its official warning (`phenomenes`), water restrictions (with the restricted uses) and storm sensor (strikes and nearest distance) are read.

### Fixes
- Météo-France's UV sensor (`…_forecast_for_city_…_uv`) was not detected.
- The rain in the next hour could pick another integration's "rain in" duration sensor and stay empty: only a sensor with the minute-by-minute forecast is taken now.
- Atmo France's pollen concentration and day-ahead (*-J+1*) sensors are no longer taken for today's levels; an indoor air purifier's PM2.5 is never taken for outdoor air.

## 1.0.1 - 2026-10-25

### Fixes
- Clearer alert labels: *Lightning 18 km away (12 strikes)* / *Foudre à 18 km (12 impacts)*, *Drought: alert* / *Sécheresse : alerte*, *No water restriction*.
- Tinted chips stay readable on every theme: the text is mixed with the theme's text colour (a crisis level was purple on purple).
- Night scenes: the stars twinkle in their place instead of piling up in the top left corner.
- The card title leaves out the provider's boilerplate: *Météo-France forecast for city Rennes* shows as *Rennes*.
- The hourly precipitation bars only show when an hour has some precipitation.

## 1.0.0 - 2026-10-25

### Changes
- First release: `custom:weather-plus-card` and `custom:weather-plus-mini-card`.
- Animated scene for every weather condition, by day and by night: turning sun, drifting clouds, falling rain, snow and hail, flashing lightning, rolling fog, gusts of wind.
- Sections: weather warnings (Météo-France), drought restrictions (VigiEau), lightning nearby (Blitzortung) and storms in the forecast; rain in the next hour (Météo-France); hourly forecast with a temperature curve and precipitation bars; daily forecast with temperature range bars; UV index with its advice; pollen by species; sun course.
- Automatic discovery of the weather entity and of the sensors of the integrations around it, overridable by role with `entities`.
- Visual editor, English and French, light and dark themes.
