import { supabaseClient } from "./supabaseService.js";

export async function signIn(email, password) {
  return supabaseClient.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabaseClient.auth.signOut();
}

export function onAuthStateChange(callback) {
  return supabaseClient.auth.onAuthStateChange(callback);
}

export async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("[Supabase Auth] getSession", error);
    return null;
  }
  return data.session || null;
}

export async function getCurrentAdminProfile() {
  const session = await getSession();
  if (!session?.user?.id) {
    return { profile: null, error: null };
  }

  const { data, error } = await supabaseClient
    .from("admin_profiles")
    .select("*")
    .eq("user_id", session.user.id)
    .eq("active", true)
    .maybeSingle();

  if (error) {
    console.error("[Supabase Auth] admin_profiles", error);
    return {
      profile: null,
      error,
      message: "Nao foi possivel validar o perfil administrativo. Confira a tabela admin_profiles e as politicas RLS."
    };
  }

  return {
    profile: data || null,
    error: null,
    message: data ? "" : "Acesso nao autorizado. O usuario nao possui admin_profile ativo."
  };
}

export async function requireActiveAdminProfile() {
  const result = await getCurrentAdminProfile();
  if (!result.profile) {
    throw new Error(result.message || "Acesso administrativo nao autorizado.");
  }
  return result.profile;
}
