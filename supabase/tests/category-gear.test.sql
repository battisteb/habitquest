-- Category gear sets (ADR 032, migration 20261014120000). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(11);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000c6001', 'runner@test.dev', '{"username":"runner"}');
update profiles set gold = 1000, level = 20, language = 'fr' where id = '00000000-0000-0000-0000-0000000c6001';
insert into habits (id, user_id, name, category, frequency) values
  ('00000000-0000-0000-0000-0000000c6a01', '00000000-0000-0000-0000-0000000c6001', 'Run', 'fitness', 'daily'),
  ('00000000-0000-0000-0000-0000000c6a02', '00000000-0000-0000-0000-0000000c6001', 'Read', 'learning', 'daily');

create function pg_temp.owned(p_sprite text) returns boolean language sql as $$
  select exists (select 1 from purchases p join shop_items s on s.id = p.item_id
                 where p.user_id = '00000000-0000-0000-0000-0000000c6001' and s.sprite_key = p_sprite);
$$;

select is((select count(*)::int from shop_items where unlock_category is not null), 12, 'four sets of three pieces');
select ok(not (select bool_or(is_available) from shop_items where unlock_category is not null), 'set pieces are not in the shop');

update streaks set current_count = 6, longest_count = 6 where habit_id = '00000000-0000-0000-0000-0000000c6a01';
select ok(not pg_temp.owned('hat_sport_headband'), 'nothing before 7 days');

update streaks set current_count = 7, longest_count = 7 where habit_id = '00000000-0000-0000-0000-0000000c6a01';
select ok(pg_temp.owned('hat_sport_headband'), '7 days on a Fitness quest: the headband');
select ok(not pg_temp.owned('acc_dumbbell'), 'not the 21-day piece yet');
select ok(not pg_temp.owned('hat_scholar_cap'), 'only the category of the habit');
select is((select title from notifications where user_id = '00000000-0000-0000-0000-0000000c6001' and type = 'gear_unlocked'),
  '🎁 Équipement débloqué !', 'the player is told, in their language');

update streaks set current_count = 66, longest_count = 66 where habit_id = '00000000-0000-0000-0000-0000000c6a01';
select ok(pg_temp.owned('acc_dumbbell') and pg_temp.owned('outfit_sport'), 'a jump to 66 days gives the missing pieces');
select is((select count(*)::int from notifications where user_id = '00000000-0000-0000-0000-0000000c6001' and type = 'gear_unlocked'),
  3, 'one notification per piece');

update streaks set current_count = 1 where habit_id = '00000000-0000-0000-0000-0000000c6a01';
select ok(pg_temp.owned('outfit_sport'), 'a broken streak keeps the pieces (best streak)');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000c6001","role":"authenticated"}', true);
set local role authenticated;
select is(
  (purchase_item('00000000-0000-0000-0000-0000000c6001', (select id from shop_items where sprite_key = 'hat_scholar_cap'))::jsonb ->> 'success'),
  'false', 'a set piece cannot be bought'
);

select * from finish();
rollback;
