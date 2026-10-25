// The mock home of the screenshots, with a recorded callService and a forecast subscription answered at once.
import { mockHass } from "../scripts/screenshots/mock.mjs";

// 14:10 on a fixed day: the sun is up, the forecasts start at 14:00.
export const NOON = new Date(2026, 9, 25, 14, 10);

export const makeHass = (lang = "en", changes = {}, now = NOON) => {
  const hass = mockHass(lang, changes, now);
  hass.calls = [];
  hass.subscriptions = [];
  hass.callService = (domain, service, data) => {
    hass.calls.push([domain, service, data]);
    return Promise.resolve();
  };
  hass.connection = {
    subscribeMessage(cb, msg) {
      hass.subscriptions.push(msg);
      cb({ type: msg.forecast_type, forecast: hass.forecasts[msg.forecast_type] });
      return Promise.resolve(() => {});
    },
  };
  return hass;
};
