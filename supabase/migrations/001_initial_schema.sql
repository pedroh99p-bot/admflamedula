create extension if not exists pgcrypto;

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text,
  role text not null default 'viewer' check (role in ('super_admin', 'admin', 'operator', 'viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donor_leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  email text,
  cidade text,
  estado text,
  blood_donor_status text,
  redome_status text,
  medula_interest text,
  contact_preference text,
  consent_lgpd boolean not null default false,
  consent_updates boolean not null default false,
  origem text not null default 'landing',
  source_section text,
  status text not null default 'novo' check (status in ('novo', 'contatado', 'acionavel', 'aguardando_retorno', 'arquivado')),
  internal_notes text,
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.patient_cases (
  id uuid primary key default gen_random_uuid(),
  requester_name text not null,
  requester_phone text not null,
  relation_to_patient text,
  patient_identifier text,
  cidade text,
  estado text,
  hospital text,
  need_type text,
  urgency_level text,
  campaign_context text,
  consent_authorized boolean not null default false,
  origem text not null default 'landing',
  source_section text,
  status text not null default 'novo' check (status in ('novo', 'em_analise', 'aguardando_informacao', 'mobilizacao_ativa', 'encerrado', 'arquivado')),
  private_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  email text,
  phone text,
  support_interest_type text,
  campaign_reference text,
  notes text,
  consent_lgpd boolean not null default false,
  origem text not null default 'landing',
  status text not null default 'novo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.donation_intents (
  id uuid primary key default gen_random_uuid(),
  donor_type text,
  name text,
  company_name text,
  responsible_name text,
  document_type text,
  document text,
  email text,
  phone text,
  birth_date date,
  contact_preference text,
  payment_method text,
  donation_type text,
  due_day integer check (due_day is null or due_day between 1 and 31),
  recurrence_period text,
  amount numeric(12,2),
  custom_amount numeric(12,2),
  privacy_accepted boolean not null default false,
  terms_accepted boolean not null default false,
  source text not null default 'apoie_page',
  status text not null default 'pending_payment_setup',
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.hero_news (
  id uuid primary key default gen_random_uuid(),
  category text,
  title text not null,
  subtitle text,
  image_url text,
  image_alt text,
  cloudinary_public_id text,
  cta_label text,
  cta_url text,
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  action_date date,
  location text,
  image_url text,
  image_alt text,
  cloudinary_public_id text,
  cta_label text,
  cta_url text,
  action_status text,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  type text,
  category text,
  title text not null,
  description text,
  url text,
  youtube_id text,
  thumbnail_url text,
  cloudinary_public_id text,
  duration text,
  source text,
  featured boolean not null default false,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  quote text,
  author_name text,
  author_label text,
  image_url text,
  image_alt text,
  cloudinary_public_id text,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  role text,
  description text,
  member_type text,
  image_url text,
  image_alt text,
  cloudinary_public_id text,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.faq_items (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  category text,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transparency_metrics (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  label text,
  value numeric,
  description text,
  mode text,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  key text unique,
  value_json jsonb,
  description text,
  updated_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id),
  action text,
  entity_type text,
  entity_id uuid,
  previous_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);

drop trigger if exists set_admin_profiles_updated_at on public.admin_profiles;
create trigger set_admin_profiles_updated_at before update on public.admin_profiles for each row execute function public.update_updated_at_column();

drop trigger if exists set_donor_leads_updated_at on public.donor_leads;
create trigger set_donor_leads_updated_at before update on public.donor_leads for each row execute function public.update_updated_at_column();

drop trigger if exists set_patient_cases_updated_at on public.patient_cases;
create trigger set_patient_cases_updated_at before update on public.patient_cases for each row execute function public.update_updated_at_column();

drop trigger if exists set_support_leads_updated_at on public.support_leads;
create trigger set_support_leads_updated_at before update on public.support_leads for each row execute function public.update_updated_at_column();

drop trigger if exists set_donation_intents_updated_at on public.donation_intents;
create trigger set_donation_intents_updated_at before update on public.donation_intents for each row execute function public.update_updated_at_column();

drop trigger if exists set_hero_news_updated_at on public.hero_news;
create trigger set_hero_news_updated_at before update on public.hero_news for each row execute function public.update_updated_at_column();

drop trigger if exists set_actions_updated_at on public.actions;
create trigger set_actions_updated_at before update on public.actions for each row execute function public.update_updated_at_column();

drop trigger if exists set_media_items_updated_at on public.media_items;
create trigger set_media_items_updated_at before update on public.media_items for each row execute function public.update_updated_at_column();

drop trigger if exists set_testimonials_updated_at on public.testimonials;
create trigger set_testimonials_updated_at before update on public.testimonials for each row execute function public.update_updated_at_column();

drop trigger if exists set_team_members_updated_at on public.team_members;
create trigger set_team_members_updated_at before update on public.team_members for each row execute function public.update_updated_at_column();

drop trigger if exists set_faq_items_updated_at on public.faq_items;
create trigger set_faq_items_updated_at before update on public.faq_items for each row execute function public.update_updated_at_column();

drop trigger if exists set_transparency_metrics_updated_at on public.transparency_metrics;
create trigger set_transparency_metrics_updated_at before update on public.transparency_metrics for each row execute function public.update_updated_at_column();

drop trigger if exists set_site_settings_updated_at on public.site_settings;
create trigger set_site_settings_updated_at before update on public.site_settings for each row execute function public.update_updated_at_column();
