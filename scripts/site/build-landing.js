/**
 * Builds the landing page of the public site (GitHub Pages, docs/):
 * docs/index.html (English), docs/fr/index.html (French) and docs/ja/index.html
 * (Japanese), from one template.
 *
 *   node scripts/site/build-landing.js
 *
 * When the apps are published, set STORES below and rebuild: the "coming soon"
 * badges become download links.
 */
const fs = require('fs');
const path = require('path');

const STORES = {
  ios: null, // e.g. 'https://apps.apple.com/app/id0000000000'
  android: null, // e.g. 'https://play.google.com/store/apps/details?id=com.battiste.habitquest'
};
const WEB_APP = 'https://habitquest.expo.app';
// Public Supabase values for the waitlist form (insert-only table, L4).
const SITE_CONFIG = require('./site-config.json');
const SOCIAL = {
  Instagram: 'https://www.instagram.com/habitquest.app/',
  TikTok: 'https://www.tiktok.com/@habitquest.application',
  YouTube: 'https://www.youtube.com/@habitquest.application',
};

const T = {
  en: {
    lang: 'en',
    title: 'HabitQuest — Turn your habits into an RPG',
    description: 'A pixel art habit tracker: complete daily quests, keep your streaks, level up your hero and challenge your friends. On iPhone and Android.',
    nav: { features: 'Features', faq: 'FAQ', support: 'Support' },
    badge: 'HABIT TRACKER RPG',
    h1: 'Turn your habits<br>into <em>quests</em>',
    pipSays: 'Hi, I’m Pip! I change colour with your day.',
    lead: 'Complete your daily quests, keep your streaks alive, earn XP and gold, and level up a pixel hero. Then take on your friends.',
    soon: 'Coming soon',
    web: 'Or play now in your browser',
    featuresTitle: 'Everything that makes <em>habits stick</em>',
    featuresSub: 'Every habit becomes a quest. Every day you show up, your hero gets stronger.',
    features: [
      ['⚔️', 'Daily quests', 'Daily, weekly or a few times a week, with categories and ready-made templates. Tick a quest, earn XP and gold.'],
      ['🔥', 'Streaks that forgive', 'Keep your streak going day after day. A weekly streak freeze and Focus mode for exams, holidays or illness: frozen, not lost.'],
      ['🧙', 'A hero that grows', 'Six ranks from Novice to Legend. Dress your 32×32 pixel hero with hats, outfits, accessories and themes from the shop.'],
      ['🤺', 'Duels and challenges', 'Turn-based duels against your friends\' heroes, and 1v1 challenges with gold at stake: the most consistent wins.'],
      ['🏟️', 'Arena leagues', 'One fight a day against a player of your league. Climb six leagues, season after season.'],
      ['🤝', 'Co-op challenges', 'Team up with friends on a shared goal and earn bonus XP together.'],
    ],
    shotsTitle: 'A look <em>inside</em>',
    shots: [['today', 'Your quests'], ['profile', 'Your hero'], ['arena', 'The arena'], ['stats', 'Your progress']],
    stepsTitle: 'How it <em>works</em>',
    steps: [
      ['Create your hero', 'Pick your look and your first quests in under a minute.'],
      ['Complete your quests', 'Each habit you do earns XP and gold, and keeps your streak alive.'],
      ['Level up and play', 'Unlock gear, finish daily missions and achievements, beat your friends.'],
    ],
    premiumTitle: 'Free to play. <em>Premium</em> if you want more.',
    freeTitle: 'Free',
    free: ['All quests, streaks and your hero', 'Daily missions and 23 achievements', 'Duels, challenges, co-op and arena', 'The basic shop catalog'],
    premiumName: 'Premium (optional subscription)',
    premium: ['No ads', 'More streak freeze tokens', 'Up to one duel a day', 'Full stats history', 'The full shop with exclusives', 'Priority support'],
    faqTitle: 'Questions',
    faq: [
      ['Is HabitQuest free?', 'Yes. The whole game is free; Premium is an optional subscription that removes ads and adds extras. You can cancel it at any time in your App Store or Google Play settings.'],
      ['Which devices?', 'iPhone and Android phones, and any web browser. Your progress is saved to your account and follows you everywhere.'],
      ['Which languages?', 'English, French and Japanese.'],
      ['What about my data?', 'Your habits are private. We use no analytics SDK and never sell your data. Read the <a href="privacy-policy">Privacy Policy</a>.'],
      ['I need help', 'Write to us from Settings → Support in the app, or see the <a href="support">Support page</a>.'],
    ],
    ctaTitle: 'Your adventure starts <em>today</em>',
    waitlist: {
      title: 'Be told on launch day',
      email: 'Your e-mail',
      consent: 'I agree to receive one e-mail when HabitQuest is available on the App Store and Google Play. No spam; unsubscribe anytime.',
      button: 'Notify me',
      ok: 'You are on the list! We will write to you on launch day.',
      error: 'That did not work. Check your e-mail and try again.',
      privacy: 'Privacy policy',
    },
    footer: { support: 'Support', privacy: 'Privacy Policy', terms: 'Terms of Use', contact: 'Contact', rights: 'HabitQuest. Made with ⚔️ and pixel art.' },
    links: { privacy: 'privacy-policy', terms: 'terms', support: 'support' },
    assets: 'assets',
    badges: { ios: 'assets/badges/app-store-en.svg', android: 'assets/badges/google-play-en.png' },
    alts: { ios: 'Download on the App Store', android: 'Get it on Google Play' },
  },
  fr: {
    lang: 'fr',
    title: 'HabitQuest — Transforme tes habitudes en RPG',
    description: 'Un habit tracker en pixel art : valide tes quêtes du jour, garde tes séries, fais évoluer ton héros et défie tes amis. Sur iPhone et Android.',
    nav: { features: 'Fonctionnalités', faq: 'FAQ', support: 'Aide' },
    badge: 'HABIT TRACKER RPG',
    h1: 'Tes habitudes<br>deviennent des <em>quêtes</em>',
    pipSays: 'Salut, moi c’est Pip ! Je change de couleur selon ta journée.',
    lead: 'Valide tes quêtes du jour, garde tes séries, gagne de l\'XP et de l\'or, et fais évoluer ton héros pixel. Puis défie tes amis.',
    soon: 'Bientôt',
    web: 'Ou joue dès maintenant dans ton navigateur',
    featuresTitle: 'Tout pour que tes <em>habitudes tiennent</em>',
    featuresSub: 'Chaque habitude devient une quête. Chaque jour où tu t\'y tiens, ton héros devient plus fort.',
    features: [
      ['⚔️', 'Quêtes du jour', 'Chaque jour, chaque semaine ou quelques fois par semaine, avec catégories et modèles prêts à l\'emploi. Valide, gagne de l\'XP et de l\'or.'],
      ['🔥', 'Des séries indulgentes', 'Garde ta série jour après jour. Un gel de série par semaine et le mode Focus pour les examens, les vacances ou une maladie : gelées, pas perdues.'],
      ['🧙', 'Un héros qui évolue', 'Six rangs, de Novice à Légende. Habille ton héros pixel 32×32 avec chapeaux, tenues, accessoires et thèmes de la boutique.'],
      ['🤺', 'Duels et défis', 'Des duels au tour par tour contre les héros de tes amis, et des défis 1 contre 1 avec de l\'or en jeu : le plus régulier gagne.'],
      ['🏟️', 'Ligues d\'arène', 'Un combat par jour contre un joueur de ta ligue. Monte à travers six ligues, saison après saison.'],
      ['🤝', 'Défis coop', 'Fais équipe avec tes amis sur un objectif commun et gagnez de l\'XP bonus ensemble.'],
    ],
    shotsTitle: 'Un aperçu de <em>l\'app</em>',
    shots: [['today', 'Tes quêtes'], ['profile', 'Ton héros'], ['arena', 'L\'arène'], ['stats', 'Ta progression']],
    stepsTitle: 'Comment ça <em>marche</em>',
    steps: [
      ['Crée ton héros', 'Choisis ton apparence et tes premières quêtes en moins d\'une minute.'],
      ['Valide tes quêtes', 'Chaque habitude faite rapporte de l\'XP et de l\'or, et garde ta série en vie.'],
      ['Monte en niveau', 'Débloque de l\'équipement, termine missions et succès, bats tes amis.'],
    ],
    premiumTitle: 'Gratuit. <em>Premium</em> si tu en veux plus.',
    freeTitle: 'Gratuit',
    free: ['Toutes les quêtes, les séries et ton héros', 'Les missions du jour et 23 succès', 'Duels, défis, coop et arène', 'Le catalogue de base de la boutique'],
    premiumName: 'Premium (abonnement facultatif)',
    premium: ['Sans publicité', 'Plus de jetons de gel de série', 'Jusqu\'à un duel par jour', 'Historique complet des stats', 'Toute la boutique et ses exclusivités', 'Support prioritaire'],
    faqTitle: 'Questions',
    faq: [
      ['HabitQuest est-il gratuit ?', 'Oui. Tout le jeu est gratuit ; Premium est un abonnement facultatif qui retire les publicités et ajoute des bonus. Tu peux le résilier à tout moment dans les réglages de l\'App Store ou de Google Play.'],
      ['Sur quels appareils ?', 'iPhone, téléphones Android et tout navigateur web. Ta progression est enregistrée sur ton compte et te suit partout.'],
      ['Dans quelles langues ?', 'Français, anglais et japonais.'],
      ['Et mes données ?', 'Tes habitudes sont privées. Aucun outil d\'analyse, aucune revente de données. Lis la <a href="../privacy-policy.fr">politique de confidentialité</a>.'],
      ['J\'ai besoin d\'aide', 'Écris-nous depuis Réglages → Support dans l\'app, ou consulte la <a href="../support.fr">page d\'aide</a>.'],
    ],
    ctaTitle: 'Ton aventure commence <em>aujourd\'hui</em>',
    waitlist: {
      title: 'Sois prévenu le jour de la sortie',
      email: 'Ton e-mail',
      consent: 'J\'accepte de recevoir un e-mail quand HabitQuest sera disponible sur l\'App Store et Google Play. Pas de spam, désinscription à tout moment.',
      button: 'Préviens-moi',
      ok: 'C\'est noté ! On t\'écrit le jour de la sortie.',
      error: 'Ça n\'a pas marché. Vérifie ton e-mail et réessaie.',
      privacy: 'Confidentialité',
    },
    footer: { support: 'Aide', privacy: 'Confidentialité', terms: 'Conditions d\'utilisation', contact: 'Contact', rights: 'HabitQuest. Fait avec ⚔️ et du pixel art.' },
    links: { privacy: '../privacy-policy.fr', terms: '../terms.fr', support: '../support.fr' },
    assets: '../assets',
    badges: { ios: '../assets/badges/app-store-en.svg', android: '../assets/badges/google-play-fr.png' },
    alts: { ios: 'Télécharger dans l\'App Store', android: 'Disponible sur Google Play' },
  },
  ja: {
    lang: 'ja',
    title: 'HabitQuest — 習慣をRPGに',
    description: 'ドット絵の習慣トラッカー。毎日のクエストをこなして連続記録をつなぎ、ヒーローを育ててフレンドに挑戦しよう。iPhoneとAndroidに対応。',
    nav: { features: '特徴', faq: 'よくある質問', support: 'サポート' },
    badge: '習慣トラッカーRPG',
    h1: '習慣を<br><em>クエスト</em>に',
    pipSays: 'やあ、ぼくはピップ！きみの一日に合わせて色が変わるよ。',
    lead: '毎日のクエストをこなして連続記録をつなぎ、XPとゴールドを集めてドット絵のヒーローを育てよう。そしてフレンドに挑戦！',
    soon: '近日公開',
    web: 'または今すぐブラウザで遊ぶ',
    featuresTitle: '習慣が<em>続く</em>しくみ',
    featuresSub: 'すべての習慣がクエストに。続けた日の分だけ、ヒーローが強くなる。',
    features: [
      ['⚔️', 'デイリークエスト', '毎日、毎週、または週に数回。カテゴリーとすぐ使えるテンプレート付き。チェックするとXPとゴールドがもらえる。'],
      ['🔥', 'やさしい連続記録', '毎日つないで連続記録を伸ばそう。週1回のフリーズと、試験・休暇・体調不良のための集中モードで、記録は消えずに凍結されるだけ。'],
      ['🧙', '成長するヒーロー', '見習いから伝説まで6つのランク。32×32のドット絵ヒーローを、ショップの帽子・服・アクセサリー・テーマで着せ替えよう。'],
      ['🤺', 'バトルとチャレンジ', 'フレンドのヒーローとターン制バトル。ゴールドを賭けた1対1のチャレンジでは、続けた人が勝つ。'],
      ['🏟️', 'アリーナリーグ', '1日1回、同じリーグのプレイヤーとバトル。シーズンごとに6つのリーグを駆け上がろう。'],
      ['🤝', '協力チャレンジ', 'フレンドとチームを組んで共通の目標に挑戦し、ボーナスXPをみんなでゲット。'],
    ],
    shotsTitle: 'アプリの<em>中身</em>',
    shots: [['today', 'クエスト'], ['profile', 'ヒーロー'], ['arena', 'アリーナ'], ['stats', '成長の記録']],
    screens: 'screens/ja',
    stepsTitle: '遊び<em>かた</em>',
    steps: [
      ['ヒーローを作る', '見た目と最初のクエストを1分以内で選ぼう。'],
      ['クエストをこなす', '習慣をやるたびにXPとゴールド。連続記録もつながる。'],
      ['レベルアップして遊ぶ', '装備を解放し、ミッションと実績をクリアして、フレンドに勝とう。'],
    ],
    premiumTitle: '基本無料。もっと遊ぶなら<em>プレミアム</em>。',
    freeTitle: '無料',
    free: ['すべてのクエスト、連続記録、ヒーロー', 'デイリーミッションと23の実績', 'バトル、チャレンジ、協力、アリーナ', 'ショップの基本アイテム'],
    premiumName: 'プレミアム（任意のサブスクリプション）',
    premium: ['広告なし', 'フリーズトークンが増える', 'バトルは1日1回まで', '統計の全履歴', 'ショップの全アイテムと限定アイテム', '優先サポート'],
    faqTitle: 'よくある質問',
    faq: [
      ['HabitQuestは無料？', 'はい。ゲームはすべて無料で遊べます。プレミアムは広告をなくして特典を追加する任意のサブスクリプションで、App StoreまたはGoogle Playの設定からいつでも解約できます。'],
      ['対応端末は？', 'iPhone、Androidスマートフォン、そしてすべてのWebブラウザ。進行状況はアカウントに保存され、どの端末でも続きから遊べます。'],
      ['対応言語は？', '日本語、英語、フランス語。'],
      ['データの扱いは？', '習慣の内容は非公開です。分析ツールは使わず、データを販売することもありません。<a href="../privacy-policy.ja">プライバシーポリシー</a>をご覧ください。'],
      ['困ったときは', 'アプリの「設定 → サポート」から連絡するか、<a href="../support.ja">サポートページ</a>をご覧ください。'],
    ],
    ctaTitle: '冒険は<em>今日</em>から',
    waitlist: {
      title: 'リリース日にお知らせを受け取る',
      email: 'メールアドレス',
      consent: 'HabitQuestがApp StoreとGoogle Playで公開されたときに、メールを1通受け取ることに同意します。スパムは送りません。いつでも配信停止できます。',
      button: '知らせて',
      ok: '登録しました！リリース日にメールでお知らせします。',
      error: 'うまくいきませんでした。メールアドレスを確認して、もう一度お試しください。',
      privacy: 'プライバシーポリシー',
    },
    footer: { support: 'サポート', privacy: 'プライバシーポリシー', terms: '利用規約', contact: 'お問い合わせ', rights: 'HabitQuest. ⚔️ とドット絵でつくりました。' },
    links: { privacy: '../privacy-policy.ja', terms: '../terms.ja', support: '../support.ja' },
    assets: '../assets',
    badges: { ios: '../assets/badges/app-store-en.svg', android: '../assets/badges/google-play-en.png' },
    alts: { ios: 'App Storeからダウンロード', android: 'Google Playで手に入れよう' },
  },
};

