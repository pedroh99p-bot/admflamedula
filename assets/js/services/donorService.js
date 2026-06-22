import { deleteRecord, fetchOne, fetchTable, getMutationErrorMessage, supabaseClient, updateRecord } from "./supabaseService.js";

const DONOR_TABLE = "donor_leads";

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
  return updateRecord(DONOR_TABLE, id, payload, "Nao foi possivel atualizar o doador.");
}

export function deleteDonorRecord(id) {
  return deleteRecord(DONOR_TABLE, id, "Nao foi possivel excluir o doador.");
}

export function exportDonors(filters = {}) {
  return listDonors(filters);
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
    .from(DONOR_TABLE)
    .update(payload)
    .eq("id", donor.id)
    .select()
    .single();

  if (result.error && String(result.error.message || "").toLowerCase().includes("column")) {
    result = await supabaseClient
      .from(DONOR_TABLE)
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
