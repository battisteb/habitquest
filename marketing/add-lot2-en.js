// Lot 2, English (audit of 11/10, validated by Battiste): 3 "System window" reels and 3 "Pip, Duolingo
// style" memes, added to reels.en.json. Narrator voice and music come from the build (VO_ENGINE=chatterbox,
// MUSIC=m5), so no sound effects here.
//   node marketing/add-lot2-en.js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'reels.en.json');
const reels = JSON.parse(fs.readFileSync(file, 'utf8'));
const music = { file: 'marketing/audio/theme-epic.m4a', theme: 'phonk', drop: 1, lift: 2 };
const base = { sayAt: 0.2, sayTail: 0.2, transition: 'cut', captions: false };
const seg = (o) => ({ ...base, ...o });
const DAILY = ['Drink a glass of water', 'Read 1 page', 'Walk 10 minutes'];
const ending = (title, subtitle, say, pips = ['proud-worried', 'joy-worried']) =>
  seg({ type: 'pip', dur: 2.2, title, subtitle, say, pips, every: 1.1, cta: '@habitquest.application', ctaBeat: 4 });

const lot = {
  'sys1-daily-quest': [
    seg({ type: 'system', dur: 4.4, head: 'DAILY QUEST HAS ARRIVED', quests: DAILY, warn: 'Failure to complete: the Couch Troll gets stronger.', say: 'A *daily quest* has arrived.', sayAt: 0.4 }),
    seg({ type: 'kinetic', dur: 2, title: 'What if your life<br>had a <em>System</em>?', say: 'What if your life had a *System?*' }),
    seg({ type: 'clip', src: 'quests', start: 0, dur: 2.2, title: 'Every habit is a<br><em>daily quest</em>.', say: 'Every habit becomes a *daily quest.*' }),
    seg({ type: 'boss', boss: 'couch_troll', hit: true, dur: 2.2, sayY: 1740, title: 'Clear it… you <em>hit</em><br>the boss.', say: 'Clear it, and you *hit* the boss.',
      fx: [{ type: 'xp', text: '-24', size: 60, color: '#e94560', x: 760, y: 880, at: 0.2 }, { type: 'bar', from: 1, to: 0.6, w: 620, label: 'TROLL HP', x: 540, y: 1590, at: 0.1, dur: 0.6, color: '#e94560' }] }),
    seg({ type: 'system', dur: 3, head: 'QUEST COMPLETE', quests: DAILY, checks: [{ i: 0, at: 0.25 }, { i: 1, at: 0.55 }, { i: 2, at: 0.85 }], done: '+24 XP · LEVEL UP', say: 'Quest *complete.*' }),
    ending('Your daily quest<br>is <em>waiting</em>.', 'Send this to your party 👇', 'Your daily quest is *waiting.*'),
  ],
  'sys2-penalty': [
    seg({ type: 'system', dur: 4.4, head: 'WARNING', sub: 'Daily quest skipped. 3 days in a row.', quests: ['Read 1 page', 'Drink water', 'Sleep before midnight'], warn: 'PENALTY QUEST: survive the Doomscroll Kraken.', say: '*Warning.* You skipped your daily quest.', sayAt: 0.4 }),
    seg({ type: 'boss', boss: 'doomscroll_kraken', dur: 2.4, sayY: 1740, title: 'Penalty: the<br><em>Doomscroll Kraken</em>.', say: 'Penalty: the *Doomscroll Kraken.*',
      fx: [{ type: 'bar', from: 0.4, to: 1, w: 620, label: 'KRAKEN HP', x: 540, y: 1590, at: 0.1, dur: 0.9, color: '#e94560' }] }),
    seg({ type: 'kinetic', dur: 2, title: 'Or…<br>just read <em>one page</em>.', say: 'Or… just read *one page.*' }),
    seg({ type: 'clip', src: 'milestone', start: 0.3, speed: 0.8, dur: 2.2, title: 'One page =<br><em>quest cleared</em>.', say: 'One page. *Quest cleared.*',
      fx: [{ type: 'xp', text: '+24 XP', icon: 'coin', x: 690, y: 1330, at: 1.25 }, { type: 'burst', x: 690, y: 1330, at: 1.25 }] }),
    seg({ type: 'system', dur: 2.8, head: 'PENALTY CANCELLED', quests: ['Read 1 page'], checks: [{ i: 0, at: 0.4 }], done: 'STREAK SAVED', say: 'Streak *saved.*' }),
    ending('Don’t let the<br><em>Kraken</em> win.', 'Tag the friend who needs this 👇', 'Don’t let the *Kraken* win.'),
  ],
  'sys3-player': [
    seg({ type: 'system', dur: 4.4, head: 'PLAYER REGISTERED', sub: 'Level 1 · Novice', quests: ['STR · Drink water', 'INT · Read 1 page', 'VIT · Sleep 7 hours'], warn: 'Your stats grow every day you show up.', say: '*Player* registered.', sayAt: 0.4 }),
    seg({ type: 'kinetic', dur: 2, title: 'Your habits<br>are your <em>stats</em>.', say: 'Your habits are your *stats.*' }),
    seg({ type: 'clip', src: 'levelup', start: 1.8, dur: 2.2, title: 'Show up daily…<br><em>level up</em>.', say: 'Show up every day, and you *level up.*',
      fx: [{ type: 'counter', from: 5, to: 6, prefix: 'LV ', size: 40, x: 780, y: 640, at: 0.6, dur: 0.4 }, { type: 'burst', x: 780, y: 640, at: 1 }] }),
    seg({ type: 'clip', src: 'journey', start: 0, dur: 2.2, title: 'From Novice<br>to <em>Legend</em>.', say: 'From Novice… to *Legend.*' }),
    seg({ type: 'system', dur: 2.8, head: 'LEVEL UP', quests: ['STR', 'INT', 'VIT'], checks: [{ i: 0, at: 0.2 }, { i: 1, at: 0.45 }, { i: 2, at: 0.7 }], done: 'RANK: APPRENTICE', say: '*Level up.*' }),
    ending('<em>Arise.</em><br>Your quest starts today.', 'Comment “ARISE” 👇', '*Arise.* Your quest starts today.'),
  ],
  'pd1-pip-day3': [
    seg({ type: 'pip', dur: 2.2, title: 'Me on <em>day 3</em><br>of my new habit:', pips: ['sleepy-rest'], say: 'Me on *day three* of my new habit.' }),
    seg({ type: 'pip', dur: 2.4, title: 'Pip:', subtitle: '“You said you’d read ONE page.”', pips: ['sad-worried', 'worried-worried'], every: 0.3, say: 'You said you’d read *one page.*' }),
    seg({ type: 'boss', boss: 'snooze_golem', dur: 2.2, sayY: 1740, title: 'The Snooze Golem<br>is <em>healing</em>.', say: 'The Snooze Golem is *healing.*',
      fx: [{ type: 'bar', from: 0.5, to: 1, w: 620, label: 'GOLEM HP', x: 540, y: 1590, at: 0.1, dur: 0.9, color: '#e94560' }] }),
    seg({ type: 'clip', src: 'today', start: 0.4, dur: 2, title: '1 tap.<br><em>Done.</em>', say: 'One tap. *Done.*',
      fx: [{ type: 'xp', text: '+21 XP', icon: 'coin', x: 690, y: 1330, at: 1 }] }),
    ending('Pip after you<br><em>show up</em>:', 'Send this to the friend who skips 👇', 'And Pip, after you *show up.*', ['joy-party', 'happy-love']),
  ],
  'pd2-pip-1158': [
    seg({ type: 'kinetic', dur: 2.2, title: '11:58 PM.<br>Streak: <em>41 days</em>.', say: 'Eleven fifty-eight. Forty-one day *streak.*' }),
    seg({ type: 'pip', dur: 2.4, title: 'Pip:', subtitle: '“WHY ARE WE STILL ON THE COUCH”', pips: ['worried-worried', 'sad-worried'], every: 0.25, say: 'Why are we *still* on the couch?' }),
    seg({ type: 'boss', boss: 'couch_troll', dur: 2.2, sayY: 1740, title: 'The Couch Troll<br>smells <em>fear</em>.', say: 'The Couch Troll smells *fear.*' }),
    seg({ type: 'clip', src: 'milestone', start: 0.3, speed: 0.8, dur: 2.2, title: '11:59 PM:<br><em>quest cleared</em>.', say: 'Eleven fifty-nine. Quest *cleared.*',
      fx: [{ type: 'xp', text: '+24 XP', icon: 'coin', x: 690, y: 1330, at: 1.25 }, { type: 'burst', x: 690, y: 1330, at: 1.25 }] }),
    ending('Pip, <em>breathing</em><br>again:', 'Tag your 11:58 friend 👇', 'Pip, *breathing* again.', ['joy-party', 'happy-calm']),
  ],
  'pd3-pip-monday': [
    seg({ type: 'kinetic', dur: 2, title: '“I’ll start<br>on <em>Monday</em>.”', say: 'I’ll start on *Monday.*' }),
    seg({ type: 'pip', dur: 2.6, title: 'Pip, every<br><em>Monday</em>:', subtitle: '(it’s been 9 Mondays)', pips: ['sad-worried', 'worried-worried'], every: 0.5, say: 'Pip, every Monday. It’s been *nine* Mondays.' }),
    seg({ type: 'kinetic', dur: 2.2, title: 'Start <em>today</em>.<br>One tiny quest.', say: 'Start *today.* One tiny quest.' }),
    seg({ type: 'clip', src: 'create', start: 0, dur: 2.4, title: 'Hard day?<br>The <em>mini</em> version counts.', say: 'Hard day? The *mini* version counts.' }),
    ending('Pip on day 1<br>(for <em>real</em> this time):', 'Send this to your Monday friend 👇', 'Pip on day one. For *real* this time.', ['proud-worried', 'joy-party']),
  ],
};

for (const [name, segments] of Object.entries(lot)) reels[name] = { music, musicVol: 0.8, voiceVol: 1, segments };
fs.writeFileSync(file, JSON.stringify(reels, null, 2) + '\n');
console.log(Object.keys(lot).join(', '));
