-- A co-op reward that levels the player up is reported as a level-up (A5). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(2);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000055001', 'lvl-a@test.dev', '{"username":"lvla"}'),
  ('00000000-0000-0000-0000-000000055002', 'lvl-b@test.dev', '{"username":"lvlb"}');
-- Progressive unlocks (I6): these players have reached the feature's level.
update profiles set xp = xp + 850, level = level_for_xp(xp + 850) where id::text like '00000000-0000-0000-0000-000000055%';
insert into friendships (requester_id, addressee_id, status)
values ('00000000-0000-0000-0000-000000055001', '00000000-0000-0000-0000-000000055002', 'accepted');
insert into habits (id, user_id, name, category, frequency) values
  ('00000000-0000-0000-0000-000000055b01', '00000000-0000-0000-0000-000000055001', 'A1', 'fitness', 'daily'),
  ('00000000-0000-0000-0000-000000055b02', '00000000-0000-0000-0000-000000055002', 'B1', 'fitness', 'daily'),
  ('00000000-0000-0000-0000-000000055b03', '00000000-0000-0000-0000-000000055002', 'B2', 'fitness', 'daily');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-000000055001');
set local role authenticated;
create temp table ch on commit drop as
  select create_coop_challenge(array['00000000-0000-0000-0000-000000055002']::uuid[], 'validations', 3, 7) as id;
grant select on ch to authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-000000055002');
select respond_coop_challenge((select id from ch), true);
select complete_habit('00000000-0000-0000-0000-000000055b02');
select complete_habit('00000000-0000-0000-0000-000000055b03');

-- A sits just under level 2: the co-op reward of the last validation crosses it.
reset role;
update profiles set xp = 95, level = level_for_xp(95) where id = '00000000-0000-0000-0000-000000055001';
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-000000055001');
create temp table res on commit drop as select complete_habit('00000000-0000-0000-0000-000000055b01') as r;
select is((select get_coop_challenges() -> 0 ->> 'status'), 'completed', 'the last validation completes the co-op challenge');
select is((select (r ->> 'old_level')::int || '→' || (r ->> 'new_level')::int from res), '1→2',
  'the level-up is reported even though the co-op reward crossed the threshold first');

select * from finish();
rollback;
