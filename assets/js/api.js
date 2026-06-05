import { supabaseClient } from "./supabaseClient.js";

function isRlsError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("row-level security")
    || message.includes("permission denied")
    || error?.code === "42501"
    || error?.status === 401
    || error?.status === 403;
}

function normalizeError(source, error) {
  if (!error) return null;
  console.error(`[Supabase] ${source}`, error);

  return {
    source,
    raw: error,
    isRls: isRlsError(error),
    message: isRlsError(error)
      ? "Erro de permissão. Verifique as políticas RLS no Supabase."
      : (error.message || "Nao foi possivel carregar os dados do Supabase.")
  };
}

async function fetchTable(tableName) {
  const { data, error } = await supabaseClient
    .from(tableName)
    .select("*")
    .order("created_at", { ascending: false });

  return {
    data: data || [],
    error: normalizeError(tableName, error)
  };
}

export async function getDashboardData() {
  try {
    const [donorResult, patientResult, donationResult] = await Promise.all([
      fetchTable("donor_leads"),
      fetchTable("patients"),
      fetchTable("monetary_donations")
    ]);

    return {
      donorLeads: donorResult.data,
      patients: patientResult.data,
      monetaryDonations: donationResult.data,
      errors: [donorResult.error, patientResult.error, donationResult.error].filter(Boolean)
    };
  } catch (error) {
    console.error("[Supabase] getDashboardData", error);
    return {
      donorLeads: [],
      patients: [],
      monetaryDonations: [],
      errors: [{
        source: "dashboard",
        raw: error,
        isRls: isRlsError(error),
        message: isRlsError(error)
          ? "Erro de permissão. Verifique as políticas RLS no Supabase."
          : "Nao foi possivel carregar os dados do Supabase."
      }]
    };
  }
}
