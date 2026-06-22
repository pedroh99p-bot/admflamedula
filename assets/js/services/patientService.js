import { deleteRecord, fetchOne, fetchTable, updateRecord } from "./supabaseService.js";

const PATIENT_CASES_TABLE = "patient_cases";

function normalizePatientCase(row) {
  if (!row) return row;
  return {
    ...row,
    nome_paciente: row.patient_identifier || row.requester_name || "Caso sinalizado",
    telefone_responsavel: row.requester_phone,
    diagnostico: row.campaign_context,
    tipo_necessidade: row.need_type,
    urgencia: row.urgency_level,
    necessita_medula: ["medula", "campanha_cadastro_medula"].includes(row.need_type),
    autorizacao_divulgacao: row.consent_authorized,
    mensagem_publica: row.campaign_context,
    observacoes: row.private_notes
  };
}

export function listPatientCases(filters = {}) {
  return fetchTable(PATIENT_CASES_TABLE, { filters });
}

export function getPatientCase(id) {
  return fetchOne(PATIENT_CASES_TABLE, id);
}

export function updatePatientStatus(id, status) {
  return updateRecord(PATIENT_CASES_TABLE, id, { status }, "Nao foi possivel atualizar o status do caso.");
}

export function updatePatientNotes(id, private_notes) {
  return updateRecord(PATIENT_CASES_TABLE, id, { private_notes }, "Nao foi possivel atualizar as notas do caso.");
}

export function updatePatientRecord(id, payload) {
  return updateRecord(PATIENT_CASES_TABLE, id, payload, "Nao foi possivel atualizar o caso.")
    .then(normalizePatientCase);
}

export function deletePatientRecord(id) {
  return deleteRecord(PATIENT_CASES_TABLE, id, "Nao foi possivel excluir o caso.");
}
