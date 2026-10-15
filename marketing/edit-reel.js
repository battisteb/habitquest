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
 * Audio (Battiste, 2026-10-13): a voice-over reads the captions (Kokoro, tts-kokoro.py; VO_VOICE,
 * VO_SPEED) and the music is a trending sound added in the apps. AUDIO=voices keeps the characters'
 * voices instead (demucs splits them from the score), AUDIO=full the scene's whole soundtrack.
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
// LANG=ja: the Japanese account's edits (edits.ja.json, VOICEVOX 青山龍星). Japanese captions keep
// spaces between their words in the spec only, for the word-by-word reveal; they are not shown.
const JA = process.env.LANG === 'ja';
const specs = JSON.parse(fs.readFileSync(path.join(root, JA ? 'edits.ja.json' : 'edits.en.json'), 'utf8'));
const outDir = path.join(root, 'exports', JA ? 'edits-ja' : 'edits-en');
const overlay = pathToFileURL(path.join(root, 'templates', 'overlay.html')).href + (JA ? '?ja' : '');
const TRANSITIONS = { flash: 'fadewhite', zoom: 'zoomin', whip: 'slideleft', fade: 'fade', cut: 'fade' };

const run = (args) => execFileSync(ffmpeg, ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const probe = (file) => {
  const out = (() => { try { execFileSync(ffmpeg, ['-hide_banner', '-i', file], { stdio: 'pipe' }); return ''; } catch (e) { return String(e.stderr); } })();
  const m = out.match(/Video:.*?, (\d{3,5})x(\d{3,5})/);
  return { w: +m[1], h: +m[2] };
};

const AUDIO = process.env.AUDIO || 'vo';
const ENGINE = process.env.VO_ENGINE || (JA ? 'voicevox' : 'chatterbox');
const voDir = path.join(root, 'exports', 'vo');
const MUSIC = process.env.MUSIC;

/**
 * The voice-over: every caption (and the closing card's line) read aloud when it appears, one after
 * the other, by Chatterbox (tts-chatterbox.py: VO_EXAGGERATION, VO_CFG; its own venv in VO_PYTHON) or
 * Kokoro (VO_ENGINE=kokoro, tts-kokoro.py: VO_VOICE, VO_SPEED). Captions follow the voice.
 */
function voiceOver(name, spec, total) {
  const card = spec.segments[spec.segments.length - 1];
  const lines = [...(spec.captions || []).map((c) => ({ t: c.t, end: c.end, text: c.text })),
    ...(card.card ? [{ t: total - card.dur + 0.25, end: total, text: card.card.line }] : [])];
  const opts = ENGINE === 'kokoro'
    ? { voice: process.env.VO_VOICE || 'af_bella', speed: Number(process.env.VO_SPEED || 1) }
    : ENGINE === 'voicevox'
      ? { speaker: process.env.VO_SPEAKER || '青山龍星', style: process.env.VO_STYLE || 'ノーマル', speed: Number(process.env.VO_SPEED || 1.1) }
      : { exaggeration: Number(process.env.VO_EXAGGERATION || 0.6), cfg: Number(process.env.VO_CFG || 0.4) };
  fs.mkdirSync(voDir, { recursive: true });
  const items = lines.map((l) => {
    let text = l.text.replace(/\*/g, '').replace(/\s*\|\s*/g, JA ? '' : ' ');
    // Japanese: no spaces, and VOICEVOX reads the app's name in katakana (it spells Latin letters).
    if (JA) text = text.replace(/\s+/g, '').replace(/HabitQuest/g, 'ハビットクエスト');
    const id = require('crypto').createHash('sha1').update(`${ENGINE}|${JSON.stringify(opts)}|${text}`).digest('hex').slice(0, 12);
    return { text, out: path.join(voDir, `${id}.wav`) };
  });
  const [cmd, script] = ENGINE === 'voicevox' ? [process.execPath, 'tts-voicevox.js']
    : [ENGINE === 'kokoro' ? process.env.PYTHON || 'python' : process.env.VO_PYTHON || 'python', `tts-${ENGINE}.py`];
  // The durations are the last line printed (the models log on stdout too).
  const durs = JSON.parse(execFileSync(cmd, [path.join(root, script)],
    { input: JSON.stringify({ ...opts, items }), stdio: ['pipe', 'pipe', 'inherit'], maxBuffer: 1 << 24 })
    .toString().trim().split('\n').pop());
  let free = 0;
  const pieces = lines.map((l, k) => {
    const at = Math.max(l.t, free);
    free = at + durs[k] + 0.08;
    if (at + durs[k] > total) console.warn(`${name}: "${items[k].text}" ends at ${(at + durs[k]).toFixed(2)} s, after the reel (${total} s)`);
    return { path: items[k].out, start: 0, at, dur: durs[k] };
  });
  // Each caption shows while its line is spoken: moved to the voice's start, kept at least until the
  // line ends, without running into the caption that follows it (captions shown together stay so).
  const caps = spec.captions || [];
  const captions = caps.map((c, k) => {
    const p = pieces[k];
    let end = Math.max(c.end + (p.at - c.t), p.at + p.dur + 0.1);
    const next = caps[k + 1];
    if (next && next.t >= c.end - 0.01) end = Math.min(end, pieces[k + 1].at);
    return { ...c, t: p.at, end: Math.min(end, total) };
  });
  return { pieces, captions };
}

const stemDir = path.join(root, 'exports', 'voice-stems');
/** The characters' voice in an audio piece, without the score (demucs, cached): `pip install demucs`. */
function voiceStem(a) {
  const id = `${a.clip.replace(/[\\/.]/g, '_')}_${a.start}_${a.dur}`;
  const vocals = path.join(stemDir, 'htdemucs', id, 'vocals.wav');
  if (fs.existsSync(vocals)) return vocals;
  fs.mkdirSync(stemDir, { recursive: true });
  const wav = path.join(stemDir, `${id}.wav`);
  run(['-ss', String(a.start), '-t', String(a.dur), '-i', path.join(clipDir, a.clip), '-vn', '-ac', '2', '-ar', '44100', wav]);
  execFileSync(process.env.PYTHON || 'python', ['-m', 'demucs', '--two-stems=vocals', '-n', 'htdemucs', '-o', stemDir, wav], { stdio: 'pipe' });
  return vocals;
}

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
  // Camera with sub-pixel precision (perspective, cubic): zoompan rounds its window to whole pixels,
  // which makes slow pushes and pans shake.
  const vw = `(W/(${z}))`, vh = `(H/(${z}))`;
  const x0 = `max(0,min(W-${vw},(${cx})*W-${vw}/2))`, y0 = `max(0,min(H-${vh},(${cy})*H-${vh}/2))`;
  const camera = `scale=${W}:${H}:flags=lanczos,perspective=x0='${x0}':y0='${y0}':x1='${x0}+${vw}':y1='${y0}':x2='${x0}':y2='${y0}+${vh}':x3='${x0}+${vw}':y3='${y0}+${vh}':interpolation=cubic:eval=frame`;
  const speed = seg.speed || 1;
  let input, crop;
  if (seg.card) {
    input = ['-loop', '1', '-framerate', String(FPS), '-t', (len + 0.1).toFixed(3), '-i', cardPng];
    crop = 'scale=1080:1920';
  } else {
    // still: a screenshot of the app (marketing/assets/<still>), for languages without HD recordings.
    const src = seg.clip ? path.join(clipDir, seg.clip) : seg.still ? path.join(root, 'assets', seg.still) : path.join(appDir, seg.app);
    const { w, h } = probe(src);
    const [fx, fy] = seg.focus || [0.5, 0.45];
    if (w / h > W / H) {
      const cw = Math.round(h * W / H / 2) * 2;
      crop = `crop=${cw}:${h}:${Math.round(Math.max(0, Math.min(w - cw, fx * w - cw / 2)))}:0`;
    } else {
      const ch = Math.round(w * H / W / 2) * 2;
      crop = `crop=${w}:${ch}:0:${Math.round(Math.max(0, Math.min(h - ch, fy * h - ch / 2)))}`;
    }
    input = seg.still
      ? ['-loop', '1', '-framerate', String(FPS), '-t', (len + 0.2).toFixed(3), '-i', src]
      : ['-ss', String(seg.start || 0), '-t', (len * speed + 0.2).toFixed(3), '-i', src];
  }
  const sharpen = seg.clip ? ',unsharp=5:5:0.6' : '';
  run([...input, '-an', '-vf', `${crop},setpts=PTS/${speed},fps=${FPS},${camera}${sharpen},setsar=1,format=yuv420p,trim=end_frame=${n}`,
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
  let segs = spec.segments;
  let total = segs.reduce((a, s) => a + s.dur, 0);
  let vo = AUDIO === 'vo' ? voiceOver(name, spec, total) : null;
  // A voice-over longer than the edit holds the closing card until it has finished.
  const over = vo ? Math.max(...vo.pieces.map((p) => p.at + p.dur)) + 0.4 - total : 0;
  if (over > 0) {
    segs = segs.map((s, i) => (i === segs.length - 1 ? { ...s, dur: s.dur + over } : s));
    total += over;
    vo = voiceOver(name, { ...spec, segments: segs }, total);
  }
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
  // Transitions (xfade at each segment's start), then the text layers.
  const layers = await renderLayers(page, vo ? { ...spec, captions: vo.captions } : spec, work);
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
  // Soundtrack (AUDIO): vo — the voice-over alone, the music being a sound added in Instagram /
  // TikTok (default); voices — the characters' voices without the score; full — the scene's audio
  // and the app sounds.
  const audio = vo ? vo.pieces
    : AUDIO === 'voices' ? (spec.audio || []).map((a) => (a.clip ? { ...a, path: voiceStem(a), start: 0 } : a))
      : [...(spec.audio || []), ...(spec.sfx || []).map((x) => ({ ...x, start: 0, dur: 4 }))];
  const aIn = [];
  const aGraph = [];
  audio.forEach((a, k) => {
    const src = a.path || (a.clip ? path.join(clipDir, a.clip) : path.join(repo, a.file));
    aIn.push('-i', src);
    const idx = files.length + layers.length + k;
    const d = a.dur;
    const fades = `${a.fadeIn ? `,afade=t=in:d=${a.fadeIn}` : ''}${a.fadeOut ? `,afade=t=out:st=${(d - a.fadeOut).toFixed(3)}:d=${a.fadeOut}` : ''}`;
    const ms = Math.round(a.at * 1000);
    aGraph.push(`[${idx}:a]atrim=${a.start}:${(a.start + d).toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo${fades},volume=${a.vol ?? 1},adelay=${ms}|${ms}[a${k}]`);
  });
  const mixed = `${audio.map((_, k) => `[a${k}]`).join('')}amix=inputs=${audio.length}:normalize=0:duration=longest,atrim=0:${total.toFixed(3)},apad=whole_dur=${total.toFixed(3)}`;
  if (MUSIC) {
    // A music bed under the voice: low, ducked further while the voice speaks, faded out at the end.
    aIn.push('-ss', String(Number(process.env.MUSIC_START || 30)), '-i', MUSIC);
    const idx = files.length + layers.length + audio.length;
    aGraph.push(`${mixed},asplit[voice][key]`);
    aGraph.push(`[${idx}:a]atrim=0:${total.toFixed(3)},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.4,afade=t=out:st=${(total - 1.2).toFixed(3)}:d=1.2,volume=${process.env.MUSIC_VOL || 0.35}[bed]`);
    aGraph.push('[bed][key]sidechaincompress=threshold=0.03:ratio=6:attack=20:release=350[ducked]');
    aGraph.push('[voice][ducked]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11[a]');
  } else aGraph.push(`${mixed},loudnorm=I=-14:TP=-1.5:LRA=11[a]`);
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
