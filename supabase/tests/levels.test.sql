-- Level scale (ADR 010): starts at 1, mirrors getLevelForXp. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

select is(level_for_xp(0), 1, 'new players are level 1');
select is(level_for_xp(99), 1, 'still level 1 just before 100 XP');
select is(level_for_xp(100), 2, 'level 2 at 100 XP');
select is(level_for_xp(250), 3, 'level 3 at 250 XP');
select is(level_for_xp(6000), 11, 'level 11 at 6000 XP');
select is(level_for_xp(8000), 12, 'levels continue past the table');
select is(rank_for_level(level_for_xp(6000)), 'Legend', 'Legend is reachable');
select is(rank_for_level(level_for_xp(0)), 'Novice', 'everyone starts Novice');

insert into auth.users (id, email, raw_user_meta_data)
values ('00000000-0000-0000-0000-00000000cc01', 'fresh@test.dev', '{"username":"fresh"}');
select is((select level from profiles where id = '00000000-0000-0000-0000-00000000cc01'), 1,
  'a new profile starts at level 1');

select * from finish();
rollback;
