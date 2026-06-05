# Flamedula ADM Dashboard MVP

Dashboard administrativa demonstrativa do Flamedula em HTML, CSS e JavaScript puro.

## Como rodar

Por usar ES Modules, rode com um servidor estatico local:

```bash
python -m http.server 8000
```

Acesse `http://localhost:8000/login.html`.

## Login de teste

- Login: `flamedula10`
- Senha: `12345`

## Estrutura

```text
index.html
login.html
assets/
  css/styles.css
  js/app.js
  js/auth.js
  js/api.js
  js/charts.js
  js/mock-data.js
  js/supabase-placeholder.js
  js/utils.js
```

## Status

- Dados mockados para `donor_leads`, `patients` e `monetary_donations`.
- Login fixo apenas para demonstracao MVP.
- Supabase ainda nao conectado.
- `assets/js/supabase-placeholder.js` documenta a futura integracao sem chaves reais.
