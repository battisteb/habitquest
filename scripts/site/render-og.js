/**
 * Social preview of the site (docs/assets/og-image.png, 1200×630): Pip, the title
 * and the Quests screen (English site screenshot). Rebuild it when the logo or the screenshot changes.
 *
 *   npm i --no-save puppeteer-core
 *   node scripts/site/render-og.js
 */
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

const assets = path.join(__dirname, '..', '..', 'docs', 'assets');
const url = (f) => pathToFileURL(path.join(assets, f)).href;

const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Silkscreen&display=swap" rel="stylesheet">
<style>
  * { margin: 0; box-sizing: border-box; }
  body { width: 1200px; height: 630px; overflow: hidden; position: relative; color: #e8e8ff;
         background: radial-gradient(circle at 30% 40%, #3a4480 0%, #1e2448 55%, #12152e 100%); font-family: 'Silkscreen', monospace; }
  body::before { content: ''; position: absolute; inset: 0; opacity: .12;
                 background-image: linear-gradient(#fff 2px, transparent 2px), linear-gradient(90deg, #fff 2px, transparent 2px); background-size: 48px 48px; }
  .text { position: absolute; left: 72px; top: 92px; width: 660px; }
  .brand { display: flex; align-items: center; gap: 22px; }
  .brand img { width: 104px; height: 104px; image-rendering: pixelated; border: 5px solid #14142a; box-shadow: 8px 8px 0 #14142a; }
  .brand span { font-family: 'Press Start 2P'; font-size: 40px; }
  h1 { font-family: 'Press Start 2P'; font-size: 50px; line-height: 1.45; margin-top: 52px; text-shadow: 5px 5px 0 #14142a; }
  h1 em { font-style: normal; color: #f5c518; }
  p { font-size: 24px; color: #a9b8ff; margin-top: 34px; }
  .phone { position: absolute; right: 86px; top: 52px; width: 300px; height: 650px; border: 8px solid #14142a; background: #14142a;
           box-shadow: 12px 12px 0 rgba(0,0,0,.45); transform: rotate(4deg); overflow: hidden; }
  .phone img { width: 100%; display: block; }
</style></head><body>
  <div class="text">
    <div class="brand"><img src="${url('icon.png')}"><span>HabitQuest</span></div>
    <h1>Turn your habits into <em>quests</em></h1>
    <p>Pixel art habit tracker · iPhone &amp; Android</p>
  </div>
  <div class="phone"><img src="${url('screens/today.png')}"></div>
</body></html>`;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 630 });
  await page.goto(url('.'), { waitUntil: 'load' });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(assets, 'og-image.png') });
  await browser.close();
  console.log('og-image.png');
})();
