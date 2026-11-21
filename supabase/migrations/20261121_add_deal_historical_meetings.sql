alter table public.crm_deals add column if not exists meeting_scheduled_at timestamptz;
alter table public.crm_deals add column if not exists meeting_held_at timestamptz;
comment on column public.crm_deals.meeting_scheduled_at is 'Data/hora agendada para a reunião vinculada ao negócio (histórico editável).';
comment on column public.crm_deals.meeting_held_at is 'Data/hora em que a reunião com o negócio foi realizada (histórico editável).';
create index if not exists crm_deals_user_meetings_idx on public.crm_deals(user_id,meeting_scheduled_at,meeting_held_at);
