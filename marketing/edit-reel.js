/**
 * Reels v2 (Battiste, 2026-10-12): full-screen edits instead of framed clips. The anime scene fills
 * the 9:16 screen, every camera move has a reason (push in on a face, reveal a detail), the scene's own
 * soundtrack runs under the whole reel (no generic chiptune), the hook is written big on the first
 * frame, and the cut into the app happens on a motion or an impact so it flows with the rhythm.
 *
 *   npm i --no-save puppeteer-core ffmpeg-static
 *   CLIP_DIR=<anime clips> APP_DIR=<HD app recordings> node marketing/edit-reel.js [reel…]
 *
 * Spec: marketing/edits.en.json, one entry per reel:
 *   segments: [{ clip | app | card, start, dur, focus: [x, y], cam: [[u, z, x?, y?]…], in, inDur, speed }]
 *     clip  — anime clip (CLIP_DIR), cropped to 9:16 around focus x (0-1 of the frame)
 *     app   — HD app recording (APP_DIR, 1170×2532), cropped to 9:16 around focus y
 *     card  — closing card { pip, line, sub } (templates/overlay.html)
 *     cam   — keyframes over the segment (u 0-1): zoom z, framing center x, y (0-1 of the 9:16 frame),
 *             smoothstep in between
 *     in    — transition from the previous segment: cut (default), flash (through white), zoom
 *             (zoom-through), whip (fast slide), fade; inDur in seconds
 *     speed — playback speed (0.7 = slow motion)
 *   captions: [{ t, end, text, y, size, pop }] — `*word*` in yellow, `|` line break; pop: words appear
 *             one by one (every 0.08 s) instead of all at once
 *   audio:    [{ clip | file, start, at, dur, vol, fadeIn, fadeOut }] — the soundtrack pieces
 *   sfx:      [{ file, at, vol }] — app sounds (assets/sounds) on taps and rewards
 * Output: marketing/exports/edits-en/<reel>.mp4 (git-ignored), loudness -14 LUFS like TikTok.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');
const ffmpeg = process.env.FFMPEG || require('ffmpeg-static');

const root = __dirname;
const repo = path.join(root, '..');
const FPS = 30;
const W = 1080, H = 1920;
const clipDir = process.env.CLIP_DIR || path.join(root, 'clips');
const appDir = process.env.APP_DIR || path.join(root, 'recordings-hd');
const specs = JSON.parse(fs.readFileSync(path.join(root, 'edits.en.json'), 'utf8'));
const outDir = path.join(root, 'exports', 'edits-en');
const overlay = pathToFileURL(path.join(root, 'templates', 'overlay.html')).href;
const TRANSITIONS = { flash: 'fadewhite', zoom: 'zoomin', whip: 'slideleft', fade: 'fade', cut: 'fade' };

const run = (args) => execFileSync(ffmpeg, ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const probe = (file) => {
  const out = (() => { try { execFileSync(ffmpeg, ['-hide_banner', '-i', file], { stdio: 'pipe' }); return ''; } catch (e) { return String(e.stderr); } })();
  const m = out.match(/Video:.*?, (\d{3,5})x(\d{3,5})/);
  return { w: +m[1], h: +m[2] };
};

/** ffmpeg expression of keyframed values [[u, v]…] (smoothstep), u = progress of the segment. */
function keyed(keys, U) {
  if (keys.length === 1) return String(keys[0][1]);
  let expr = String(keys[keys.length - 1][1]);
  for (let i = keys.length - 2; i >= 0; i--) {
    const [ua, va] = keys[i], [ub, vb] = keys[i + 1];
    const s = `((${U}-${ua})/${(ub - ua).toFixed(4)})`;
    expr = `if(lt(${U},${ua}),${va},if(lt(${U},${ub}),${va}+(${(vb - va).toFixed(4)})*${s}*${s}*(3-2*${s}),${expr}))`;
  }
  return expr;
}

/** One segment as a 1080×1920 30 fps clip of `len` seconds (its duration + the next transition). */
function renderSegment(seg, len, file, cardPng) {
  const n = Math.round(len * FPS);
  const U = `min(1,on/${Math.max(1, Math.round(seg.dur * FPS) - 1)})`;
  const cam = seg.cam || [[0, 1]];
  const z = keyed(cam.map(([u, zz]) => [u, zz]), U);
  const cx = keyed(cam.map(([u, , x = 0.5]) => [u, x]), U);
  const cy = keyed(cam.map(([u, , , y = 0.5]) => [u, y]), U);
  const zoompan = `zoompan=z='${z}':x='max(0,min(iw-iw/zoom,(${cx})*iw-iw/zoom/2))':y='max(0,min(ih-ih/zoom,(${cy})*ih-ih/zoom/2))':d=1:s=${W}x${H}:fps=${FPS}`;
  const speed = seg.speed || 1;
  let input, crop;
  if (seg.card) {
    input = ['-loop', '1', '-framerate', String(FPS), '-t', (len + 0.1).toFixed(3), '-i', cardPng];
    crop = 'scale=1080:1920';
  } else {
    const src = seg.clip ? path.join(clipDir, seg.clip) : path.join(appDir, seg.app);
    const { w, h } = probe(src);
    const [fx, fy] = seg.focus || [0.5, 0.45];
    if (w / h > W / H) {
      const cw = Math.round(h * W / H / 2) * 2;
      crop = `crop=${cw}:${h}:${Math.round(Math.max(0, Math.min(w - cw, fx * w - cw / 2)))}:0`;
    } else {
      const ch = Math.round(w * H / W / 2) * 2;
      crop = `crop=${w}:${ch}:0:${Math.round(Math.max(0, Math.min(h - ch, fy * h - ch / 2)))}`;
    }
    input = ['-ss', String(seg.start || 0), '-t', (len * speed + 0.2).toFixed(3), '-i', src];
  }
  const sharpen = seg.clip ? ',unsharp=5:5:0.6' : '';
  run([...input, '-an', '-vf', `${crop},setpts=PTS/${speed},fps=${FPS},${zoompan}${sharpen},setsar=1,format=yuv420p,trim=end_frame=${n}`,
    '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', file]);
}

