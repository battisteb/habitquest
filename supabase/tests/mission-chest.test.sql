-- Mission chest (G7, ADR 028). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(9);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000c4001', 'chest@test.dev', '{"username":"chester"}');
insert into user_daily_quests (user_id, template_id, assigned_date, is_completed, is_claimed)
select '00000000-0000-0000-0000-0000000c4001', t.id, user_today('00000000-0000-0000-0000-0000000c4001'), true, false
from (select id from daily_quest_templates order by id limit 3) t;

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000c4001","role":"authenticated"}', true);
set local role authenticated;

select is((open_daily_chest()::jsonb ->> 'reason'), 'not_ready', 'no chest before the three missions are claimed');
reset role;
update user_daily_quests set is_claimed = true where user_id = '00000000-0000-0000-0000-0000000c4001';
create temp table before on commit drop as
  select xp, gold from profiles where id = '00000000-0000-0000-0000-0000000c4001';
grant select on before to authenticated;
set local role authenticated;

create temp table r on commit drop as select open_daily_chest()::jsonb as j;
select ok((select (j ->> 'success')::boolean from r), 'the chest opens once the missions are claimed');
select ok(
  (select (j ->> 'gold')::int between 20 and 40 and (j ->> 'xp')::int = 0
       or (j ->> 'xp')::int between 25 and 50 and (j ->> 'gold')::int = 0
       or (j ->> 'gold')::int = 100 from r),
  'a small reward: 20-40 gold, 25-50 XP or the 100 gold jackpot'
);
select is((open_daily_chest()::jsonb ->> 'reason'), 'already_opened', 'once a day');
select throws_ok($$ insert into daily_chests (user_id, day) values ('00000000-0000-0000-0000-0000000c4001', current_date + 1) $$,
  '42501', null, 'chests are only written by the server');
reset role;

select is(
  (select gold - (select gold from before) from profiles where id = '00000000-0000-0000-0000-0000000c4001'),
  (select (j ->> 'gold')::int from r), 'the gold is paid by the server'
);

-- Unchecking a quest reopens a mission (its reward taken back): the chest goes too.
update user_daily_quests set is_claimed = false
where id = (select id from user_daily_quests where user_id = '00000000-0000-0000-0000-0000000c4001' limit 1);
select is((select count(*)::int from daily_chests where user_id = '00000000-0000-0000-0000-0000000c4001'), 0,
  'a reopened mission takes the chest back');
select is(
  (select (gold, xp) from profiles where id = '00000000-0000-0000-0000-0000000c4001'),
  (select (gold, xp) from before), 'with its reward'
);
select ok(not has_function_privilege('authenticated', 'public.take_back_daily_chest()', 'execute'),
  'the take-back trigger cannot be called directly');

select * from finish();
rollback;
