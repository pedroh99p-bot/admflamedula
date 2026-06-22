# Contratos futuros da landing publica para Supabase

Esta documentacao prepara a futura conexao da landing publica. Nenhum formulario publico foi conectado nesta etapa.

## Regra de intake

A landing nao deve inserir diretamente em tabelas privadas usando o cliente anon no navegador nesta fase. Recomendacao para producao:

- Edge Function para receber formularios.
- Validacao de schema.
- Rate limit.
- Sanitizacao de texto.
- Consentimento LGPD obrigatorio.
- Insert controlado no Supabase.
- Sem `service_role` no frontend.

## `donor_leads`

Payload previsto:

```json
{
  "nome": "string obrigatoria",
  "telefone": "string obrigatoria",
  "email": "string opcional",
  "cidade": "string opcional",
  "estado": "string opcional",
  "blood_donor_status": "ja_doador | quero_comecar | interessado | nao_informado",
  "redome_status": "cadastrado | nao_cadastrado | nao_informado",
  "medula_interest": "sim | nao | quero_saber",
  "contact_preference": "whatsapp | email | telefone",
  "consent_lgpd": "boolean obrigatorio true",
  "consent_updates": "boolean",
  "origem": "landing",
  "source_section": "string",
  "status": "novo"
}
```

Campos que nunca devem ser enviados: documentos sensiveis desnecessarios, dados medicos, dados de cartao.

## `patient_cases`

Payload previsto:

```json
{
  "requester_name": "string obrigatoria",
  "requester_phone": "string obrigatoria",
  "relation_to_patient": "string opcional",
  "patient_identifier": "string opcional",
  "cidade": "string opcional",
  "estado": "string opcional",
  "hospital": "string opcional",
  "need_type": "sangue | medula | plaquetas | campanha_cadastro_medula | outro",
  "urgency_level": "baixa | media | alta",
  "campaign_context": "string opcional",
  "consent_authorized": "boolean obrigatorio",
  "origem": "landing",
  "source_section": "string",
  "status": "novo"
}
```

Observacao: compatibilidade medica nao deve ser calculada pela landing nem pelo ADM. O ADM pode organizar mobilizacoes por regiao e contatos autorizados.

## `donation_intents`

Payload previsto:

```json
{
  "donor_type": "individual | company",
  "name": "string",
  "company_name": "string",
  "responsible_name": "string",
  "document_type": "cpf | cnpj",
  "document": "string",
  "email": "string",
  "phone": "string",
  "birth_date": "date opcional",
  "contact_preference": "whatsapp | email | telefone",
  "payment_method": "pix | card | platform",
  "donation_type": "single | recurring",
  "due_day": "integer 1-31",
  "recurrence_period": "monthly | yearly",
  "amount": "number",
  "custom_amount": "number",
  "privacy_accepted": "boolean obrigatorio true",
  "terms_accepted": "boolean obrigatorio true",
  "source": "apoie_page",
  "status": "pending_payment_setup"
}
```

Dados proibidos:

- numero completo de cartao
- CVV
- validade do cartao
- senha
- token secreto do provedor

O banco deve guardar apenas `provider_reference` ou token seguro retornado pelo provedor em backend/Edge Function.

## Conteudo publico

Tabelas publicas gerenciadas pelo ADM:

- `hero_news`
- `actions`
- `media_items`
- `testimonials`
- `team_members`
- `faq_items`
- `transparency_metrics`

Leitura anonima deve retornar somente `published = true`.

## Campos Cloudinary

Campos preparados:

- `image_url`
- `thumbnail_url`
- `image_alt`
- `cloudinary_public_id`

Upload futuro deve ser assinado por backend/Edge Function. Nunca expor Cloudinary API secret no navegador.
