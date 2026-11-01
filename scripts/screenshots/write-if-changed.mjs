// A shot replaces its file only when its pixels differ: a re-encoded PNG or GIF with the same picture (other bytes,
// same pixels) leaves the committed file as it is, so the screenshot job commits only what changed visibly.
// The pictures are compared decoded, frame by frame, with their size and timing (ffmpeg's framemd5 of RGBA frames).
import { execFileSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";

// One line per frame: its time, duration, byte count and the MD5 of its RGBA pixels (header comments left out).
export const pixelHash = (file) =>
  execFileSync("ffmpeg", ["-v", "error", "-i", file, "-map", "0:v", "-pix_fmt", "rgba", "-f", "framemd5", "-"], { encoding: "utf8" })
    .split("\n")
    .filter((l) => l && !l.startsWith("#"))
    .join("\n");

// Moves `fresh` onto `dest` if `dest` is missing or looks different; otherwise drops `fresh`. True when written.
export const writeIfChanged = (fresh, dest) => {
  if (existsSync(dest) && pixelHash(fresh) === pixelHash(dest)) {
    rmSync(fresh);
    return false;
  }
  renameSync(fresh, dest);
  return true;
};
