/**
 * Renders the Instagram carousels described in posts.json to PNG (1080×1350).
 *
 *   npm i --no-save puppeteer-core
 *   CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" node marketing/render-posts.js
 *
 * Output: marketing/exports/posts/<carousel>/<n>.png (git-ignored).
 *
 * English version: LANG=en node marketing/render-posts.js
 * → posts.en.json, screenshots from assets/screens-en, output exports/posts-en.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

const root = __dirname;
const lang = process.env.LANG === 'en' ? 'en' : 'fr';
const posts = JSON.parse(fs.readFileSync(path.join(root, lang === 'en' ? 'posts.en.json' : 'posts.json'), 'utf8'));
const screens = lang === 'en' ? 'screens-en' : 'screens';
const exportsDir = lang === 'en' ? 'posts-en' : 'posts';
const template = pathToFileURL(path.join(root, 'templates', 'slide.html')).href;
const only = process.argv[2];

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 1 });

  for (const [name, slides] of Object.entries(posts)) {
    if (only && name !== only) continue;
    const outDir = path.join(root, 'exports', exportsDir, name);
    fs.mkdirSync(outDir, { recursive: true });
    for (let i = 0; i < slides.length; i++) {
      await page.goto(template, { waitUntil: 'networkidle0' });
      await page.evaluate((s) => window.render(s), { ...slides[i], screens, index: i + 1, total: slides.length });
      await page.evaluate(() => document.fonts.ready);
      await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));
      await page.screenshot({ path: path.join(outDir, `${i + 1}.png`) });
    }
    console.log(`${name}: ${slides.length} slides`);
  }
  await browser.close();
})();
