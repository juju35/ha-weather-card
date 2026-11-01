// Focus given back after a re-render (the zoom button replaced by its twin, the popup's close button, the popup
// button once the popup closes) must not scroll the page: every focus() call passes { preventScroll: true }.
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";
import { makeHass, NOON } from "./hass.mjs";
import { load, mount } from "./load.mjs";

const lib = load(NOON);
// A button stand-in that records the arguments of its focus() calls.
const button = () => ({ calls: [], focus(...a) { this.calls.push(a); }, dataset: {}, isConnected: true });
const noScroll = (b) => {
  assert.equal(b.calls.length, 1, "focused once");
  assert.equal(b.calls[0][0]?.preventScroll, true, `focus(${JSON.stringify(b.calls[0][0])}) scrolls the page`);
};

test("focus: every focus() call in the sources keeps the page where it is", () => {
  const src = new URL("../src/", import.meta.url);
  const calls = [];
  for (const f of readdirSync(src).filter((n) => n.endsWith(".js")))
    for (const [i, line] of readFileSync(new URL(f, src), "utf8").split("\n").entries())
      for (const m of line.matchAll(/\.focus(?:\?\.)?\(([^)]*)\)/g)) calls.push([`${f}:${i + 1}`, m[1]]);
  assert.ok(calls.length >= 4, `${calls.length} calls found`);
  for (const [at, arg] of calls) assert.match(arg, /preventScroll:\s*true/, at);
});

test("focus: the zoom button toggled from the keyboard hands its focus to its twin without scrolling", () => {
  const el = mount(lib, "weather-plus-mini-card", {}, makeHass());
  const zoom = button();
  el.shadowRoot.querySelector = (sel) => (sel === ".zoom" ? zoom : null);
  el._toggleZoom({ detail: 0 });
  assert.equal(el._zoomed, true);
  noScroll(zoom);
});

test("focus: opening and closing the full screen detail moves the focus without scrolling", () => {
  const el = mount(lib, "weather-plus-card", {}, makeHass());
  const close = button();
  const create = lib.document.createElement;
  lib.document.createElement = (t) => {
    const n = create(t);
    const attach = n.attachShadow;
    n.attachShadow = function (o) {
      const r = attach.call(this, o);
      r.querySelector = (sel) => (sel === ".close" ? close : null);
      return r;
    };
    return n;
  };
  try {
    el._onClick({ composedPath: () => [{ dataset: { action: "popup" } }] });
  } finally {
    lib.document.createElement = create;
  }
  assert.ok(el._popup, "the popup is open");
  noScroll(close);
  const popupButton = button();
  el.shadowRoot.querySelector = (sel) => (sel === '[data-action="popup"]' ? popupButton : null);
  el._closePopup();
  noScroll(popupButton);
});
