// assets/js/auth.js
import { supabase } from './supabaseClient.js';
import { showToast } from './toast.js';
import { logAuditEvent, clearRoleCache } from './security.js';

// ─────────────────────────────────────────────
// Rate Limiting contra brute force
// ─────────────────────────────────────────────
let loginAttempts = 0;
let lockoutUntil = null;
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 5 * 60 * 1000; // 5 minutos de bloqueio

/**
 * Função para proteger páginas. 
 * Se não houver usuário logado, redireciona para o login.html.
 */
export async function requireAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    // Não tem sessão ativa, redireciona
    window.location.replace('./login.html');
    return null;
  }
  
  return session.user;
}

/**
 * Lida com o Login via email e senha.
 * Inclui rate limiting e registro de auditoria.
 */
export async function handleLogin(email, password) {
  // 1. Verificar lockout
  if (lockoutUntil && Date.now() < lockoutUntil) {
    const remainingSec = Math.ceil((lockoutUntil - Date.now()) / 1000);
    showToast(`Muitas tentativas. Aguarde ${remainingSec} segundos.`, 'error');
    throw new Error('Rate limited');
  }

  // 2. Tentar login
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email,
    password: password,
  });

  if (error) {
    loginAttempts++;

    // 3. Aplicar lockout se excedeu tentativas
    if (loginAttempts >= MAX_ATTEMPTS) {
      lockoutUntil = Date.now() + LOCKOUT_MS;
      loginAttempts = 0;
      showToast(`Conta temporariamente bloqueada. Tente novamente em 5 minutos.`, 'error');
    } else {
      // Mensagem genérica — não revelar se é email ou senha incorreta
      showToast(`Credenciais inválidas. Tentativa ${loginAttempts}/${MAX_ATTEMPTS}.`, 'error');
    }

    // NÃO logar error.message — pode vazar info do servidor
    throw error;
  }
  
  // 4. Login bem-sucedido
  loginAttempts = 0;
  lockoutUntil = null;

  // 5. Registrar auditoria (falha silenciosamente se tabela não existir)
  await logAuditEvent('LOGIN_SUCCESS', { email_masked: email.substring(0, 2) + '***' });

  // 6. Redirecionar
  window.location.replace('./index.html');
}

/**
 * Desloga o usuário da plataforma
 */
export async function handleLogout() {
  await logAuditEvent('LOGOUT', {});
  clearRoleCache();
  await supabase.auth.signOut();
  window.location.replace('./login.html');
}

/**
 * Escuta mudanças de estado (ex: token expirou)
 */
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' && window.location.pathname.includes('index.html')) {
    clearRoleCache();
    window.location.replace('./login.html');
  }
});
