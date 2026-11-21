// Measures how closely the hero film keeps up with fast wheel scrolling.
// Usage: node qa/preview-server.mjs & node qa/fast-scroll-check.mjs
import { chromium } from "@playwright/test";
const base = process.env.RATHORE_BASE_URL || "http://127.0.0.1:3019";
const browser = await chromium.launch({ channel: "chrome", headless: !process.env.HEADED, args: ["--enable-gpu-rasterization"] });
for (const v of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844, mobile: true }]) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height }, isMobile: !!v.mobile, hasTouch: !!v.mobile });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.waitForFunction(() => document.querySelector(".journey-canvas")?.dataset.frame === "0");
  await page.waitForTimeout(6000); // let background preload settle, like a visitor reading the hero
  await page.evaluate(() => {
    const el = document.querySelector(".scroll-journey"), c = document.querySelector(".journey-canvas");
    window.__log = []; let last = performance.now();
    const tick = now => {
      const total = Math.max(1, el.offsetHeight - innerHeight);
      const p = Math.max(0, Math.min(1, -el.getBoundingClientRect().top / total));
      const n = +el.dataset.frameCount;
      window.__log.push({ dt: now - last, target: p * (n - 1), drawn: +c.dataset.frame, req: +el.dataset.requestedFrame, q: el.dataset.frameQuality, src: el.dataset.frameSource });
      last = now; requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await page.mouse.move(v.width / 2, v.height / 2);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, 250); await page.waitForTimeout(16); }
    await page.waitForTimeout(400);
    for (let i = 0; i < 40; i++) { await page.mouse.wheel(0, -250); await page.waitForTimeout(16); }
    await page.waitForTimeout(400);
  }
  const log = await page.evaluate(() => window.__log);
  const moving = log.filter(r => r.dt > 0);
  const lag = moving.map(r => Math.abs(r.target - r.drawn));
  lag.sort((a, b) => a - b);
  const pct = q => lag[Math.floor(q * (lag.length - 1))].toFixed(1);
  let changes = 0; for (let i = 1; i < log.length; i++) if (log[i].drawn !== log[i - 1].drawn) changes++;
  const dl = moving.map(r => Math.abs(r.req - r.drawn)).sort((a, b) => a - b); const dpct = q => dl[Math.floor(q * (dl.length - 1))].toFixed(1);
  const sprite = log.filter(r => r.src === "sprite").length;
  const jank = log.filter(r => r.dt > 34).length;
  console.log(`${v.name}: rafs=${log.length} frameChanges=${changes} lag(frames) p50=${pct(.5)} p90=${pct(.9)} max=${pct(1)} decodeLag p50=${dpct(.5)} p90=${dpct(.9)} max=${dpct(1)} spriteTicks=${sprite} longFrames(>34ms)=${jank}`);
  await page.close();
}
await browser.close();
