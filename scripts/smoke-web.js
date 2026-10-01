/**
 * Smoke test of the web build: signs in with a test account, opens every
 * screen of app/ in French and English, and reports JS errors, i18n keys shown
 * as raw text, content overflowing a 390 px phone screen, words broken across
 * lines and screens still loading.
 *
 *   npm i --no-save puppeteer-core
 *   SMOKE_EMAIL=… SMOKE_PASSWORD=… node scripts/smoke-web.js [baseUrl]
 *
 * baseUrl defaults to http://localhost:8090 (a local `expo export` served
 * statically). Dynamic routes use ids seen in the app's own API responses,
 * so it works against any environment. Output: smoke-report/
 * (report.md, report.json, one screenshot per screen and language).
 */
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const BASE = (process.argv[2] || 'http://localhost:8090').replace(/\/$/, '');
const EMAIL = process.env.SMOKE_EMAIL || 'hero@habitquest.test';
const PASSWORD = process.env.SMOKE_PASSWORD || 'HabitQuest!2026';
const LANGS = (process.env.SMOKE_LANGS || 'fr,en').split(',');
const OUT = path.resolve(process.env.SMOKE_OUT || 'smoke-report');
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const WIDTH = 390;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every key of the French dictionary: shown verbatim, it means a missing translation.
const I18N_KEYS = new Set(
  [...fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'i18n', 'index.ts'), 'utf8')
    .matchAll(/^ {2}([a-z][a-z0-9]*(?:_[a-z0-9]+)+):/gm)].map((m) => m[1]),
);

// Screens of app/; :params are filled with ids seen in API responses.
const ROUTES = [
  '/today', '/profile', '/shop', '/social', '/stats',
  '/achievements', '/arena', '/challenge/create', '/coop', '/coop/create', '/coop/:coopId',
  '/duels', '/duels/challenge', '/duels/battle?myName=Hero&opponentName=Rival&myLevel=5&opponentLevel=4',
  '/habit/:habitId', '/habit/edit/:habitId', '/habit/create', '/habit/archive', '/habit/history?habitId=:habitId&habitName=Quest', '/habit/templates',
  '/notifications', '/paywall', '/profile/:friendId', '/profile/edit', '/settings', '/settings/contextual-mode', '/settings/support',
  '/weekly-recap', '/xp-journey', '/invite/not-a-code', '/onboarding', '/',
];
// Screens seen signed out.
const PUBLIC_ROUTES = ['/sign-in', '/reset-password'];

async function clickText(page, re) {
  const pt = await page.evaluate((src, flags) => {
    const rx = new RegExp(src, flags);
    const el = [...document.querySelectorAll('div,span,a')]
      .find((e) => e.childElementCount === 0 && rx.test((e.textContent || '').trim()));
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }, re.source, re.flags);
  if (!pt) return false;
  await page.mouse.click(pt.x, pt.y);
  return true;
}

