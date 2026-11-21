create table public.crm_recurring_payments (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null references auth.users(id) on delete cascade,
 deal_id uuid not null,
 reference_month date not null check (extract(day from reference_month)=1),
 paid_at date not null,
 amount numeric(14,2) not null check(amount>0),
 notes text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique (user_id,deal_id,reference_month),
 foreign key (deal_id,user_id) references public.crm_deals(id,user_id) on delete cascade
);
create index crm_recurring_payments_user_date_idx on public.crm_recurring_payments (user_id,paid_at);
alter table public.crm_recurring_payments enable row level security;
create policy "recurring payments owner" on public.crm_recurring_payments for all to authenticated using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
revoke all on public.crm_recurring_payments from anon;
grant select,insert,update,delete on public.crm_recurring_payments to authenticated;
create view public.crm_monthly_revenue with (security_invoker=true) as
select user_id,month,
sum(setups_won)::numeric(14,2) as setups_won,
sum(recurring_paid)::numeric(14,2) as recurring_paid,
sum(setups_won+recurring_paid)::numeric(14,2) as revenue_total
from (
 select user_id, (date_trunc('month',won_at at time zone 'America/Sao_Paulo'))::date as month,
 setup_value as setups_won,0::numeric as recurring_paid
 from public.crm_deals where status='won' and won_at is not null
 union all
 select user_id,(date_trunc('month',paid_at::timestamp))::date as month,
 0::numeric as setups_won,amount as recurring_paid
 from public.crm_recurring_payments
) revenue_events
group by user_id,month;
revoke all on public.crm_monthly_revenue from anon;
grant select on public.crm_monthly_revenue to authenticated;
