-- Financeiro: cobranças previstas são separadas dos pagamentos realmente recebidos.
alter table public.crm_deals add column if not exists billing_day integer;
alter table public.crm_deals add column if not exists billing_start_month date;
alter table public.crm_deals drop constraint if exists crm_deals_billing_day_check;
alter table public.crm_deals add constraint crm_deals_billing_day_check check (billing_day between 1 and 28);
alter table public.crm_deals drop constraint if exists crm_deals_billing_start_month_check;
alter table public.crm_deals add constraint crm_deals_billing_start_month_check check (extract(day from billing_start_month)=1);
create table if not exists public.crm_recurring_charges(
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 deal_id uuid not null,
 reference_month date not null check(extract(day from reference_month)=1),
 due_on date not null,
 amount numeric(14,2) not null check(amount>0),
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id,deal_id,reference_month),
 foreign key (deal_id,user_id) references public.crm_deals(id,user_id) on delete cascade
);
create index if not exists crm_recurring_charges_user_due on public.crm_recurring_charges(user_id,due_on);
create index if not exists crm_recurring_charges_deal_month on public.crm_recurring_charges(user_id,deal_id,reference_month);
alter table public.crm_recurring_charges enable row level security;
drop policy if exists crm_recurring_charges_owner on public.crm_recurring_charges;
create policy crm_recurring_charges_owner on public.crm_recurring_charges for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.crm_recurring_charges from anon;
grant select,insert,update,delete on public.crm_recurring_charges to authenticated;