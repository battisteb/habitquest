-- Japanese (L1, 2026-10-03): the app speaks Japanese, so the player's
-- language can be 'ja', and the notifications written by the server are
-- translated for Japanese players too (as for French ones).

alter table public.profiles drop constraint if exists profiles_language_check;
alter table public.profiles add constraint profiles_language_check check (language in ('en', 'fr', 'ja'));
alter table public.support_messages drop constraint if exists support_messages_language_check;
alter table public.support_messages add constraint support_messages_language_check check (language in ('en', 'fr', 'ja'));

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
  if v_lang = 'ja' then
    new.title := case new.title
      when '🏆 Challenge Won!' then '🏆 チャレンジに勝利！'
      when '⚔️ Challenge Lost' then '⚔️ チャレンジに敗北'
      when '🤝 Challenge Over' then '🤝 チャレンジ終了'
      when '🤝 Co-op challenge' then '🤝 協力チャレンジ'
      when '🏆 Co-op challenge complete!' then '🏆 協力チャレンジ達成！'
      when '🤝 New friend' then '🤝 新しいフレンド'
      when '🤝 Friend request accepted' then '🤝 フレンド申請が承認されました'
      when '👥 Friend request' then '👥 フレンド申請'
      when '⚔️ Duel challenge' then '⚔️ バトルの挑戦'
      else new.title
    end;
    v_body := regexp_replace(v_body, '^You won the challenge and earned (\d+)g!$', 'チャレンジに勝利して\1ゴールドを獲得！');
    v_body := regexp_replace(v_body, '^Time is up and you were ahead: \+(\d+)g!$', '時間切れ：きみのリード！ +\1ゴールド！');
    v_body := regexp_replace(v_body, '^Time is up and you were ahead!$', '時間切れ：きみのリード！');
    v_body := regexp_replace(v_body, '^Your opponent won the challenge\.', '相手がチャレンジに勝利しました。');
    v_body := regexp_replace(v_body, '^Time is up and your opponent was ahead\.', '時間切れ：相手のリードでした。');
    v_body := regexp_replace(v_body, ' You lost (\d+)g\.$', ' \1ゴールドを失いました。');
    v_body := regexp_replace(v_body, '^Time is up: it is a draw\.$', '時間切れ：引き分けです。');
    v_body := regexp_replace(v_body, '^(.+) invites you to a co-op challenge!$', '\1さんから協力チャレンジの招待が届きました！');
    v_body := regexp_replace(v_body, '^(.+) joined your co-op challenge!$', '\1さんが協力チャレンジに参加しました！');
    v_body := regexp_replace(v_body, '^Your team made it! \+(\d+) XP$', 'チームで達成！ +\1 XP');
    v_body := regexp_replace(v_body, '^(.+) joined you with your invite link!$', '\1さんが招待リンクから参加しました！');
    v_body := regexp_replace(v_body, '^(.+) accepted your friend request!$', '\1さんがフレンド申請を承認しました！');
    v_body := regexp_replace(v_body, '^(.+) wants to be your friend\.$', '\1さんからフレンド申請が届きました。');
    v_body := regexp_replace(v_body, '^(.+) challenged you to a duel!$', '\1さんからバトルの挑戦状が届きました！');
    v_body := regexp_replace(v_body, '^(.+) challenged you to a duel: it is a draw\.$', '\1さんとのバトル：引き分けです。');
    v_body := regexp_replace(v_body, '^(.+) challenged you to a duel and your hero won!$', '\1さんからの挑戦に、きみのヒーローが勝利！');
    v_body := regexp_replace(v_body, '^(.+) challenged you to a duel and won\.$', '\1さんがバトルに勝利しました。');
    new.body := v_body;
    return new;
  end if;
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
