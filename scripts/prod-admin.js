#!/usr/bin/env node
/**
 * Small admin helper for the production database. Runs SQL through the Supabase
 * Management API (no Docker, no pg client), authenticated with
 * SUPABASE_ACCESS_TOKEN (read from env or ../.env.deploy.local).
 *
 * Usage (run from the repo root, with .env.deploy.local alongside):
 *   node scripts/prod-admin.js list-admins
 *   node scripts/prod-admin.js set-admin   <username>
 *   node scripts/prod-admin.js unset-admin <username>
 *   node scripts/prod-admin.js set-premium   <username>   # testing override (bypasses RevenueCat)
 *   node scripts/prod-admin.js unset-premium <username>
 *
 * Only toggles profiles.is_admin / profiles.subscription_status — nothing else.
 */
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'aksxyaullvozlkzcegth'; // HabitQuest prod

function readToken() {
  if (process.env.SUPABASE_ACCESS_TOKEN) return process.env.SUPABASE_ACCESS_TOKEN;
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const f = path.join(dir, '.env.deploy.local');
    if (fs.existsSync(f)) {
      const txt = fs.readFileSync(f, 'utf8').replace(/^﻿/, '');
      const m = txt.match(/^\s*SUPABASE_ACCESS_TOKEN\s*=\s*(.*)$/m);
      if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  throw new Error('SUPABASE_ACCESS_TOKEN not found (env or .env.deploy.local)');
}

async function runSql(query) {
  const token = readToken();
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Management API ${res.status}: ${text}`);
  try { return JSON.parse(text); } catch { return text; }
}

function requireUsername(u) {
  if (!u || !/^[A-Za-z0-9_]{3,20}$/.test(u)) throw new Error('username must be 3-20 chars of letters, digits or _');
  return u;
}

(async () => {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'list-admins') {
    const rows = await runSql(`select username from public.profiles where is_admin = true order by username`);
    console.log(rows.length ? rows.map((r) => r.username).join(', ') : 'no admins');
  } else if (cmd === 'set-admin' || cmd === 'unset-admin') {
    const u = requireUsername(arg);
    const rows = await runSql(`update public.profiles set is_admin = ${cmd === 'set-admin'} where username = '${u}' returning username, is_admin`);
    if (!rows.length) { console.error(`no such user: ${u}`); process.exit(1); }
    console.log(`${u}: is_admin = ${rows[0].is_admin}`);
  } else if (cmd === 'set-premium' || cmd === 'unset-premium') {
    const u = requireUsername(arg);
    const val = cmd === 'set-premium' ? 'premium' : 'free';
    const rows = await runSql(`update public.profiles set subscription_status = '${val}' where username = '${u}' returning username, subscription_status`);
    if (!rows.length) { console.error(`no such user: ${u}`); process.exit(1); }
    console.log(`${u}: subscription_status = ${rows[0].subscription_status}`);
  } else {
    console.error('usage: prod-admin.js <list-admins | set-admin <u> | unset-admin <u> | set-premium <u> | unset-premium <u>>');
    process.exit(1);
  }
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
