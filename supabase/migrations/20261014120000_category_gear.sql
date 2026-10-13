-- Category gear sets (ADR 032, Battiste 2026-10-13/14): each habit category has a set of three
-- pieces, earned (never sold) at the identity milestones of a habit of that category: 7 days in a
-- row → hat, 21 → held item, 66 → outfit. Sport, Learning, Mindfulness and Health first.

alter table public.shop_items
  add column if not exists unlock_category text,
  add column if not exists unlock_streak integer check (unlock_streak is null or unlock_streak in (7, 21, 66));

insert into public.shop_items (name, description, category, price_gold, rarity, required_level, sprite_key,
                               is_available, unlock_category, unlock_streak)
select v.name, v.description, v.category, 0, v.rarity, 1, v.sprite_key, false, v.unlock_category, v.unlock_streak
from (values
  ('Sport Headband', 'Earned with 7 days in a row on a Fitness quest.', 'avatar_hat', 'uncommon', 'hat_sport_headband', 'fitness', 7),
  ('Iron Dumbbell', 'Earned with 21 days in a row on a Fitness quest.', 'avatar_accessory', 'rare', 'acc_dumbbell', 'fitness', 21),
  ('Champion Tank Top', 'Earned with 66 days in a row on a Fitness quest.', 'avatar_outfit', 'epic', 'outfit_sport', 'fitness', 66),
  ('Scholar Cap', 'Earned with 7 days in a row on a Learning quest.', 'avatar_hat', 'uncommon', 'hat_scholar_cap', 'learning', 7),
  ('Tome of Knowledge', 'Earned with 21 days in a row on a Learning quest.', 'avatar_accessory', 'rare', 'acc_book', 'learning', 21),
  ('Scholar Gown', 'Earned with 66 days in a row on a Learning quest.', 'avatar_outfit', 'epic', 'outfit_scholar', 'learning', 66),
  ('Lotus Flower', 'Earned with 7 days in a row on a Mindfulness quest.', 'avatar_hat', 'uncommon', 'hat_lotus', 'mindfulness', 7),
  ('Prayer Beads', 'Earned with 21 days in a row on a Mindfulness quest.', 'avatar_accessory', 'rare', 'acc_prayer_beads', 'mindfulness', 21),
  ('Monk Robe', 'Earned with 66 days in a row on a Mindfulness quest.', 'avatar_outfit', 'epic', 'outfit_monk', 'mindfulness', 66),
  ('Leaf Crown', 'Earned with 7 days in a row on a Health quest.', 'avatar_hat', 'uncommon', 'hat_laurel', 'health', 7),
  ('Water Flask', 'Earned with 21 days in a row on a Health quest.', 'avatar_accessory', 'rare', 'acc_water_bottle', 'health', 21),
  ('Healer Tunic', 'Earned with 66 days in a row on a Health quest.', 'avatar_outfit', 'epic', 'outfit_healer', 'health', 66)
) as v(name, description, category, rarity, sprite_key, unlock_category, unlock_streak)
where not exists (select 1 from public.shop_items s where s.sprite_key = v.sprite_key);

-- Grants the pieces a streak has just reached, with a notification in the player's language.
create or replace function public.grant_category_gear()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_uid uuid;
  v_category text;
  v_lang text;
  v_item record;
begin
  if new.longest_count <= coalesce(old.longest_count, 0) then
    return new;
  end if;
  select user_id, category into v_uid, v_category from public.habits where id = new.habit_id;
  if v_uid is null then
    return new;
  end if;
  select language into v_lang from public.profiles where id = v_uid;
  for v_item in
    select s.id, s.unlock_streak from public.shop_items s
    where s.unlock_category = v_category and s.unlock_streak <= new.longest_count
      and not exists (select 1 from public.purchases p where p.user_id = v_uid and p.item_id = s.id)
    order by s.unlock_streak
  loop
    insert into public.purchases (user_id, item_id) values (v_uid, v_item.id);
    insert into public.notifications (user_id, type, title, body, data)
    values (v_uid, 'gear_unlocked',
            case v_lang when 'fr' then '🎁 Équipement débloqué !' when 'ja' then '🎁 装備をゲット！'
                        when 'ko' then '🎁 장비 획득!' when 'zh' then '🎁 獲得新裝備！' else '🎁 Gear unlocked!' end,
            case v_lang
              when 'fr' then v_item.unlock_streak || ' jours d''affilée : ton héros reçoit une nouvelle pièce de set. Équipe-la dans la boutique !'
              when 'ja' then v_item.unlock_streak || '日連続！ヒーローが新しいセット装備を手に入れました。ショップで装備しよう！'
              when 'ko' then v_item.unlock_streak || '일 연속! 히어로가 새 세트 장비를 얻었어요. 상점에서 장착해 보세요!'
              when 'zh' then '連續 ' || v_item.unlock_streak || ' 天！你的英雄獲得了新的套裝裝備，快去商店裝備吧！'
              else v_item.unlock_streak || ' days in a row: your hero gets a new set piece. Equip it in the shop!'
            end,
            jsonb_build_object('route', '/(tabs)/shop', 'itemId', v_item.id));
  end loop;
  return new;
end;
$$;

revoke all on function public.grant_category_gear() from public, anon, authenticated;

drop trigger if exists on_streak_grant_category_gear on public.streaks;
create trigger on_streak_grant_category_gear
  after insert or update of longest_count on public.streaks
  for each row execute function public.grant_category_gear();

-- Players who already reached a milestone get their pieces now (quietly: no notification flood).
insert into public.purchases (user_id, item_id)
select distinct h.user_id, s.id
from public.streaks st
join public.habits h on h.id = st.habit_id
join public.shop_items s on s.unlock_category = h.category and s.unlock_streak <= st.longest_count
where not exists (select 1 from public.purchases p where p.user_id = h.user_id and p.item_id = s.id);
