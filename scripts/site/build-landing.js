/**
 * Builds the landing page of the public site (GitHub Pages, docs/):
 * docs/index.html (English), docs/fr/index.html (French), docs/ja/index.html
 * (Japanese) and docs/ko/index.html (Korean), from one template.
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
    demo: { button: '▶ Play the demo', note: 'Free, right in your browser. Nothing to install, and your hero follows you to the app.', nav: '▶ Play', title: 'Can’t wait? <em>Play now.</em>' },
    featuresTitle: 'Everything that makes <em>habits stick</em>',
    featuresSub: 'Every habit becomes a quest. Every day you show up, your hero gets stronger.',
    features: [
      ['⚔️', 'Daily quests', 'Daily, weekly or a few times a week, with categories and ready-made templates. Tick a quest, earn XP and gold.'],
      ['🔥', 'Streaks that forgive', 'Keep your streak going day after day. A weekly streak freeze and a Pause for exams, holidays or illness: frozen, not lost.'],
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
    premium: ['No ads', 'More streak freeze tokens', 'A dragon companion that grows with your streak, and an item every month', 'Full stats history', 'The full shop with exclusives', 'Priority support'],
    faqTitle: 'Questions',
    faq: [
      ['Is HabitQuest free?', 'Yes. The whole game is free; Premium is an optional subscription that removes ads and adds extras. You can cancel it at any time in your App Store or Google Play settings.'],
      ['Which devices?', 'iPhone and Android phones, and any web browser. Your progress is saved to your account and follows you everywhere.'],
      ['Which languages?', 'English, French, Japanese and Korean.'],
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
    screens: 'assets/screens',
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
    demo: { button: '▶ Jouer à la démo', note: 'Gratuit, directement dans ton navigateur. Rien à installer, et ton héros te suivra dans l’app.', nav: '▶ Jouer', title: 'Pas envie d’attendre ? <em>Joue maintenant.</em>' },
    featuresTitle: 'Tout pour que tes <em>habitudes tiennent</em>',
    featuresSub: 'Chaque habitude devient une quête. Chaque jour où tu t\'y tiens, ton héros devient plus fort.',
    features: [
      ['⚔️', 'Quêtes du jour', 'Chaque jour, chaque semaine ou quelques fois par semaine, avec catégories et modèles prêts à l\'emploi. Valide, gagne de l\'XP et de l\'or.'],
      ['🔥', 'Des séries indulgentes', 'Garde ta série jour après jour. Un gel de série par semaine et une Pause pour les examens, les vacances ou une maladie : gelées, pas perdues.'],
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
    premium: ['Sans publicité', 'Plus de jetons de gel de série', 'Un dragon compagnon qui grandit avec ta série, et un objet chaque mois', 'Historique complet des stats', 'Toute la boutique et ses exclusivités', 'Support prioritaire'],
    faqTitle: 'Questions',
    faq: [
      ['HabitQuest est-il gratuit ?', 'Oui. Tout le jeu est gratuit ; Premium est un abonnement facultatif qui retire les publicités et ajoute des bonus. Tu peux le résilier à tout moment dans les réglages de l\'App Store ou de Google Play.'],
      ['Sur quels appareils ?', 'iPhone, téléphones Android et tout navigateur web. Ta progression est enregistrée sur ton compte et te suit partout.'],
      ['Dans quelles langues ?', 'Français, anglais, japonais et coréen.'],
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
    screens: '../assets/screens',
    badges: { ios: '../assets/badges/app-store-en.svg', android: '../assets/badges/google-play-fr.png' },
    alts: { ios: 'Télécharger dans l\'App Store', android: 'Disponible sur Google Play' },
  },
  ja: {
    lang: 'ja',
    title: 'HabitQuest — 習慣をRPGに',
    description: 'ドット絵の習慣化アプリ：デイリークエストを達成して連続記録をつなぎ、ヒーローを育て、フレンドと競おう。iPhoneとAndroidに対応。',
    nav: { features: '機能', faq: 'よくある質問', support: 'サポート' },
    badge: '習慣化RPG',
    h1: '習慣を<br><em>クエスト</em>に',
    pipSays: 'こんにちは、ピップだよ！1日の様子で色が変わるんだ。',
    lead: 'デイリークエストを達成して連続記録をつなぎ、XPとゴールドを稼いで、ドット絵のヒーローを育てよう。そしてフレンドに挑戦！',
    soon: '近日公開',
    web: 'ブラウザで今すぐ遊ぶ',
    demo: { button: '▶ デモで遊ぶ', note: '無料・ブラウザでそのまま遊べます。インストール不要、ヒーローはアプリにも引き継がれます。', nav: '▶ 遊ぶ', title: '待ちきれない？<em>今すぐ遊ぼう。</em>' },
    featuresTitle: '<em>習慣が続く</em>しかけがぜんぶ',
    featuresSub: '習慣はすべてクエストに。続けた日の数だけ、ヒーローは強くなる。',
    features: [
      ['⚔️', 'デイリークエスト', '毎日、選んだ曜日、週に数回など自由に設定。カテゴリーとテンプレートつき。達成するとXPとゴールドがもらえます。'],
      ['🔥', 'やさしい連続記録', 'うっかり忘れた日は週1回のフリーズが自動でカバー。途切れてもペナルティなし：戻ってきた日はXP2倍、48時間以内なら修復も。'],
      ['🧙', '成長するヒーロー', '見習いから伝説まで6つのランク。32×32のドット絵ヒーローを、ショップの帽子・服・アクセサリー・テーマで着せ替え。'],
      ['🤺', 'バトルとチャレンジ', 'フレンドのヒーローとターン制バトル。1対1のチャレンジでは、いちばん続けた人が勝ち。'],
      ['🏟️', 'アリーナ', '1日1回、同じリーグのプレイヤーとバトル。シーズンごとに6つのリーグを駆け上がろう。'],
      ['👹', '今週のボス', '毎週、悪い習慣がモンスターに。クエストを達成するたびにダメージを与えて、日曜日までに倒そう。'],
    ],
    shotsTitle: 'アプリの<em>なか</em>をのぞいてみよう',
    shots: [['today', 'クエスト'], ['profile', 'ヒーロー'], ['arena', 'アリーナ'], ['stats', '成長の記録']],
    stepsTitle: '遊び<em>かた</em>',
    steps: [
      ['ヒーローを作る', '見た目と最初のクエストを1分以内で選ぼう。'],
      ['クエストを達成する', '習慣をこなすたびにXPとゴールド。連続記録もつながる。'],
      ['レベルアップして遊ぶ', '装備を解放し、ミッションや実績をクリアして、フレンドに勝とう。'],
    ],
    premiumTitle: '基本無料。もっと楽しむなら<em>プレミアム</em>',
    freeTitle: '無料',
    free: ['すべてのクエスト、連続記録、ヒーロー', 'デイリーミッションと23の実績', 'バトル、チャレンジ、協力チャレンジ、アリーナ', 'ショップの基本カタログ'],
    premiumName: 'プレミアム（任意）',
    premium: ['広告なし', '連続記録フリーズのトークンを追加', '連続記録とともに育つドラゴンの相棒と、毎月の限定アイテム', '全期間の統計', 'ショップの全アイテムと限定品', '優先サポート（48時間以内）'],
    faqTitle: 'よくある質問',
    faq: [
      ['HabitQuestは無料ですか？', 'はい。ゲームはすべて無料で遊べます。プレミアムは広告を消して特典を追加する任意のプランで、App StoreまたはGoogle Playの設定からいつでも解約できます。'],
      ['どの端末で使えますか？', 'iPhone、Androidスマホ、そしてウェブブラウザ。進行状況はアカウントに保存され、どこでも続きから遊べます。'],
      ['対応言語は？', '日本語、英語、フランス語、韓国語。'],
      ['データは大丈夫？', '習慣は非公開です。分析ツールは使わず、データを販売することもありません。<a href="../privacy-policy.ja">プライバシーポリシー</a>をご覧ください。'],
      ['困ったときは', 'アプリの設定 → サポートからご連絡いただくか、<a href="../support.ja">サポートページ</a>をご覧ください。'],
    ],
    ctaTitle: '冒険は<em>今日</em>からはじまる',
    waitlist: {
      title: '公開日にお知らせを受け取る',
      email: 'メールアドレス',
      consent: 'HabitQuestがApp StoreとGoogle Playで公開されたときに、メールを1通受け取ることに同意します。迷惑メールは送りません。いつでも解除できます。',
      button: '知らせてほしい',
      ok: '登録しました！公開日にメールでお知らせします。',
      error: 'うまくいきませんでした。メールアドレスを確認してもう一度お試しください。',
      privacy: 'プライバシーポリシー',
    },
    footer: { support: 'サポート', privacy: 'プライバシーポリシー', terms: '利用規約', contact: 'お問い合わせ', rights: 'HabitQuest. ⚔️ とドット絵で作りました。' },
    links: { privacy: '../privacy-policy.ja', terms: '../terms.ja', support: '../support.ja' },
    assets: '../assets',
    screens: '../assets/screens/ja',
    badges: { ios: '../assets/badges/app-store-en.svg', android: '../assets/badges/google-play-en.png' },
    alts: { ios: 'App Storeからダウンロード', android: 'Google Playで手に入れよう' },
  },
  ko: {
    lang: 'ko',
    title: 'HabitQuest — 습관을 RPG로',
    description: '픽셀 아트 습관 트래커: 매일 퀘스트를 달성하고, 연속 기록을 이어가고, 히어로를 키우고, 친구들과 겨뤄요. iPhone과 Android 지원.',
    nav: { features: '기능', faq: '자주 묻는 질문', support: '고객 지원' },
    badge: '습관 RPG',
    h1: '습관을<br><em>퀘스트</em>로',
    pipSays: '안녕, 나는 핍이야! 하루에 따라 색이 바뀌어.',
    lead: '매일 퀘스트를 달성하고, 연속 기록을 이어가고, XP와 골드를 모아 픽셀 히어로를 키워요. 그리고 친구에게 도전!',
    soon: '곧 출시',
    web: '지금 브라우저에서 플레이',
    demo: { button: '▶ 데모 플레이', note: '무료, 브라우저에서 바로 즐겨요. 설치할 필요 없고, 영웅은 앱으로 그대로 이어져요.', nav: '▶ 플레이', title: '기다리기 힘들다면? <em>지금 플레이!</em>' },
    featuresTitle: '<em>습관이 이어지는</em> 모든 장치',
    featuresSub: '모든 습관이 퀘스트가 돼요. 꾸준히 한 날만큼 히어로가 강해져요.',
    features: [
      ['⚔️', '매일 퀘스트', '매일, 고른 요일, 주 몇 회 등 자유롭게. 카테고리와 템플릿 제공. 달성하면 XP와 골드를 받아요.'],
      ['🔥', '다정한 연속 기록', '깜빡한 날은 주 1회 프리즈가 자동으로 지켜 줘요. 끊겨도 불이익 없음: 돌아온 날은 XP 2배, 48시간 안에는 복구도 가능.'],
      ['🧙', '성장하는 히어로', '견습생부터 레전드까지 6개 등급. 32×32 픽셀 히어로를 상점의 모자, 의상, 아이템, 테마로 꾸며요.'],
      ['🤺', '배틀과 챌린지', '친구의 히어로와 턴제 배틀. 협력 챌린지에서는 친구들과 함께 목표를 달성해요.'],
      ['🏟️', '아레나', '하루 한 번, 같은 리그의 플레이어와 대결. 시즌마다 6개 리그를 올라가요.'],
      ['👹', '이번 주 보스', '매주 나쁜 습관이 몬스터로. 퀘스트를 달성할 때마다 대미지를 주고 일요일까지 쓰러뜨려요.'],
    ],
    shotsTitle: '앱 <em>속</em>을 살짝 볼까요',
    shots: [['today', '퀘스트'], ['profile', '히어로'], ['arena', '아레나'], ['stats', '성장 기록']],
    stepsTitle: '플레이 <em>방법</em>',
    steps: [
      ['히어로 만들기', '외형과 첫 퀘스트를 1분 안에 골라요.'],
      ['퀘스트 달성하기', '습관을 할 때마다 XP와 골드. 연속 기록도 이어져요.'],
      ['레벨 업하고 즐기기', '장비를 열고, 미션과 업적을 깨고, 친구를 이겨요.'],
    ],
    premiumTitle: '기본 무료. 더 즐기려면 <em>프리미엄</em>',
    freeTitle: '무료',
    free: ['모든 퀘스트, 연속 기록, 히어로', '오늘의 미션과 23개의 업적', '배틀, 협력 챌린지, 아레나', '상점 기본 카탈로그'],
    premiumName: '프리미엄 (선택)',
    premium: ['광고 없음', '연속 기록 프리즈 토큰 추가', '연속 기록과 함께 자라는 드래곤 동료와 매달 한정 아이템', '전체 기간 통계', '상점의 모든 아이템과 한정판', '우선 고객 지원 (48시간 이내)'],
    faqTitle: '자주 묻는 질문',
    faq: [
      ['HabitQuest는 무료인가요?', '네. 게임은 모두 무료로 즐길 수 있어요. 프리미엄은 광고를 없애고 혜택을 더하는 선택 플랜이고, App Store 또는 Google Play 설정에서 언제든 해지할 수 있어요.'],
      ['어떤 기기에서 쓸 수 있나요?', 'iPhone, Android 스마트폰, 그리고 웹 브라우저. 진행 상황은 계정에 저장돼서 어디서든 이어서 할 수 있어요.'],
      ['지원 언어는?', '한국어, 영어, 프랑스어, 일본어.'],
      ['내 데이터는 안전한가요?', '습관은 비공개예요. 분석 도구를 쓰지 않고, 데이터를 판매하지도 않아요. <a href="../privacy-policy.ko">개인정보 처리방침</a>을 확인해 주세요.'],
      ['도움이 필요하면?', '앱의 설정 → 고객 지원으로 연락하거나 <a href="../support.ko">고객 지원 페이지</a>를 확인해 주세요.'],
    ],
    ctaTitle: '모험은 <em>오늘</em> 시작돼요',
    waitlist: {
      title: '출시 소식 받기',
      email: '이메일 주소',
      consent: 'HabitQuest가 App Store와 Google Play에 출시되면 이메일 1통을 받는 데 동의해요. 스팸은 없고, 언제든 취소할 수 있어요.',
      button: '알려 주세요',
      ok: '등록했어요! 출시되면 이메일로 알려 드릴게요.',
      error: '잘 안 됐어요. 이메일 주소를 확인하고 다시 시도해 주세요.',
      privacy: '개인정보 처리방침',
    },
    footer: { support: '고객 지원', privacy: '개인정보 처리방침', terms: '이용약관', contact: '문의', rights: 'HabitQuest. ⚔️ 와 픽셀 아트로 만들었어요.' },
    links: { privacy: '../privacy-policy.ko', terms: '../terms.ko', support: '../support.ko' },
    assets: '../assets',
    screens: '../assets/screens/ko',
    badges: { ios: '../assets/badges/app-store-en.svg', android: '../assets/badges/google-play-en.png' },
    alts: { ios: 'App Store에서 다운로드', android: 'Google Play에서 다운로드' },
  },
};

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

/**
 * The web demo: until the apps are in the stores, it is the main way to try HabitQuest
 * (Battiste, 2026-10-04), so it gets a big button; afterwards, a small link under the badges.
 */
