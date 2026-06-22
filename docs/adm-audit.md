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
- Relatorios
- Configuracoes

Nao existem telas dedicadas para Hero/Novidades, Acoes ou Midias. A fundacao Supabase e os services foram criados para essas entidades, mas a UI CRUD ainda precisa ser construida.

## Estado funcional

- Login usa Supabase Auth.
- Dashboard busca dados via Supabase.
- Doadores usam `donor_leads`.
- Pacientes/casos usam a tabela legada `patients`.
- Apoio financeiro usa a tabela legada `monetary_donations`.
- Exportacao CSV existe para abas principais.
- Modo Demo/Teste injeta dados FIC apenas no front-end.
- Matching operacional usa score e priorizacao visual no front-end.

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
- Nao existe upload Cloudinary no ADM.
- Migrations incluem campos `image_url`, `thumbnail_url` e `cloudinary_public_id` para conteudo futuro.

## Partes ainda prototipo

- CRUD visual de Hero/Novidades.
- CRUD visual de Acoes.
- CRUD visual de Midias.
- Upload Cloudinary.
- Intake publico da landing.
- Gateway/plataforma real de pagamento.

## Partes prontas para dados reais

- Login administrativo.
- Dashboard principal.
- Doadores/interessados.
- Pacientes/casos existentes na tabela legada.
- Doacoes/apoio financeiro na tabela legada.
- Conteudo gerenciado assim que as migrations forem aplicadas e UI dedicada for criada.

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
