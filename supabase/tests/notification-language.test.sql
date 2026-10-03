-- Notifications in the player's language (A5). Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

select plan(8);

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000066001', 'fr@test.dev', '{"username":"Camille"}'),
  ('00000000-0000-0000-0000-000000066002', 'en@test.dev', '{"username":"Jordan"}');
-- Progressive unlocks (I6): these players have reached the feature's level.
update profiles set xp = xp + 850, level = level_for_xp(xp + 850) where id::text like '00000000-0000-0000-0000-000000066%';
insert into friendships (requester_id, addressee_id, status)
values ('00000000-0000-0000-0000-000000066001', '00000000-0000-0000-0000-000000066002', 'accepted');

create function pg_temp.act_as(p_uid uuid) returns void language sql as $$
  select set_config('request.jwt.claims', json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
$$;

select pg_temp.act_as('00000000-0000-0000-0000-000000066001');
set local role authenticated;
select lives_ok($$update profiles set language = 'fr' where id = auth.uid()$$, 'the app saves the player language');
select throws_ok($$update profiles set language = 'klingon' where id = auth.uid()$$, '23514', null, 'only supported languages');

-- Jordan (English) invites Camille (French) to a co-op challenge.
select pg_temp.act_as('00000000-0000-0000-0000-000000066002');
select create_coop_challenge(array['00000000-0000-0000-0000-000000066001']::uuid[], 'validations', 5, 7);
select create_notification('00000000-0000-0000-0000-000000066001', 'friend_request', '👥 Friend request',
  'Jordan wants to be your friend.', '{}'::jsonb);

reset role;
select is((select title || ' | ' || body from notifications
           where user_id = '00000000-0000-0000-0000-000000066001' and type = 'coop_invite'),
  '🤝 Défi coop | Jordan t’invite à un défi coop !', 'a French player gets the co-op invite in French, with the name');
select is((select title || ' | ' || body from notifications
           where user_id = '00000000-0000-0000-0000-000000066001' and type = 'friend_request'),
  '👥 Demande d’ami | Jordan veut devenir ton ami.', 'and friend requests too');

-- Camille joins: Jordan (English) is told in English.
create temp table last_coop on commit drop as select id from coop_challenges order by created_at desc limit 1;
grant select on last_coop to authenticated;
set local role authenticated;
select pg_temp.act_as('00000000-0000-0000-0000-000000066001');
select respond_coop_challenge((select id from last_coop), true);
reset role;
select is((select body from notifications where user_id = '00000000-0000-0000-0000-000000066002' and type = 'coop_accepted'),
  'Camille joined your co-op challenge!', 'an English player keeps English');
select is((select count(*)::int from notifications where title ~ '[A-Za-z]' and user_id = '00000000-0000-0000-0000-000000066001'
           and title in ('🤝 Co-op challenge', '👥 Friend request')), 0, 'no English title left for the French player');

-- Japanese (L1): a Japanese player gets the texts in Japanese, names kept.
reset role;
update profiles set language = 'ja' where id = '00000000-0000-0000-0000-000000066002';
select pg_temp.act_as('00000000-0000-0000-0000-000000066001');
set local role authenticated;
select create_notification('00000000-0000-0000-0000-000000066002', 'friend_request', '👥 Friend request',
  'Camille wants to be your friend.', '{}'::jsonb);
reset role;
select is((select title from notifications where user_id = '00000000-0000-0000-0000-000000066002' and type = 'friend_request'),
  '👥 フレンド申請', 'the title is in Japanese');
select is((select body from notifications where user_id = '00000000-0000-0000-0000-000000066002' and type = 'friend_request'),
  'Camilleさんからフレンド申請が届きました。', 'and the body, with the name');

select * from finish();
rollback;
