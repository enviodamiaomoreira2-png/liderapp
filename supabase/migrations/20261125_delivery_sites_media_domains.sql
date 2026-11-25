-- Delivery builder: per-user project records, media and domain purchase quote.
-- Applied to Supabase on 2026-11-25.
create table public.delivery_sites(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 organization_id uuid,client_name text not null check(length(trim(client_name)) between 2 and 160),
 project_slug text not null,site_data jsonb not null default '{}'::jsonb,media_urls text[] not null default '{}',
 status text not null default 'draft' check(status in ('draft','publishing','published','needs_setup','error')),
 github_repo text,github_url text,vercel_project_id text,vercel_url text,
 domain text,domain_order_id text,last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 unique(user_id,project_slug),unique(id,user_id),
 foreign key(organization_id,user_id) references public.crm_organizations(id,user_id) on delete set null(organization_id)
);
create index delivery_sites_user_updated on public.delivery_sites(user_id,updated_at desc);
alter table public.delivery_sites enable row level security;
create policy delivery_sites_owner on public.delivery_sites for all to authenticated
 using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
revoke all on public.delivery_sites from anon;
grant select,insert,update,delete on public.delivery_sites to authenticated;
create table public.delivery_domain_quotes(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 site_id uuid not null,domain text not null,price numeric(12,2) not null check(price>0),
 years integer not null default 1 check(years between 1 and 10),
 status text not null default 'quoted' check(status in ('quoted','processing','ordered','failed')),
 order_id text,created_at timestamptz not null default now(),expires_at timestamptz not null default(now()+interval '10 minutes'),
 foreign key(site_id,user_id) references public.delivery_sites(id,user_id) on delete cascade
);
create index delivery_domain_quotes_active on public.delivery_domain_quotes(user_id,site_id,expires_at desc);
alter table public.delivery_domain_quotes enable row level security;
create policy delivery_domain_quotes_owner on public.delivery_domain_quotes for all to authenticated
 using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
revoke all on public.delivery_domain_quotes from anon;
grant select,insert,update on public.delivery_domain_quotes to authenticated;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('delivery-media','delivery-media',true,10485760,array['image/jpeg','image/png','image/webp','image/avif'])
 on conflict(id) do update set public=true,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy "delivery_media_upload_owner" on storage.objects for insert to authenticated
 with check(bucket_id='delivery-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "delivery_media_update_owner" on storage.objects for update to authenticated
 using(bucket_id='delivery-media' and (storage.foldername(name))[1]=(select auth.uid())::text)
 with check(bucket_id='delivery-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy "delivery_media_delete_owner" on storage.objects for delete to authenticated
 using(bucket_id='delivery-media' and (storage.foldername(name))[1]=(select auth.uid())::text);
