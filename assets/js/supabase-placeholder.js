export const SUPABASE_PLACEHOLDER = {
  status: "placeholder aguardando integracao",
  futureUrl: "SUPABASE_URL no arquivo .env ou em configuracao segura do deploy",
  futureAnonKey: "SUPABASE_ANON_KEY no arquivo .env ou em configuracao segura do deploy",
  tables: ["donor_leads", "patients", "monetary_donations"],
  notes: [
    "Substituir mocks por queries reais nas tabelas futuras.",
    "Usar Supabase Auth no lugar do login fixo do MVP.",
    "Nunca expor service_role no frontend."
  ]
};
