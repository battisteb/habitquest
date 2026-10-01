/**
 * Uploads the auth e-mail templates (supabase/templates, see build.js) to a
 * Supabase project through the Management API.
 *
 *   SUPABASE_ACCESS_TOKEN=… node scripts/auth-emails/push.js <project-ref> --backup <file> [--dry-run]
 *
 * The current subjects and templates are saved to the backup file first;
 * restore them with --restore <file>.
 */
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const ref = args[0];
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1] ?? true;
};
const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!ref || !token) {
  console.error('usage: SUPABASE_ACCESS_TOKEN=… node scripts/auth-emails/push.js <project-ref> --backup <file> [--dry-run]');
  process.exit(1);
}

const EMAILS = ['confirmation', 'recovery', 'email_change'];
const KEYS = EMAILS.flatMap((e) => [`mailer_subjects_${e}`, `mailer_templates_${e}_content`]);
const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

function newConfig() {
  const dir = path.join(__dirname, '..', '..', 'supabase', 'templates');
  const subjects = JSON.parse(fs.readFileSync(path.join(dir, 'subjects.json'), 'utf8'));
  const body = {};
  for (const e of EMAILS) {
    body[`mailer_subjects_${e}`] = subjects[e];
    body[`mailer_templates_${e}_content`] = fs.readFileSync(path.join(dir, `${e}.html`), 'utf8');
  }
  return body;
}

(async () => {
  const current = await fetch(api, { headers });
  if (!current.ok) throw new Error(`read config: ${current.status} ${await current.text()}`);
  const config = await current.json();
  const saved = Object.fromEntries(KEYS.map((k) => [k, config[k] ?? null]));

  const restore = flag('--restore');
  const body = typeof restore === 'string' ? JSON.parse(fs.readFileSync(restore, 'utf8')) : newConfig();

  const backup = flag('--backup');
  if (typeof backup !== 'string' && typeof restore !== 'string') throw new Error('--backup <file> is required');
  if (typeof backup === 'string') {
    fs.writeFileSync(backup, JSON.stringify(saved, null, 2));
    console.log('backup:', backup);
  }

  for (const k of KEYS) console.log(`${saved[k] === body[k] ? '  same   ' : '  change '} ${k}`);
  if (flag('--dry-run')) return;

  const res = await fetch(api, { method: 'PATCH', headers, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`update config: ${res.status} ${await res.text()}`);
  const after = await res.json();
  const ok = KEYS.every((k) => after[k] === body[k]);
  console.log(ok ? 'templates updated' : 'update returned different values: check the dashboard');
  if (!ok) process.exit(1);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
