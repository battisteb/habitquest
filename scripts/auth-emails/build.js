/**
 * Builds the Supabase auth e-mail templates (confirmation, password reset,
 * e-mail change) in the HabitQuest pixel style, from one layout.
 *
 *   node scripts/auth-emails/build.js   → supabase/templates/*.html + subjects.json
 *
 * Supabase keeps one template per e-mail, so each template picks French or
 * English at send time from the player's language ({{ .Data.language }},
 * saved in the account metadata by the app); English is the default.
 * Upload to a project: scripts/auth-emails/push.js.
 */
const fs = require('fs');
const path = require('path');

const ICON = 'https://habitquest.expo.app/icon-192.png';
const SITE = 'https://habitquest.expo.app';
const C = {
  background: '#0D0D1A',
  surface: '#1A1A2E',
  border: '#2D2D4E',
  text: '#E8E8FF',
  textSecondary: '#9999CC',
  muted: '#555580',
  primary: '#6C63FF',
  primaryDark: '#4A44B3',
  accent: '#FFD700',
};

const EMAILS = {
  confirmation: {
    en: {
      subject: 'Confirm your HabitQuest account ⚔️',
      title: 'YOUR QUEST BEGINS',
      body: 'Welcome, adventurer! Confirm your e-mail address to create your hero and start your first quest.',
      button: 'CONFIRM MY ACCOUNT',
      footer: "You didn't sign up for HabitQuest? Just ignore this e-mail.",
    },
    fr: {
      subject: 'Confirme ton compte HabitQuest ⚔️',
      title: 'TA QUÊTE COMMENCE',
      body: 'Bienvenue, aventurier ! Confirme ton adresse e-mail pour créer ton héros et lancer ta première quête.',
      button: 'CONFIRMER MON COMPTE',
      footer: 'Tu ne t’es pas inscrit sur HabitQuest ? Ignore simplement cet e-mail.',
    },
  },
  recovery: {
    en: {
      subject: 'Reset your HabitQuest password 🔑',
      title: 'NEW PASSWORD',
      body: 'You asked to reset your password. Tap the button to choose a new one: your hero, streaks and gold are safe.',
      button: 'CHOOSE A NEW PASSWORD',
      footer: "You didn't ask for this? Ignore this e-mail: your password stays the same.",
    },
    fr: {
      subject: 'Réinitialise ton mot de passe HabitQuest 🔑',
      title: 'NOUVEAU MOT DE PASSE',
      body: 'Tu as demandé à réinitialiser ton mot de passe. Touche le bouton pour en choisir un nouveau : ton héros, tes séries et ton or sont en sécurité.',
      button: 'CHOISIR UN MOT DE PASSE',
      footer: 'Ce n’est pas toi ? Ignore cet e-mail : ton mot de passe ne change pas.',
    },
  },
  email_change: {
    en: {
      subject: 'Confirm your new HabitQuest e-mail ✉️',
      title: 'NEW E‑MAIL',
      body: 'Confirm that {{ .NewEmail }} is your new e-mail address for HabitQuest (instead of {{ .Email }}).',
      button: 'CONFIRM NEW E‑MAIL',
      footer: "You didn't ask for this change? Ignore this e-mail and your address stays the same.",
    },
    fr: {
      subject: 'Confirme ta nouvelle adresse HabitQuest ✉️',
      title: 'NOUVELLE ADRESSE',
      body: 'Confirme que {{ .NewEmail }} est ta nouvelle adresse e-mail pour HabitQuest (à la place de {{ .Email }}).',
      button: 'CONFIRMER L’ADRESSE',
      footer: 'Tu n’as pas demandé ce changement ? Ignore cet e-mail : ton adresse ne change pas.',
    },
  },
};

const FR = '{{ if eq .Data.language "fr" }}';

function card(t) {
  // Tables and inline styles: the only layout every mail client renders.
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:${C.surface};border:4px solid ${C.border};">
      <tr><td style="padding:32px 28px 8px 28px;text-align:center;">
        <img src="${ICON}" width="72" height="72" alt="HabitQuest" style="display:block;margin:0 auto;border:3px solid ${C.border};image-rendering:pixelated;">
        <div style="margin-top:16px;font-family:'Courier New',Courier,monospace;font-size:13px;font-weight:bold;letter-spacing:3px;color:${C.accent};">HABITQUEST</div>
      </td></tr>
      <tr><td style="padding:12px 28px 0 28px;text-align:center;">
        <h1 style="margin:0;font-family:'Courier New',Courier,monospace;font-size:22px;letter-spacing:2px;color:${C.text};">${t.title}</h1>
      </td></tr>
      <tr><td style="padding:16px 28px 0 28px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:22px;color:${C.textSecondary};">
        ${t.body}
      </td></tr>
      <tr><td style="padding:28px 28px 8px 28px;text-align:center;">
        <a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 22px;background:${C.primary};border:3px solid ${C.primaryDark};box-shadow:0 4px 0 ${C.primaryDark};color:#ffffff;font-family:'Courier New',Courier,monospace;font-size:15px;font-weight:bold;letter-spacing:1px;text-decoration:none;">${t.button}</a>
      </td></tr>
      <tr><td style="padding:20px 28px 28px 28px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:${C.muted};">
        ${t.footer}
      </td></tr>
    </table>`;
}

function page(email) {
  const { en, fr } = EMAILS[email];
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="dark">
<title>HabitQuest</title>
</head>
<body style="margin:0;padding:0;background:${C.background};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.background};">
  <tr><td align="center" style="padding:32px 12px;">
    ${FR}${card(fr)}{{ else }}${card(en)}{{ end }}
    <div style="margin-top:20px;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.muted};">
      <a href="${SITE}" style="color:${C.muted};">habitquest.expo.app</a>
    </div>
  </td></tr>
</table>
</body>
</html>
`;
}

const outDir = path.join(__dirname, '..', '..', 'supabase', 'templates');
fs.mkdirSync(outDir, { recursive: true });
const subjects = {};
for (const email of Object.keys(EMAILS)) {
  fs.writeFileSync(path.join(outDir, `${email}.html`), page(email));
  const { en, fr } = EMAILS[email];
  subjects[email] = `${FR}${fr.subject}{{ else }}${en.subject}{{ end }}`;
}
fs.writeFileSync(path.join(outDir, 'subjects.json'), JSON.stringify(subjects, null, 2) + '\n');
console.log('templates:', Object.keys(EMAILS).join(', '), '→', path.relative(process.cwd(), outDir));
