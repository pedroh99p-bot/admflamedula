# Supabase - Flamedula ADM

Esta pasta versiona a fundacao de banco para o ADM. Ela nao conecta a landing publica e nao usa `service_role` no frontend.

## Ordem das migrations

Execute no SQL Editor do Supabase ou via Supabase CLI, nesta ordem:

1. `supabase/migrations/001_initial_schema.sql`
2. `supabase/migrations/002_rls_policies.sql`
3. `supabase/migrations/003_views_and_indexes.sql`
4. Opcional em desenvolvimento: `supabase/migrations/004_seed_development.sql`

O seed usa apenas dados FIC ficticios e nao deve ser aplicado em producao.

## Primeiro administrador

1. Crie o usuario no Supabase Auth.
2. Copie o UUID do usuario criado.
3. Rode o SQL abaixo substituindo somente o UUID e nome ficticios:

```sql
insert into public.admin_profiles (user_id, full_name, role, active)
values ('00000000-0000-0000-0000-000000000000', 'Primeiro Admin', 'super_admin', true);
```

Roles suportadas:

- `super_admin`: gerencia administradores e configuracoes.
- `admin`: gerencia dados e conteudo.
- `operator`: atualiza status/notas operacionais.
- `viewer`: leitura administrativa.

## RLS

Todas as tabelas usam RLS.

- Dados privados (`donor_leads`, `patient_cases`, `support_leads`, `donation_intents`) nao possuem leitura publica.
- Conteudo publico permite `select` anonimo somente quando `published = true`.
- Escrita anonima para formularios publicos nao esta liberada nesta etapa.
- A funcao `public.is_active_admin()` valida que o usuario autenticado possui `admin_profiles.active = true`.

## Cloudinary

O banco guarda apenas referencias:

- `image_url`
- `thumbnail_url`
- `cloudinary_public_id`
- textos alternativos e metadados

Upload real deve ser implementado futuramente por backend/Edge Function com assinatura segura. Nao expor API secret no navegador.

## Cartao/pagamento

`donation_intents` nao possui campos de numero de cartao, CVV ou validade. Futuramente deve receber apenas referencia/token seguro do provedor de pagamento.

## Fase futura da landing

Para intake publico, usar Edge Function com:

- validacao de payload
- rate limit
- consentimento obrigatorio
- insert controlado no Supabase
- logs operacionais

Nesta etapa a landing publica nao foi alterada.
