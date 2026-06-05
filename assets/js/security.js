export function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

export function maskEmail(email) {
  if (!email || !email.includes("@")) return "***";
  const [user, domain] = email.split("@");
  return `${user.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone) {
  if (!phone) return "***";
  return String(phone).replace(/(\(\d{2}\)\s9)\d{4}-(\d{2})\d{2}/, "$1****-$2**");
}

export function logAuditEvent(action, details = {}) {
  const audit = JSON.parse(localStorage.getItem("flamedula_mvp_audit") || "[]");
  audit.unshift({
    action,
    details,
    created_at: new Date().toISOString()
  });
  localStorage.setItem("flamedula_mvp_audit", JSON.stringify(audit.slice(0, 50)));
}

export function clearRoleCache() {
  localStorage.removeItem("flamedula_mvp_role");
}

export function getUserRole() {
  return localStorage.getItem("flamedula_mvp_role") || "admin";
}

export function hasPermission() {
  return true;
}
