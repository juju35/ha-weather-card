# Changelog

## 1.2.0

### Changes
- **Pollen** section laid out like the air quality one: the overall risk in a round badge with its level, advice and main species, the scale, then each species on six levels. Atmo France's top level (*extremely high*, 6) is no longer folded into 5. Without a risk sensor, the most present species gives the risk.
- Hero chip *Pollen: low* / *Pollens : faible* in the colour of the level; a high risk (4 and up) also shows in the alerts and on the mini card.
- Weather warnings in plain words with their colour: *Fortes vagues · jaune*, *Fortes pluies · orange*, *Neige et verglas · jaune*… The official name and what it means are in the chip's tooltip (*Vigilance vagues-submersion : fortes vagues, submersion du littoral possible*).
- Niak Weather's pollen sensor is read as the overall pollen risk when no other one is found.

## 1.1.0

### Changes
- New **air quality** section (`air`, in the default sections): the index with its level, advice and zone, then PM2.5, PM10, ozone, NO₂ and SO₂ on the six levels of the index, the most degraded first. Atmo France levels are read as they are; WAQI, AirVisual, Google Air Quality, Airly or sensor.community concentrations are placed on the European EAQI thresholds. Override them with `entities: { air: { pm25: …, o3: … } }`.
- The hero chip reads *Air: fair* / *Air : moyen* in the colour of the level, instead of *AQI 2*; a poor air (level 4 and up) also shows in the alerts and on the mini card.
- Niak Weather: its official warning (`phenomenes`), water restrictions (with the restricted uses) and storm sensor (strikes and nearest distance) are read.

### Fixes
- Météo-France's UV sensor (`…_forecast_for_city_…_uv`) was not detected.
- The rain in the next hour could pick another integration's "rain in" duration sensor and stay empty: only a sensor with the minute-by-minute forecast is taken now.
- Atmo France's pollen concentration and day-ahead (*-J+1*) sensors are no longer taken for today's levels; an indoor air purifier's PM2.5 is never taken for outdoor air.

## 1.0.1

### Fixes
- Clearer alert labels: *Lightning 18 km away (12 strikes)* / *Foudre à 18 km (12 impacts)*, *Drought: alert* / *Sécheresse : alerte*, *No water restriction*.
- Tinted chips stay readable on every theme: the text is mixed with the theme's text colour (a crisis level was purple on purple).
- Night scenes: the stars twinkle in their place instead of piling up in the top left corner.
- The card title leaves out the provider's boilerplate: *Météo-France forecast for city Rennes* shows as *Rennes*.
- The hourly precipitation bars only show when an hour has some precipitation.

## 1.0.0

### Changes
- First release: `custom:weather-plus-card` and `custom:weather-plus-mini-card`.
- Animated scene for every weather condition, by day and by night: turning sun, drifting clouds, falling rain, snow and hail, flashing lightning, rolling fog, gusts of wind.
- Sections: weather warnings (Météo-France), drought restrictions (VigiEau), lightning nearby (Blitzortung) and storms in the forecast; rain in the next hour (Météo-France); hourly forecast with a temperature curve and precipitation bars; daily forecast with temperature range bars; UV index with its advice; pollen by species; sun course.
- Automatic discovery of the weather entity and of the sensors of the integrations around it, overridable by role with `entities`.
- Visual editor, English and French, light and dark themes.
