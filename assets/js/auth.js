import {
  getCurrentAdminProfile,
  getSession as getSupabaseSession,
  requireActiveAdminProfile,
  signIn,
  signOut
} from "./services/authService.js";
import { clearRoleCache } from "./security.js";
import { showToast } from "./toast.js";

export async function getSession() {
  return getSupabaseSession();
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.replace("./login.html");
    return null;
  }

  try {
    await requireActiveAdminProfile();
  } catch (error) {
    console.error("[Supabase Auth] admin profile", error);
    clearRoleCache();
    sessionStorage.setItem("flamedula_login_error", error.message || "Acesso administrativo nao autorizado.");
    await signOut();
    window.location.replace("./login.html");
    return null;
  }

  return session;
}

export async function handleLogout() {
  const { error } = await signOut();
  clearRoleCache();
  if (error) {
    console.error("[Supabase Auth] signOut", error);
  }
  window.location.replace("./login.html");
}

function setLoginError(message = "") {
  const errorBox = document.getElementById("loginError");
  if (!errorBox) return;
  errorBox.textContent = message;
  errorBox.classList.toggle("show", Boolean(message));
}

function getFriendlyAuthError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (message.includes("invalid login credentials")) {
    return "Email ou senha invalidos.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirme o email do usuario antes de entrar.";
  }
  return error?.message || "Nao foi possivel entrar agora. Verifique os dados e tente novamente.";
}

async function redirectIfActiveSession() {
  const existingSession = await getSession();
  if (!existingSession) return;

  const adminProfile = await getCurrentAdminProfile();
  if (adminProfile.profile) {
    window.location.replace("./index.html");
    return;
  }

  await signOut();
  setLoginError(adminProfile.message || "Acesso administrativo nao autorizado.");
}

async function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const queuedError = sessionStorage.getItem("flamedula_login_error");
  if (queuedError) {
    sessionStorage.removeItem("flamedula_login_error");
    setLoginError(queuedError);
  }

  await redirectIfActiveSession();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginError("");

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    const { error } = await signIn(email, password);
    if (error) {
      console.error("[Supabase Auth] signInWithPassword", error);
      const friendlyMessage = getFriendlyAuthError(error);
      setLoginError(friendlyMessage);
      showToast(friendlyMessage, "error");
      return;
    }

    const adminProfile = await getCurrentAdminProfile();
    if (!adminProfile.profile) {
      await signOut();
      const message = adminProfile.message || "Acesso administrativo nao autorizado.";
      setLoginError(message);
      showToast(message, "error");
      return;
    }

    showToast("Login realizado com sucesso.");
    window.location.replace("./index.html");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (typeof lucide !== "undefined") lucide.createIcons();
  initLoginForm().catch((error) => {
    console.error("[Supabase Auth] initLoginForm", error);
    setLoginError("Falha ao iniciar o login. Confira a configuracao do Supabase.");
  });
});
