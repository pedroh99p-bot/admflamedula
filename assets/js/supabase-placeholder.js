export const SUPABASE_PLACEHOLDER = {
  status: "placeholder aguardando integração",
  futureUrl: "Configurar via .env ou configuração segura do deploy",
  futureAnonKey: "Configurar anon key pública via ambiente seguro",
  tables: ["donor_leads", "patients", "monetary_donations"],
  notes: [
    "Substituir mocks por queries reais nas tabelas futuras.",
    "Usar Supabase Auth no lugar do login fixo do MVP.",
    "Nunca expor service_role no frontend."
  ]
};
