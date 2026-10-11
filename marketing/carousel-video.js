/**
 * Turns a carousel into a vertical video (1080×1920, 30 fps) for TikTok and YouTube Shorts, so
 * those accounts post on the days Instagram gets a carousel.
 *
 *   VIDEO=1 LANG=ja node marketing/render-posts.js j4-mini     (vertical slides first)
 *   LANG=ja FFMPEG=…/ffmpeg.exe node marketing/carousel-video.js j4-mini [j7-ato …]
 *
 * Each slide stays on screen long enough to be read (from the length of its text), with a slow
 * zoom so the picture is always moving and a short slide transition between slides. Silent audio
 * track: a sound can be added in the app if wanted.
 * Output: marketing/exports/carousel-videos-<lang>/<carousel>.mp4 (git-ignored).
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = __dirname;
const lang = ['en', 'ja'].includes(process.env.LANG) ? process.env.LANG : 'fr';
const posts = JSON.parse(fs.readFileSync(path.join(root, lang === 'fr' ? 'posts.json' : `posts.${lang}.json`), 'utf8'));
const slidesDir = path.join(root, 'exports', (lang === 'fr' ? 'posts' : `posts-${lang}`) + '-video');
const outDir = path.join(root, 'exports', `carousel-videos-${lang}`);
const ffmpeg = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;
const FADE = 0.35;
// Reading speed in characters per second (Japanese characters carry more meaning each).
const RATE = lang === 'ja' ? 9 : 16;

const plain = (html) => (html || '').replace(/<br\s*\/?>/g, ' ').replace(/<[^>]+>/g, '').trim();
const seconds = (s) => Math.min(6.5, Math.max(2.6, 1.4 + (plain(s.title).length + plain(s.body).length) / RATE));

fs.mkdirSync(outDir, { recursive: true });
for (const name of process.argv.slice(2)) {
  const slides = posts[name];
  if (!slides) throw new Error(`${name}: unknown carousel`);
  const durations = slides.map(seconds);
  const inputs = [];
  const filters = [];
  slides.forEach((_, i) => {
    const png = path.join(slidesDir, name, `${i + 1}.png`);
    if (!fs.existsSync(png)) throw new Error(`${png} missing: run render-posts.js with VIDEO=1 first`);
    // Each slide lasts its reading time plus the transition that overlaps the next one.
    const frames = Math.round((durations[i] + FADE) * FPS);
    inputs.push('-loop', '1', '-framerate', String(FPS), '-t', ((frames + 1) / FPS).toFixed(3), '-i', png);
    filters.push(`[${i}:v]scale=2160:3840,zoompan=z='1+0.035*on/${frames}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1080x1920:fps=${FPS},format=yuv420p,trim=end_frame=${frames},setpts=PTS-STARTPTS[s${i}]`);
  });
  let last = 's0';
  let offset = 0;
  for (let i = 1; i < slides.length; i++) {
    offset += durations[i - 1];
    filters.push(`[${last}][s${i}]xfade=transition=slideleft:duration=${FADE}:offset=${offset.toFixed(3)}[x${i}]`);
    last = `x${i}`;
  }
  const total = durations.reduce((a, b) => a + b, 0) + FADE;
  const out = path.join(outDir, `${name}.mp4`);
  const run = spawnSync(ffmpeg, ['-y', '-loglevel', 'error', ...inputs,
    '-f', 'lavfi', '-t', total.toFixed(3), '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100',
    '-filter_complex', filters.join(';'), '-map', `[${last}]`, '-map', `${slides.length}:a`,
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '128k', '-t', total.toFixed(3), '-movflags', '+faststart', out], { encoding: 'utf8' });
  if (run.status) throw new Error(`${name}: ${run.stderr}`);
  process.stdout.write(`${name}: ${slides.length} slides, ${total.toFixed(1)} s → ${out}\n`);
}
