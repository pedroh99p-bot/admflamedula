const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.FLAMEDULA_CONFIG || {};

if (!window.supabase) {
  throw new Error("Supabase JS nao foi carregado antes do client.");
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("Configuracao do Supabase ausente em window.FLAMEDULA_CONFIG.");
}

export const supabaseClient = window.__flamedulaSupabase
  || window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

window.__flamedulaSupabase = supabaseClient;
