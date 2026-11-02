// The screenshot scripts replace a shot only when its pixels change: same picture with other bytes keeps the file.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { writeIfChanged } from "../scripts/screenshots/write-if-changed.mjs";

let skip = false;
try {
  execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
} catch {
  skip = "no ffmpeg";
}
// A picture drawn by ffmpeg: `color` on 16×8 pixels, `frames` frames, in `file` (its extension picks the format);
// `filters` follow the source (format=rgba keeps the colour's alpha).
const draw = (file, color, extra = [], frames = 1, filters = "") =>
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=${color}:s=16x8:r=10${filters}`, "-frames:v", String(frames), ...extra, file]);
// Its first pixel, decoded: [r, g, b, a].
const firstPixel = (file) => [...execFileSync("ffmpeg", ["-v", "error", "-i", file, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgba", "-"]).subarray(0, 4)];

for (const ext of ["png", "gif"]) {
  test(`screenshots: a ${ext} shot replaces its file only when its pixels change`, { skip }, () => {
    const n = ext === "gif" ? 3 : 1;
    const dir = mkdtempSync(join(tmpdir(), "wx-wic-"));
    try {
      const dest = join(dir, `shot.${ext}`);
      draw(dest, "red", ext === "png" ? ["-compression_level", "0"] : [], n);
      const before = readFileSync(dest);
      // Same pixels, other bytes (another compression level, or a GIF comment).
      const same = join(dir, `same.${ext}`);
      draw(same, "red", ext === "png" ? ["-compression_level", "9"] : ["-metadata", "comment=x"], n);
      if (ext === "png") assert.notDeepEqual(readFileSync(same), before, "the test needs other bytes");
      assert.equal(writeIfChanged(same, dest), false);
      assert.deepEqual(readFileSync(dest), before, "the committed file is left as it is");
      assert.equal(existsSync(same), false, "the fresh render is dropped");
      // Other pixels: the file is replaced.
      const other = join(dir, `other.${ext}`);
      draw(other, "blue", [], n);
      assert.equal(writeIfChanged(other, dest), true);
      assert.notDeepEqual(readFileSync(dest), before);
      // One frame more (a GIF's length) is a change too; a missing file is written.
      if (ext === "gif") {
        const longer = join(dir, "longer.gif");
        draw(longer, "blue", [], 4);
        assert.equal(writeIfChanged(longer, dest), true);
      }
      const fresh = join(dir, `fresh.${ext}`);
      draw(fresh, "red");
      assert.equal(writeIfChanged(fresh, join(dir, `new.${ext}`)), true);
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
}

// The comparison sees every channel: opaque shots that differ only in red, green or blue, or only in alpha, are
// different shots (a comparison of the alpha channel alone would keep the old file for the three opaque ones).
for (const ext of ["png", "gif"]) {
  test(`screenshots: a ${ext} shot that changes in one channel only is replaced`, { skip }, () => {
    const dir = mkdtempSync(join(tmpdir(), "wx-wic-"));
    try {
      const variants = { red: "0xC04040", green: "0x40C040", blue: "0x4040C0" };
      // A GIF has one transparent palette entry at most: the alpha case is a PNG's.
      if (ext === "png") variants.alpha = "0x404040@0.5";
      for (const [channel, color] of Object.entries(variants)) {
        const dest = join(dir, `shot-${channel}.${ext}`);
        const rgba = ext === "png" ? [["-pix_fmt", "rgba"], 1, ",format=rgba"] : [];
        draw(dest, "0x404040", ...rgba);
        const before = readFileSync(dest);
        const fresh = join(dir, `fresh-${channel}.${ext}`);
        draw(fresh, color, ...rgba);
        // The two pictures differ in this channel only (the test would prove nothing otherwise).
        const [a, b] = [firstPixel(dest), firstPixel(fresh)];
        const differ = [0, 1, 2, 3].filter((i) => Math.abs(a[i] - b[i]) > 8);
        assert.deepEqual(differ, [["red", "green", "blue", "alpha"].indexOf(channel)], `${channel} only: ${a} vs ${b}`);
        assert.equal(writeIfChanged(fresh, dest), true, `${channel} only`);
        assert.notDeepEqual(readFileSync(dest), before, `${channel} only: the file is replaced`);
      }
    } finally {
      rmSync(dir, { recursive: true });
    }
  });
}
