-- Executada no projeto Supabase vinculado (2026-11-20).
create table if not exists public.monthly_goals (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 month date not null check(extract(day from month)=1), contracts_target integer not null default 20 check(contracts_target>0),
 setup_revenue_target numeric(14,2) not null default 20000 check(setup_revenue_target>=0),
 new_mrr_target numeric(14,2) not null default 6000 check(new_mrr_target>=0),
 updated_at timestamptz not null default now(), unique(user_id,month));
create table if not exists public.monthly_results (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 month date not null check(extract(day from month)=1), contracts_count integer not null default 0 check(contracts_count>=0),
 setup_revenue numeric(14,2) not null default 0 check(setup_revenue>=0), new_mrr numeric(14,2) not null default 0 check(new_mrr>=0),
 leads_count integer check(leads_count>=0), meetings_count integer check(meetings_count>=0), proposals_count integer check(proposals_count>=0),
 notes text, updated_at timestamptz not null default now(), unique(user_id,month),
 constraint funnel_consistency check ((leads_count is null or meetings_count is null or meetings_count<=leads_count) and
 (meetings_count is null or proposals_count is null or proposals_count<=meetings_count) and
 (proposals_count is null or contracts_count<=proposals_count)));
create table if not exists public.action_items (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 month date not null check(extract(day from month)=1), title text not null check(length(trim(title)) between 1 and 180),
 completed boolean not null default false, created_at timestamptz not null default now());
create index if not exists monthly_goals_user_month_idx on public.monthly_goals(user_id,month desc);
create index if not exists monthly_results_user_month_idx on public.monthly_results(user_id,month desc);
create index if not exists action_items_user_month_idx on public.action_items(user_id,month,created_at);
alter table public.monthly_goals enable row level security;
alter table public.monthly_results enable row level security;
alter table public.action_items enable row level security;
create policy "goals select own" on public.monthly_goals for select to authenticated using ((select auth.uid())=user_id);
create policy "goals insert own" on public.monthly_goals for insert to authenticated with check ((select auth.uid())=user_id);
create policy "goals update own" on public.monthly_goals for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "goals delete own" on public.monthly_goals for delete to authenticated using ((select auth.uid())=user_id);
create policy "results select own" on public.monthly_results for select to authenticated using ((select auth.uid())=user_id);
create policy "results insert own" on public.monthly_results for insert to authenticated with check ((select auth.uid())=user_id);
create policy "results update own" on public.monthly_results for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "results delete own" on public.monthly_results for delete to authenticated using ((select auth.uid())=user_id);
create policy "actions select own" on public.action_items for select to authenticated using ((select auth.uid())=user_id);
create policy "actions insert own" on public.action_items for insert to authenticated with check ((select auth.uid())=user_id);
create policy "actions update own" on public.action_items for update to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create policy "actions delete own" on public.action_items for delete to authenticated using ((select auth.uid())=user_id);
revoke all on public.monthly_goals,public.monthly_results,public.action_items from anon;
grant select,insert,update,delete on public.monthly_goals,public.monthly_results,public.action_items to authenticated;
