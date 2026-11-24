/*
 * The sections of the weather card, in the order of `sections`: each one draws itself from the card's model and
 * returns nothing when it has no data, so that a missing integration simply hides its section.
 */

export const WX_CARDINALS = {
  en: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  fr: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
  de: ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  es: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
  sr: ["С", "ССИ", "СИ", "ИСИ", "И", "ИЈИ", "ЈИ", "ЈЈИ", "Ј", "ЈЈЗ", "ЈЗ", "ЗЈЗ", "З", "ЗСЗ", "СЗ", "ССЗ"],
  "sr-Latn": ["S", "SSI", "SI", "ISI", "I", "IJI", "JI", "JJI", "J", "JJZ", "JZ", "ZJZ", "Z", "ZSZ", "SZ", "SSZ"],
  it: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
  nl: ["N", "NNO", "NO", "ONO", "O", "OZO", "ZO", "ZZO", "Z", "ZZW", "ZW", "WZW", "W", "WNW", "NW", "NNW"],
  pt: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSO", "SO", "OSO", "O", "ONO", "NO", "NNO"],
  pl: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"],
  ro: ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSV", "SV", "VSV", "V", "VNV", "NV", "NNV"],
  da: ["N", "NNØ", "NØ", "ØNØ", "Ø", "ØSØ", "SØ", "SSØ", "S", "SSV", "SV", "VSV", "V", "VNV", "NV", "NNV"],
  sv: ["N", "NNO", "NO", "ONO", "O", "OSO", "SO", "SSO", "S", "SSV", "SV", "VSV", "V", "VNV", "NV", "NNV"],
  bg: ["С", "ССИ", "СИ", "ИСИ", "И", "ИЮИ", "ЮИ", "ЮЮИ", "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ"],
  ru: ["С", "ССВ", "СВ", "ВСВ", "В", "ВЮВ", "ЮВ", "ЮЮВ", "Ю", "ЮЮЗ", "ЮЗ", "ЗЮЗ", "З", "ЗСЗ", "СЗ", "ССЗ"],
  uk: ["Пн", "ПнПнСх", "ПнСх", "СхПнСх", "Сх", "СхПдСх", "ПдСх", "ПдПдСх", "Пд", "ПдПдЗх", "ПдЗх", "ЗхПдЗх", "Зх", "ЗхПнЗх", "ПнЗх", "ПнПнЗх"],
  hu: ["É", "ÉÉK", "ÉK", "KÉK", "K", "KDK", "DK", "DDK", "D", "DDNy", "DNy", "NyDNy", "Ny", "NyÉNy", "ÉNy", "ÉÉNy"],
  sk: ["S", "SSV", "SV", "VSV", "V", "VJV", "JV", "JJV", "J", "JJZ", "JZ", "ZJZ", "Z", "ZSZ", "SZ", "SSZ"],
  cs: ["S", "SSV", "SV", "VSV", "V", "VJV", "JV", "JJV", "J", "JJZ", "JZ", "ZJZ", "Z", "ZSZ", "SZ", "SSZ"],
  sl: ["S", "SSV", "SV", "VSV", "V", "VJV", "JV", "JJV", "J", "JJZ", "JZ", "ZJZ", "Z", "ZSZ", "SZ", "SSZ"],
  lv: ["Z", "ZZA", "ZA", "AZA", "A", "ADA", "DA", "DDA", "D", "DDR", "DR", "RDR", "R", "RZR", "ZR", "ZZR"],
  el: ["Β", "ΒΒΑ", "ΒΑ", "ΑΒΑ", "Α", "ΑΝΑ", "ΝΑ", "ΝΝΑ", "Ν", "ΝΝΔ", "ΝΔ", "ΔΝΔ", "Δ", "ΔΒΔ", "ΒΔ", "ΒΒΔ"],
};

// A wind bearing in degrees, or already a cardinal point ("NW"), as { deg, label }.
export function wxBearing(lang, b) {
  const n = wxNumber(b);
  const en = WX_CARDINALS.en;
  if (n == null) {
    const i = en.indexOf(String(b ?? "").toUpperCase());
    return i < 0 ? null : { deg: i * 22.5, label: (WX_CARDINALS[lang] || en)[i] };
  }
  const i = Math.round((((n % 360) + 360) % 360) / 22.5) % 16;
  return { deg: n, label: (WX_CARDINALS[lang] || en)[i] };
}

// A colour for a temperature in °C (cold blue → mild green → hot red), for the daily range bars.
export const WX_TEMP_STOPS = [
  [-10, [92, 107, 192]],
  [0, [41, 182, 246]],
  [10, [38, 198, 218]],
  [16, [102, 187, 106]],
  [22, [255, 202, 40]],
  [28, [251, 140, 0]],
  [35, [229, 57, 53]],
];
export function wxTempColor(c) {
  const s = WX_TEMP_STOPS;
  if (c <= s[0][0]) return `rgb(${s[0][1]})`;
  for (let i = 1; i < s.length; i++) {
    if (c <= s[i][0]) {
      const k = (c - s[i - 1][0]) / (s[i][0] - s[i - 1][0]);
      return `rgb(${s[i][1].map((v, j) => Math.round(s[i - 1][1][j] + (v - s[i - 1][1][j]) * k)).join(",")})`;
    }
  }
  return `rgb(${s.at(-1)[1]})`;
}
export const wxToC = (t, unit) => (/F/.test(unit || "") ? ((t - 32) * 5) / 9 : t);

// The icon in front of each section heading.
export const WX_SECTION_ICONS = {
  alerts: "mdi:alert-outline",
  rain: "mdi:weather-rainy",
  hourly: "mdi:clock-outline",
  daily: "mdi:calendar-range",
  uv: "mdi:sun-wireless-outline",
  air: "mdi:air-filter",
  pollen: "mdi:flower-pollen",
  sun: "mdi:weather-sunset",
  moon: "mdi:moon-waning-crescent",
  wind: "mdi:compass-rose",
};

export const wxSectionTitle = (card, key, extra = "") =>
  `<div class="section-title"><ha-icon icon="${WX_SECTION_ICONS[key]}"></ha-icon><span>${wxEsc(card._t(`s_${key}`))}</span>${extra}</div>`;

export const wxChip = (icon, text, { color, cls = "", more, title, style } = {}) =>
  `<span class="chip ${cls}"${color ? ` style="--k:${color}${style ? `;${style}` : ""}"` : style ? ` style="${style}"` : ""}${
    more ? ` data-more="${wxEsc(more)}" role="button" tabindex="0"` : ""
  }${title ? ` title="${wxEsc(title)}"` : ""}><ha-icon icon="${icon}"></ha-icon><span class="ct">${wxEsc(text)}</span></span>`;
