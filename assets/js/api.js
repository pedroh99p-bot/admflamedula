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

export {
  deleteDonorRecord,
  deletePatientRecord,
  getDashboardData,
  updateDonorContactStatus,
  updateDonorRecord,
  updatePatientRecord
};
