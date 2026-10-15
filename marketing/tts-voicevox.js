/**
 * Voice-over lines for the Japanese reels with VOICEVOX (Battiste, 2026-10-16: 青山龍星). The engine
 * runs locally (VOICEVOX ENGINE, windows-cpu, `run.exe --port 50021`; VOICEVOX_URL to change it).
 * Its terms ask for a credit in each post: "VOICEVOX:青山龍星".
 *
 * stdin: {"speaker": "青山龍星", "style": "ノーマル", "speed": 1.1, "items": [{"text": "...", "out": "x.wav"}]}
 * stdout: the duration in seconds of each item, as a JSON list. Existing files are reused.
 */
const fs = require('fs');

const API = process.env.VOICEVOX_URL || 'http://127.0.0.1:50021';

/** Duration of a PCM wav, from its header. */
function wavSeconds(file) {
  const b = fs.readFileSync(file);
  const byteRate = b.readUInt32LE(28);
  let pos = 12;
  while (pos < b.length - 8) {
    const id = b.toString('ascii', pos, pos + 4);
    const size = b.readUInt32LE(pos + 4);
    if (id === 'data') return size / byteRate;
    pos += 8 + size;
  }
  throw new Error(`no data chunk in ${file}`);
}

(async () => {
  const req = JSON.parse(fs.readFileSync(0, 'utf8'));
  const todo = req.items.filter((it) => !fs.existsSync(it.out));
  if (todo.length) {
    const speakers = await (await fetch(`${API}/speakers`)).json();
    const sp = speakers.find((s) => s.name === req.speaker);
    if (!sp) throw new Error(`VOICEVOX speaker not found: ${req.speaker}`);
    const style = sp.styles.find((s) => s.name === (req.style || 'ノーマル')) || sp.styles[0];
    for (const it of todo) {
      const query = await (await fetch(`${API}/audio_query?speaker=${style.id}&text=${encodeURIComponent(it.text)}`, { method: 'POST' })).json();
      // Short margins: the line starts with its caption.
      Object.assign(query, { speedScale: req.speed || 1.1, prePhonemeLength: 0.05, postPhonemeLength: 0.08 });
      const res = await fetch(`${API}/synthesis?speaker=${style.id}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(query) });
      if (!res.ok) throw new Error(`synthesis ${res.status}: ${it.text}`);
      fs.writeFileSync(it.out, Buffer.from(await res.arrayBuffer()));
      console.error(`voice-over: ${it.text}`);
    }
  }
  console.log(JSON.stringify(req.items.map((it) => wavSeconds(it.out))));
})().catch((e) => { console.error(e.message); process.exit(1); });
