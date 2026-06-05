import { MOCK_DONOR_LEADS, MOCK_PATIENTS, MOCK_MONETARY_DONATIONS } from "./mock-data.js";

export async function getDonorLeads() {
  return [...MOCK_DONOR_LEADS];
}

export async function getPatients() {
  return [...MOCK_PATIENTS];
}

export async function getMonetaryDonations() {
  return [...MOCK_MONETARY_DONATIONS];
}

export async function getDashboardData() {
  return {
    donorLeads: await getDonorLeads(),
    patients: await getPatients(),
    monetaryDonations: await getMonetaryDonations()
  };
}

// Futuro Supabase:
// substituir estes retornos mockados por queries nas tabelas
// donor_leads, patients e monetary_donations, mantendo seleção explícita de campos.
