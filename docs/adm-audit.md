# Auditoria do ADM Flamedula

## Stack encontrada

- Aplicacao estatica em HTML, CSS e JavaScript puro.
- Sem React, Vite, Next.js ou roteador SPA.
- Entrada principal: `index.html`.
- Login: `login.html`.
- Estilos: `assets/css/styles.css`.
- Scripts ES Modules: `assets/js/*.js`.
- Graficos: Chart.js via CDN.
- Icones: Lucide via CDN.
- Supabase JS: CDN no browser e dependencia npm `@supabase/supabase-js`.

## Rotas e telas existentes

Nao ha rotas reais. A navegacao do ADM acontece por abas em `index.html`:

- Visao Geral
- Doadores
- Pacientes
- Doacoes
- Regioes
- Conteudo
- Relatorios
- Configuracoes

Existe uma aba dedicada para Hero/Novidades, Acoes, Midias, Depoimentos, Equipe, FAQ, Transparencia e Configuracoes do site.

## Estado funcional

- Login usa Supabase Auth.
- Dashboard busca dados via Supabase.
- Doadores usam `donor_leads`.
- Pacientes/casos usam `patient_cases`.
- Apoio financeiro usa `donation_intents`.
- Conteudo publico usa as tabelas versionadas em `supabase/migrations/001_initial_schema.sql`.
- Exportacao CSV existe para abas principais.
- Modo Demo/Teste injeta dados FIC apenas no front-end.
- Mobilizacao operacional usa score e priorizacao visual no front-end.

## Dados mockados/demo

- `assets/js/mock-data.js`: mock legado, nao e fonte principal do dashboard atual.
- `assets/js/demo-data.js`: dados FIC para Modo Demo/Teste, somente front-end.
- Nenhum dado FIC e inserido no Supabase pelo ADM.

## Supabase atual

- Cliente central em `assets/js/supabaseClient.js`.
- Configuracao atual em `assets/js/config.js`.
- Leitura/mutacoes principais em `assets/js/api.js`.
- Nova fundacao SQL criada em `supabase/migrations`.
- Services de dominio criados em `assets/js/services`.

## Autenticacao atual

- `login.html` envia e-mail/senha para Supabase Auth.
- `auth.js` valida sessao e agora verifica `admin_profiles.active`.
- Usuario autenticado sem perfil admin ativo deve ser bloqueado.

## Cloudinary atual

- Logo e favicon usam URL Cloudinary.
- Upload administrativo usa a Edge Function `generate-cloudinary-signature`.
- Migrations incluem `media_assets` e vinculos de asset para conteudo.

## Partes ainda prototipo

- Intake publico da landing.
- Gateway/plataforma real de pagamento.

## Partes prontas para dados reais

- Login administrativo.
- Dashboard principal.
- Doadores/interessados.
- Pacientes/casos.
- Doacoes/apoio financeiro.
- Conteudo gerenciado e upload Cloudinary assinado.

## Arquivos alterados nesta etapa

- `assets/js/api.js`
- `assets/js/auth.js`
- `assets/js/supabaseClient.js`
- `README.md`

## Arquivos criados nesta etapa

- `supabase/migrations/*.sql`
- `supabase/README.md`
- `docs/adm-audit.md`
- `docs/landing-supabase-contracts.md`
- `assets/js/services/*.js`
- `.env.example`
- `assets/js/config.example.js`