async function inspect(page) {
  return page.evaluate((width, keys) => {
    const scroller = (el) => {
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowX;
        if (o === 'auto' || o === 'scroll' || o === 'hidden') return true;
      }
      return false;
    };
    const texts = [...document.querySelectorAll('div,span,a,input')]
      .filter((e) => e.childElementCount === 0 && (e.textContent || e.value || '').trim());
    const rawKeys = [...new Set(texts
      .flatMap((e) => (e.textContent || '').match(/[a-z][a-z0-9]*(?:_[a-z0-9]+)+/g) || [])
      .filter((w) => keys.includes(w)))];
    const overflow = texts
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return r.width > 0 && (r.right > width + 1 || r.left < -1) && !scroller(e);
      })
      .map((e) => (e.textContent || '').trim().slice(0, 40))
      .slice(0, 5);
    return {
      rawKeys,
      overflow,
      pageScroll: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      empty: texts.length === 0,
      // A single word laid out on several lines, like "MODIFIE/R" in a narrow button.
      brokenWords: texts
        .filter((e) => /^[^\s]{4,}$/.test((e.textContent || '').trim()) && e.firstChild?.nodeType === 3)
        .filter((e) => {
          const range = document.createRange();
          range.selectNodeContents(e.firstChild);
          const lines = new Set([...range.getClientRects()].filter((r) => r.width > 0).map((r) => Math.round(r.top)));
          return lines.size > 1;
        })
        .map((e) => e.textContent.trim())
        .slice(0, 5),
      // RN Web renders ActivityIndicator as role=progressbar.
      loading: [...document.querySelectorAll('[role="progressbar"]')].some((e) => e.getBoundingClientRect().width > 0),
    };
  }, WIDTH, [...I18N_KEYS]);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const results = [];

  for (const lang of LANGS) {
    // A fresh context per language: signed out, empty storage.
    const context = await browser.createBrowserContext();
    const page = await context.newPage();
    await page.setViewport({ width: WIDTH, height: 844, deviceScaleFactor: 1, isMobile: true });
    let errors = [];
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.split('\n')[0].slice(0, 160)}`));
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(`console: ${m.text().split('\n')[0].slice(0, 160)}`);
    });
    // Web-only noise: audio needs a user gesture before it can play.
    const ignored = (e) => /play\(\) failed because the user didn't interact/.test(e);
    // Record which API rows back the dynamic routes.
    const ids = {};
    page.on('response', async (res) => {
      const u = res.url();
      if (!/\/rest\/v1\//.test(u) || res.request().method() !== 'GET' || !res.ok()) return;
      try {
        const body = await res.json();
        const rows = Array.isArray(body) ? body : [];
        if (/\/rest\/v1\/habits\?/.test(u) && rows[0]?.id && !ids.habitId) ids.habitId = rows[0].id;
        if (/\/rest\/v1\/friendships\?/.test(u)) {
          const f = rows.find((r) => r.profile?.id || r.addressee_id);
          if (f && !ids.friendId) ids.friendId = f.profile?.id ?? f.addressee_id;
        }
      } catch { /* not JSON */ }
    });
    await page.evaluateOnNewDocument((l) => {
      localStorage.setItem('habitquest-storage:onboarding-completed', 'true');
      localStorage.setItem('habitquest-storage:today-tutorial-seen', 'true');
      localStorage.setItem('habitquest-storage:today-tour-v2-seen', 'true');
      localStorage.setItem('habitquest-storage:app_language', l);
    }, lang);

    const visit = async (route, label) => {
      errors = [];
      await page.goto(BASE + route, { waitUntil: 'networkidle2', timeout: 60000 }).catch((e) => errors.push(`goto: ${e.message}`));
      await sleep(2500);
      const found = await inspect(page);
      const file = `${lang}-${label.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root'}.png`;
      await page.screenshot({ path: path.join(OUT, file) });
      const errs = errors.filter((e) => !ignored(e));
      results.push({ lang, route: label, url: page.url().replace(BASE, ''), errors: errs, ...found, screenshot: file });
      const bad = errs.length || found.rawKeys.length || found.overflow.length || found.pageScroll || found.loading || found.brokenWords.length;
      console.log(`${bad ? '✗' : '✓'} [${lang}] ${label}${bad ? ` — ${[...errs, ...found.rawKeys.map((k) => `key:${k}`), ...found.overflow.map((o) => `overflow:${o}`), found.pageScroll ? 'page scrolls sideways' : '', found.loading ? 'still loading' : '', ...found.brokenWords.map((w) => `broken word:${w}`)].filter(Boolean).join(' | ')}` : ''}`);
    };

    for (const route of PUBLIC_ROUTES) await visit(route, route);

    // Sign in.
    await page.goto(BASE + '/sign-in', { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.type('input[type="email"], input[placeholder*="@"]', EMAIL);
    await page.type('input[type="password"]', PASSWORD);
    await clickText(page, /DONJON|DUNGEON/i);
    await sleep(6000);
    // Visit the lists first so the id collectors see some rows.
    await page.goto(BASE + '/today', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await page.goto(BASE + '/social', { waitUntil: 'networkidle2' });
    await sleep(2500);
    await clickText(page, /^(AMIS|FRIENDS)$/);
    await sleep(2000);

    for (const route of ROUTES) {
      let url = route;
      let skip = null;
      for (const [param, value] of [[':habitId', ids.habitId], [':friendId', ids.friendId], [':coopId', 'none']]) {
        if (url.includes(param)) {
          if (!value) skip = param;
          url = url.replace(param, value || '');
        }
      }
      if (skip) {
        results.push({ lang, route, skipped: `no ${skip.slice(1)} found` });
        console.log(`- [${lang}] ${route} skipped (no ${skip.slice(1)})`);
        continue;
      }
      await visit(url, route);
    }
    await context.close();
  }
  await browser.close();

  const bad = results.filter((r) => !r.skipped && (r.errors.length || r.rawKeys.length || r.overflow.length || r.pageScroll || r.loading || r.brokenWords.length));
  const md = [
    `# Smoke test — ${BASE}`,
    '',
    `${results.length} checks, ${bad.length} with problems, ${results.filter((r) => r.skipped).length} skipped.`,
    '',
    '| Lang | Screen | Problems | Screenshot |',
    '|---|---|---|---|',
    ...results.map((r) => r.skipped
      ? `| ${r.lang} | \`${r.route}\` | skipped: ${r.skipped} | |`
      : `| ${r.lang} | \`${r.route}\` | ${[...r.errors, ...r.rawKeys.map((k) => `untranslated \`${k}\``), ...r.overflow.map((o) => `overflow « ${o} »`), r.pageScroll ? 'page scrolls sideways' : '', r.loading ? 'still loading' : '', ...r.brokenWords.map((w) => `word broken across lines « ${w} »`)].filter(Boolean).join('<br>') || '✓'} | ${r.screenshot} |`),
  ].join('\n');
  fs.writeFileSync(path.join(OUT, 'report.md'), md);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(results, null, 2));
  console.log(`\n${bad.length} screen(s) with problems — ${path.join(OUT, 'report.md')}`);
  process.exitCode = bad.length ? 1 : 0;
})();
