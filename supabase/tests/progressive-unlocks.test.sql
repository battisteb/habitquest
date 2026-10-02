-- Progressive unlocks (I6, migration 20261003210000). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000f0001', 'newbie@test.dev', '{"username":"newbie"}'),
  ('00000000-0000-0000-0000-0000000f0002', 'pal@test.dev', '{"username":"pal"}');
insert into friendships (requester_id, addressee_id, status)
values ('00000000-0000-0000-0000-0000000f0001', '00000000-0000-0000-0000-0000000f0002', 'accepted');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select is(unlock_level('arena'), 3, 'the arena opens at level 3');
select is(unlock_level('duels'), 5, 'friend duels open at level 5');
select is(unlock_level('coop'), 5, 'co-op challenges open at level 5');

-- A new player (level 1).
select pg_temp.act_as('00000000-0000-0000-0000-0000000f0001');
set local role authenticated;
select is((arena_state() ->> 'locked')::boolean, true, 'a new player sees the arena locked');
reset role;
select is((select count(*)::int from arena_members where user_id = '00000000-0000-0000-0000-0000000f0001'), 0, 'and is not enrolled in a group');
set local role authenticated;
select throws_ok($$ select create_coop_challenge(array['00000000-0000-0000-0000-0000000f0002']::uuid[], 'validations', 3, 7) $$,
  '42501', null, 'co-op challenges are refused before level 5');
select throws_ok($$ insert into duels (challenger_id, opponent_id) values (auth.uid(), '00000000-0000-0000-0000-0000000f0002') $$,
  '42501', null, 'friend duels are refused before level 5');

-- Level 3: the arena opens.
reset role;
update profiles set xp = 250, level = level_for_xp(250) where id = '00000000-0000-0000-0000-0000000f0001';
set local role authenticated;
select ok((arena_state() ->> 'locked') is null and (arena_state() ->> 'tier') is not null, 'at level 3 the arena opens');

select * from finish();
rollback;
