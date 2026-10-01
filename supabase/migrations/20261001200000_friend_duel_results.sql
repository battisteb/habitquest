-- Friend duels are asynchronous: the challenger fights the friend's hero
-- right away (ADR 008). The result was never saved (the battle screen did not
-- get the duel id), so no reward, no stats, and the friend was told about a
-- duel they could do nothing with. Now:
--   * only the challenger closes the duel, once, from pending or active;
--   * a draw closes it without a winner;
--   * the friend is told the result instead of receiving a dead invite.

create or replace function public.guard_duel_writes()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_premium boolean;
  v_last timestamptz;
begin
  -- Only client writes are limited; server code (definer functions) is trusted.
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    select subscription_status = 'premium'
           and (subscription_expires_at is null or subscription_expires_at > now())
    into v_premium
    from public.profiles where id = new.challenger_id;

    select max(d.created_at) into v_last
    from public.duels d
    where (d.challenger_id = new.challenger_id or d.opponent_id = new.challenger_id)
      and d.status <> 'cancelled';
    if v_last is not null
       and v_last > now() - (case when v_premium then interval '24 hours' else interval '48 hours' end) then
      raise exception 'Duel cooldown not over' using errcode = '42501';
    end if;

    if not coalesce(v_premium, false) and (
        select count(*) from public.duels d
        where (d.challenger_id = new.challenger_id or d.opponent_id = new.challenger_id)
          and d.status <> 'cancelled'
          and d.created_at >= date_trunc('week', now())) >= 3 then
      raise exception 'Weekly duel limit reached' using errcode = '42501';
    end if;
    new.status := 'pending';
    new.winner_id := null;
    new.winner_rewarded := false;
    new.loser_rewarded := false;
    return new;
  end if;

  if new.winner_rewarded is distinct from old.winner_rewarded
     or new.loser_rewarded is distinct from old.loser_rewarded
     or new.challenger_id is distinct from old.challenger_id
     or new.opponent_id is distinct from old.opponent_id then
    raise exception 'Protected duel fields' using errcode = '42501';
  end if;
  if old.status in ('resolved', 'cancelled')
     and (new.status, new.winner_id) is distinct from (old.status, old.winner_id) then
    raise exception 'Duel already over' using errcode = '42501';
  end if;
  if new.status = 'resolved' and old.status <> 'resolved' and auth.uid() is distinct from old.challenger_id then
    raise exception 'Only the challenger records the result' using errcode = '42501';
  end if;
  if new.status <> 'resolved' and new.winner_id is not null then
    raise exception 'Only a finished duel has a winner' using errcode = '42501';
  end if;
  if new.winner_id is not null and new.winner_id not in (new.challenger_id, new.opponent_id) then
    raise exception 'Winner must be a player of the duel' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- The friend has nothing to accept: no invite, the result instead.
drop trigger if exists on_duel_created_notify on public.duels;

create or replace function public.notify_duel_result()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_name text;
  v_body text;
begin
  select username into v_name from public.profiles where id = new.challenger_id;
  v_name := coalesce(v_name, 'A friend');
  v_body := case
    when new.winner_id is null then v_name || ' challenged you to a duel: it is a draw.'
    when new.winner_id = new.opponent_id then v_name || ' challenged you to a duel and your hero won!'
    else v_name || ' challenged you to a duel and won.'
  end;
  insert into public.notifications (user_id, type, title, body, data)
  values (new.opponent_id, 'duel_resolved', '⚔️ Duel', v_body,
          jsonb_build_object('route', '/duels', 'duelId', new.id));
  return new;
end;
$$;

revoke all on function public.notify_duel_result() from public, anon, authenticated;

drop trigger if exists on_duel_resolved_notify on public.duels;
create trigger on_duel_resolved_notify
  after update of status on public.duels
  for each row
  when (old.status <> 'resolved' and new.status = 'resolved')
  execute function public.notify_duel_result();

-- French texts for the new notification (see localize_notification).
create or replace function public.localize_notification()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_lang text;
  v_body text := new.body;
begin
  select language into v_lang from public.profiles where id = new.user_id;
  if v_lang is distinct from 'fr' then
    return new;
  end if;

  new.title := case new.title
    when '🏆 Challenge Won!' then '🏆 Défi gagné !'
    when '⚔️ Challenge Lost' then '⚔️ Défi perdu'
    when '🤝 Challenge Over' then '🤝 Défi terminé'
    when '🤝 Co-op challenge' then '🤝 Défi coop'
    when '🏆 Co-op challenge complete!' then '🏆 Défi coop réussi !'
    when '🤝 New friend' then '🤝 Nouvel ami'
    when '🤝 Friend request accepted' then '🤝 Demande acceptée'
    when '👥 Friend request' then '👥 Demande d’ami'
    when '⚔️ Duel challenge' then '⚔️ Défi en duel'
    else new.title
  end;

  -- Our own English texts, with names and amounts kept.
  v_body := regexp_replace(v_body, '^You won the challenge and earned (\d+)g!$', 'Tu as gagné le défi et remporté \1 or !');
  v_body := regexp_replace(v_body, '^Time is up and you were ahead: \+(\d+)g!$', 'Temps écoulé : tu étais devant, +\1 or !');
  v_body := regexp_replace(v_body, '^Time is up and you were ahead!$', 'Temps écoulé : tu étais devant !');
  v_body := regexp_replace(v_body, '^Your opponent won the challenge\.', 'Ton adversaire a gagné le défi.');
  v_body := regexp_replace(v_body, '^Time is up and your opponent was ahead\.', 'Temps écoulé : ton adversaire était devant.');
  v_body := regexp_replace(v_body, ' You lost (\d+)g\.$', ' Tu as perdu \1 or.');
  v_body := regexp_replace(v_body, '^Time is up: it is a draw\.$', 'Temps écoulé : égalité.');
  v_body := regexp_replace(v_body, '^(.+) invites you to a co-op challenge!$', '\1 t’invite à un défi coop !');
  v_body := regexp_replace(v_body, '^(.+) joined your co-op challenge!$', '\1 a rejoint ton défi coop !');
  v_body := regexp_replace(v_body, '^Your team made it! \+(\d+) XP$', 'Votre équipe a réussi ! +\1 XP');
  v_body := regexp_replace(v_body, '^(.+) joined you with your invite link!$', '\1 t’a rejoint grâce à ton lien d’invitation !');
  v_body := regexp_replace(v_body, '^(.+) accepted your friend request!$', '\1 a accepté ta demande d’ami !');
  v_body := regexp_replace(v_body, '^(.+) wants to be your friend\.$', '\1 veut devenir ton ami.');
  v_body := regexp_replace(v_body, '^(.+) challenged you to a duel!$', '\1 t’a défié en duel !');
  v_body := regexp_replace(v_body, '^(.+) challenged you to a duel: it is a draw\.$', '\1 t’a défié en duel : égalité.');
  v_body := regexp_replace(v_body, '^(.+) challenged you to a duel and your hero won!$', '\1 t’a défié en duel et ton héros a gagné !');
  v_body := regexp_replace(v_body, '^(.+) challenged you to a duel and won\.$', '\1 t’a défié en duel et a gagné.');
  v_body := regexp_replace(v_body, '^(A player|A friend|Your friend) ', 'Un ami ');
  new.body := v_body;
  return new;
end;
$$;