const PRELAUNCH = !(STORES.ios && STORES.android);
function demoButton(t) {
  return PRELAUNCH
    ? `<div class="demo"><a class="play pixel" href="${WEB_APP}">${t.demo.button}</a><p>${t.demo.note}</p></div>`
    : `<p class="web"><a href="${WEB_APP}">${t.web} →</a></p>`;
}

/** Links to the other languages of the landing page (from the page of `lang`). */
function otherLangs(lang) {
  const root = lang === 'en' ? '' : '../';
  const home = { en: root || './', fr: `${root}fr/`, ja: `${root}ja/`, ko: `${root}ko/` };
  return ['en', 'fr', 'ja', 'ko'].filter((l) => l !== lang).map((l) => [l, home[l]]);
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
<meta name="theme-color" content="#CFE8FF">
<link rel="icon" href="${a}/icon.png">
<link rel="alternate" hreflang="en" href="/"><link rel="alternate" hreflang="fr" href="/fr/"><link rel="alternate" hreflang="ja" href="/ja/"><link rel="alternate" hreflang="ko" href="/ko/">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jersey+10${t.lang === 'ja' ? '&family=DotGothic16' : ''}&family=Inter:wght@400;600;700&display=swap" rel="stylesheet">${t.lang === 'ko' ? '\n<link href="https://cdn.jsdelivr.net/npm/galmuri@2.40.3/dist/galmuri.css" rel="stylesheet">' : ''}
<link rel="stylesheet" href="${a}/site.css">
<script src="${a}/site.js" defer></script>
<script src="${a}/waitlist.js" defer></script>
</head>
<body>
<header class="top"><div class="wrap">
  <a class="brand pixel" href="./"><img src="${a}/icon.png" alt="">HabitQuest</a>
  <nav class="nav">
    <a class="nav-play pixel" href="${WEB_APP}">${t.demo.nav}</a>
    <a href="#features">${t.nav.features}</a><a href="#faq">${t.nav.faq}</a><a href="${t.links.support}">${t.nav.support}</a>
${otherLangs(t.lang).map(([l, href]) => `    <a class="lang" href="${href}" hreflang="${l}">${l.toUpperCase()}</a>`).join('\n')}
  </nav>
</div></header>

<main>
<section class="hero"><div class="wrap">
  <div>
    <span class="badge pixel">${t.badge}</span>
    <h1 class="pixel">${t.h1}</h1>
    <p class="lead">${t.lead}</p>
    ${PRELAUNCH ? demoButton(t) + storeBadges(t) : storeBadges(t) + demoButton(t)}
  </div>
  <div class="hero-art">
    <div class="phone"><img src="${t.screens}/today.png" alt="" width="390" height="844"></div>
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
${t.shots.map(([img, cap]) => `    <figure><div class="phone"><img src="${t.screens}/${img}.png" alt="${cap}" loading="lazy" width="390" height="844"></div><figcaption>${cap}</figcaption></figure>`).join('\n')}
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

${PRELAUNCH ? `<section><div class="wrap"><div class="cta">
  <h2 class="pixel">${t.demo.title}</h2>
  ${demoButton(t)}
</div></div></section>

` : ''}<section id="faq"><div class="wrap">
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
fs.writeFileSync(path.join(docs, 'index.html'), page(T.en));
fs.mkdirSync(path.join(docs, 'fr'), { recursive: true });
fs.writeFileSync(path.join(docs, 'fr', 'index.html'), page(T.fr));
fs.mkdirSync(path.join(docs, 'ja'), { recursive: true });
fs.writeFileSync(path.join(docs, 'ja', 'index.html'), page(T.ja));
fs.mkdirSync(path.join(docs, 'ko'), { recursive: true });
fs.writeFileSync(path.join(docs, 'ko', 'index.html'), page(T.ko));
console.log('docs/index.html, docs/fr/index.html, docs/ja/index.html, docs/ko/index.html');
