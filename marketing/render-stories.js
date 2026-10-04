/**
 * Instagram stories of the Japanese account (1080×1920, pink Pip) and the YouTube banner
 * (2560×1440, English channel: blue Pip and the app's night theme).
 *
 *   npm i --no-save puppeteer-core
 *   node marketing/render-stories.js   → marketing/exports/stories/<name>.png
 *
 * The dashed areas are where Battiste adds the interactive sticker in the Instagram app
 * (poll, countdown, question box): those stickers cannot be drawn in an image.
 */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

const root = __dirname;
const template = pathToFileURL(path.join(root, 'templates', 'story-ja.html')).href;
const outDir = path.join(root, 'exports', 'stories');

const STORIES = {
  'ja-mood-poll': { size: [1080, 1920], layout: 'mood', title: 'きみの今日の<em>気分</em>は？', body: 'ぼくの顔で答えてね🌸', slot: 'ここに投票スタンプ' },
  'ja-countdown': { size: [1080, 1920], layout: 'sticker', pip: 'joy-party', title: 'もうすぐ<em>リリース</em>！', body: '通知をオンにして待っててね✨', slot: 'ここにカウントダウン' },
  'ja-question': { size: [1080, 1920], layout: 'sticker', pip: 'happy-love', title: 'ピップに<em>質問</em>してね', body: '習慣のこと、アプリのこと、なんでも！', slot: 'ここに質問スタンプ' },
  'ja-winter-goal': { size: [1080, 1920], layout: 'sticker', pip: 'happy-worried', title: 'きみの<em>冬の目標</em>は？', body: 'Winter Arc、いっしょにがんばろう❄️', slot: 'ここに質問スタンプ' },
  'youtube-banner': { size: [2560, 1440], layout: 'youtube', theme: 'night', pip: 'joy-worried', title: 'Your habits = RPG quests', tag: 'WINTER ARC ❄️' },
};

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new',
    args: ['--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  for (const [name, s] of Object.entries(STORIES)) {
    await page.setViewport({ width: s.size[0], height: s.size[1], deviceScaleFactor: 1 });
    await page.goto(template, { waitUntil: 'networkidle0' });
    await page.evaluate((spec) => window.render(spec), s);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.images].map((img) => img.decode().catch(() => {}))));
    await page.screenshot({ path: path.join(outDir, `${name}.png`) });
    console.log(name);
  }
  await browser.close();
})();
