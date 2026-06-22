import { deleteRecord, fetchOne, fetchTable, updateRecord } from "./supabaseService.js";

const LEGACY_PATIENT_TABLE = "patients";
const PATIENT_CASES_TABLE = "patient_cases";

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

export function listLegacyPatients(filters = {}) {
  return fetchTable(LEGACY_PATIENT_TABLE, { filters });
}

export function updatePatientRecord(id, payload) {
  return updateRecord(LEGACY_PATIENT_TABLE, id, payload, "Nao foi possivel atualizar o paciente.");
}

export function deletePatientRecord(id) {
  return deleteRecord(LEGACY_PATIENT_TABLE, id, "Nao foi possivel excluir o paciente.");
}