// Landing page of each language, relative to the site root.
const HOME = { en: '', fr: 'fr/', ja: 'ja/' };

const esc = (s) => s.replace(/&(?!amp;|lt;|gt;|quot;)/g, '&amp;');

/** Launch waitlist (L4), while the apps are not in the stores yet. */
function waitlistForm(t) {
  const w = t.waitlist;
  return `<form class="waitlist" id="waitlist" data-url="${SITE_CONFIG.supabaseUrl}" data-key="${SITE_CONFIG.anonKey}" data-lang="${t.lang}" novalidate>
    <h3 class="pixel">${w.title}</h3>
    <div class="waitlist-row">
      <label class="sr" for="wl-email">${w.email}</label>
      <input id="wl-email" name="email" type="email" required autocomplete="email" placeholder="${w.email}">
      <button type="submit">${w.button}</button>
    </div>
    <input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <label class="waitlist-consent"><input id="wl-consent" name="consent" type="checkbox" required> <span>${esc(w.consent)} <a href="${t.links.privacy}">${w.privacy}</a></span></label>
    <p class="waitlist-msg" role="status" data-ok="${esc(w.ok)}" data-error="${esc(w.error)}"></p>
  </form>`;
}

function storeBadges(t) {
  const one = (key, cls) => {
    const url = STORES[key];
    const img = `<img src="${t.badges[key]}" alt="${t.alts[key]}">`;
    return url
      ? `<a class="store ${cls}" href="${url}">${img}</a>`
      : `<span class="store ${cls} soon" data-soon="${t.soon}" aria-label="${t.alts[key]} (${t.soon})">${img}</span>`;
  };
  return `<div class="stores">${one('ios', 'as')}${one('android', 'gp')}</div>`;
}

