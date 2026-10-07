-- Segmented admin metrics and platform tracking. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(12);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000be01', 'boss2@test.dev', '{"username":"boss2"}'),
  ('00000000-0000-0000-0000-00000000be02', 'aki@test.dev', '{"username":"aki"}'),
  ('00000000-0000-0000-0000-00000000be03', 'lea@test.dev', '{"username":"lea"}');

update public.profiles set is_admin = true where id = '00000000-0000-0000-0000-00000000be01';
update public.profiles set language = 'ja', timezone = 'Asia/Tokyo' where id = '00000000-0000-0000-0000-00000000be02';
update public.profiles set language = 'fr', timezone = 'Europe/Paris' where id = '00000000-0000-0000-0000-00000000be03';

-- aki created a habit and completed it today; lea has nothing yet.
insert into public.habits (id, user_id, name, category) values
  ('00000000-0000-0000-0000-00000000bf01', '00000000-0000-0000-0000-00000000be02', 'Read', 'learning');
insert into public.completions (habit_id, completed_at) values
  ('00000000-0000-0000-0000-00000000bf01', now());

-- Players: track_session records the platform, other players cannot read it.
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000be02', 'role', 'authenticated')::text, true);
set local role authenticated;

select lives_ok($$select track_session('android')$$, 'a player records their platform');
select throws_ok($$select track_session('windows')$$, 'P0001', null, 'an unknown platform is refused');
select throws_ok($$select last_platform from public.profiles$$, '42501', null,
  'players cannot read the platform column');
select throws_ok($$select admin_segments()$$, '42501', 'admin only', 'a non-admin cannot read segments');
select throws_ok($$select admin_user_facts()$$, '42501', null, 'the per-player facts are not callable');

reset role;
select is((select last_platform from public.profiles where id = '00000000-0000-0000-0000-00000000be02'),
  'android', 'the platform is stored');

-- Admin view.
select set_config('request.jwt.claims',
  json_build_object('sub', '00000000-0000-0000-0000-00000000be01', 'role', 'authenticated')::text, true);
set local role authenticated;

create temp table seg on commit drop as select admin_segments() as r;

select ok((select r ? 'funnel' and r ? 'by_language' and r ? 'by_platform' and r ? 'by_region'
  and r ? 'by_plan' and r ? 'cohorts' from seg), 'the payload has every section');
select is((select (r -> 'funnel' -> 0 ->> 'n')::int from seg), 2, 'admins are left out of the counts');
select is((select (r -> 'funnel' -> 2 ->> 'n')::int from seg), 1, 'one player completed a first quest');
select is((select (e ->> 'activation_rate')::int from seg, jsonb_array_elements(r -> 'by_language') e
  where e ->> 'key' = 'ja'), 100, 'Japanese players: 100% activated');
select is((select (e ->> 'users')::int from seg, jsonb_array_elements(r -> 'by_platform') e
  where e ->> 'key' = 'android'), 1, 'one Android player');
select is((select jsonb_array_length(r -> 'cohorts') from seg), 8, 'eight weekly cohorts');

select * from finish();
rollback;
