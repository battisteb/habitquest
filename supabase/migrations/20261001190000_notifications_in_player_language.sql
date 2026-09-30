-- A5 (review): notifications written by the server (challenges, co-op,
-- invites, duels, friend requests) were in English for every player, push
-- included. The app now stores the player's language on the profile, and a
-- trigger translates our own notification texts for French players before
-- the row is saved (so the push, sent after insert, is translated too).

alter table public.profiles
  add column if not exists language text not null default 'en' check (language in ('en', 'fr'));
grant update (language) on public.profiles to authenticated;

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
  v_body := regexp_replace(v_body, '^(A player|A friend|Your friend) ', 'Un ami ');
  new.body := v_body;
  return new;
end;
$$;

revoke all on function public.localize_notification() from public, anon, authenticated;

drop trigger if exists localize_notification on public.notifications;
create trigger localize_notification
  before insert on public.notifications
  for each row execute function public.localize_notification();
