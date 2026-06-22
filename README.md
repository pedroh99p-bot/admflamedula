# Flamedula ADM

Dashboard administrativa do Flamedula em HTML, CSS e JavaScript puro.

## Stack

- HTML estatico: `index.html` e `login.html`
- CSS: `assets/css/styles.css`
- JavaScript ES Modules: `assets/js/*.js`
- Supabase Auth e Database
- Chart.js e Lucide via CDN

Nao ha React, Vite, Next.js ou build step obrigatorio nesta versao.

## Como rodar localmente

Por usar ES Modules, rode com um servidor estatico local:

```bash
python -m http.server 8000
```

Depois acesse:

```text
http://localhost:8000/login.html
```

Se Python nao estiver disponivel, use qualquer servidor estatico equivalente.

## Configuracao Supabase

O app le `window.FLAMEDULA_CONFIG` em `assets/js/config.js`.

Use `assets/js/config.example.js` como referencia:

```js
window.FLAMEDULA_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_PROJECT_REF: "",
  SUPABASE_PUBLISHABLE_KEY: "",
  CLOUDINARY_CLOUD_NAME: ""
};
```

Tambem existe `.env.example` para ambientes que futuramente usem build tool:

```text
SUPABASE_URL=
SUPABASE_PROJECT_REF=
SUPABASE_PUBLISHABLE_KEY=
CLOUDINARY_CLOUD_NAME=
```

Nunca exponha `service_role` no frontend.

## Banco Supabase

Migrations:

```text
supabase/migrations/001_initial_schema.sql
supabase/migrations/002_rls_policies.sql
supabase/migrations/003_views_and_indexes.sql
supabase/migrations/005_media_assets_and_cloudinary_links.sql
supabase/migrations/004_seed_development.sql
```

Leia `supabase/README.md` antes de aplicar. O seed e opcional e somente para desenvolvimento.

## Primeiro administrador

1. Crie um usuario no Supabase Auth.
2. Copie o UUID.
3. Insira o perfil em `admin_profiles`:

```sql
insert into public.admin_profiles (user_id, full_name, role, active)
values ('00000000-0000-0000-0000-000000000000', 'Primeiro Admin', 'super_admin', true);
```

Sem `admin_profiles.active = true`, o ADM bloqueia o acesso mesmo com login valido.

## Services

A camada modular fica em `assets/js/services`:

- `authService.js`
- `dashboardService.js`
- `donorService.js`
- `patientService.js`
- `supportService.js`
- `contentService.js`
- `cloudinaryService.js`
- `supabaseService.js`

`assets/js/api.js` funciona como ponte de compatibilidade para a UI atual.

## Dados demo

`assets/js/demo-data.js` injeta dados FIC somente no front-end quando `Modo Demo/Teste` esta ativo.

Esses dados:

- nao sao salvos no Supabase
- nao podem ser editados/excluidos no banco
- servem para testar cards, graficos, filtros, ranking e mobilizacao operacional

## Landing publica

A landing publica nao foi conectada nesta etapa. Os contratos futuros estao em:

```text
docs/landing-supabase-contracts.md
```

Recomendacao para intake publico: Edge Function com validacao, rate limit e insert controlado.

## Cloudinary

O upload administrativo usa a Edge Function:

```text
supabase/functions/generate-cloudinary-signature
```

Configure os segredos somente no ambiente da Function. Use `supabase/functions/.env.example` como referencia. Nunca exponha `CLOUDINARY_API_SECRET` no navegador ou no repositório.
