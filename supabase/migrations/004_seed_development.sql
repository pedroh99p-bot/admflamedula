-- Optional development seed. Do not run this in production.
-- All records are fictional and exist only to validate layouts and RLS in a dev project.

insert into public.donor_leads (
  nome,
  telefone,
  email,
  cidade,
  estado,
  blood_donor_status,
  redome_status,
  medula_interest,
  contact_preference,
  consent_lgpd,
  consent_updates,
  origem,
  source_section,
  status,
  internal_notes
) values
  ('FIC Seed Ana', '21999990001', 'fic.seed.ana@example.test', 'Rio de Janeiro', 'RJ', 'ja_doador', 'nao_informado', 'sim', 'whatsapp', true, true, 'seed_dev', 'adm_seed', 'acionavel', 'Seed ficticio de desenvolvimento.'),
  ('FIC Seed Bruno', '11999990002', 'fic.seed.bruno@example.test', 'Sao Paulo', 'SP', 'quero_comecar', 'nao_informado', 'quero_saber', 'email', true, false, 'seed_dev', 'adm_seed', 'novo', 'Seed ficticio de desenvolvimento.')
on conflict do nothing;

insert into public.patient_cases (
  requester_name,
  requester_phone,
  relation_to_patient,
  patient_identifier,
  cidade,
  estado,
  hospital,
  need_type,
  urgency_level,
  campaign_context,
  consent_authorized,
  origem,
  source_section,
  status,
  private_notes
) values
  ('FIC Solicitante Clara', '31999990003', 'familiar', 'FIC Caso Clara', 'Belo Horizonte', 'MG', 'Hospital FIC MG', 'sangue', 'alta', 'Mobilizacao ficticia para teste.', true, 'seed_dev', 'adm_seed', 'em_analise', 'Seed ficticio de desenvolvimento.'),
  ('FIC Solicitante Diego', '71999990004', 'amigo', 'FIC Caso Diego', 'Salvador', 'BA', 'Hospital FIC BA', 'medula', 'media', 'Campanha ficticia para teste.', false, 'seed_dev', 'adm_seed', 'novo', 'Seed ficticio de desenvolvimento.')
on conflict do nothing;

insert into public.hero_news (
  category,
  title,
  subtitle,
  image_url,
  image_alt,
  cta_label,
  cta_url,
  featured,
  published,
  sort_order
) values
  ('seed', 'FIC Hero de desenvolvimento', 'Conteudo ficticio para validar publicacao.', null, 'Imagem ficticia', 'Saiba mais', '#', true, false, 10)
on conflict do nothing;

insert into public.actions (
  title,
  summary,
  action_date,
  location,
  action_status,
  published,
  sort_order
) values
  ('FIC Acao de desenvolvimento', 'Acao ficticia para validar CRUD e ordenacao.', current_date + 14, 'Local FIC', 'planejada', false, 10)
on conflict do nothing;

insert into public.media_items (
  type,
  category,
  title,
  description,
  url,
  source,
  featured,
  published,
  sort_order
) values
  ('video', 'seed', 'FIC Midia de desenvolvimento', 'Midia ficticia para validar campos de conteudo.', 'https://example.test/fic-video', 'seed_dev', false, false, 10)
on conflict do nothing;
