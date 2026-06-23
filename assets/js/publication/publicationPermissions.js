import { supabaseClient } from "../services/supabaseService.js";

let cachedCmsRole = null;
let cacheTimestamp = 0;
const CACHE_TTL = 30000; // 30 segundos de cache para permissões

export async function checkCmsAccess() {
  const now = Date.now();
  if (cachedCmsRole !== null && now - cacheTimestamp < CACHE_TTL) {
    return cachedCmsRole;
  }

  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session?.user) {
      cachedCmsRole = { active: false, role: "viewer" };
      cacheTimestamp = now;
      return cachedCmsRole;
    }

    const { data, error } = await supabaseClient
      .from("admin_app_access")
      .select("active, access_role")
      .eq("user_id", session.user.id)
      .eq("app_code", "cms")
      .maybeSingle();

    if (error || !data) {
      cachedCmsRole = { active: false, role: "viewer" };
    } else {
      cachedCmsRole = {
        active: Boolean(data.active),
        role: data.access_role || "viewer" // 'owner', 'editor', 'viewer'
      };
    }
  } catch (err) {
    console.error("[checkCmsAccess] Falha ao verificar acesso", err);
    cachedCmsRole = { active: false, role: "viewer" };
  }

  cacheTimestamp = now;
  return cachedCmsRole;
}

export function clearCmsAccessCache() {
  cachedCmsRole = null;
  cacheTimestamp = 0;
}
