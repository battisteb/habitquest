-- Daily Quest Templates: admin-defined pool of possible quests
create table public.daily_quest_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  quest_type text not null check (quest_type in ('complete_habits', 'complete_category', 'earn_xp', 'maintain_streak')),
  target_value integer not null,
  target_category text,
  xp_reward integer not null default 25,
  gold_reward integer not null default 5,
  difficulty text not null default 'normal' check (difficulty in ('easy', 'normal', 'hard')),
  is_active boolean not null default true
);

-- Daily quests assigned to users (3 per day, refreshed daily)
create table public.user_daily_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  template_id uuid not null references public.daily_quest_templates(id),
  assigned_date date not null default current_date,
  current_progress integer not null default 0,
  is_completed boolean not null default false,
  is_claimed boolean not null default false,
  completed_at timestamptz,
  claimed_at timestamptz,
  unique (user_id, template_id, assigned_date)
);

-- Indexes
create index idx_user_daily_quests_user_date on public.user_daily_quests (user_id, assigned_date);
create index idx_user_daily_quests_template on public.user_daily_quests (template_id);
create index idx_daily_quest_templates_active on public.daily_quest_templates (is_active) where is_active = true;

-- RLS
alter table public.daily_quest_templates enable row level security;
alter table public.user_daily_quests enable row level security;

-- Templates are readable by all authenticated users (they are shared/global)
create policy "Anyone can read active quest templates"
  on public.daily_quest_templates for select
  to authenticated
  using (is_active = true);

-- Users can read their own daily quests
create policy "Users can read own daily quests"
  on public.user_daily_quests for select
  to authenticated
  using (auth.uid() = user_id);

-- Users can update their own daily quests (progress tracking)
create policy "Users can update own daily quests"
  on public.user_daily_quests for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Insert policy for the RPC function (runs as invoker)
create policy "Users can insert own daily quests"
  on public.user_daily_quests for insert
  to authenticated
  with check (auth.uid() = user_id);

-- RPC: Assign daily quests for a user (1 easy, 1 normal, 1 hard)
create or replace function public.assign_daily_quests(p_user_id uuid)
returns setof public.user_daily_quests
language plpgsql
security invoker
as $$
declare
  v_today date := current_date;
  v_existing_count integer;
  v_easy_id uuid;
  v_normal_id uuid;
  v_hard_id uuid;
begin
  -- Check if user already has quests for today
  select count(*) into v_existing_count
  from public.user_daily_quests
  where user_id = p_user_id and assigned_date = v_today;

  if v_existing_count > 0 then
    -- Return existing quests
    return query
      select * from public.user_daily_quests
      where user_id = p_user_id and assigned_date = v_today;
    return;
  end if;

  -- Pick 1 random easy template
  select id into v_easy_id
  from public.daily_quest_templates
  where is_active = true and difficulty = 'easy'
  order by random()
  limit 1;

  -- Pick 1 random normal template
  select id into v_normal_id
  from public.daily_quest_templates
  where is_active = true and difficulty = 'normal'
  order by random()
  limit 1;

  -- Pick 1 random hard template
  select id into v_hard_id
  from public.daily_quest_templates
  where is_active = true and difficulty = 'hard'
  order by random()
  limit 1;

  -- Insert the selected quests
  if v_easy_id is not null then
    insert into public.user_daily_quests (user_id, template_id, assigned_date)
    values (p_user_id, v_easy_id, v_today);
  end if;

  if v_normal_id is not null then
    insert into public.user_daily_quests (user_id, template_id, assigned_date)
    values (p_user_id, v_normal_id, v_today);
  end if;

  if v_hard_id is not null then
    insert into public.user_daily_quests (user_id, template_id, assigned_date)
    values (p_user_id, v_hard_id, v_today);
  end if;

  -- Return the newly assigned quests
  return query
    select * from public.user_daily_quests
    where user_id = p_user_id and assigned_date = v_today;
end;
$$;

-- RPC: Claim a completed daily quest (awards XP and gold)
create or replace function public.claim_daily_quest(p_user_id uuid, p_quest_id uuid)
returns json
language plpgsql
security invoker
as $$
declare
  v_quest public.user_daily_quests;
  v_template public.daily_quest_templates;
begin
  -- Get the quest
  select * into v_quest
  from public.user_daily_quests
  where id = p_quest_id and user_id = p_user_id;

  if not found then
    return json_build_object('success', false, 'error', 'Quest not found');
  end if;

  if not v_quest.is_completed then
    return json_build_object('success', false, 'error', 'Quest not yet completed');
  end if;

  if v_quest.is_claimed then
    return json_build_object('success', false, 'error', 'Quest already claimed');
  end if;

  -- Get the template for reward amounts
  select * into v_template
  from public.daily_quest_templates
  where id = v_quest.template_id;

  -- Award XP
  update public.profiles
  set xp = xp + v_template.xp_reward
  where id = p_user_id;

  -- Award gold
  update public.profiles
  set gold = gold + v_template.gold_reward
  where id = p_user_id;

  -- Mark quest as claimed
  update public.user_daily_quests
  set is_claimed = true, claimed_at = now()
  where id = p_quest_id;

  return json_build_object(
    'success', true,
    'xp_awarded', v_template.xp_reward,
    'gold_awarded', v_template.gold_reward
  );
end;
$$;

-- Seed quest templates
insert into public.daily_quest_templates (title, description, quest_type, target_value, target_category, xp_reward, gold_reward, difficulty) values
  -- Easy quests (complete_habits)
  ('First Step', 'Complete 1 habit today', 'complete_habits', 1, null, 15, 3, 'easy'),
  ('Morning Starter', 'Complete any habit to start your day', 'complete_habits', 1, null, 15, 3, 'easy'),
  ('Quick Win', 'Finish at least 1 habit today', 'complete_habits', 1, null, 15, 3, 'easy'),
  ('Easy Does It', 'Complete 1 habit — that is all it takes', 'complete_habits', 1, null, 15, 3, 'easy'),

  -- Normal quests (complete_habits)
  ('Steady Progress', 'Complete 2 habits today', 'complete_habits', 2, null, 25, 5, 'normal'),
  ('Double Down', 'Finish 2 habits to prove your dedication', 'complete_habits', 2, null, 25, 5, 'normal'),
  ('Triple Threat', 'Complete 3 habits today', 'complete_habits', 3, null, 30, 7, 'normal'),

  -- Normal quests (complete_category)
  ('Fitness Focus', 'Complete a fitness habit', 'complete_category', 1, 'fitness', 25, 5, 'normal'),
  ('Healthy Mind', 'Complete a health habit', 'complete_category', 1, 'health', 25, 5, 'normal'),
  ('Knowledge Seeker', 'Complete a learning habit', 'complete_category', 1, 'learning', 25, 5, 'normal'),

  -- Normal quests (earn_xp)
  ('XP Hunter', 'Earn at least 30 XP today', 'earn_xp', 30, null, 25, 5, 'normal'),

  -- Hard quests (complete_habits)
  ('Habit Master', 'Complete 5 habits today', 'complete_habits', 5, null, 50, 15, 'hard'),
  ('All In', 'Complete 4 habits in a single day', 'complete_habits', 4, null, 40, 12, 'hard'),

  -- Hard quests (earn_xp)
  ('XP Grinder', 'Earn at least 100 XP today', 'earn_xp', 100, null, 50, 15, 'hard'),

  -- Hard quests (maintain_streak)
  ('Streak Guardian', 'Keep your streak alive on all habits', 'maintain_streak', 1, null, 50, 15, 'hard');
