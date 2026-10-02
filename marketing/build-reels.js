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
 *   full    — app recording full screen, caption on top; optional punch zoom
 *             { zoom: { at, to, x, y } } on a detail (x, y: 0-1 in the screen), { y } to scroll the crop
 *   kinetic — title whose words slam in one by one (hook); optional subtitle, icon, cta
 *   hero    — the hero drawn big in its scene, outfits swapping every `every` s
 *             (looks: [{ hat, outfit, accessory, label }])
 * Smooth by default (Battiste): no hard cut, no zoom into the screens, no shake or flash. Every
 *   segment dissolves into the next (0.5 s); phone screens (clip, still) arrive with a gentle 3D
 *   card flip; titles fade in word by word; the hero's outfits dissolve into each other.
 *   Per segment: `transition: 'flip' | 'fade' | 'slide' | 'cut'`; per reel `punchy: true` brings back
 *   the old style (hard cuts, punch zooms, slams, flashes).
 * Any segment: `flash` (cut from white, only without transitions), `speed` (clips), `sfx` (sound at `sfxAt` s, from marketing/audio/sfx
 * if it exists there, else from the app's assets/sounds). Music: marketing/audio (chiptune.py).
 * clip/still: `zoom: [{ t, z, x, y }]` zooms the whole phone (title stays fixed): keyframes at t s,
 *   zoom z, centered on (x, y) of the app screen (0-1), eased in between.
 * Output: marketing/exports/reels/<reel>.mp4 and a copy without the music (game sounds only) in
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

/** The app's hero renderer and scenes (TypeScript, no React Native), compiled for Node. */
function loadHeroModules() {
  const ts = require('typescript');
  const dir = path.join(work, 'ts');
  fs.mkdirSync(dir, { recursive: true });
  const files = {
    sprites: 'src/features/avatar/renderer/sprites.ts',
    'compose-hero': 'src/features/avatar/renderer/compose-hero.ts',
    'hero-scene': 'src/features/avatar/utils/hero-scene.ts',
  };
  for (const [name, file] of Object.entries(files)) {
    const out = ts.transpileModule(fs.readFileSync(path.join(repo, file), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2019 },
    });
    fs.writeFileSync(path.join(dir, `${name}.js`), out.outputText);
  }
  return { ...require(path.join(dir, 'compose-hero.js')), ...require(path.join(dir, 'hero-scene.js')) };
}

/** ffmpeg expression of a keyframed value (smoothstep between keys), time = output frame / FPS. */
function keyframes(keys, value) {
  const T = `(on/${FPS})`;
  let expr = String(value(keys[keys.length - 1]));
  for (let i = keys.length - 2; i >= 0; i--) {
    const a = keys[i], b = keys[i + 1];
    const u = `((${T}-${a.t})/${(b.t - a.t).toFixed(3)})`;
    const ease = `(${u}*${u}*(3-2*${u}))`;
    const va = value(a), vb = value(b);
    expr = `if(lt(${T},${a.t}),${va},if(lt(${T},${b.t}),${va}+(${(vb - va).toFixed(4)})*${ease},${expr}))`;
  }
  return expr;
}

