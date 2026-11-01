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
// A picture drawn by ffmpeg: `color` on 16×8 pixels, `frames` frames, in `file` (its extension picks the format).
const draw = (file, color, extra = [], frames = 1) =>
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=${color}:s=16x8:r=10`, "-frames:v", String(frames), ...extra, file]);

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
