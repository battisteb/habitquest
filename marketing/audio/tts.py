"""Free AI voice-over for the story reels (Microsoft Edge neural voices, no key).

    python marketing/audio/tts.py lines.json out_dir

lines.json: [{"id": "m1-0", "text": "...", "voice": "en-US-ChristopherNeural", "rate": "+5%", "pitch": "-2Hz"}]
Writes out_dir/<id>.mp3 and out_dir/<id>.json, the timing of every spoken word
([{"w": "Would", "t": 0.11, "d": 0.24}], seconds) for the word-by-word captions (build-reels.js).
A line already rendered with the same settings is kept (the cache key is in the JSON).
"""
import asyncio
import json
import os
import sys

import edge_tts


async def speak(line, out_dir):
    key = {k: line.get(k) for k in ('text', 'voice', 'rate', 'pitch')}
    mp3 = os.path.join(out_dir, f"{line['id']}.mp3")
    meta = os.path.join(out_dir, f"{line['id']}.json")
    if os.path.exists(mp3) and os.path.exists(meta):
        with open(meta, encoding='utf-8') as f:
            if json.load(f).get('key') == key:
                return
    com = edge_tts.Communicate(
        line['text'], line.get('voice') or 'en-US-ChristopherNeural',
        rate=line.get('rate') or '+0%', pitch=line.get('pitch') or '+0Hz', boundary='WordBoundary')
    words = []
    with open(mp3, 'wb') as f:
        async for chunk in com.stream():
            if chunk['type'] == 'audio':
                f.write(chunk['data'])
            elif chunk['type'] == 'WordBoundary':
                # Offsets are in 100 ns units.
                words.append({'w': chunk['text'], 't': chunk['offset'] / 1e7, 'd': chunk['duration'] / 1e7})
    with open(meta, 'w', encoding='utf-8') as f:
        json.dump({'key': key, 'words': words}, f, ensure_ascii=False)


async def main():
    with open(sys.argv[1], encoding='utf-8') as f:
        lines = json.load(f)
    os.makedirs(sys.argv[2], exist_ok=True)
    for line in lines:
        await speak(line, sys.argv[2])


if __name__ == '__main__':
    asyncio.run(main())
