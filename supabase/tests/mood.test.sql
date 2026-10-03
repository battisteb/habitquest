-- Mood of the day (ADR 023). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000ad01', 'mood@test.dev', '{"username":"moody"}'),
  ('00000000-0000-0000-0000-00000000ad02', 'other@test.dev', '{"username":"other_mood"}');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000ad01","role":"authenticated"}', true);
set local role authenticated;

select is((log_mood(4) ->> 'mood')::int, 4, 'the mood of the day is saved');
select is((log_mood(2) ->> 'mood')::int, 2, 'and can be changed the same day');
select is((select count(*)::int from mood_logs), 1, 'one mood per day');
select throws_ok($$ select log_mood(6) $$, '22023', null, 'a mood is between 1 and 5');
select throws_ok($$ insert into mood_logs (user_id, day, mood) values (auth.uid(), current_date - 1, 5) $$,
  '42501', null, 'moods are only written through log_mood');

select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000ad02","role":"authenticated"}', true);
select is((select count(*)::int from mood_logs), 0, 'nobody else can read your moods');
reset role;
set local role anon;
select throws_ok($$ select log_mood(3) $$, '42501', null, 'signed-out visitors cannot log a mood');

select * from finish();
rollback;
