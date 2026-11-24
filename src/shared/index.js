// Entry point: the card's modules in their original order. scripts/bundle.mjs concatenates them in this order into the
// single classic script the card ships as.
import "./card-picker.js";
import "./core.js";
import "./i18n/wx-i18n.js";
import "./i18n-helpers.js";
import "./shadow-dom-patching.js";
import "./conditions.js";
import "./scales.js";
import "./discovery.js";
import "./base-element.js";
import "./mini-card.js";
import "./editor.js";
