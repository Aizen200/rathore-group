// Cuts the tunnel hero's five chapter clips from the source video (one per construction stage).
// Usage: node qa/sequence/encode-clips.mjs /absolute/path/to/video.mp4   (ffmpeg on PATH or FFMPEG=…)
// Each clip is 2s, 1280×720, muted (audio removed with -an) and loops in its card.
import { spawnSync } from "node:child_process";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = process.argv[2];
if (!source) throw Error("Usage: node qa/sequence/encode-clips.mjs /absolute/path/to/video.mp4");
const ffmpeg = process.env.FFMPEG || "ffmpeg";
const out = path.resolve("public/film-video/clips");
await mkdir(out, { recursive: true });
// Start times (s): earthworks, grading, paving, finishing, the expressway at dusk.
const starts = [0, 2, 4, 6, 8];
for (const [i, start] of starts.entries()) {
  const file = path.join(out, `chapter-${i + 1}.mp4`);
  const run = args => {
    const r = spawnSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 28 });
    if (r.status !== 0) throw Error(`ffmpeg failed for clip ${i + 1}`);
    return r.stdout;
  };
  run(["-ss", String(start), "-t", "2", "-i", source, "-an", "-vf", "scale=1280:720:flags=lanczos", "-c:v", "libx264",
    "-profile:v", "high", "-pix_fmt", "yuv420p", "-preset", "slow", "-crf", "24", "-movflags", "+faststart", file]);
  const rgb = run(["-i", file, "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:1"]);
  await sharp(rgb, { raw: { width: 1280, height: 720, channels: 3 } }).webp({ quality: 70 }).toFile(path.join(out, `chapter-${i + 1}.webp`));
  console.log(`chapter ${i + 1}: ${start}s–${start + 2}s, ${((await stat(file)).size / 1024).toFixed(0)} KiB, no audio`);
}
