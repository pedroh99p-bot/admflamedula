import { fetchOne, fetchTable, updateRecord } from "./supabaseService.js";

export function listSupportLeads(filters = {}) {
  return fetchTable("support_leads", { filters });
}

export function listDonationIntents(filters = {}) {
  return fetchTable("donation_intents", { filters });
}

export function getDonationIntent(id) {
  return fetchOne("donation_intents", id);
}

export function updateDonationIntentStatus(id, status) {
  return updateRecord("donation_intents", id, { status }, "Nao foi possivel atualizar a intencao de doacao.");
}

export function updateSupportLead(id, payload) {
  return updateRecord("support_leads", id, payload, "Nao foi possivel atualizar o contato de apoio.");
}
