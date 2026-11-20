
-- Liderapp CRM: funil, contatos, atividades e integração de receita (2026-11-20).
create table public.crm_stages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 80),
  position integer not null check(position >= 0),
  probability integer not null default 0 check(probability between 0 and 100),
  color text not null default '#9874f7' check(color ~ '^#[A-Fa-f0-9]{6}$'),
  created_at timestamptz not null default now(),
  unique(id,user_id),
  unique(user_id,position)
);
create table public.crm_organizations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(char_length(trim(name)) between 1 and 180),
  email text,
  phone text,
  website text,
  industry text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id)
);
create table public.crm_people (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  organization_id uuid,
  name text not null check(char_length(trim(name)) between 1 and 180),
  email text,
  phone text,
  role text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id),
  foreign key(organization_id,user_id) references public.crm_organizations(id,user_id) on delete set null (organization_id)
);
create table public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(trim(title)) between 1 and 180),
  stage_id uuid not null,
  organization_id uuid,
  person_id uuid,
  setup_value numeric(14,2) not null default 0 check(setup_value >= 0),
  monthly_value numeric(14,2) not null default 0 check(monthly_value >= 0),
  status text not null default 'open' check(status in ('open','won','lost')),
  won_at timestamptz,
  lost_at timestamptz,
  lost_reason text,
  expected_close date,
  label text,
  notes text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id),
  foreign key(stage_id,user_id) references public.crm_stages(id,user_id),
  foreign key(organization_id,user_id) references public.crm_organizations(id,user_id) on delete set null (organization_id),
  foreign key(person_id,user_id) references public.crm_people(id,user_id) on delete set null (person_id),
  constraint crm_deal_dates_check check (
    (status <> 'won' or won_at is not null)
    and (status <> 'lost' or lost_at is not null)
  )
);
create table public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check(char_length(trim(title)) between 1 and 200),
  type text not null default 'task' check(type in ('call','meeting','task','email','followup','deadline','other')),
  description text,
  due_at timestamptz not null,
  duration_minutes integer not null default 30 check(duration_minutes between 0 and 1440),
  done boolean not null default false,
  done_at timestamptz,
  deal_id uuid,
  person_id uuid,
  organization_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(id,user_id),
  foreign key(deal_id,user_id) references public.crm_deals(id,user_id) on delete set null (deal_id),
  foreign key(person_id,user_id) references public.crm_people(id,user_id) on delete set null (person_id),
  foreign key(organization_id,user_id) references public.crm_organizations(id,user_id) on delete set null (organization_id)
);
create table public.crm_deal_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  deal_id uuid not null,
  kind text not null check(kind in ('created','stage','won','lost','reopened','updated')),
  detail text,
  created_at timestamptz not null default now(),
  foreign key(deal_id,user_id) references public.crm_deals(id,user_id) on delete cascade
);
create index crm_organizations_owner_name_idx on public.crm_organizations(user_id,name);
create index crm_people_owner_name_idx on public.crm_people(user_id,name);
create index crm_deals_owner_stage_idx on public.crm_deals(user_id,status,stage_id,position);
create index crm_deals_owner_won_idx on public.crm_deals(user_id,won_at) where status='won';
create index crm_activities_owner_due_idx on public.crm_activities(user_id,done,due_at);
create index crm_activities_deal_idx on public.crm_activities(deal_id);
create index crm_events_deal_idx on public.crm_deal_events(user_id,deal_id,created_at desc);
alter table public.crm_stages enable row level security;
alter table public.crm_organizations enable row level security;
alter table public.crm_people enable row level security;
alter table public.crm_deals enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_deal_events enable row level security;
create policy crm_stages_owner on public.crm_stages for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy crm_org_owner on public.crm_organizations for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy crm_people_owner on public.crm_people for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy crm_deals_owner on public.crm_deals for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy crm_activities_owner on public.crm_activities for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy crm_events_owner on public.crm_deal_events for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.crm_stages,public.crm_organizations,public.crm_people,public.crm_deals,public.crm_activities,public.crm_deal_events from anon;
grant select,insert,update,delete on public.crm_stages,public.crm_organizations,public.crm_people,public.crm_deals,public.crm_activities,public.crm_deal_events to authenticated;
-- View uses caller identity and RLS, not the view creator's database privileges.
create view public.crm_monthly_wins with (security_invoker=true) as
 select user_id,
        (date_trunc('month',won_at at time zone 'America/Sao_Paulo'))::date as month,
        count(*)::integer as contracts_count,
        coalesce(sum(setup_value),0)::numeric(14,2) as setup_revenue,
        coalesce(sum(monthly_value),0)::numeric(14,2) as new_mrr
 from public.crm_deals where status='won' and won_at is not null
 group by user_id,(date_trunc('month',won_at at time zone 'America/Sao_Paulo'))::date;
revoke all on public.crm_monthly_wins from anon;
grant select on public.crm_monthly_wins to authenticated;