function page(t) {
  const a = t.assets;
  return `<!doctype html>
<html lang="${t.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t.title}</title>
<meta name="description" content="${t.description}">
<meta property="og:title" content="${t.title}">
<meta property="og:description" content="${t.description}">
<meta property="og:image" content="${a}/og-image.png">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#0D0D1A">
<link rel="icon" href="${a}/icon.png">
${Object.entries(HOME).map(([l, h]) => `<link rel="alternate" hreflang="${l}" href="/${h}">`).join('')}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jersey+10${t.lang === 'ja' ? '&family=DotGothic16' : ''}&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${a}/site.css">
<script src="${a}/site.js" defer></script>
<script src="${a}/waitlist.js" defer></script>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand pixel" href="./"><img src="${a}/icon.png" alt="">HabitQuest</a>
  <nav class="nav">
    <a href="#features">${t.nav.features}</a><a href="#faq">${t.nav.faq}</a><a href="${t.links.support}">${t.nav.support}</a>
${Object.keys(HOME).filter((l) => l !== t.lang).map((l) => `    <a class="lang" href="${t.lang === 'en' ? '' : '../'}${HOME[l]}" hreflang="${l}">${l.toUpperCase()}</a>`).join('\n')}
  </nav>
</div></header>

<main>
<section class="hero"><div class="wrap">
  <div>
    <span class="badge pixel">${t.badge}</span>
    <h1 class="pixel">${t.h1}</h1>
    <p class="lead">${t.lead}</p>
    ${storeBadges(t)}
    <p class="web"><a href="${WEB_APP}">${t.web} →</a></p>
  </div>
  <div class="hero-art">
    <div class="phone"><img src="${a}/${t.screens || 'screens'}/today.png" alt="" width="390" height="844"></div>
    <div class="pip" aria-label="Pip">
      <p class="pip-says">${t.pipSays}</p>
      <div class="pip-sprite">${['vert', 'orange', 'or', 'bleu', 'violet', 'rose'].map((m) => `<img src="${a}/pip/pip-${m}.png" alt="" width="96" height="96">`).join('')}</div>
    </div>
  </div>
</div></section>

<section id="features"><div class="wrap">
  <h2 class="pixel">${t.featuresTitle}</h2>
  <p class="sub">${t.featuresSub}</p>
  <div class="grid">
${t.features.map(([icon, h, p]) => `    <div class="card"><div class="icon">${icon}</div><h3>${h}</h3><p>${esc(p)}</p></div>`).join('\n')}
  </div>
</div></section>

<section><div class="wrap">
  <h2 class="pixel">${t.shotsTitle}</h2>
  <div class="shots">
${t.shots.map(([img, cap]) => `    <figure><div class="phone"><img src="${a}/${t.screens || 'screens'}/${img}.png" alt="${cap}" loading="lazy" width="390" height="844"></div><figcaption>${cap}</figcaption></figure>`).join('\n')}
  </div>
</div></section>

<section><div class="wrap">
  <h2 class="pixel">${t.stepsTitle}</h2>
  <div class="steps">
${t.steps.map(([b, s]) => `    <div class="step"><b>${b}</b><span>${s}</span></div>`).join('\n')}
  </div>
</div></section>

<section><div class="wrap">
  <h2 class="pixel">${t.premiumTitle}</h2>
  <div class="premium">
    <div class="card"><h3>${t.freeTitle}</h3><ul>${t.free.map((x) => `<li>${x}</li>`).join('')}</ul></div>
    <div class="card"><h3>${t.premiumName}</h3><ul>${t.premium.map((x) => `<li>${x}</li>`).join('')}</ul></div>
  </div>
</div></section>

<section id="faq"><div class="wrap">
  <h2 class="pixel">${t.faqTitle}</h2>
${t.faq.map(([q, r]) => `  <details><summary>${q}</summary><p>${r}</p></details>`).join('\n')}
</div></section>

<section><div class="wrap"><div class="cta">
  <h2 class="pixel">${t.ctaTitle}</h2>
  ${storeBadges(t)}
  ${STORES.ios && STORES.android ? '' : waitlistForm(t)}
</div></div></section>
</main>

<footer><div class="wrap">
  <nav>
    <a href="${t.links.support}">${t.footer.support}</a>
    <a href="${t.links.privacy}">${t.footer.privacy}</a>
    <a href="${t.links.terms}">${t.footer.terms}</a>
    <a href="mailto:habitquest.application@gmail.com">${t.footer.contact}</a>
${Object.entries(SOCIAL).map(([n, u]) => `    <a href="${u}">${n}</a>`).join('\n')}
  </nav>
  <span>© 2026 ${t.footer.rights}</span>
</div></footer>
</body>
</html>
`;
}

const docs = path.join(__dirname, '..', '..', 'docs');
for (const [lang, dir] of Object.entries(HOME)) {
  fs.mkdirSync(path.join(docs, dir), { recursive: true });
  fs.writeFileSync(path.join(docs, dir, 'index.html'), page(T[lang]));
  console.log(`docs/${dir}index.html`);
}
