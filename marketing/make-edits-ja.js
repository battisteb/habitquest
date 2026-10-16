// Run: node marketing/make-edits-ja.js (rebuilds edits.ja.json).
// Builds marketing/edits.ja.json from the validated English edits: same shots and camera, Japanese
// captions (spaces only mark the words for the reveal), the app from the Japanese screenshots.
const fs = require('fs');
const path = require('path');
const dir = __dirname;
const en = JSON.parse(fs.readFileSync(path.join(dir, 'edits.en.json'), 'utf8'));

const appStill = (dur) => ({ still: 'screens-ja/today.png', dur, focus: [0.5, 0.3], in: 'flash', inDur: 0.5,
  cam: [[0, 1.25, 0.5, 0.3], [0.4, 1.25, 0.5, 0.3], [1, 1.04, 0.5, 0.45]] });
const ja = (from, captions, card) => {
  const segments = from.segments.map((s) => (s.app ? appStill(s.dur) : s.card ? { ...s, card } : s));
  // A Japanese character is about 1 em wide: the longest line must fit in ~880 px, outline included.
  const fit = (text, size) => {
    const longest = Math.max(...text.split('|').map((l) => l.replace(/[ *]/g, '').length));
    return Math.min(size, Math.floor(880 / longest));
  };
  return { segments, captions: from.captions.map((c, i) => ({ ...c, text: captions[i], size: fit(captions[i], c.size) })) };
};

const fitSize = (text, size) => Math.min(size, Math.floor(880 / Math.max(...text.split('|').map((l) => l.replace(/[ *]/g, '').length))));
const card = (line, sub) => ({ card: { pip: 'pip-joy-love', line, sub }, dur: 2, in: 'fade', inDur: 0.4, cam: [[0, 1], [1, 1.04]] });
// A Japanese-only edit: segments, and captions as [t, end, text, y, size, pop].
const own = (segments, caps) => ({ segments,
  captions: caps.map(([t, end, text, y, size, pop]) => ({ t, end, text, y, size: fitSize(text, size), ...(pop ? { pop: true } : {}) })) });

