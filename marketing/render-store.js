/**
 * Renders the App Store and Google Play screenshots described in store.json.
 *
 *   npm i --no-save puppeteer-core
 *   node marketing/render-store.js            → English and French
 *   LANG=en node marketing/render-store.js    → one language
 *
 * App screens: marketing/assets/store-<lang>/<screen>.png, captured from the
 * app at 390×844 with a device scale of 3 (demo account PixelHero).
 * Output: marketing/exports/store/<lang>/<size>/NN-<screen>.png (git-ignored),
 * sizes: iPhone 6.7"/6.9" (1290×2796), iPhone 6.5" (1242×2688), Android (1080×1920).
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

const root = __dirname;
const spec = JSON.parse(fs.readFileSync(path.join(root, 'store.json'), 'utf8'));
const langs = process.env.LANG === 'en' || process.env.LANG === 'fr' ? [process.env.LANG] : ['en', 'fr'];
const template = pathToFileURL(path.join(root, 'templates', 'store.html')).href;

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  for (const lang of langs) {
    for (const [size, [width, height]] of Object.entries(spec.sizes)) {
      const out = path.join(root, 'exports', 'store', lang, size);
      fs.mkdirSync(out, { recursive: true });
      await page.setViewport({ width, height, deviceScaleFactor: 1 });
      for (const [i, screen] of spec.screens.entries()) {
        const image = path.join(root, 'assets', `store-${lang}`, `${screen}.png`);
        if (!fs.existsSync(image)) throw new Error(`missing capture: ${image}`);
        await page.goto(template, { waitUntil: 'networkidle0' });
        await page.evaluate(
          (s) => window.render(s),
          { width, height, ...spec[lang][screen], image: pathToFileURL(image).href },
        );
        await page.evaluate(() => document.fonts.ready);
        await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));
        await page.screenshot({ path: path.join(out, `${String(i + 1).padStart(2, '0')}-${screen}.png`) });
      }
      console.log(`${lang} ${size}: ${spec.screens.length} screenshots`);
    }
  }
  await browser.close();
})();
