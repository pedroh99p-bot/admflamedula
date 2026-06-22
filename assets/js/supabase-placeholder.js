export const SUPABASE_PLACEHOLDER = {
  status: "placeholder aguardando integracao",
  futureUrl: "SUPABASE_URL no arquivo .env ou em configuracao segura do deploy",
  futurePublishableKey: "SUPABASE_PUBLISHABLE_KEY no arquivo de configuracao publica do deploy",
  tables: ["donor_leads", "patient_cases", "donation_intents", "media_assets"],
  notes: [
    "Queries reais usam RLS e Supabase Auth.",
    "Cloudinary usa assinatura via Edge Function.",
    "Nunca expor service_role no frontend."
  ]
};