/** Renders an animated layer (window.frame(t)) frame by frame into a video. */
async function renderAnimated(page, spec, dur, out, enc) {
  await page.goto(template, { waitUntil: 'networkidle0' });
  await page.evaluate((s) => window.render(s), spec);
  // The text is inserted after load: request the fonts explicitly, or a capture can fall back to a serif.
  await page.evaluate(() => Promise.all(['52px "Press Start 2P"', '800 46px Inter', '600 46px Inter'].map((f) => document.fonts.load(f))));
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
  const dir = `${out}.frames`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(dur * FPS);
  for (let f = 0; f < n; f++) {
    await page.evaluate((t) => window.frame(t), f / FPS);
    await page.screenshot({ path: path.join(dir, `${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
  }
  run(['-framerate', String(FPS), '-i', path.join(dir, '%04d.jpg'), ...enc]);
  fs.rmSync(dir, { recursive: true, force: true });
}

// Long enough to be seen (Battiste: the 0.5 s dissolves went unnoticed).
const TRANSITION = 0.8;

/**
 * 3D card flip between two segments: the last image of `fromVideo` turns over around the vertical
 * axis and the first image of `toVideo` is on its back. Renders TRANSITION seconds of video.
 */
async function renderFlip(page, fromVideo, toVideo, bgFile, out, enc) {
  const a = `${out}-a.png`;
  const b = `${out}-b.png`;
  run(['-sseof', '-0.05', '-i', fromVideo, '-frames:v', '1', '-update', '1', a]);
  run(['-i', toVideo, '-frames:v', '1', b]);
  const url = (f) => pathToFileURL(f).href;
  await page.setContent(`<html><body style="margin:0;width:1080px;height:1920px;overflow:hidden;
    background:url('${url(bgFile)}');perspective:2600px">
    <div id="card" style="position:absolute;inset:0;transform-style:preserve-3d">
      <div style="position:absolute;inset:0;backface-visibility:hidden;background:url('${url(a)}') center/cover"></div>
      <div style="position:absolute;inset:0;backface-visibility:hidden;transform:rotateY(180deg);background:url('${url(b)}') center/cover"></div>
    </div></body></html>`, { waitUntil: 'load' });
  const dir = `${out}.frames`;
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const n = Math.round(TRANSITION * FPS);
  for (let f = 0; f < n; f++) {
    const t = (f + 1) / (n + 1);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    await page.evaluate((deg) => {
      document.getElementById('card').style.transform = `rotateY(${deg}deg)`;
    }, 180 * eased);
    await page.screenshot({ path: path.join(dir, `${String(f).padStart(4, '0')}.jpg`), type: 'jpeg', quality: 92 });
  }
  run(['-framerate', String(FPS), '-i', path.join(dir, '%04d.jpg'), ...enc]);
  fs.rmSync(dir, { recursive: true, force: true });
  await page.setViewport({ width: 1080, height: 1920 });
}
// 'flip' is rendered in 3D by renderFlip; the others are ffmpeg xfade transitions.
const XFADE = { flip: 'flip', slide: 'slideleft', push: 'slideleft', up: 'slideup', zoom: 'zoomin', fade: 'fade', circle: 'circleopen' };

/** Transition into segment i (null = hard cut). */
function transitionInto(reel, i) {
  if (i === 0 || reel.punchy) return null;
  const seg = reel.segments[i];
  const prev = reel.segments[i - 1];
  if (seg.transition === 'cut') return null;
  if (seg.transition) return XFADE[seg.transition] || XFADE.fade;
  // Two pieces of the same recording: a soft dissolve, never a cut.
  if (seg.src && seg.src === prev.src && seg.type === prev.type) return XFADE.fade;
  // From one phone screen to another: the phone turns over.
  if ((seg.type === 'clip' || seg.type === 'still') && (prev.type === 'clip' || prev.type === 'still')) return XFADE.flip;
  // Otherwise the next scene pushes the previous one out (no zoom, no cut).
  return XFADE.push;
}

/** Start time of each segment once transitions overlap them, and the total length. */
function timeline(reel) {
  const starts = [];
  let t = 0;
  reel.segments.forEach((seg, i) => {
    const kind = i > 0 ? transitionInto(reel, i) : null;
    // A flip is inserted between the two segments; the other transitions overlap them.
    if (kind === 'flip') t += TRANSITION;
    else if (kind) t -= TRANSITION;
    starts.push(t);
    t += seg.dur;
  });
  return { starts, total: t };
}

/** Joins the segment videos with their transitions into one file (flips: rendered clips in `flips`). */
function joinSegments(reel, parts, flips, out) {
  const inputs = [...parts, ...flips.filter(Boolean)].flatMap((p) => ['-i', p]);
  const flipInput = {};
  flips.forEach((f, i) => { if (f) flipInput[i] = parts.length + Object.keys(flipInput).length; });
  // Same frame rate, pixel format, aspect and timebase everywhere: xfade requires it.
  const norm = (input, label) => `[${input}:v]fps=${FPS},scale=1080:1920,setsar=1,format=yuv420p,settb=AVTB[${label}]`;
  const steps = [
    ...parts.map((_, i) => norm(i, `n${i}`)),
    ...Object.entries(flipInput).map(([i, input]) => norm(input, `f${i}`)),
  ];
  let prev = '[n0]';
  let length = reel.segments[0].dur;
  for (let i = 1; i < parts.length; i++) {
    const kind = transitionInto(reel, i);
    const label = `[v${i}]`;
    if (kind === 'flip') {
      steps.push(`${prev}[f${i}][n${i}]concat=n=3:v=1:a=0${label}`);
      length += TRANSITION + reel.segments[i].dur;
    } else {
      steps.push(
        kind
          ? `${prev}[n${i}]xfade=transition=${kind}:duration=${TRANSITION}:offset=${(length - TRANSITION).toFixed(3)}${label}`
          : `${prev}[n${i}]concat=n=2:v=1:a=0${label}`,
      );
      length += reel.segments[i].dur - (kind ? TRANSITION : 0);
    }
    prev = label;
  }
  run([...inputs, '-filter_complex', steps.join(';'), '-map', prev,
    '-r', String(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-an', out]);
}

async function renderLayer(page, spec, file) {
  await page.goto(template, { waitUntil: 'networkidle0' });
  await page.evaluate((s) => window.render(s), spec);
  // The text is inserted after load: request the fonts explicitly, or a capture can fall back to a serif.
  await page.evaluate(() => Promise.all(['52px "Press Start 2P"', '800 46px Inter', '600 46px Inter'].map((f) => document.fonts.load(f))));
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
  const hero = loadHeroModules();

  for (const [name, reel] of Object.entries(reels)) {
    if (process.argv[2] && process.argv[2] !== name) continue;
    const parts = [];
    const sfx = [];
    const { starts, total } = timeline(reel);
    for (const [i, seg] of reel.segments.entries()) {
      const clock = starts[i];
      const out = path.join(work, `${name}-${i}.mp4`);
      const enc = ['-r', String(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-an', out];
      if (seg.sfx) {
        // Video-only sounds (marketing/audio/sfx) take precedence over the app's.
        const own = path.join(root, 'audio', 'sfx', `${seg.sfx}.m4a`);
        const file = fs.existsSync(own) ? own : path.join(repo, 'assets', 'sounds', `${seg.sfx}.m4a`);
        sfx.push({ file, at: clock + (seg.sfxAt || 0) });
      }
      if (seg.type === 'kinetic') {
        await renderAnimated(page, { layout: 'kinetic', ...seg, smooth: !reel.punchy }, seg.dur, out, enc);
      } else if (seg.type === 'hero') {
        const looks = seg.looks.map((l) => ({
          label: l.label,
          grid: hero.composeHero({ skin: hero.DEFAULTS.skin, hair: hero.DEFAULTS.hair, eye: hero.DEFAULTS.eye, ...l }),
        }));
        const scene = hero.heroScene(seg.theme || 'default', 36);
        await renderAnimated(page, { layout: 'hero', ...seg, looks, scene, smooth: !reel.punchy }, seg.dur, out, enc);
      } else if (seg.type === 'full') {
        const overlay = path.join(work, `${name}-${i}-full.png`);
        await renderLayer(page, { layout: 'full', ...seg }, overlay);
        const z = reel.punchy ? seg.zoom : null;
        // Zoom: reaches `to` in 0.5 s from `at`, centered on (x, y).
        const a = z ? Math.round(z.at * FPS) : 0;
        const zoom = z
          ? `,zoompan=z='if(lt(on,${a}),1,min(1+(on-${a})*${((z.to - 1) / 15).toFixed(4)},${z.to}))'` +
            `:x='(iw-iw/zoom)*${z.x}':y='(ih-ih/zoom)*${z.y}':d=1:s=1080x1920:fps=${FPS}`
          : '';
        run(['-ss', String(seg.start || 0), '-i', path.join(recDir, `${seg.src}.webm`), '-loop', '1', '-i', overlay, '-t', String(seg.dur),
          '-filter_complex',
          `[0:v]setpts=PTS/${seg.speed || 1},fps=${FPS},tpad=stop_mode=clone:stop_duration=3,scale=1080:-2,crop=1080:1920:0:(ih-1920)*${seg.y || 0}${zoom},format=rgba[s];` +
          `[s][1:v]overlay=0:0,format=yuv420p`,
          ...enc]);
      } else if (seg.type === 'card') {
        const png = path.join(work, `${name}-${i}.png`);
        await renderLayer(page, { layout: 'card', ...seg }, png);
        // Short fade-in and a gentle push-in so the card is not a frozen frame.
        run(['-loop', '1', '-t', String(seg.dur), '-i', png,
          '-vf', reel.punchy
            ? `scale=1188:2112,zoompan=z='min(1+0.0009*on,1.1)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=${FPS},fade=in:0:6`
            : `scale=1080:1920,fps=${FPS}`,
          ...enc]);
      } else {
        const overlay = path.join(work, `${name}-${i}-phone.png`);
        await renderLayer(page, { layout: 'phone', ...seg }, overlay);
        const screenInput = seg.type === 'clip'
          ? ['-ss', String(seg.start || 0), '-i', path.join(recDir, `${seg.src}.webm`)]
          : ['-loop', '1', '-i', path.join(root, 'assets', screens, `${seg.src}.png`)];
        const screen = seg.type === 'clip'
          ? `[1:v]setpts=PTS/${seg.speed || 1},fps=${FPS},tpad=stop_mode=clone:stop_duration=3,scale=${PHONE.w}:${PHONE.h}`
          : reel.punchy
            ? `[1:v]scale=${PHONE.w * 2}:-1,zoompan=z='min(1+0.0008*on,1.08)':d=1:x='iw/2-(iw/zoom/2)':y=0:s=${PHONE.w}x${PHONE.h}:fps=${FPS}`
            : `[1:v]scale=${PHONE.w}:-1,crop=${PHONE.w}:${PHONE.h}:0:0,fps=${FPS}`;
        if (reel.punchy && Array.isArray(seg.zoom)) {
          // The phone zooms (rendered at 2x for a smooth move), the title stays on top.
          const frame = path.join(work, `${name}-${i}-frame.png`);
          const title = path.join(work, `${name}-${i}-title.png`);
          await renderLayer(page, { layout: 'frame' }, frame);
          await renderLayer(page, { layout: 'title', title: seg.title }, title);
          const fx = (k) => (PHONE.x + (k.x ?? 0.5) * PHONE.w) / 1080;
          const fy = (k) => (PHONE.y + (k.y ?? 0.5) * PHONE.h) / 1920;
          const z = keyframes(seg.zoom, (k) => k.z);
          const x = keyframes(seg.zoom, fx);
          const y = keyframes(seg.zoom, fy);
          run(['-loop', '1', '-i', bg, ...screenInput, '-loop', '1', '-i', mask, '-loop', '1', '-i', frame, '-loop', '1', '-i', title,
            '-t', String(seg.dur), '-filter_complex',
            `${screen},format=rgba[s];[2:v]format=gray,scale=${PHONE.w}:${PHONE.h}[m];[s][m]alphamerge[sr];` +
            `[0:v][sr]overlay=${PHONE.x}:${PHONE.y}[b];[b][3:v]overlay=0:0,scale=2160:3840,` +
            `zoompan=z='${z}':x='(iw-iw/zoom)*(${x})':y='(ih-ih/zoom)*(${y})':d=1:s=1080x1920:fps=${FPS}[zz];` +
            `[zz][4:v]overlay=0:0,format=yuv420p`,
            ...enc]);
        } else {
          run(['-loop', '1', '-i', bg, ...screenInput, '-loop', '1', '-i', mask, '-loop', '1', '-i', overlay, '-t', String(seg.dur),
            '-filter_complex',
            `${screen},format=rgba[s];[2:v]format=gray,scale=${PHONE.w}:${PHONE.h}[m];[s][m]alphamerge[sr];` +
            `[0:v][sr]overlay=${PHONE.x}:${PHONE.y}[b];[b][3:v]overlay=0:0,format=yuv420p`,
            ...enc]);
        }
      }
      if (seg.flash && reel.punchy) {
        const flashed = out.replace(/\.mp4$/, '-flash.mp4');
        run(['-i', out, '-vf', 'fade=in:0:5:color=white', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-an', flashed]);
        fs.renameSync(flashed, out);
      }
      parts.push(out);
    }

    // One video with the transitions, then music and sounds on top.
    const joined = path.join(work, `${name}-joined.mp4`);
    const flips = [];
    for (let i = 1; i < parts.length; i++) {
      if (transitionInto(reel, i) !== 'flip') continue;
      const flipOut = path.join(work, `${name}-flip-${i}.mp4`);
      await renderFlip(page, parts[i - 1], parts[i], bg, flipOut,
        ['-r', String(FPS), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-crf', '20', '-an', flipOut]);
      flips[i] = flipOut;
    }
    joinSegments(reel, parts, flips, joined);
    const list = path.join(work, `${name}.txt`);
    fs.writeFileSync(list, `file '${joined.replace(/\\/g, '/')}'`);
    const out = path.join(outDir, `${name}.mp4`);
    // Music, plus the sound effects of the segments on top.
    const sfxIn = sfx.flatMap((x) => ['-i', x.file]);
    const sfxMix = sfx.map((x, k) => `[${k + 2}:a]adelay=${Math.round(x.at * 1000)}|${Math.round(x.at * 1000)},volume=1.2[s${k}];`).join('');
    const mix = sfx.length
      ? `${sfxMix}[m]${sfx.map((_, k) => `[s${k}]`).join('')}amix=inputs=${sfx.length + 1}:duration=first:normalize=0[a]`
      : '[m]anull[a]';
    run(['-f', 'concat', '-safe', '0', '-i', list,
      '-ss', String(reel.music.start), '-i', path.join(repo, reel.music.file), ...sfxIn,
      '-filter_complex', `[1:a]volume=0.7,afade=in:st=0:d=0.3,afade=out:st=${(total - 1.2).toFixed(2)}:d=1.2[m];${mix}`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-t', String(total), '-movflags', '+faststart', out]);
    console.log(`${name}: ${total.toFixed(1)} s → ${path.relative(repo, out)}`);

    // Twin without the music, to add a trending sound in the TikTok/Instagram
    // editor: it keeps the game sounds, so it is never silent.
    const silent = path.join(outDir, 'sans-musique', `${name}.mp4`);
    fs.mkdirSync(path.dirname(silent), { recursive: true });
    const base = `[1:a]atrim=0:${total.toFixed(2)}[b]`;
    const sfxOnly = sfx.length
      ? `${base};${sfxMix}[b]${sfx.map((_, k) => `[s${k}]`).join('')}amix=inputs=${sfx.length + 1}:duration=first:normalize=0[a]`
      : `${base};[b]anull[a]`;
    run(['-f', 'concat', '-safe', '0', '-i', list, '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo', ...sfxIn,
      '-filter_complex', sfxOnly,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-t', String(total), '-movflags', '+faststart', silent]);
  }
  await browser.close();
})();
