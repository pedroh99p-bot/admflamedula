import { listDonors } from "./donorService.js";
import { listLegacyPatients } from "./patientService.js";
import { listLegacyMonetaryDonations } from "./supportService.js";
import { fetchTable } from "./supabaseService.js";

export async function getDashboardData() {
  try {
    const [donorResult, patientResult, donationResult] = await Promise.all([
      listDonors(),
      listLegacyPatients(),
      listLegacyMonetaryDonations()
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
        isRls: false,
        message: "Nao foi possivel carregar os dados do Supabase."
      }]
    };
  }
}

export function getDashboardMetrics() {
  return fetchTable("v_dashboard_metrics", { orderBy: null });
}

export function getRegionSummary() {
  return fetchTable("v_donor_region_summary", { orderBy: "total_pessoas" });
}

export function getActiveContentSummary() {
  return fetchTable("v_content_status", { orderBy: null });
}
