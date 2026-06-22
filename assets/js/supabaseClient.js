const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = window.FLAMEDULA_CONFIG || {};

function createUnavailableClient(message) {
  const error = new Error(message);
  const response = { data: null, error };

  function queryBuilder() {
    const query = {
      select: () => query,
      order: () => query,
      eq: () => query,
      insert: () => query,
      update: () => query,
      delete: () => query,
      single: async () => response,
      maybeSingle: async () => response,
      then: (resolve) => Promise.resolve(response).then(resolve)
    };
    return query;
  }

  return {
    __unavailable: true,
    __message: message,
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => response,
      signOut: async () => ({ error: null })
    },
    from: () => queryBuilder()
  };
}

let client;

if (!window.supabase) {
  client = createUnavailableClient("Supabase JS nao foi carregado antes do client.");
} else if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  client = createUnavailableClient("Configuracao do Supabase ausente. Defina SUPABASE_URL e SUPABASE_PUBLISHABLE_KEY em window.FLAMEDULA_CONFIG.");
} else {
  client = window.__flamedulaSupabase
    || window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
}

export const supabaseClient = client;
window.__flamedulaSupabase = supabaseClient;
