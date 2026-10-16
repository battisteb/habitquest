// Halloween 31/10 (lot 2): a reel and a carousel for each account, around the Pumpkin Hat (item of
// the month, Premium). Reels: reels.en.json / reels.ja.json; carousels: posts.en.json / posts.ja.json.
//   node marketing/add-halloween.js
const fs = require('fs');
const path = require('path');

const music = { file: 'marketing/audio/theme-epic.m4a', theme: 'phonk', drop: 1, lift: 2 };
const base = { sayAt: 0.2, sayTail: 0.2, transition: 'cut', captions: false };
const seg = (o) => ({ ...base, ...o });
const pumpkinLooks = (label) => [{ lv: 1 }, { hat: 'hat_pumpkin', outfit: 'outfit_shadow', label, lv: 13 }];

const reels = {
  en: { 'h1-halloween': [
    seg({ type: 'kinetic', dur: 2.2, title: 'This Halloween,<br>the scariest monster is…', say: 'This Halloween, the scariest monster is…' }),
    seg({ type: 'boss', boss: 'snooze_golem', dur: 2.2, sayY: 1740, title: '…your <em>snooze</em><br>button.', say: '…your *snooze* button.' }),
    seg({ type: 'clip', src: 'quests', start: 0, dur: 2.2, title: 'Beat your habit<br>monsters <em>daily</em>.', say: 'Beat your habit monsters *every day.*' }),
    seg({ type: 'hero', dur: 3, every: 1.4, looks: pumpkinLooks('PUMPKIN KNIGHT'), title: 'Item of the month:<br>the <em>Pumpkin Hat</em> 🎃', say: 'Item of the month: the *Pumpkin Hat.*' }),
    seg({ type: 'pip', dur: 2.2, title: 'Trick or treat…<br>or <em>quest</em>?', subtitle: 'Send this to your party 🎃', say: 'Trick or treat… or *quest?*', pips: ['proud-worried', 'joy-party'], every: 1.1, cta: '@habitquest.application', ctaBeat: 4 }),
  ] },
  ja: { 'j-h1-halloween': [
    seg({ type: 'kinetic', dur: 2.2, title: 'ハロウィンで<br>いちばんこわいのは…', say: 'ハロウィンで、いちばんこわいのは…' }),
    seg({ type: 'boss', boss: 'snooze_golem', dur: 2.2, sayY: 1740, title: '…<em>二度寝</em>の<br>モンスター。', subtitle: 'スヌーズゴーレム', say: '二度寝の*モンスター*。' }),
    seg({ type: 'still', src: 'today', dur: 2.2, title: '毎日の<em>クエスト</em>で<br>やっつけよう。', say: '毎日のクエストで、*やっつけよう*。' }),
    seg({ type: 'hero', dur: 3, every: 1.4, looks: pumpkinLooks('かぼちゃナイト'), title: '今月のアイテム：<br><em>かぼちゃ帽子</em>🎃', say: '今月のアイテムは、*かぼちゃ帽子*。' }),
    seg({ type: 'pip', dur: 2.2, title: 'トリック・オア・<br><em>クエスト</em>？', subtitle: 'コメントで🎃って教えてね', say: 'トリック・オア・*クエスト*？', pips: ['proud-love', 'joy-party'], every: 1.1, cta: '@habitquest.app', ctaBeat: 4 }),
  ] },
};

const carousels = {
  en: { 'c8-halloween': [
    { emoji: '🎃', title: 'The <em>habit monsters</em> of Halloween', body: 'Real horror is a broken streak.<br><b>Which one haunts you?</b>' },
    { boss: 'snooze_golem', title: 'The <em>Snooze</em> Golem', body: 'Feeds on the 2nd alarm.<br><b>Banish it:</b> feet on the floor at the 1st.' },
    { boss: 'doomscroll_kraken', title: 'The <em>Doomscroll</em> Kraken', body: 'Rises at midnight from your phone.<br><b>Banish it:</b> charge it outside the bedroom.' },
    { boss: 'couch_troll', title: 'The <em>Couch</em> Troll', body: '“One more episode”… then four.<br><b>Banish it:</b> 10 push-ups before the remote.' },
    { emoji: '🎃', title: 'This month: the <em>Pumpkin Hat</em>', body: 'Beat your monsters, dress your hero.<br><b>Save this for your Halloween reset 📌</b>' },
  ] },
  ja: { 'j17-halloween': [
    { pip: 'sad-love', title: 'ハロウィンの<em>こわい</em>モンスター👻', body: 'ほんとうにこわいのは、<span class="nw">連続記録が切れること。</span>' },
    { boss: 'snooze_golem', title: '<em>二度寝</em>ゴーレム', body: '2回目のアラームが大好物。<br><b>たいじ法：</b>1回目で足を床に。' },
    { boss: 'doomscroll_kraken', title: '<em>夜ふかしスマホ</em>クラーケン', body: '真夜中に画面からあらわれる。<br><b>たいじ法：</b>充電は寝室の外で。' },
    { boss: 'couch_troll', title: '<em>ソファ</em>トロール', body: '「あと1話だけ」…が4話に。<br><b>たいじ法：</b>リモコンの前に腕立て10回。' },
    { pip: 'joy-party', title: '今月は<em>かぼちゃ帽子</em>🎃', body: 'モンスターをたおして、ヒーローを着がえよう。<br>保存してね📌', cta: '保存する' },
  ] },
};

const fmt = (x) => JSON.stringify(x).replace(/^\{/, '{ ').replace(/\}$/, ' }').replace(/","/g, '", "').replace(/":/g, '": ');
for (const lang of ['en', 'ja']) {
  const rf = path.join(__dirname, `reels.${lang}.json`);
  const r = JSON.parse(fs.readFileSync(rf, 'utf8'));
  for (const [id, segments] of Object.entries(reels[lang])) r[id] = { music, musicVol: 0.8, voiceVol: 1, segments };
  fs.writeFileSync(rf, JSON.stringify(r, null, 2) + '\n');

  const pf = path.join(__dirname, `posts.${lang}.json`);
  let s = fs.readFileSync(pf, 'utf8').replace(/\r\n/g, '\n');
  const p = JSON.parse(s);
  const block = Object.entries(carousels[lang]).filter(([id]) => !p[id])
    .map(([id, slides]) => `  ${JSON.stringify(id)}: [\n${slides.map((x) => `    ${fmt(x)}`).join(',\n')}\n  ]`).join(',\n');
  if (block) s = s.replace(/\n\}\s*$/, `,\n${block}\n}\n`);
  JSON.parse(s);
  fs.writeFileSync(pf, s);
}
console.log('halloween: h1-halloween, j-h1-halloween, c8-halloween, j17-halloween');
