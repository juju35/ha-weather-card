# Changelog

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
