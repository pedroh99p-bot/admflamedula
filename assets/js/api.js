import {
  deleteDonorRecord,
  updateDonorContactStatus,
  updateDonorRecord
} from "./services/donorService.js";
import { getDashboardData } from "./services/dashboardService.js";
import {
  deletePatientRecord,
  updatePatientRecord
} from "./services/patientService.js";
import {
  listSupportLeads,
  updateSupportLead,
  listDonationIntents,
  updateDonationIntentStatus
} from "./services/supportService.js";
import { listAuditLogs } from "./services/auditService.js";

export {
  deleteDonorRecord,
  deletePatientRecord,
  getDashboardData,
  updateDonorContactStatus,
  updateDonorRecord,
  updatePatientRecord,
  listSupportLeads,
  updateSupportLead,
  listDonationIntents,
  updateDonationIntentStatus,
  listAuditLogs
};
