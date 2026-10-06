-- Referral reward: inviting a friend who gets started grants both a week of
-- Premium, once, server-side. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

-- Referrer (A) and invitee (B); profiles created by the handle_new_user trigger.
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000aaa01', 'ref@test.dev', '{"username":"refA"}'),
  ('00000000-0000-0000-0000-0000000aaa02', 'inv@test.dev', '{"username":"invB"}');

insert into public.invite_codes (user_id, code)
  values ('00000000-0000-0000-0000-0000000aaa01', 'REFCODE0001');

-- B opens A's invite link.
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000aaa02', 'role', 'authenticated')::text, true);
set local role authenticated;
select accept_invite('REFCODE0001');
reset role;

select is((select referrer_id from referrals where invitee_id = '00000000-0000-0000-0000-0000000aaa02'),
  '00000000-0000-0000-0000-0000000aaa01'::uuid, 'the referral is recorded on accept_invite');

-- B has a habit and has not earned Premium yet.
insert into public.habits (id, user_id, name, category)
  values ('00000000-0000-0000-0000-0000000bbb01', '00000000-0000-0000-0000-0000000aaa02', 'Read', 'learning');

select is((select subscription_status from profiles where id = '00000000-0000-0000-0000-0000000aaa02'),
  'free', 'invitee is not Premium before getting started');

-- B completes their first quest -> both get a week of Premium.
insert into public.completions (habit_id) values ('00000000-0000-0000-0000-0000000bbb01');

select is((select subscription_status from profiles where id = '00000000-0000-0000-0000-0000000aaa02'),
  'premium', 'invitee becomes Premium after first completion');
select is((select subscription_status from profiles where id = '00000000-0000-0000-0000-0000000aaa01'),
  'premium', 'referrer becomes Premium too');
select ok((select subscription_expires_at from profiles where id = '00000000-0000-0000-0000-0000000aaa01')
  > now() + interval '6 days', 'referrer gets about 7 days');
select isnt((select rewarded_at from referrals where invitee_id = '00000000-0000-0000-0000-0000000aaa02'),
  null, 'the referral is marked rewarded');

-- A second completion must not reward again (no stacking to ~14 days).
insert into public.completions (habit_id) values ('00000000-0000-0000-0000-0000000bbb01');
select ok((select subscription_expires_at from profiles where id = '00000000-0000-0000-0000-0000000aaa01')
  < now() + interval '8 days', 'the reward is granted only once');

select * from finish();
rollback;
