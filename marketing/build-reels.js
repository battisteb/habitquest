/**
 * Builds the vertical reels (1080×1920, 30 fps, H.264 + AAC) described in reels.json.
 *
 *   npm i --no-save puppeteer-core ffmpeg-static
 *   REC_DIR=<folder with today.webm, profile.webm…> node marketing/build-reels.js [reel]
 *
 * Segment types:
 *   card  — full-screen title card
 *   clip  — app screen recording (REC_DIR/<src>.webm) in a phone frame, title above
 *   still — app screenshot (assets/screens/<src>.png) in the phone frame, slow zoom
 * Output: marketing/exports/reels/<reel>.mp4 and a silent copy in
 * marketing/exports/reels/sans-musique/ (git-ignored).
 *
 * English version: LANG=en REC_DIR=<English recordings> node marketing/build-reels.js
 * → reels.en.json, screenshots from assets/screens-en, output exports/reels-en.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');
const ffmpeg = process.env.FFMPEG || require('ffmpeg-static');

const root = __dirname;
const repo = path.join(root, '..');
const lang = process.env.LANG === 'en' ? 'en' : 'fr';
const reels = JSON.parse(fs.readFileSync(path.join(root, lang === 'en' ? 'reels.en.json' : 'reels.json'), 'utf8'));
const screens = lang === 'en' ? 'screens-en' : 'screens';
const outDir = path.join(root, 'exports', lang === 'en' ? 'reels-en' : 'reels');
const template = pathToFileURL(path.join(root, 'templates', 'reel.html')).href;
const recDir = process.env.REC_DIR || path.join(root, 'recordings');
const work = path.join(outDir, '.work');
const PHONE = { x: 267, y: 600, w: 546, h: 1182, radius: 44 };
const FPS = 30;

const run = (args) => execFileSync(ffmpeg, ['-v', 'error', '-y', ...args], { stdio: 'inherit' });

async function renderLayer(page, spec, file) {
  await page.goto(template, { waitUntil: 'networkidle0' });
  await page.evaluate((s) => window.render(s), spec);
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  await page.screenshot({ path: file, omitBackground: true });
}

async function roundedMask(page, file) {
  await page.setContent(
    `<body style="margin:0;background:#000"><div style="width:${PHONE.w}px;height:${PHONE.h}px;background:#fff;border-radius:${PHONE.radius}px"></div></body>`,
  );
  await page.setViewport({ width: PHONE.w, height: PHONE.h });
  await page.screenshot({ path: file });
  await page.setViewport({ width: 1080, height: 1920 });
}

(async () => {
  fs.mkdirSync(work, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920 });
  const mask = path.join(work, 'mask.png');
  await roundedMask(page, mask);
  const bg = path.join(work, 'bg.png');
  await renderLayer(page, { layout: 'bg' }, bg);

  for (const [name, reel] of Object.entries(reels)) {
    if (process.argv[2] && process.argv[2] !== name) continue;
    const parts = [];
    for (const [i, seg] of reel.segments.entries()) {
      const out = path.join(work, `${name}-${i}.mp4`);
      const enc = ['-r', String(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-an', out];
      if (seg.type === 'card') {
        const png = path.join(work, `${name}-${i}.png`);
        await renderLayer(page, { layout: 'card', ...seg }, png);
        // Short fade-in and a gentle push-in so the card is not a frozen frame.
        run(['-loop', '1', '-t', String(seg.dur), '-i', png,
          '-vf', `scale=1188:2112,zoompan=z='min(1+0.0009*on,1.1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS},fade=in:0:6`,
          ...enc]);
      } else {
        const overlay = path.join(work, `${name}-${i}-phone.png`);
        await renderLayer(page, { layout: 'phone', ...seg }, overlay);
        const screenInput = seg.type === 'clip'
          ? ['-ss', String(seg.start || 0), '-i', path.join(recDir, `${seg.src}.webm`)]
          : ['-loop', '1', '-i', path.join(root, 'assets', screens, `${seg.src}.png`)];
        const screen = seg.type === 'clip'
          ? `[1:v]setpts=PTS/${seg.speed || 1},fps=${FPS},scale=${PHONE.w}:${PHONE.h}`
          : `[1:v]scale=${PHONE.w * 2}:-1,zoompan=z='min(1+0.0008*on,1.08)':d=1:x='iw/2-(iw/zoom/2)':y=0:s=${PHONE.w}x${PHONE.h}:fps=${FPS}`;
        run(['-loop', '1', '-i', bg, ...screenInput, '-loop', '1', '-i', mask, '-loop', '1', '-i', overlay, '-t', String(seg.dur),
          '-filter_complex',
          `${screen},format=rgba[s];[2:v]format=gray,scale=${PHONE.w}:${PHONE.h}[m];[s][m]alphamerge[sr];` +
          `[0:v][sr]overlay=${PHONE.x}:${PHONE.y}[b];[b][3:v]overlay=0:0,format=yuv420p`,
          ...enc]);
      }
      parts.push(out);
    }

    const list = path.join(work, `${name}.txt`);
    fs.writeFileSync(list, parts.map((p) => `file '${p.replace(/\\/g, '/')}'`).join('\n'));
    const total = reel.segments.reduce((s, x) => s + x.dur, 0);
    const out = path.join(outDir, `${name}.mp4`);
    run(['-f', 'concat', '-safe', '0', '-i', list,
      '-ss', String(reel.music.start), '-i', path.join(repo, reel.music.file),
      '-filter_complex', `[1:a]volume=0.7,afade=in:st=0:d=0.5,afade=out:st=${(total - 1.2).toFixed(2)}:d=1.2[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-t', String(total), '-movflags', '+faststart', out]);
    console.log(`${name}: ${total.toFixed(1)} s → ${path.relative(repo, out)}`);

    // Silent twin, to add a trending sound in the TikTok/Instagram editor.
    const silent = path.join(outDir, 'sans-musique', `${name}.mp4`);
    fs.mkdirSync(path.dirname(silent), { recursive: true });
    run(['-f', 'concat', '-safe', '0', '-i', list, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-t', String(total), '-movflags', '+faststart', silent]);
  }
  await browser.close();
})();
