-- Simple RPC to atomically add gold to a user
create or replace function public.add_gold(p_user_id uuid, p_amount integer)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles
  set gold = gold + p_amount
  where id = p_user_id;
end;
$$;
