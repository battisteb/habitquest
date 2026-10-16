// Lot 2, Japanese account (audit of 11/10): three 有益 carousels for Instagram, the format that works
// on the Japanese account: a targeted hook on slide 1, practical tips, "保存してね" at the end.
//   node marketing/add-lot2-ja.js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'posts.ja.json');
const lot = {
  'j14-mikka-bozu': [
    { pip: 'sad-worried', title: '<em>三日坊主</em>の人へ👇', body: '続かないのは、<span class="nw">きみのせいじゃない。</span>' },
    { pip: 'sleepy-rest', title: 'なぜ<em>3日目</em>でやめちゃう？', body: '最初の目標が大きすぎて、<br><b>疲れた日にゼロ</b>になるから。' },
    { pip: 'happy-calm', title: '① <em>小さすぎる</em>目標に', body: '「毎日30分運動」より<br><b>「くつをはくだけ」</b>から。' },
    { pip: 'happy-love', title: '② つかれた日の<em>ミニ版</em>', body: '「20ページ」が無理な日は<br><b>「1ページ」</b>でもOK。' },
    { pip: 'joy-fire', title: '③ 続いた日を<em>見える化</em>', body: '連続記録がのびると、<br><b>やめたくなくなる</b>。' },
    { pip: 'joy-party', title: '4日目のきみへ、<em>おめでとう</em>🎉', body: '保存して、明日見返してね📌', cta: '保存する' },
  ],
  'j15-kotsu-3sen': [
    { pip: 'proud-love', title: '続く習慣のコツ<em>3選</em>✨', body: '今日からできることだけ。' },
    { pip: 'happy-calm', title: '① <em>ついでに</em>やる', body: '「歯みがきのあとに、<br>ストレッチ1分」<br><b>いつもの行動にくっつける</b>。' },
    { pip: 'happy-love', title: '② <em>決める</em>のは前の晩', body: '朝に迷わないように、<br><b>やることを1つだけ</b>決めておく。' },
    { pip: 'joy-fire', title: '③ <em>できた日</em>を数える', body: 'できなかった日じゃなくて、<br><b>できた日</b>にしるしをつける。' },
    { pip: 'joy-party', title: 'どれから<em>ためす</em>？', body: 'コメントで番号を教えてね👇<br>保存してね📌', cta: '保存する' },
  ],
  'j16-han-bun': [
    { pip: 'sad-worried', title: '今日は<em>半分</em>しかできなかった…', body: 'それ、ちゃんと<span class="nw">カウントしていいよ。</span>' },
    { pip: 'happy-calm', title: 'ノートなら<em>半分だけ</em>ぬる', body: 'まるごと×じゃなくて、<br><b>半分の○</b>。' },
    { pip: 'happy-love', title: 'アプリでは<em>ミニ版</em>', body: '「1ページだけ」でクリア。<br><b>連続記録はそのまま</b>、XPは半分。', image: 'create' },
    { pip: 'proud-love', title: 'ゼロより、<em>半分</em>', body: '半分の日が、<br><b>続ける力</b>になる。' },
    { pip: 'joy-party', title: 'きみの<em>ミニ版</em>は？', body: 'コメントで教えてね👇<br>保存してね📌', cta: '保存する' },
  ],
};

let s = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
const posts = JSON.parse(s);
for (const id of Object.keys(lot)) if (posts[id]) throw new Error(`${id} exists`);
// Same hand formatting as the file: one slide per line.
const block = Object.entries(lot).map(([id, slides]) =>
  `  ${JSON.stringify(id)}: [\n${slides.map((x) => `    ${JSON.stringify(x).replace(/^\{/, '{ ').replace(/\}$/, ' }').replace(/","/g, '", "').replace(/":/g, '": ')}`).join(',\n')}\n  ]`).join(',\n');
s = s.replace(/\n\}\s*$/, `,\n${block}\n}\n`);
JSON.parse(s);
fs.writeFileSync(file, s);
console.log(Object.keys(lot).join(', '));
