-- Korean (2026-10-04, ~10-15 % of Battiste's Instagram followers): the app
-- speaks Korean, so the player's language (and the site's waitlist) can be
-- 'ko', and the notifications written by the server are translated for
-- Korean players too, as for Japanese and French ones.

alter table public.profiles drop constraint if exists profiles_language_check;
alter table public.profiles add constraint profiles_language_check check (language in ('en', 'fr', 'ja', 'ko'));
alter table public.support_messages drop constraint if exists support_messages_language_check;
alter table public.support_messages add constraint support_messages_language_check check (language in ('en', 'fr', 'ja', 'ko'));
alter table public.waitlist drop constraint if exists waitlist_lang_check;
alter table public.waitlist add constraint waitlist_lang_check check (lang in ('en', 'fr', 'de', 'pt', 'ja', 'ko'));

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
  if v_lang = 'ko' then
    new.title := case new.title
      when '🏆 Challenge Won!' then '🏆 챌린지 승리!'
      when '⚔️ Challenge Lost' then '⚔️ 챌린지 패배'
      when '🤝 Challenge Over' then '🤝 챌린지 종료'
      when '🤝 Co-op challenge' then '🤝 협력 챌린지'
      when '🏆 Co-op challenge complete!' then '🏆 협력 챌린지 성공!'
      when '🤝 New friend' then '🤝 새 친구'
      when '🤝 Friend request accepted' then '🤝 친구 신청 수락'
      when '👥 Friend request' then '👥 친구 신청'
      when '⚔️ Duel challenge' then '⚔️ 배틀 도전'
      else new.title
    end;
    v_body := regexp_replace(v_body, '^You won the challenge and earned (\d+)g!$', '챌린지에서 이겨서 \1 골드를 얻었어요!');
    v_body := regexp_replace(v_body, '^Time is up and you were ahead: \+(\d+)g!$', '시간 종료: 내가 앞섰어요! +\1 골드!');
    v_body := regexp_replace(v_body, '^Time is up and you were ahead!$', '시간 종료: 내가 앞섰어요!');
    v_body := regexp_replace(v_body, '^Your opponent won the challenge\.', '상대가 챌린지에서 이겼어요.');
    v_body := regexp_replace(v_body, '^Time is up and your opponent was ahead\.', '시간 종료: 상대가 앞섰어요.');
    v_body := regexp_replace(v_body, ' You lost (\d+)g\.$', ' \1 골드를 잃었어요.');
    v_body := regexp_replace(v_body, '^Time is up: it is a draw\.$', '시간 종료: 무승부예요.');
    v_body := regexp_replace(v_body, '^(.+) invites you to a co-op challenge!$', '\1님이 협력 챌린지에 초대했어요!');
    v_body := regexp_replace(v_body, '^(.+) joined your co-op challenge!$', '\1님이 협력 챌린지에 참가했어요!');
    v_body := regexp_replace(v_body, '^Your team made it! \+(\d+) XP$', '팀이 해냈어요! +\1 XP');
    v_body := regexp_replace(v_body, '^(.+) joined you with your invite link!$', '\1님이 초대 링크로 함께하게 됐어요!');
    v_body := regexp_replace(v_body, '^(.+) accepted your friend request!$', '\1님이 친구 신청을 수락했어요!');
    v_body := regexp_replace(v_body, '^(.+) wants to be your friend\.$', '\1님이 친구 신청을 보냈어요.');
    v_body := regexp_replace(v_body, '^(.+) challenged you to a duel!$', '\1님이 배틀을 신청했어요!');
    v_body := regexp_replace(v_body, '^(.+) challenged you to a duel: it is a draw\.$', '\1님과의 배틀: 무승부예요.');
    v_body := regexp_replace(v_body, '^(.+) challenged you to a duel and your hero won!$', '\1님의 도전에 내 히어로가 이겼어요!');
    v_body := regexp_replace(v_body, '^(.+) challenged you to a duel and won\.$', '\1님이 배틀에서 이겼어요.');
    new.body := v_body;
    return new;
  end if;
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

create or replace function public.give_kudos(p_friend_id uuid)
returns json
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_day date;
  v_name text;
  v_lang text;
begin
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;
  if p_friend_id is null or p_friend_id = v_uid or not public.are_friends(v_uid, p_friend_id) then
    return json_build_object('success', false, 'reason', 'not_friends');
  end if;
  -- Cheer a real effort: the friend validated at least one quest today.
  if not exists (
    select 1 from public.completions c
    join public.habits h on h.id = c.habit_id
    where h.user_id = p_friend_id
      and public.user_local_date(p_friend_id, c.completed_at) = public.user_today(p_friend_id)
  ) then
    return json_build_object('success', false, 'reason', 'nothing_today');
  end if;

  v_day := public.user_today(v_uid);
  insert into public.kudos (from_user, to_user, day) values (v_uid, p_friend_id, v_day)
  on conflict do nothing;
  if not found then
    return json_build_object('success', false, 'reason', 'already_sent');
  end if;

  select username into v_name from public.profiles where id = v_uid;
  select language into v_lang from public.profiles where id = p_friend_id;
  insert into public.notifications (user_id, type, title, body, data)
  values (
    p_friend_id,
    'kudos',
    case v_lang when 'fr' then '👏 Bravo !' when 'ja' then '👏 ナイス！' when 'ko' then '👏 응원해요!' else '👏 Kudos!' end,
    case v_lang
      when 'fr' then v_name || ' t''encourage pour tes quêtes du jour !'
      when 'ja' then v_name || 'さんが今日のクエストを応援しています！'
      when 'ko' then v_name || '님이 오늘의 퀘스트를 응원해요!'
      else v_name || ' cheers you on for today''s quests!'
    end,
    jsonb_build_object('route', '/(tabs)/social', 'fromUserId', v_uid)
  );

  return json_build_object('success', true);
end;
$$;

revoke all on function public.give_kudos(uuid) from public, anon;
grant execute on function public.give_kudos(uuid) to authenticated;
