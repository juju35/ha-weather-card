// The time zone and the clock of every shot, imported before anything reads a date.
// The mock home is in Paris: its sun.sun times are wall-clock hours of the process, while dawn, dusk and the golden
// hour come from Paris' coordinates. Both only agree in Paris time, so the shots are drawn in it whatever the
// machine's own zone (UTC on the CI runners); the browser gets the same zone (TZ, in harness.mjs).
export const TZ = "Europe/Paris";
process.env.TZ = TZ;

// An October afternoon (or `night`), the forecasts drawn around it.
export const DAY = new Date(2026, 9, 21, 14, 10);
export const NIGHT = new Date(2026, 9, 21, 22, 40);
