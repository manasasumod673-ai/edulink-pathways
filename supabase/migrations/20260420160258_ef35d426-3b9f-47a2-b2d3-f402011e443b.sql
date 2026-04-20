
-- ============ ENUMS ============
create type public.app_role as enum ('student', 'recruiter', 'admin');
create type public.opportunity_type as enum ('internship', 'challenge', 'job', 'project');
create type public.application_status as enum ('pending', 'accepted', 'rejected');

-- ============ PROFILES ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  username text unique,
  bio text default '',
  headline text default '',
  avatar_url text,
  location text,
  website text,
  github_url text,
  total_xp integer not null default 0,
  current_level integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are viewable by authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "Users can insert their own profile"
  on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users can update their own profile"
  on public.profiles for update to authenticated using (auth.uid() = id);

-- ============ USER ROLES ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

create policy "Users can view their own roles"
  on public.user_roles for select to authenticated
  using (auth.uid() = user_id);
create policy "Roles are publicly readable for badges/leaderboard"
  on public.user_roles for select to authenticated using (true);
create policy "Users can insert their own role at signup"
  on public.user_roles for insert to authenticated
  with check (auth.uid() = user_id);

-- ============ SKILLS ============
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  category text,
  created_at timestamptz not null default now()
);
alter table public.skills enable row level security;
create policy "Skills are viewable by everyone"
  on public.skills for select to authenticated using (true);
create policy "Authenticated users can suggest skills"
  on public.skills for insert to authenticated with check (true);

create table public.profile_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  proficiency integer not null default 1 check (proficiency between 1 and 5),
  created_at timestamptz not null default now(),
  unique (user_id, skill_id)
);
alter table public.profile_skills enable row level security;
create policy "Profile skills viewable by authenticated"
  on public.profile_skills for select to authenticated using (true);
create policy "Users manage their own skills - insert"
  on public.profile_skills for insert to authenticated with check (auth.uid() = user_id);
create policy "Users manage their own skills - update"
  on public.profile_skills for update to authenticated using (auth.uid() = user_id);
create policy "Users manage their own skills - delete"
  on public.profile_skills for delete to authenticated using (auth.uid() = user_id);

-- ============ PROJECTS ============
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  repo_url text,
  demo_url text,
  image_url text,
  tech_stack text[] default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.projects enable row level security;
create policy "Projects viewable by authenticated"
  on public.projects for select to authenticated using (true);
create policy "Users insert own projects"
  on public.projects for insert to authenticated with check (auth.uid() = user_id);
create policy "Users update own projects"
  on public.projects for update to authenticated using (auth.uid() = user_id);
create policy "Users delete own projects"
  on public.projects for delete to authenticated using (auth.uid() = user_id);

-- ============ BADGES ============
create table public.badges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  icon text,
  xp_reward integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.badges enable row level security;
create policy "Badges viewable by everyone"
  on public.badges for select to authenticated using (true);

create table public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);
alter table public.user_badges enable row level security;
create policy "User badges viewable by authenticated"
  on public.user_badges for select to authenticated using (true);
create policy "Users earn their own badges"
  on public.user_badges for insert to authenticated with check (auth.uid() = user_id);

-- ============ XP EVENTS ============
create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.xp_events enable row level security;
create policy "XP events viewable by authenticated"
  on public.xp_events for select to authenticated using (true);
create policy "Users insert own XP events"
  on public.xp_events for insert to authenticated with check (auth.uid() = user_id);

-- Trigger: when XP event added, recompute profile total_xp + level
create or replace function public.recompute_xp()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  new_total integer;
  new_level integer;
begin
  select coalesce(sum(amount), 0) into new_total
    from public.xp_events where user_id = new.user_id;
  -- Level formula: level = floor(sqrt(xp/50)) + 1, capped at 35
  new_level := least(35, greatest(1, floor(sqrt(new_total::numeric / 50.0))::int + 1));
  update public.profiles
    set total_xp = new_total, current_level = new_level, updated_at = now()
    where id = new.user_id;
  return new;
end; $$;

create trigger trg_recompute_xp
  after insert on public.xp_events
  for each row execute function public.recompute_xp();

-- ============ OPPORTUNITIES ============
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  recruiter_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  company text,
  description text,
  type opportunity_type not null default 'internship',
  required_skills text[] default '{}',
  min_level integer not null default 1,
  location text,
  remote boolean not null default true,
  xp_reward integer not null default 100,
  created_at timestamptz not null default now()
);
alter table public.opportunities enable row level security;
create policy "Opportunities viewable by authenticated"
  on public.opportunities for select to authenticated using (true);
create policy "Only recruiters can create opportunities"
  on public.opportunities for insert to authenticated
  with check (auth.uid() = recruiter_id and public.has_role(auth.uid(), 'recruiter'));
create policy "Recruiters update own opportunities"
  on public.opportunities for update to authenticated using (auth.uid() = recruiter_id);
create policy "Recruiters delete own opportunities"
  on public.opportunities for delete to authenticated using (auth.uid() = recruiter_id);

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  message text,
  status application_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (opportunity_id, student_id)
);
alter table public.applications enable row level security;
create policy "Students see own applications"
  on public.applications for select to authenticated
  using (auth.uid() = student_id);
create policy "Recruiter sees applications to own opportunities"
  on public.applications for select to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.recruiter_id = auth.uid()));
