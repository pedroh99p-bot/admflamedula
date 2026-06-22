create table if not exists public.media_assets (
  id uuid primary key default gen_random_uuid(),
  cloudinary_public_id text not null unique,
  secure_url text not null,
  resource_type text not null check (resource_type in ('image', 'video')),
  asset_type text,
  folder text,
  original_filename text,
  display_name text,
  alt_text text,
  format text,
  width integer,
  height integer,
  duration numeric,
  bytes bigint,
  version bigint,
  uploaded_by uuid references auth.users(id),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hero_news add column if not exists image_asset_id uuid references public.media_assets(id) on delete set null;
alter table public.actions add column if not exists image_asset_id uuid references public.media_assets(id) on delete set null;
alter table public.media_items add column if not exists media_asset_id uuid references public.media_assets(id) on delete set null;
alter table public.testimonials add column if not exists image_asset_id uuid references public.media_assets(id) on delete set null;
alter table public.team_members add column if not exists image_asset_id uuid references public.media_assets(id) on delete set null;

drop trigger if exists set_media_assets_updated_at on public.media_assets;
create trigger set_media_assets_updated_at before update on public.media_assets for each row execute function public.update_updated_at_column();

create index if not exists idx_media_assets_resource_type on public.media_assets (resource_type);
create index if not exists idx_media_assets_uploaded_by on public.media_assets (uploaded_by);
create index if not exists idx_media_assets_created_at on public.media_assets (created_at desc);

alter table public.media_assets enable row level security;

drop policy if exists "media_assets_admin_select" on public.media_assets;
create policy "media_assets_admin_select"
on public.media_assets
for select
to authenticated
using (public.is_active_admin(null));

drop policy if exists "media_assets_admin_insert" on public.media_assets;
create policy "media_assets_admin_insert"
on public.media_assets
for insert
to authenticated
with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));

drop policy if exists "media_assets_admin_update" on public.media_assets;
create policy "media_assets_admin_update"
on public.media_assets
for update
to authenticated
using (public.is_active_admin(array['super_admin', 'admin', 'operator']))
with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));

drop policy if exists "media_assets_admin_delete" on public.media_assets;
create policy "media_assets_admin_delete"
on public.media_assets
for delete
to authenticated
using (public.is_active_admin(array['super_admin', 'admin']));
