# Fla Medula Dashboard (Protótipo HTML/Vanilla JS)

Este repositório contém a Dashboard Administrativa do Fla Medula, um sistema visual focado na captação, educação e acompanhamento de doadores de medula óssea.

Seguindo as novas especificações, a stack foi migrada inteiramente para **Vanilla HTML/CSS/JS** sem frameworks complexos, visando leveza, compatibilidade universal e para agir como um protótipo estático.

## Como utilizar

Para ver a dashboard funcionando, devido à nova arquitetura utilizando **ES6 Modules** para maior segurança e modularidade, navegadores bloqueiam acessos diretos via duplo-clique (CORS). Siga este passo a passo:

1. Use a extensão **Live Server** no VSCode.
2. Ou rode um servidor estático local via terminal:
   ```bash
   npx serve .
   ```
3. Acesse `http://localhost:3000` no seu navegador.

```text
/fla-medula-dashboard
├── index.html                   # Estrutura e layout
└── assets/
    ├── css/
    │   └── styles.css           # Estilização com paleta focada no Fla e responsividade
    └── js/
        ├── app.js               # Lógica de renderização de interface e filtros
        ├── charts.js            # Instanciação dos gráficos dinâmicos usando Chart.js
        ├── mock-data.js         # Base de 50 leads e parceiros fictícios de teste
        └── utils.js             # Funções utilitárias (formatações, extração de CSV, etc)
```

## Funcionalidades Prontas

- **Filtros e Buscas Dinâmicas:** Todo o dashboard reage instantaneamente aos filtros na lateral sem recarregamento.
- **Gráficos Chart.js:** Mapeamento visual das origens e desempenho das campanhas.
- **Exportação de CSV (LGPD):** É possível exportar para excel/csv todos os resultados aplicando seus devidos filtros de forma segura (sem exportação de credenciais).
- **Follow-ups:** Métricas calculam em tempo real os contatos que precisam de acompanhamento.
- **Modal:** Visão de detalhes robustos sobre cada lead clicado na tabela.

*(Os antigos arquivos Next.js/React ainda podem estar presentes caso você deseje retornar para essa stack no futuro)*
