# Changelog

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
