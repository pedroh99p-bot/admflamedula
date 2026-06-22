create or replace function public.is_active_admin(required_roles text[] default null)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.active = true
      and (
        required_roles is null
        or ap.role = any(required_roles)
      )
  );
$$;

alter table public.admin_profiles enable row level security;
alter table public.donor_leads enable row level security;
alter table public.patient_cases enable row level security;
alter table public.support_leads enable row level security;
alter table public.donation_intents enable row level security;
alter table public.hero_news enable row level security;
alter table public.actions enable row level security;
alter table public.media_items enable row level security;
alter table public.testimonials enable row level security;
alter table public.team_members enable row level security;
alter table public.faq_items enable row level security;
alter table public.transparency_metrics enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "admin_profiles_self_select" on public.admin_profiles;
create policy "admin_profiles_self_select"
on public.admin_profiles
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "admin_profiles_super_admin_all" on public.admin_profiles;
create policy "admin_profiles_super_admin_all"
on public.admin_profiles
for all
to authenticated
using (public.is_active_admin(array['super_admin']))
with check (public.is_active_admin(array['super_admin']));

drop policy if exists "donor_leads_admin_select" on public.donor_leads;
create policy "donor_leads_admin_select"
on public.donor_leads
for select
to authenticated
using (public.is_active_admin(null));

drop policy if exists "donor_leads_operator_update" on public.donor_leads;
create policy "donor_leads_operator_update"
on public.donor_leads
for update
to authenticated
using (public.is_active_admin(array['super_admin', 'admin', 'operator']))
with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));

drop policy if exists "donor_leads_admin_delete" on public.donor_leads;
create policy "donor_leads_admin_delete"
on public.donor_leads
for delete
to authenticated
using (public.is_active_admin(array['super_admin', 'admin']));

drop policy if exists "patient_cases_admin_select" on public.patient_cases;
create policy "patient_cases_admin_select"
on public.patient_cases
for select
to authenticated
using (public.is_active_admin(null));

drop policy if exists "patient_cases_operator_update" on public.patient_cases;
create policy "patient_cases_operator_update"
on public.patient_cases
for update
to authenticated
using (public.is_active_admin(array['super_admin', 'admin', 'operator']))
with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));

drop policy if exists "patient_cases_admin_delete" on public.patient_cases;
create policy "patient_cases_admin_delete"
on public.patient_cases
for delete
to authenticated
using (public.is_active_admin(array['super_admin', 'admin']));

drop policy if exists "support_leads_admin_all" on public.support_leads;
create policy "support_leads_admin_all"
on public.support_leads
for all
to authenticated
using (public.is_active_admin(array['super_admin', 'admin', 'operator']))
with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));

drop policy if exists "donation_intents_admin_all" on public.donation_intents;
create policy "donation_intents_admin_all"
on public.donation_intents
for all
to authenticated
using (public.is_active_admin(array['super_admin', 'admin']))
with check (public.is_active_admin(array['super_admin', 'admin']));

drop policy if exists "audit_logs_admin_select" on public.audit_logs;
create policy "audit_logs_admin_select"
on public.audit_logs
for select
to authenticated
using (public.is_active_admin(array['super_admin', 'admin']));

drop policy if exists "audit_logs_admin_insert" on public.audit_logs;
create policy "audit_logs_admin_insert"
on public.audit_logs
for insert
to authenticated
with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));

drop policy if exists "hero_news_public_select" on public.hero_news;
create policy "hero_news_public_select" on public.hero_news for select to anon using (published = true);
drop policy if exists "actions_public_select" on public.actions;
create policy "actions_public_select" on public.actions for select to anon using (published = true);
drop policy if exists "media_items_public_select" on public.media_items;
create policy "media_items_public_select" on public.media_items for select to anon using (published = true);
drop policy if exists "testimonials_public_select" on public.testimonials;
create policy "testimonials_public_select" on public.testimonials for select to anon using (published = true);
drop policy if exists "team_members_public_select" on public.team_members;
create policy "team_members_public_select" on public.team_members for select to anon using (published = true);
drop policy if exists "faq_items_public_select" on public.faq_items;
create policy "faq_items_public_select" on public.faq_items for select to anon using (published = true);
drop policy if exists "transparency_metrics_public_select" on public.transparency_metrics;
create policy "transparency_metrics_public_select" on public.transparency_metrics for select to anon using (published = true);

drop policy if exists "hero_news_admin_all" on public.hero_news;
create policy "hero_news_admin_all" on public.hero_news for all to authenticated using (public.is_active_admin(array['super_admin', 'admin', 'operator'])) with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));
drop policy if exists "actions_admin_all" on public.actions;
create policy "actions_admin_all" on public.actions for all to authenticated using (public.is_active_admin(array['super_admin', 'admin', 'operator'])) with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));
drop policy if exists "media_items_admin_all" on public.media_items;
create policy "media_items_admin_all" on public.media_items for all to authenticated using (public.is_active_admin(array['super_admin', 'admin', 'operator'])) with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));
drop policy if exists "testimonials_admin_all" on public.testimonials;
create policy "testimonials_admin_all" on public.testimonials for all to authenticated using (public.is_active_admin(array['super_admin', 'admin', 'operator'])) with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));
drop policy if exists "team_members_admin_all" on public.team_members;
create policy "team_members_admin_all" on public.team_members for all to authenticated using (public.is_active_admin(array['super_admin', 'admin', 'operator'])) with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));
drop policy if exists "faq_items_admin_all" on public.faq_items;
create policy "faq_items_admin_all" on public.faq_items for all to authenticated using (public.is_active_admin(array['super_admin', 'admin', 'operator'])) with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));
drop policy if exists "transparency_metrics_admin_all" on public.transparency_metrics;
create policy "transparency_metrics_admin_all" on public.transparency_metrics for all to authenticated using (public.is_active_admin(array['super_admin', 'admin', 'operator'])) with check (public.is_active_admin(array['super_admin', 'admin', 'operator']));
drop policy if exists "site_settings_admin_all" on public.site_settings;
create policy "site_settings_admin_all" on public.site_settings for all to authenticated using (public.is_active_admin(array['super_admin', 'admin'])) with check (public.is_active_admin(array['super_admin', 'admin']));
