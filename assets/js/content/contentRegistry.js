export const CONTENT_TYPES = [
  "hero_news",
  "actions",
  "media_items",
  "testimonials",
  "team_members",
  "faq_items",
  "transparency_metrics",
  "site_settings"
];

export const contentRegistry = {
  hero_news: {
    label: "Hero",
    table: "hero_news",
    icon: "panel-top",
    cloudinaryTarget: "hero",
    supportsImage: true,
    supportsPublished: true,
    supportsSortOrder: true,
    supportsFeatured: true,
    supportsDelete: true,
    titleField: "title",
    descriptionField: "subtitle",
    fields: [
      { name: "category", label: "Categoria", type: "text" },
      { name: "title", label: "Titulo", type: "text", required: true },
      { name: "subtitle", label: "Subtitulo", type: "textarea" },
      { name: "cta_label", label: "CTA label", type: "text" },
      { name: "cta_url", label: "CTA URL", type: "url" },
      { name: "image_alt", label: "Texto alternativo", type: "text" }
    ]
  },
  actions: {
    label: "Acoes",
    table: "actions",
    icon: "calendar-check",
    cloudinaryTarget: "actions",
    supportsImage: true,
    supportsPublished: true,
    supportsSortOrder: true,
    supportsFeatured: false,
    supportsDelete: true,
    titleField: "title",
    descriptionField: "summary",
    fields: [
      { name: "title", label: "Titulo", type: "text", required: true },
      { name: "summary", label: "Resumo", type: "textarea" },
      { name: "action_date", label: "Data", type: "date" },
      { name: "location", label: "Local", type: "text" },
      { name: "action_status", label: "Status da acao", type: "text" },
      { name: "cta_label", label: "CTA label", type: "text" },
      { name: "cta_url", label: "CTA URL", type: "url" },
      { name: "image_alt", label: "Texto alternativo", type: "text" }
    ]
  },
  media_items: {
    label: "Midia",
    table: "media_items",
    icon: "image",
    cloudinaryTarget: "media",
    supportsImage: true,
    supportsPublished: true,
    supportsSortOrder: true,
    supportsFeatured: true,
    supportsDelete: true,
    titleField: "title",
    descriptionField: "description",
    fields: [
      { name: "type", label: "Tipo", type: "text" },
      { name: "category", label: "Categoria", type: "text" },
      { name: "title", label: "Titulo", type: "text", required: true },
      { name: "description", label: "Descricao", type: "textarea" },
      { name: "url", label: "URL externa", type: "url" },
      { name: "youtube_id", label: "Youtube ID", type: "text" },
      { name: "duration", label: "Duracao", type: "text" },
      { name: "source", label: "Fonte", type: "text" }
    ]
  },
  testimonials: {
    label: "Depoimentos",
    table: "testimonials",
    icon: "message-square-quote",
    cloudinaryTarget: "testimonials",
    supportsImage: true,
    supportsPublished: true,
    supportsSortOrder: true,
    supportsFeatured: false,
    supportsDelete: true,
    titleField: "author_name",
    descriptionField: "quote",
    fields: [
      { name: "author_name", label: "Autor", type: "text", required: true },
      { name: "author_label", label: "Rotulo do autor", type: "text" },
      { name: "quote", label: "Depoimento", type: "textarea", required: true },
      { name: "image_alt", label: "Texto alternativo", type: "text" }
    ]
  },
  team_members: {
    label: "Equipe",
    table: "team_members",
    icon: "users",
    cloudinaryTarget: "team",
    supportsImage: true,
    supportsPublished: true,
    supportsSortOrder: true,
    supportsFeatured: false,
    supportsDelete: true,
    titleField: "name",
    descriptionField: "role",
    fields: [
      { name: "name", label: "Nome", type: "text", required: true },
      { name: "role", label: "Papel", type: "text" },
      { name: "member_type", label: "Tipo", type: "text" },
      { name: "description", label: "Bio", type: "textarea" },
      { name: "image_alt", label: "Texto alternativo", type: "text" }
    ]
  },
  faq_items: {
    label: "FAQ",
    table: "faq_items",
    icon: "circle-help",
    supportsImage: false,
    supportsPublished: true,
    supportsSortOrder: true,
    supportsFeatured: false,
    supportsDelete: true,
    titleField: "question",
    descriptionField: "answer",
    fields: [
      { name: "question", label: "Pergunta", type: "text", required: true },
      { name: "answer", label: "Resposta", type: "textarea", required: true },
      { name: "category", label: "Categoria", type: "text" }
    ]
  },
  transparency_metrics: {
    label: "Metricas",
    table: "transparency_metrics",
    icon: "chart-no-axes-column",
    supportsImage: false,
    supportsPublished: true,
    supportsSortOrder: true,
    supportsFeatured: false,
    supportsDelete: true,
    titleField: "label",
    descriptionField: "description",
    fields: [
      { name: "key", label: "Chave", type: "text" },
      { name: "label", label: "Label", type: "text", required: true },
      { name: "value", label: "Valor", type: "number", required: true },
      { name: "mode", label: "Modo", type: "text" },
      { name: "description", label: "Descricao", type: "textarea" }
    ]
  },
  site_settings: {
    label: "Configuracoes",
    table: "site_settings",
    icon: "settings",
    supportsImage: false,
    supportsPublished: false,
    supportsSortOrder: false,
    supportsFeatured: false,
    supportsDelete: true,
    titleField: "key",
    descriptionField: "description",
    fields: [
      { name: "key", label: "Chave", type: "text", required: true },
      { name: "value_json", label: "JSON", type: "json", required: true },
      { name: "description", label: "Descricao", type: "textarea" }
    ]
  }
};

export function getContentConfig(type) {
  return contentRegistry[type] || contentRegistry.hero_news;
}
