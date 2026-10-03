-- Seasonal cosmetics (G6b). Run with `supabase test db`.
-- Date-independent: works out which arc "today" belongs to.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(7);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000b6001', 'cape@test.dev', '{"username":"caper"}');
update profiles set gold = 1000, level = 5 where id = '00000000-0000-0000-0000-0000000b6001';

create temp table t on commit drop as
  select (select a.season from arc_of(user_today('00000000-0000-0000-0000-0000000b6001')) a) as now_season;
create temp table capes on commit drop as
  select id, season, (season = (select now_season from t)) as current
  from shop_items where sprite_key like 'acc_cape_%' and season is not null;
grant select on t, capes to authenticated;

select is((select count(*)::int from capes), 4, 'one cape per arc');
select ok(not (select bool_or(is_available) from shop_items where season is not null), 'seasonal items stay out of the regular shop');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000b6001","role":"authenticated"}', true);
set local role authenticated;

select is(
  (purchase_item('00000000-0000-0000-0000-0000000b6001', (select id from capes where not current limit 1))::jsonb ->> 'success'),
  'false', 'another arc''s cape cannot be bought'
);
select is(
  (purchase_item('00000000-0000-0000-0000-0000000b6001', (select id from capes where current))::jsonb ->> 'gold_remaining'),
  '700', 'the current arc''s cape is sold for 300 gold'
);
select is(
  (purchase_item('00000000-0000-0000-0000-0000000b6001', (select id from shop_items where sprite_key = 'hat_seasons'))::jsonb ->> 'success'),
  'false', 'the Crown of Seasons is never sold'
);
reset role;

update profiles set four_seasons_rewarded_at = now() where id = '00000000-0000-0000-0000-0000000b6001';
select ok(exists (
  select 1 from purchases p join shop_items s on s.id = p.item_id
  where p.user_id = '00000000-0000-0000-0000-0000000b6001' and s.sprite_key = 'hat_seasons'
), 'the four runes give the Crown of Seasons');
update profiles set four_seasons_rewarded_at = now() where id = '00000000-0000-0000-0000-0000000b6001';
select is((
  select count(*)::int from purchases p join shop_items s on s.id = p.item_id
  where p.user_id = '00000000-0000-0000-0000-0000000b6001' and s.sprite_key = 'hat_seasons'
), 1, 'only once');

select * from finish();
rollback;
