/**
 * Builds the landing page of the public site (GitHub Pages, docs/):
 * docs/index.html (English) and docs/fr/index.html (French), from one template.
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
    nav: { features: 'Features', faq: 'FAQ', support: 'Support', other: 'FR', otherHref: 'fr/' },
    badge: 'HABIT TRACKER RPG',
    h1: 'Turn your habits<br>into <em>quests</em>',
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
      ['Which languages?', 'English and French.'],
      ['What about my data?', 'Your habits are private. We use no analytics SDK and never sell your data. Read the <a href="privacy-policy">Privacy Policy</a>.'],
      ['I need help', 'Write to us from Settings → Support in the app, or see the <a href="support">Support page</a>.'],
    ],
    ctaTitle: 'Your adventure starts <em>today</em>',
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
    nav: { features: 'Fonctionnalités', faq: 'FAQ', support: 'Aide', other: 'EN', otherHref: '../' },
    badge: 'HABIT TRACKER RPG',
    h1: 'Tes habitudes<br>deviennent des <em>quêtes</em>',
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
      ['Dans quelles langues ?', 'Français et anglais.'],
      ['Et mes données ?', 'Tes habitudes sont privées. Aucun outil d\'analyse, aucune revente de données. Lis la <a href="../privacy-policy.fr">politique de confidentialité</a>.'],
      ['J\'ai besoin d\'aide', 'Écris-nous depuis Réglages → Support dans l\'app, ou consulte la <a href="../support">page d\'aide</a>.'],
    ],
    ctaTitle: 'Ton aventure commence <em>aujourd\'hui</em>',
    footer: { support: 'Aide', privacy: 'Confidentialité', terms: 'Conditions d\'utilisation', contact: 'Contact', rights: 'HabitQuest. Fait avec ⚔️ et du pixel art.' },
    links: { privacy: '../privacy-policy.fr', terms: '../terms', support: '../support' },
    assets: '../assets',
    badges: { ios: '../assets/badges/app-store-en.svg', android: '../assets/badges/google-play-fr.png' },
    alts: { ios: 'Télécharger dans l\'App Store', android: 'Disponible sur Google Play' },
  },
};

const esc = (s) => s.replace(/&(?!amp;|lt;|gt;|quot;)/g, '&amp;');

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
<link rel="alternate" hreflang="en" href="/"><link rel="alternate" hreflang="fr" href="/fr/">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jersey+10&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${a}/site.css">
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand pixel" href="${t.lang === 'fr' ? './' : './'}"><img src="${a}/icon.png" alt="">HabitQuest</a>
  <nav class="nav">
    <a href="#features">${t.nav.features}</a><a href="#faq">${t.nav.faq}</a><a href="${t.links.support}">${t.nav.support}</a>
    <a class="lang" href="${t.nav.otherHref}" hreflang="${t.nav.other.toLowerCase()}">${t.nav.other}</a>
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
  <div class="phone"><img src="${a}/screens/today.png" alt="" width="390" height="844"></div>
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
${t.shots.map(([img, cap]) => `    <figure><div class="phone"><img src="${a}/screens/${img}.png" alt="${cap}" loading="lazy" width="390" height="844"></div><figcaption>${cap}</figcaption></figure>`).join('\n')}
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
fs.writeFileSync(path.join(docs, 'index.html'), page(T.en));
fs.mkdirSync(path.join(docs, 'fr'), { recursive: true });
fs.writeFileSync(path.join(docs, 'fr', 'index.html'), page(T.fr));
console.log('docs/index.html, docs/fr/index.html');
