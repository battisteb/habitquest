/**
 * Adds a written hook (white box, TikTok style) on the first seconds of an existing reel, so a
 * variant can be tested without rebuilding it (same video, only the hook changes).
 *
 *   NODE_PATH=<puppeteer-core, ffmpeg-static> node marketing/add-hook.js <in.mp4> <out.mp4> "<hook>" [seconds=3.5] [y=300]
 *
 * The hook is drawn in Chrome (Inter for Latin text, M PLUS Rounded 1c for Japanese) to a
 * transparent 1080×1920 PNG, then overlaid with ffmpeg; the audio is copied untouched.
 * `*word*` highlights a word in yellow; `|` forces a line break (Japanese lines never break by themselves).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const puppeteer = require('puppeteer-core');
const ffmpeg = process.env.FFMPEG || require('ffmpeg-static');

const [input, output, hook, secs = '3.5', y = '300'] = process.argv.slice(2);
if (!input || !output || !hook) {
  console.error('usage: node marketing/add-hook.js <in.mp4> <out.mp4> "<hook>" [seconds] [y]');
  process.exit(1);
}

const escape = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const html = `<!DOCTYPE html><html><head><meta charset="utf-8" />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@800&family=M+PLUS+Rounded+1c:wght@800&display=swap" rel="stylesheet" />
<style>
  html, body { margin: 0; width: 1080px; height: 1920px; background: transparent; }
  .hook { position: absolute; left: 0; right: 0; margin: 0 auto; width: fit-content; top: ${Number(y)}px; transform: translateY(-50%); max-width: 960px;
    background: #fff; color: #111; border-radius: 22px; padding: 26px 40px; text-align: center;
    font: 800 60px/1.25 Inter, 'M PLUS Rounded 1c', sans-serif; box-shadow: 0 10px 40px rgba(0,0,0,.45);
    text-wrap: balance; line-break: strict; word-break: keep-all; }
  .hook em { font-style: normal; background: #ffd400; padding: 0 8px; border-radius: 8px; }
</style></head><body><div class="hook">${escape(hook).replace(/\*([^*]+)\*/g, '<em>$1</em>').replace(/\|/g, '<br>').replace(/-/g, '‑')}</div></body></html>`;

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'hook-'));
  const page = path.join(tmp, 'hook.html');
  const png = path.join(tmp, 'hook.png');
  fs.writeFileSync(page, html);
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
  });
  const tab = await browser.newPage();
  await tab.setViewport({ width: 1080, height: 1920 });
  await tab.goto('file://' + page, { waitUntil: 'networkidle0' });
  await tab.evaluate(() => document.fonts.ready);
  await tab.screenshot({ path: png, omitBackground: true });
  await browser.close();

  // Pops in over the first 0.15 s, stays until `secs`, then fades out in 0.2 s.
  const t = Number(secs);
  fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-i', input, '-loop', '1', '-t', String(t + 0.2), '-i', png,
    '-filter_complex', `[1:v]format=rgba,fade=t=in:st=0:d=0.15:alpha=1,fade=t=out:st=${t}:d=0.2:alpha=1[h];[0:v][h]overlay=0:0:eof_action=pass[v]`,
    '-map', '[v]', '-map', '0:a?', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-c:a', 'copy', '-movflags', '+faststart', output], { stdio: 'inherit' });
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`${path.basename(output)}: hook "${hook}" for ${t} s`);
})();
