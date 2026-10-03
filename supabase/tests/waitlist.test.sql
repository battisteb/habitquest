-- Launch waitlist (L4, migration 20261003230000). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

set local role anon;
select lives_ok($$ insert into waitlist (email, lang, consent) values ('fan@example.com', 'fr', true) $$,
  'a visitor joins the waitlist');
select throws_ok($$ insert into waitlist (email, lang, consent) values ('FAN@example.com', 'fr', true) $$,
  '23505', null, 'one entry per address, whatever its case');
select throws_ok($$ insert into waitlist (email, lang, consent) values ('nope@example.com', 'en', false) $$,
  null, null, 'consent is required');
select throws_ok($$ insert into waitlist (email, lang, consent) values ('not-an-email', 'en', true) $$,
  '23514', null, 'the address must look like an e-mail');
select throws_ok($$ select email from waitlist $$, '42501', null, 'the list cannot be read from outside');
select throws_ok($$ insert into waitlist (email, consent, created_at) values ('old@example.com', true, now() - interval '1 year') $$,
  '42501', null, 'only the e-mail, language and consent can be sent');

reset role;
select * from finish();
rollback;
