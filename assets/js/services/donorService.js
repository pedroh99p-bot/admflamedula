import { deleteRecord, fetchOne, fetchTable, getMutationErrorMessage, supabaseClient, updateRecord } from "./supabaseService.js";

const DONOR_TABLE = "donor_leads";

export function formatBloodDonorStatus(value) {
  if (!value) return "Não informado";
  const val = String(value).toLowerCase().trim();
  if (["ja_doador", "doador_recorrente", "sim", "true"].includes(val)) return "Sim";
  if (["nao", "false", "nao_doador", "quero_comecar", "interessado"].includes(val)) return "Não";
  return "Não informado";
}

export function formatRedomeStatus(value) {
  if (!value) return "Não informado";
  const val = String(value).toLowerCase().trim();
  if (["cadastrado", "sim", "true"].includes(val)) return "Sim";
  if (["nao_cadastrado", "nao", "false"].includes(val)) return "Não";
  return "Não informado";
}

export function formatMarrowInterest(value) {
  if (!value) return "Não informado";
  const val = String(value).toLowerCase().trim();
  if (["sim", "interessado", "true"].includes(val)) return "Sim";
  if (["nao", "false"].includes(val)) return "Não";
  if (val === "quero_saber") return "Quero saber mais";
  return "Não informado";
}

function normalizeDonor(row) {
  if (!row) return row;
  const bloodStatus = row.blood_donor_status || "";
  const marrowInterest = row.medula_interest || "";
  return {
    ...row,
    blood_donor_status_raw: row.blood_donor_status,
    redome_status_raw: row.redome_status,
    medula_interest_raw: row.medula_interest,
    ja_doador_sangue: ["ja_doador", "doador_recorrente", "sim"].includes(bloodStatus),
    quer_doar_sangue: ["quero_comecar", "interessado", "sim"].includes(bloodStatus),
    quer_doar_medula: ["sim", "interessado", "quero_saber"].includes(marrowInterest),
    consentimento_contato: row.consent_lgpd,
    contato_whatsapp_realizado: Boolean(row.contacted_at),
    canal_preferido: row.contact_preference,
    observacoes: row.internal_notes
  };
}

export function listDonors(filters = {}) {
  return fetchTable(DONOR_TABLE, { filters });
}

export function getDonor(id) {
  return fetchOne(DONOR_TABLE, id);
}

export function updateDonorStatus(id, status) {
  return updateRecord(DONOR_TABLE, id, { status }, "Nao foi possivel atualizar o status do doador.");
}

export function updateDonorNotes(id, internal_notes) {
  return updateRecord(DONOR_TABLE, id, { internal_notes }, "Nao foi possivel atualizar as notas do doador.");
}

export function updateDonorRecord(id, payload) {
  return updateRecord(DONOR_TABLE, id, payload, "Nao foi possivel atualizar o doador.")
    .then(normalizeDonor);
}

export function deleteDonorRecord(id) {
  return deleteRecord(DONOR_TABLE, id, "Nao foi possivel excluir o doador.");
}

export function exportDonors(filters = {}) {
  return listDonors(filters);
}

export async function updateDonorContactStatus(donor, completed) {
  const result = await supabaseClient
    .from(DONOR_TABLE)
    .update({ contacted_at: completed ? new Date().toISOString() : null })
    .eq("id", donor.id)
    .select()
    .single();

  if (result.error) {
    console.error("[Supabase] update donor_leads contato_whatsapp_realizado", result.error);
    throw new Error(getMutationErrorMessage(result.error, "Nao foi possivel atualizar o contato do doador."));
  }

  return normalizeDonor(result.data);
}
