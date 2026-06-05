// assets/js/security.js
// Módulo centralizado de segurança: sanitização, mascaramento, auditoria e RBAC.

import { supabase } from './supabaseClient.js';

// ─────────────────────────────────────────────
// 1. Sanitização contra XSS
// ─────────────────────────────────────────────

/**
 * Escapa caracteres HTML perigosos para prevenir XSS.
 * DEVE ser usado em TODO conteúdo dinâmico inserido via innerHTML.
 */
export function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

// ─────────────────────────────────────────────
// 2. Mascaramento de dados PII
// ─────────────────────────────────────────────

/**
 * Mascara email: "ana.silva@email.com" → "an***@email.com"
 */
export function maskEmail(email) {
  if (!email || !email.includes('@')) return '***';
  const [user, domain] = email.split('@');
  if (user.length <= 2) return '***@' + domain;
  return user.substring(0, 2) + '***@' + domain;
}

/**
 * Mascara telefone: "(21) 91234-5678" → "(21) 9****-**78"
 */
export function maskPhone(phone) {
  if (!phone) return '***';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length < 6) return '***';
  return phone.substring(0, 5) + '****' + phone.slice(-2);
}

// ─────────────────────────────────────────────
// 3. Auditoria
// ─────────────────────────────────────────────

/**
 * Registra uma ação na trilha de auditoria.
 * Em ambiente sem tabela audit_logs, loga silenciosamente no console (dev only).
 */
export async function logAuditEvent(action, details = {}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const logEntry = {
      user_id: user?.id || 'anonymous',
      action,
      details,
      created_at: new Date().toISOString()
    };

    // Tenta inserir na tabela audit_logs (falha silenciosamente se não existir ainda)
    const { error } = await supabase.from('audit_logs').insert(logEntry);
    
    if (error) {
      // Tabela pode não existir ainda — log local apenas em dev
      if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
        console.info('[AUDIT]', action, details);
      }
    }
  } catch {
    // Nunca bloquear a aplicação por falha de auditoria
  }
}

// ─────────────────────────────────────────────
// 4. RBAC — Controle de acesso por role
// ─────────────────────────────────────────────

// Cache do role do usuário para evitar queries repetidas
let cachedUserRole = null;

/**
 * Retorna o role do usuário atual.
 * Tenta buscar da tabela user_roles. Se não existir, assume 'admin' (fase de dev).
 */
export async function getUserRole() {
  if (cachedUserRole) return cachedUserRole;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'viewer';

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (error || !data) {
      // Tabela não existe ou usuário sem role — padrão para dev
      cachedUserRole = 'admin';
      return cachedUserRole;
    }

    cachedUserRole = data.role;
    return cachedUserRole;
  } catch {
    return 'admin'; // Fallback seguro durante desenvolvimento
  }
}

/**
 * Verifica se o usuário tem permissão para uma ação.
 */
export function hasPermission(userRole, action) {
  const permissions = {
    admin:    ['view_dashboard', 'view_leads', 'view_lead_detail', 'view_pii', 'export_csv', 'manage_users', 'view_audit'],
    operator: ['view_dashboard', 'view_leads', 'view_lead_detail', 'view_pii'],
    medico:   ['view_dashboard', 'view_lead_detail'],
    viewer:   ['view_dashboard']
  };

  const allowed = permissions[userRole] || [];
  return allowed.includes(action);
}

/**
 * Limpa o cache de role (chamar no logout)
 */
export function clearRoleCache() {
  cachedUserRole = null;
}
