-- Premium item of the month (P10). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000aa001', 'month-premium@test.dev', '{"username":"MonthPremium"}'),
  ('00000000-0000-0000-0000-0000000aa002', 'month-free@test.dev', '{"username":"MonthFree"}');
update profiles set subscription_status = 'premium', subscription_expires_at = now() + interval '30 days'
where id = '00000000-0000-0000-0000-0000000aa001';

-- An item for the current month, whatever the day the test runs.
insert into shop_items (id, name, description, category, price_gold, rarity, required_level, sprite_key, is_available)
values ('00000000-0000-0000-0000-0000000ab001', 'Test Hat', 'Item of the month', 'avatar_hat', 0, 'legendary', 1, 'hat_pumpkin', false);
delete from premium_monthly_items where month = date_trunc('month', user_today('00000000-0000-0000-0000-0000000aa001'))::date;
insert into premium_monthly_items (month, item_id)
values (date_trunc('month', user_today('00000000-0000-0000-0000-0000000aa001'))::date, '00000000-0000-0000-0000-0000000ab001');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

set local role authenticated;

select pg_temp.act_as('00000000-0000-0000-0000-0000000aa001');
select is((claim_monthly_item() ->> 'granted')::boolean, true, 'a Premium player receives the item of the month');
select is((select count(*)::int from purchases where user_id = auth.uid() and item_id = '00000000-0000-0000-0000-0000000ab001'), 1,
  'it is in their inventory');
select is(claim_monthly_item() ->> 'reason', 'owned', 'only once');
select lives_ok($$ insert into equipped_items (user_id, item_id, slot) values (auth.uid(), '00000000-0000-0000-0000-0000000ab001', 'hat') $$,
  'and can be equipped');

select pg_temp.act_as('00000000-0000-0000-0000-0000000aa002');
select is(claim_monthly_item() ->> 'reason', 'not_premium', 'a free player does not get it');
select is((purchase_item(auth.uid(), '00000000-0000-0000-0000-0000000ab001') ->> 'success')::boolean, false,
  'nor can buy it');
select throws_ok($$ insert into purchases (user_id, item_id) values (auth.uid(), '00000000-0000-0000-0000-0000000ab001') $$,
  '42501', null, 'nor write it directly');

reset role;
select is((select count(*)::int from premium_monthly_items where month in ('2026-10-01', '2026-11-01', '2026-12-01')), 3,
  'October to December 2026 have an item');

select * from finish();
rollback;
