import { supabaseClient } from "./supabaseClient.js";
import { clearRoleCache } from "./security.js";
import { showToast } from "./toast.js";

export async function getSession() {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    console.error("[Supabase Auth] getSession", error);
    return null;
  }
  return data.session || null;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    window.location.replace("./login.html");
    return null;
  }
  return session;
}

export async function handleLogout() {
  const { error } = await supabaseClient.auth.signOut();
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
  return "Nao foi possivel entrar agora. Verifique os dados e tente novamente.";
}

async function initLoginForm() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  const existingSession = await getSession();
  if (existingSession) {
    window.location.replace("./index.html");
    return;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setLoginError("");

    const email = document.getElementById("loginEmail")?.value.trim();
    const password = document.getElementById("loginPassword")?.value;

    const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("[Supabase Auth] signInWithPassword", error);
      const friendlyMessage = getFriendlyAuthError(error);
      setLoginError(friendlyMessage);
      showToast(friendlyMessage, "error");
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