const out = {
  'j-e1-saitama': ja(en['e1-saitama-day3'], [
    '3日目。',
    'ここで みんな *やめる。*',
    '*彼は* やめなかった。',
    'スクワット 100回。',
    '腕立て 100回。|*毎日。*',
    '*3年後。*',
    '最強の 秘密は？',
    '一日も *休まない* こと。',
    'HabitQuestで|毎日を *クエスト* に。',
  ], { pip: 'pip-joy-love', line: 'きみの 毎日の|*100回* は？', sub: 'コメントで教えて👇' }),
  'j-e4-deku': ja(en['e4-deku-born'], [
    '*個性* なしで|生まれた 少年。',
    'あきらめろと 言われた。',
    '最初の 課題：|海浜公園の *掃除。*',
    '*10か月。*',
    '*毎日。*',
    'そして ある朝……',
    '*やり遂げた。*',
    'HabitQuestで|毎日を *クエスト* に。',
  ], { pip: 'pip-joy-love', line: 'きみの|*海浜公園* は？', sub: 'コメントで大きな目標を👇' }),
  'j-e5-eren': ja(en['e5-eren-tatakae'], [
    '毎晩 ひとり、|*鏡の前* で……',
    '*ひとつ* の 言葉を|つぶやいた。',
    '*戦え。*',
    '*毎日* 戦え。',
    'きのうの 自分と。',
    'HabitQuestで|毎日を *クエスト* に。',
  ], { pip: 'pip-joy-love', line: 'いっしょに 言おう。|*戦え！*', sub: 'コメントで「戦え」👇' }),
  'j-e2-shun': ja(en['e2-jinwoo-one-year'], [
    'これが 今日の *きみ。*',
    '1年後の|*きみ。*',
    'その 差は？',
    '*毎日の クエスト。*',
    '*きみの* デイリークエスト。',
    'やりきって、|*レベルアップ。*',
    '毎日、 *毎日。*',
  ], { pip: 'pip-joy-love', line: 'デイリークエストが|*待ってるよ。*', sub: 'コメントで「やる」👇' }),
  'j-e9-tanjiro': own([
    { clip: 'tanjiro/wWarogrnQ9M.mp4', start: 17.5, dur: 2.2, focus: [0.5, 0.5], cam: [[0, 1.2, 0.5, 0.42], [1, 1.35, 0.5, 0.4]] },
    { clip: 'tanjiro/YFcMc0amTUM.mp4', start: 75.5, dur: 2.2, focus: [0.45, 0.5], in: 'fade', inDur: 0.3, cam: [[0, 1.2, 0.5, 0.42], [1, 1.3, 0.45, 0.42]] },
    { clip: 'tanjiro/tbPvK1f96hQ.mp4', start: 20, dur: 1.6, focus: [0.45, 0.5], in: 'whip', inDur: 0.25, cam: [[0, 1.2, 0.5, 0.45], [1, 1.35, 0.5, 0.42]] },
    { clip: 'tanjiro/tbPvK1f96hQ.mp4', start: 33, dur: 0.9, focus: [0.5, 0.5], cam: [[0, 1.15, 0.5, 0.45], [1, 1.3, 0.5, 0.42]] },
    { clip: 'tanjiro/tbPvK1f96hQ.mp4', start: 35.4, dur: 2.2, focus: [0.5, 0.5], in: 'flash', inDur: 0.3, cam: [[0, 1.1, 0.5, 0.5], [1, 1.25, 0.45, 0.5]] },
    appStill(3.8),
    card('きみの *岩* は|なに？', 'コメントで教えて👇'),
  ], [
    [0, 2.2, '師匠の 課題：|この *岩* を 斬れ。', 0.26, 96],
    [2.2, 4.4, 'だから 彼は、|*毎日* 刀を 振った。', 0.26, 96],
    [4.4, 6, '*1年* かけて、', 0.28, 120],
    [6, 6.9, 'ついに……', 0.3, 120],
    [6.9, 9.1, '岩を、|*真っ二つ* に。', 0.26, 110],
    [9.4, 12.8, 'HabitQuestは|一振り 一振りを *クエスト* に。', 0.8, 76],
  ]),
  // Japanese-only memes (the old framed reels j-m8, j-m9, j-m10), full screen.
  'j-e6-keikaku': own([
    { clip: 'light/a7eWvOJDw3Q.mp4', start: 5.6, dur: 2.6, focus: [0.45, 0.5], cam: [[0, 1.1, 0.5, 0.45], [1, 1.3, 0.5, 0.42]] },
    { clip: 'light/a7eWvOJDw3Q.mp4', start: 2.4, dur: 2.4, focus: [0.55, 0.5], in: 'flash', inDur: 0.25, cam: [[0, 1.2, 0.5, 0.45], [1, 1.45, 0.55, 0.45]] },
    { clip: 'light/a7eWvOJDw3Q.mp4', start: 6.8, dur: 2.1, focus: [0.5, 0.5], cam: [[0, 1.35, 0.5, 0.4], [1, 1.05, 0.5, 0.5]] },
    appStill(3.8),
    card('きみの 計画は|*何日* 続く？', 'コメントで教えて👇'),
  ], [
    [0, 2.6, 'すべて、|*計画通り。*', 0.26, 120],
    [2.6, 5, '6時 起き、|筋トレ、 勉強。', 0.26, 100, true],
    [5, 7.3, '結果：|*三日坊主。*', 0.3, 120],
    [7.6, 11, 'HabitQuestなら|続けるたびに *一撃。*', 0.8, 80],
  ]),
  'j-e7-anzai': own([
    { clip: 'anzai/HhCg6gOxfug.mp4', start: 11, dur: 2.4, focus: [0.5, 0.5], cam: [[0, 1, 0.5, 0.45], [1, 1.2, 0.5, 0.4]] },
    { clip: 'anzai/HhCg6gOxfug.mp4', start: 0, dur: 1.8, focus: [0.3, 0.5], in: 'fade', inDur: 0.3, cam: [[0, 1.1, 0.5, 0.5], [1, 1.22, 0.5, 0.5]] },
    { clip: 'anzai/HhCg6gOxfug.mp4', start: 4.6, dur: 1.4, focus: [0.45, 0.5], cam: [[0, 1.05, 0.5, 0.45], [1, 1.2, 0.5, 0.42]] },
    { clip: 'anzai/HhCg6gOxfug.mp4', start: 8, dur: 1.6, focus: [0.5, 0.5], cam: [[0, 1.2, 0.5, 0.42], [1, 1.05, 0.5, 0.45]] },
    { clip: 'anzai/HhCg6gOxfug.mp4', start: 14, dur: 1, focus: [0.5, 0.5], cam: [[0, 1.1, 0.5, 0.45], [1, 1.35, 0.5, 0.45]] },
    appStill(3.8),
    card('きみは|*諦めない？*', 'コメントで「諦めない」👇'),
  ], [
    [0, 2.4, '諦めたら そこで|*試合終了* ですよ。', 0.25, 90, true],
    [2.4, 4.2, '連続記録が、|*途切れた* 日。', 0.26, 100],
    [4.2, 5.6, 'でも、', 0.28, 120],
    [5.6, 7.2, 'また *始めれば* いい。', 0.26, 100],
    [7.2, 8.2, '*今日* から。', 0.3, 130],
    [8.5, 11.9, 'HabitQuestで|毎日を *クエスト* に。', 0.8, 80],
  ]),
  'j-e8-kenshiro': own([
    { clip: 'kenshiro/9efbPwAJzBU.mp4', start: 6, dur: 1.2, focus: [0.45, 0.5], cam: [[0, 1.1, 0.5, 0.5], [1, 1.22, 0.5, 0.45]] },
    { clip: 'kenshiro/9efbPwAJzBU.mp4', start: 7.6, dur: 2.2, focus: [0.5, 0.5], in: 'whip', inDur: 0.25, cam: [[0, 1, 0.5, 0.4], [1, 1.15, 0.5, 0.34]] },
    { clip: 'kenshiro/9efbPwAJzBU.mp4', start: 12.6, dur: 2.6, focus: [0.5, 0.5], in: 'flash', inDur: 0.3, speed: 0.85, cam: [[0, 1, 0.5, 0.4], [1, 1.2, 0.5, 0.33]] },
    appStill(3.8),
    card('きみの *ボス* は|なに？', 'コメントで教えて👇'),
  ], [
    [0, 1.2, '相手は 夜中の|*スマホ。*', 0.26, 110],
    [1.2, 3.4, '毎日の クエストで|*秘孔* を 突け。', 0.62, 96],
    [3.4, 6, 'お前は もう、|*死んでいる。*', 0.66, 110],
    [6.3, 9.7, 'HabitQuestで|習慣を *クエスト* に。', 0.8, 80],
  ]),
};
fs.writeFileSync(path.join(dir, 'edits.ja.json'), JSON.stringify(out, null, 2) + '\n');
console.log(Object.keys(out).join(', '), out['j-e1-saitama'].captions.length, 'captions');
