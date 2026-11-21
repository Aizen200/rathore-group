// Hero pipeline for a new source video. Usage: node qa/sequence/render.mjs /absolute/path/to/video.mp4
// (ffmpeg on PATH or FFMPEG=…). See encode-video.mjs: all-keyframe scrub videos, no audio.
import { spawnSync } from "node:child_process";
const source = process.argv[2];
if (!source) throw Error("Usage: node qa/sequence/render.mjs /absolute/path/to/video.mp4");
const { status } = spawnSync(process.execPath, ["qa/sequence/encode-video.mjs", source], { stdio: "inherit" });
process.exitCode = status ?? 1;