create policy "Students apply"
  on public.applications for insert to authenticated
  with check (auth.uid() = student_id);
create policy "Recruiter updates application status"
  on public.applications for update to authenticated
  using (exists (select 1 from public.opportunities o where o.id = opportunity_id and o.recruiter_id = auth.uid()));

-- ============ COMMUNITIES ============
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.communities enable row level security;
create policy "Communities viewable by authenticated"
  on public.communities for select to authenticated using (true);
create policy "Authenticated can create communities"
  on public.communities for insert to authenticated with check (auth.uid() = created_by);

create table public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz not null default now(),
  unique (community_id, user_id)
);
alter table public.community_members enable row level security;
create policy "Members viewable by authenticated"
  on public.community_members for select to authenticated using (true);
create policy "Users join themselves"
  on public.community_members for insert to authenticated with check (auth.uid() = user_id);
create policy "Users leave themselves"
  on public.community_members for delete to authenticated using (auth.uid() = user_id);

create or replace function public.is_community_member(_user uuid, _community uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.community_members where user_id = _user and community_id = _community)
$$;

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid references public.communities(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  title text,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.posts enable row level security;
create policy "Posts viewable by authenticated"
  on public.posts for select to authenticated using (true);
create policy "Members can post in community"
  on public.posts for insert to authenticated
  with check (
    auth.uid() = user_id and (
      community_id is null or public.is_community_member(auth.uid(), community_id)
    )
  );
create policy "Authors edit own posts"
  on public.posts for update to authenticated using (auth.uid() = user_id);
create policy "Authors delete own posts"
  on public.posts for delete to authenticated using (auth.uid() = user_id);

create table public.comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.comments enable row level security;
create policy "Comments viewable by authenticated"
  on public.comments for select to authenticated using (true);
create policy "Authenticated can comment"
  on public.comments for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own comments"
  on public.comments for delete to authenticated using (auth.uid() = user_id);

-- ============ DIRECT MESSAGES ============
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references auth.users(id) on delete cascade,
  user_b uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);
alter table public.conversations enable row level security;
create policy "Participants view conversations"
  on public.conversations for select to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);
create policy "Users create conversations they belong to"
  on public.conversations for insert to authenticated
  with check (auth.uid() = user_a or auth.uid() = user_b);

create or replace function public.is_conversation_participant(_user uuid, _conv uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.conversations
    where id = _conv and (user_a = _user or user_b = _user)
  )
$$;

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);
alter table public.messages enable row level security;
create policy "Participants read messages"
  on public.messages for select to authenticated
  using (public.is_conversation_participant(auth.uid(), conversation_id));
create policy "Participants send messages"
  on public.messages for insert to authenticated
  with check (auth.uid() = sender_id and public.is_conversation_participant(auth.uid(), conversation_id));

-- Trigger: update conversation last_message_at
create or replace function public.bump_conversation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.conversations
    set last_message_at = now()
    where id = new.conversation_id;
  return new;
end; $$;
create trigger trg_bump_conv after insert on public.messages
  for each row execute function public.bump_conversation();

-- ============ ROADMAPS (AI) ============
create table public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.roadmaps enable row level security;
create policy "Users see own roadmaps"
  on public.roadmaps for select to authenticated using (auth.uid() = user_id);
create policy "Users create own roadmaps"
  on public.roadmaps for insert to authenticated with check (auth.uid() = user_id);
create policy "Users delete own roadmaps"
  on public.roadmaps for delete to authenticated using (auth.uid() = user_id);

-- ============ AUTO-CREATE PROFILE ON SIGNUP ============
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  selected_role public.app_role;
begin
  insert into public.profiles (id, display_name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6))
  );

  selected_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'student'::public.app_role);
  insert into public.user_roles (user_id, role) values (new.id, selected_role)
    on conflict do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============ SEED BADGES + SKILLS ============
insert into public.badges (slug, name, description, icon, xp_reward) values
  ('first-steps', 'First Steps', 'Created your profile', '👣', 50),
  ('project-builder', 'Project Builder', 'Added your first project', '🛠️', 100),
  ('skill-collector', 'Skill Collector', 'Added 5 skills', '🎯', 75),
  ('community-voice', 'Community Voice', 'Made your first post', '💬', 50),
  ('apprentice', 'Apprentice', 'Reached Level 5', '⭐', 200),
  ('rising-star', 'Rising Star', 'Reached Level 10', '🌟', 400),
  ('pro-coder', 'Pro Coder', 'Reached Level 20', '🏆', 800),
  ('legend', 'Legend', 'Reached Level 35', '👑', 2000);

insert into public.skills (name, category) values
  ('JavaScript', 'Programming'),
  ('TypeScript', 'Programming'),
  ('React', 'Frontend'),
  ('Node.js', 'Backend'),
  ('Python', 'Programming'),
  ('SQL', 'Database'),
  ('PostgreSQL', 'Database'),
  ('UI/UX Design', 'Design'),
  ('Figma', 'Design'),
  ('Machine Learning', 'AI'),
  ('Data Science', 'AI'),
  ('Tailwind CSS', 'Frontend'),
  ('Next.js', 'Frontend'),
  ('Docker', 'DevOps'),
  ('AWS', 'Cloud'),
  ('Git', 'Tools'),
  ('GraphQL', 'Backend'),
  ('Rust', 'Programming'),
  ('Go', 'Programming'),
  ('Mobile Development', 'Mobile');
