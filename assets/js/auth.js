import { showToast } from "./toast.js";
import { clearRoleCache, logAuditEvent } from "./security.js";

const SESSION_KEY = "flamedula_mvp_session";
const LOGIN_USER = "flamedula10";
const LOGIN_PASSWORD = "12345";

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

export function requireAuth() {
  const session = getSession();
  if (!session?.authenticated) {
    window.location.replace("./login.html");
    return null;
  }
  return session;
}

export function handleLogout() {
  logAuditEvent("LOGOUT", { source: "mvp" });
  clearRoleCache();
  localStorage.removeItem(SESSION_KEY);
  window.location.replace("./login.html");
}

function setLoginError(message) {
  const errorBox = document.getElementById("loginError");
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.classList.toggle("show", Boolean(message));
}

function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  if (getSession()?.authenticated) {
    window.location.replace("./index.html");
    return;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const login = document.getElementById("loginUser")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    // Login fixo apenas para demonstração MVP. Substituir por Supabase Auth em produção.
    if (login === LOGIN_USER && password === LOGIN_PASSWORD) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        authenticated: true,
        login,
        name: "Equipe Flamedula",
        role: "admin",
        created_at: new Date().toISOString()
      }));
      localStorage.setItem("flamedula_mvp_role", "admin");
      logAuditEvent("LOGIN_SUCCESS", { source: "fixed_mvp_login" });
      showToast("Login realizado com sucesso.");
      window.location.replace("./index.html");
      return;
    }

    setLoginError("Login ou senha incorretos. Confira as credenciais do protótipo.");
    showToast("Credenciais inválidas.", "error");
    logAuditEvent("LOGIN_FAILED", { source: "fixed_mvp_login" });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof lucide !== "undefined") lucide.createIcons();
  initLoginForm();
});
