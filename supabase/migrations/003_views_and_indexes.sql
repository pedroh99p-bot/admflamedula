create index if not exists idx_donor_leads_estado on public.donor_leads (estado);
create index if not exists idx_donor_leads_cidade on public.donor_leads (cidade);
create index if not exists idx_donor_leads_status on public.donor_leads (status);
create index if not exists idx_donor_leads_created_at on public.donor_leads (created_at desc);

create index if not exists idx_patient_cases_estado on public.patient_cases (estado);
create index if not exists idx_patient_cases_cidade on public.patient_cases (cidade);
create index if not exists idx_patient_cases_status on public.patient_cases (status);
create index if not exists idx_patient_cases_created_at on public.patient_cases (created_at desc);

create index if not exists idx_donation_intents_status on public.donation_intents (status);
create index if not exists idx_donation_intents_created_at on public.donation_intents (created_at desc);

create index if not exists idx_hero_news_published_order on public.hero_news (published, sort_order);
create index if not exists idx_actions_published_order on public.actions (published, sort_order);
create index if not exists idx_actions_action_status on public.actions (action_status);
create index if not exists idx_media_items_published_order on public.media_items (published, sort_order);
create index if not exists idx_media_items_type on public.media_items (type);
create index if not exists idx_testimonials_published_order on public.testimonials (published, sort_order);
create index if not exists idx_team_members_published_order on public.team_members (published, sort_order);
create index if not exists idx_faq_items_published_order on public.faq_items (published, sort_order);
create index if not exists idx_transparency_metrics_published_order on public.transparency_metrics (published, sort_order);

create or replace view public.v_dashboard_metrics as
select 'network_people'::text as metric_key, 'Pessoas na rede'::text as label, count(*)::numeric as value
from public.donor_leads
union all
select 'marrow_interested', 'Interessados em medula', count(*)::numeric
from public.donor_leads
where medula_interest in ('sim', 'interessado', 'quero_saber')
union all
select 'actionable_donors', 'Doadores acionaveis', count(*)::numeric
from public.donor_leads
where status = 'acionavel' and consent_lgpd = true
union all
select 'flagged_cases', 'Casos sinalizados', count(*)::numeric
from public.patient_cases
where status in ('novo', 'em_analise', 'mobilizacao_ativa')
union all
select 'published_content', 'Conteudos publicados', (
  (select count(*) from public.hero_news where published = true)
  + (select count(*) from public.actions where published = true)
  + (select count(*) from public.media_items where published = true)
  + (select count(*) from public.testimonials where published = true)
  + (select count(*) from public.team_members where published = true)
  + (select count(*) from public.faq_items where published = true)
)::numeric
union all
select 'active_actions', 'Acoes ativas', count(*)::numeric
from public.actions
where published = true and action_status in ('ativa', 'planejada');

create or replace view public.v_donor_region_summary as
select
  estado,
  cidade,
  count(*)::integer as total_pessoas,
  count(*) filter (where blood_donor_status in ('ja_doador', 'doador_recorrente'))::integer as ja_doadores_sangue,
  count(*) filter (where blood_donor_status in ('quero_comecar', 'interessado'))::integer as interessados_em_comecar,
  count(*) filter (where medula_interest in ('sim', 'interessado', 'quero_saber'))::integer as interessados_em_medula,
  count(*) filter (where status = 'acionavel' and consent_lgpd = true)::integer as acionaveis
from public.donor_leads
group by estado, cidade;

create or replace view public.v_content_status as
select 'hero_news'::text as content_type,
  count(*) filter (where published = true)::integer as publicados,
  count(*) filter (where published = false)::integer as rascunhos,
  count(*) filter (where featured = true)::integer as destaques
from public.hero_news
union all
select 'actions',
  count(*) filter (where published = true)::integer,
  count(*) filter (where published = false)::integer,
  count(*) filter (where published = true and action_status = 'ativa')::integer
from public.actions
union all
select 'media_items',
  count(*) filter (where published = true)::integer,
  count(*) filter (where published = false)::integer,
  count(*) filter (where featured = true)::integer
from public.media_items
union all
select 'testimonials',
  count(*) filter (where published = true)::integer,
  count(*) filter (where published = false)::integer,
  0::integer
from public.testimonials
union all
select 'team_members',
  count(*) filter (where published = true)::integer,
  count(*) filter (where published = false)::integer,
  0::integer
from public.team_members
union all
select 'faq_items',
  count(*) filter (where published = true)::integer,
  count(*) filter (where published = false)::integer,
  0::integer
from public.faq_items;