async function renderLayers(page, spec, work) {
  const layers = [];
  for (const [i, c] of (spec.captions || []).entries()) {
    await page.goto(overlay, { waitUntil: 'networkidle0' });
    const count = await page.evaluate((s) => window.caption(s), c);
    await page.evaluate(() => document.fonts.ready);
    const steps = c.pop ? count : 1;
    for (let k = 1; k <= steps; k++) {
      if (c.pop) await page.evaluate((s, w) => window.caption({ ...s, words: w }), c, k);
      const file = path.join(work, `cap${i}-${k}.png`);
      await page.screenshot({ path: file, omitBackground: true });
      const from = c.t + (k - 1) * 0.08;
      const to = k < steps ? c.t + k * 0.08 : c.end;
      layers.push({ file, from, to });
    }
  }
  return layers;
}

async function build(name, spec, page) {
  const work = path.join(outDir, '.work', name);
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  const segs = spec.segments;
  // Closing card image.
  const card = segs.find((s) => s.card);
  let cardPng;
  if (card) {
    await page.goto(overlay, { waitUntil: 'networkidle0' });
    await page.evaluate((c) => window.card(c), card.card);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => Promise.all([...document.images].map((i) => i.decode().catch(() => {}))));
    cardPng = path.join(work, 'card.png');
    await page.screenshot({ path: cardPng });
  }
  // Segments, each long enough to overlap the next transition.
  const inDur = (s) => (s.in && s.in !== 'cut' ? s.inDur || 0.3 : 1 / FPS);
  const files = segs.map((s, i) => {
    const len = s.dur + (i + 1 < segs.length ? inDur(segs[i + 1]) : 0);
    const file = path.join(work, `seg${i}.mp4`);
    renderSegment(s, len, file, cardPng);
    return file;
  });
  const total = segs.reduce((a, s) => a + s.dur, 0);
  // Transitions (xfade at each segment's start), then the text layers.
  const layers = await renderLayers(page, spec, work);
  const inputs = [...files.flatMap((f) => ['-i', f]), ...layers.flatMap((l) => ['-i', l.file])];
  const graph = [];
  let last = '[0:v]';
  let at = 0;
  segs.forEach((s, i) => {
    if (i === 0) return;
    at += segs[i - 1].dur;
    const out = `[x${i}]`;
    graph.push(`${last}[${i}:v]xfade=transition=${TRANSITIONS[s.in || 'cut']}:duration=${inDur(s).toFixed(4)}:offset=${at.toFixed(4)}${out}`);
    last = out;
  });
  layers.forEach((l, k) => {
    const out = `[o${k}]`;
    graph.push(`${last}[${files.length + k}:v]overlay=0:0:enable='between(t,${l.from.toFixed(3)},${l.to.toFixed(3)})'${out}`);
    last = out;
  });
  graph.push(`${last}trim=duration=${total.toFixed(3)},format=yuv420p[v]`);
  // Soundtrack: the scene's audio pieces and the app sounds, mixed and normalised.
  const audio = [...(spec.audio || []), ...(spec.sfx || []).map((x) => ({ ...x, start: 0, dur: 4 }))];
  const aIn = [];
  const aGraph = [];
  audio.forEach((a, k) => {
    const src = a.clip ? path.join(clipDir, a.clip) : path.join(repo, a.file);
    aIn.push('-i', src);
    const idx = files.length + layers.length + k;
    const d = a.dur;
    const fades = `${a.fadeIn ? `,afade=t=in:d=${a.fadeIn}` : ''}${a.fadeOut ? `,afade=t=out:st=${(d - a.fadeOut).toFixed(3)}:d=${a.fadeOut}` : ''}`;
    const ms = Math.round(a.at * 1000);
    aGraph.push(`[${idx}:a]atrim=${a.start}:${(a.start + d).toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo${fades},volume=${a.vol ?? 1},adelay=${ms}|${ms}[a${k}]`);
  });
  aGraph.push(`${audio.map((_, k) => `[a${k}]`).join('')}amix=inputs=${audio.length}:normalize=0:duration=longest,atrim=0:${total.toFixed(3)},loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
  const out = path.join(outDir, `${name}.mp4`);
  run([...inputs, ...aIn, '-filter_complex', [...graph, ...aGraph].join(';'), '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-r', String(FPS), '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', out]);
  console.log(`${name}: ${total.toFixed(1)} s → ${out}`);
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: 'new', args: ['--allow-file-access-from-files'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 });
  const only = process.argv.slice(2);
  for (const [name, spec] of Object.entries(specs)) {
    if (only.length && !only.includes(name)) continue;
    await build(name, spec, page);
  }
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
