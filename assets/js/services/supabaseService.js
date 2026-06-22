import { supabaseClient } from "../supabaseClient.js";

export const READ_RLS_MESSAGE = "Erro de permissao. Verifique as politicas RLS no Supabase.";
export const MUTATION_RLS_MESSAGE = "Sem permissao para editar/excluir. Verifique as politicas RLS no Supabase.";

export function isRlsError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("row-level security")
    || message.includes("permission denied")
    || error?.code === "42501"
    || error?.status === 401
    || error?.status === 403;
}

export function normalizeReadError(source, error) {
  if (!error) return null;
  console.error(`[Supabase] ${source}`, error);
  return {
    source,
    raw: error,
    isRls: isRlsError(error),
    message: isRlsError(error)
      ? READ_RLS_MESSAGE
      : (error.message || "Nao foi possivel carregar os dados do Supabase.")
  };
}

export function getMutationErrorMessage(error, fallbackMessage) {
  return isRlsError(error)
    ? MUTATION_RLS_MESSAGE
    : (error?.message || fallbackMessage);
}

export async function fetchTable(tableName, { orderBy = "created_at", ascending = false, filters = {} } = {}) {
  let query = supabaseClient.from(tableName).select("*");

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query = query.eq(key, value);
    }
  });

  if (orderBy) {
    query = query.order(orderBy, { ascending });
  }

  const { data, error } = await query;
  return {
    data: data || [],
    error: normalizeReadError(tableName, error)
  };
}

export async function fetchOne(tableName, id) {
  const { data, error } = await supabaseClient
    .from(tableName)
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw new Error(getMutationErrorMessage(error, `Nao foi possivel carregar ${tableName}.`));
  }

  return data;
}

export async function updateRecord(tableName, id, payload, fallbackMessage) {
  const { data, error } = await supabaseClient
    .from(tableName)
    .update(payload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    console.error(`[Supabase] update ${tableName}`, error);
    throw new Error(getMutationErrorMessage(error, fallbackMessage));
  }

  return data;
}

export async function deleteRecord(tableName, id, fallbackMessage) {
  const { error } = await supabaseClient
    .from(tableName)
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`[Supabase] delete ${tableName}`, error);
    throw new Error(getMutationErrorMessage(error, fallbackMessage));
  }
}

export async function insertRecord(tableName, payload, fallbackMessage) {
  const { data, error } = await supabaseClient
    .from(tableName)
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error(`[Supabase] insert ${tableName}`, error);
    throw new Error(getMutationErrorMessage(error, fallbackMessage));
  }

  return data;
}

export { supabaseClient };
