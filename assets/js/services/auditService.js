import { fetchTable } from "./supabaseService.js";

export function listAuditLogs(filters = {}) {
  return fetchTable("audit_logs", { orderBy: "created_at", ascending: false, filters });
}
