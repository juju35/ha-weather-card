/*
 * Sun and moon positions for the observer's place (Home Assistant's latitude and longitude), with the low-precision
 * formulas of the Astronomical Almanac: a minute or two on the times of the day's events, which is all the card needs.
 * The events are found by sampling the altitude every 10 minutes over the local day and interpolating each crossing.
 */
const WX_RAD = Math.PI / 180;
const WX_OBLIQUITY = 23.4397 * WX_RAD;

// Days since J2000.0 (1 Jan 2000, 12:00 TT).
const wxJ2000 = (date) => new Date(date).getTime() / 864e5 - 10957.5;

const wxRightAscension = (l, b) => Math.atan2(Math.sin(l) * Math.cos(WX_OBLIQUITY) - Math.tan(b) * Math.sin(WX_OBLIQUITY), Math.cos(l));
const wxDeclination = (l, b) => Math.asin(Math.sin(b) * Math.cos(WX_OBLIQUITY) + Math.cos(b) * Math.sin(WX_OBLIQUITY) * Math.sin(l));

// Ecliptic longitude and latitude of each body, in radians, `d` days after J2000.
const WX_BODIES = {
  sun(d) {
    const m = (357.5291 + 0.98560028 * d) * WX_RAD;
    const c = (1.9148 * Math.sin(m) + 0.02 * Math.sin(2 * m) + 0.0003 * Math.sin(3 * m)) * WX_RAD;
    return { l: m + c + 102.9372 * WX_RAD + Math.PI, b: 0 };
  },
  moon(d) {
    const l = (218.316 + 13.176396 * d) * WX_RAD;
    const m = (134.963 + 13.064993 * d) * WX_RAD;
    const f = (93.272 + 13.22935 * d) * WX_RAD;
    return { l: l + 6.289 * WX_RAD * Math.sin(m), b: 5.128 * WX_RAD * Math.sin(f) };
  },
};

// Altitude of `body` above the horizon, in degrees, seen from (lat, lon) at `date`.
function wxAltitude(body, date, lat, lon) {
  const d = wxJ2000(date);
  const { l, b } = WX_BODIES[body](d);
  const ra = wxRightAscension(l, b);
  const dec = wxDeclination(l, b);
  const hourAngle = (280.16 + 360.9856235 * d + lon) * WX_RAD - ra;
  const phi = lat * WX_RAD;
  return Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(hourAngle)) / WX_RAD;
}

// The times `body` crosses `h0` degrees on the local day of `date`: { up: [dates], down: [dates] }.
function wxCrossings(body, date, lat, lon, h0) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const step = 10 * 60000;
  const up = [];
  const down = [];
  let t0 = start.getTime();
  let a0 = wxAltitude(body, t0, lat, lon) - h0;
  for (let i = 1; i <= 144; i++) {
    const t1 = start.getTime() + i * step;
    const a1 = wxAltitude(body, t1, lat, lon) - h0;
    if ((a0 < 0) !== (a1 < 0)) {
      const t = new Date(t0 + (step * a0) / (a0 - a1));
      (a1 > a0 ? up : down).push(t);
    }
    t0 = t1;
    a0 = a1;
  }
  return { up, down };
}

// Moonrise and moonset of the day (either may be missing: the moon rises about 50 minutes later every day).
// +0.13°: the moon's parallax, minus refraction and its half-diameter.
function wxMoonTimes(date, lat, lon) {
  const c = wxCrossings("moon", date, lat, lon, 0.13);
  return { rise: c.up[0] || null, set: c.down[0] || null };
}

// Dawn and dusk (civil twilight, sun at −6°) and the golden hours (sun below 6°, above the horizon).
function wxSunTimes(date, lat, lon) {
  const civil = wxCrossings("sun", date, lat, lon, -6);
  const golden = wxCrossings("sun", date, lat, lon, 6);
  const horizon = wxCrossings("sun", date, lat, lon, -0.833);
  return {
    dawn: civil.up[0] || null,
    dusk: civil.down[0] || null,
    goldenMorning: horizon.up[0] && golden.up[0] ? [horizon.up[0], golden.up[0]] : null,
    goldenEvening: golden.down[0] && horizon.down[0] ? [golden.down[0], horizon.down[0]] : null,
  };
}
