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
 * Japanese account: LANG=ja → posts.ja.json, templates/slide-ja.html (Pip), exports/posts-ja.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

const root = __dirname;
const lang = ['en', 'ja'].includes(process.env.LANG) ? process.env.LANG : 'fr';
const posts = JSON.parse(fs.readFileSync(path.join(root, lang === 'fr' ? 'posts.json' : `posts.${lang}.json`), 'utf8'));
const screens = lang === 'fr' ? 'screens' : `screens-${lang}`;
const exportsDir = lang === 'fr' ? 'posts' : `posts-${lang}`;
// The Japanese account has its own kawaii template where Pip speaks (strategy.ja.md).
// English account: Pip's Sky like the app and its own handle (@habitquest.application).
const template = pathToFileURL(path.join(root, 'templates', lang === 'ja' ? 'slide-ja.html' : 'slide.html')).href + (lang === 'en' ? '?sky&handle=habitquest.application' : '');
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
