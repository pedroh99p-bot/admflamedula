import { supabaseClient } from "./supabaseClient.js";

const READ_RLS_MESSAGE = "Erro de permiss\u00e3o. Verifique as pol\u00edticas RLS no Supabase.";
const MUTATION_RLS_MESSAGE = "Sem permiss\u00e3o para editar/excluir. Verifique as pol\u00edticas RLS no Supabase.";

function isRlsError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("row-level security")
    || message.includes("permission denied")
    || error?.code === "42501"
    || error?.status === 401
    || error?.status === 403;
}

function normalizeReadError(source, error) {
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

function getMutationErrorMessage(error, fallbackMessage) {
  return isRlsError(error)
    ? MUTATION_RLS_MESSAGE
    : (error?.message || fallbackMessage);
}

async function fetchTable(tableName) {
  const { data, error } = await supabaseClient
    .from(tableName)
    .select("*")
    .order("created_at", { ascending: false });

  return {
    data: data || [],
    error: normalizeReadError(tableName, error)
  };
}

async function updateRecord(tableName, id, payload, fallbackMessage) {
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

async function deleteRecord(tableName, id, fallbackMessage) {
  const { error } = await supabaseClient
    .from(tableName)
    .delete()
    .eq("id", id);

  if (error) {
    console.error(`[Supabase] delete ${tableName}`, error);
    throw new Error(getMutationErrorMessage(error, fallbackMessage));
  }
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
          ? READ_RLS_MESSAGE
          : "Nao foi possivel carregar os dados do Supabase."
      }]
    };
  }
}

export async function updateDonorRecord(donorId, payload) {
  return updateRecord(
    "donor_leads",
    donorId,
    payload,
    "Nao foi possivel atualizar o doador."
  );
}

export async function deleteDonorRecord(donorId) {
  return deleteRecord(
    "donor_leads",
    donorId,
    "Nao foi possivel excluir o doador."
  );
}

export async function updatePatientRecord(patientId, payload) {
  return updateRecord(
    "patients",
    patientId,
    payload,
    "Nao foi possivel atualizar o paciente."
  );
}

export async function deletePatientRecord(patientId) {
  return deleteRecord(
    "patients",
    patientId,
    "Nao foi possivel excluir o paciente."
  );
}

export async function updateDonorContactStatus(donor, completed) {
  const payload = {
    contato_whatsapp_realizado: completed
  };

  if (completed && Object.prototype.hasOwnProperty.call(donor || {}, "ultima_notificacao_em")) {
    payload.ultima_notificacao_em = new Date().toISOString();
  }

  if (completed && Object.prototype.hasOwnProperty.call(donor || {}, "total_notificacoes")) {
    payload.total_notificacoes = Number(donor.total_notificacoes || 0) + 1;
  }

  let result = await supabaseClient
    .from("donor_leads")
    .update(payload)
    .eq("id", donor.id)
    .select()
    .single();

  if (result.error && String(result.error.message || "").toLowerCase().includes("column")) {
    result = await supabaseClient
      .from("donor_leads")
      .update({ contato_whatsapp_realizado: completed })
      .eq("id", donor.id)
      .select()
      .single();
  }

  if (result.error) {
    console.error("[Supabase] update donor_leads contato_whatsapp_realizado", result.error);
    throw new Error(getMutationErrorMessage(result.error, "Nao foi possivel atualizar o contato do doador."));
  }

  return result.data;
}
