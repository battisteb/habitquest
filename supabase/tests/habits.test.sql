-- Quest completion rules (docs/review/2026-10-revue-app.md). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(6);

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-0000000ee001', 'weekly@test.dev', '{"username":"weekly"}');
insert into habits (id, user_id, name, category, frequency, is_paused, is_archived) values
  ('00000000-0000-0000-0000-0000000eb001', '00000000-0000-0000-0000-0000000ee001', 'Gym', 'fitness', '3x_week', false, false),
  ('00000000-0000-0000-0000-0000000eb002', '00000000-0000-0000-0000-0000000ee001', 'Swim', 'fitness', 'daily', true, false),
  ('00000000-0000-0000-0000-0000000eb003', '00000000-0000-0000-0000-0000000ee001', 'Old', 'fitness', 'daily', false, true);

select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-0000000ee001', 'role', 'authenticated')::text, true);
set local role authenticated;

select is((complete_habit('00000000-0000-0000-0000-0000000eb001') ->> 'success')::boolean, true,
  'a weekly quest can be completed today');
select is(complete_habit('00000000-0000-0000-0000-0000000eb001') ->> 'reason', 'already_completed',
  'but only once a day: 3 times a week means 3 different days');

reset role;
-- An earlier day of the same week counts towards the target.
update completions set completed_at = completed_at - interval '1 day'
where habit_id = '00000000-0000-0000-0000-0000000eb001'
  and date_trunc('week', user_today('00000000-0000-0000-0000-0000000ee001'))::date
      <= user_local_date('00000000-0000-0000-0000-0000000ee001', completed_at - interval '1 day');
create temp table dow on commit drop as
  select extract(isodow from user_today('00000000-0000-0000-0000-0000000ee001')) = 1 as monday;
grant select on dow to authenticated;
set local role authenticated;
select is((select count(*)::int from completions where habit_id = '00000000-0000-0000-0000-0000000eb001'), 1,
  'one validation recorded');
select ok((complete_habit('00000000-0000-0000-0000-0000000eb001') ->> 'success')::boolean
          or (select monday from dow),
  'another day of the week can be validated (skipped on Mondays)');

select is(complete_habit('00000000-0000-0000-0000-0000000eb002') ->> 'reason', 'inactive',
  'a paused quest cannot be completed');
select is(complete_habit('00000000-0000-0000-0000-0000000eb003') ->> 'reason', 'inactive',
  'an archived quest cannot be completed');

select * from finish();
rollback;
