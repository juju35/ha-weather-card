// Records the animated scenes into screenshots/scenes.gif (needs ffmpeg).
// Usage: npm install && npm run build && node scripts/screenshots/animation.mjs
// The animations are paused and stepped frame by frame, so the GIF loops cleanly whatever the machine's speed.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addCards, DAY, launch, NIGHT, openPage, root } from "./harness.mjs";
import { conditionCards } from "./weather.mjs";

const SCENES = [
  ["sunny", 24, DAY],
  ["partlycloudy", 12, NIGHT],
  ["pouring", 12, DAY],
  ["lightning-rainy", 21, DAY],
  ["snowy", -1, DAY],
  ["windy", 14, DAY],
  ["clear-night", 11, NIGHT],
  ["rainy", 10, NIGHT],
  ["lightning-rainy", 14, NIGHT],
];
const FPS = 20;
const SECONDS = 4.2; // one lightning cycle

const browser = await launch();
const page = await openPage(browser, { width: 900, now: DAY });
await addCards(page, conditionCards("en", false, SCENES), 3);
await page.waitForTimeout(300);
const dir = mkdtempSync(join(tmpdir(), "wx-frames-"));
const frames = Math.round(FPS * SECONDS);
for (let i = 0; i < frames; i++) {
  await page.evaluate((t) => {
    for (const a of document.getAnimations()) {
      a.pause();
      a.currentTime = t;
    }
  }, 5000 + (i * 1000) / FPS);
  // The cards on the theme background, with the body's 16px padding around them, like the still shots.
  const box = await page.locator("#root").boundingBox();
  await page.screenshot({
    path: join(dir, `f${String(i).padStart(3, "0")}.png`),
    clip: { x: 0, y: 0, width: 900 + 32, height: Math.ceil(box.height) + 32 },
  });
}
await browser.close();
const out = `${root}screenshots/scenes.gif`;
execFileSync("ffmpeg", [
  "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(dir, "f%03d.png"),
  "-vf", "scale=932:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer:bayer_scale=4",
  "-loop", "0", out,
]);
rmSync(dir, { recursive: true });
console.log("screenshots/scenes.gif");
