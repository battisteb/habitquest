-- Friend invite links (https://habitquest.expo.app/invite/<code>).
-- Adding friends only worked by searching usernames, so the whole social side
-- (leaderboard, duels, challenges) stayed empty for new players.
-- The code is secret (own-row RLS): sharing it is the inviter's consent, so
-- opening the link creates an accepted friendship. See ADR 010.

create table if not exists public.invite_codes (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  code text not null unique,
  created_at timestamptz not null default now()
);

alter table public.invite_codes enable row level security;

create policy "Users can view own invite code"
  on public.invite_codes for select
  using (auth.uid() = user_id);

grant select on public.invite_codes to authenticated;
grant all on public.invite_codes to service_role;

create or replace function public.get_invite_code()
returns text
language plpgsql
security definer set search_path = ''
as $$
declare
  v_code text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select code into v_code from public.invite_codes where user_id = auth.uid();
  if v_code is null then
    loop
      v_code := substr(translate(encode(extensions.gen_random_bytes(9), 'base64'), '+/=', 'xyz'), 1, 10);
      begin
        insert into public.invite_codes (user_id, code) values (auth.uid(), v_code);
        exit;
      exception when unique_violation then
        -- Retry on the (unlikely) collision.
      end;
    end loop;
  end if;
  return v_code;
end;
$$;

-- Returns the inviter so the app can show "You are now friends with X".
create or replace function public.accept_invite(p_code text)
returns json
language plpgsql
security definer set search_path = ''
as $$
declare
  v_inviter uuid;
  v_name text;
  v_me text;
  v_existing public.friendships;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated' using errcode = '42501';
  end if;

  select user_id into v_inviter from public.invite_codes where code = p_code;
  if v_inviter is null then
    return json_build_object('status', 'invalid');
  end if;

  select username into v_name from public.profiles where id = v_inviter;
  if v_inviter = auth.uid() then
    return json_build_object('status', 'self', 'username', v_name);
  end if;

  select * into v_existing from public.friendships
  where (requester_id = v_inviter and addressee_id = auth.uid())
     or (requester_id = auth.uid() and addressee_id = v_inviter)
  for update;

  if found and v_existing.status = 'accepted' then
    return json_build_object('status', 'already_friends', 'username', v_name, 'user_id', v_inviter);
  elsif found then
    update public.friendships set status = 'accepted' where id = v_existing.id;
  else
    insert into public.friendships (requester_id, addressee_id, status)
    values (v_inviter, auth.uid(), 'accepted');
  end if;

  select username into v_me from public.profiles where id = auth.uid();
  insert into public.notifications (user_id, type, title, body, data)
  values (v_inviter, 'friend_accepted', '🤝 New friend',
          coalesce(v_me, 'A player') || ' joined you with your invite link!',
          jsonb_build_object('route', '/(tabs)/social'));

  return json_build_object('status', 'friends', 'username', v_name, 'user_id', v_inviter);
end;
$$;

revoke all on function public.get_invite_code() from public, anon;
revoke all on function public.accept_invite(text) from public, anon;
grant execute on function public.get_invite_code() to authenticated;
grant execute on function public.accept_invite(text) to authenticated;
