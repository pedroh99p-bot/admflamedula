// assets/js/utils.js

import { escapeHtml, maskEmail, maskPhone } from './security.js';

export function formatDate(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR');
}

export function formatDateTime(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export function getLeadTypeLabel(type) {
  const types = {
    "ja_sou_doador": "Já sou doador",
    "nao_sou_doador_ainda": "Não sou doador ainda",
    "quero_ajudar_divulgar": "Quero ajudar/divulgar",
    "instituicao_ou_parceiro": "Instituição ou parceiro"
  };
  return types[type] || escapeHtml(type) || '-';
}

export function formatLeadType(type) {
  return getLeadTypeLabel(type);
}

export function getStatusLabel(status) {
  const statuses = {
    "novo": "Novo",
    "boas_vindas_enviada": "Boas-vindas enviada",
    "em_educacao": "Em educação",
    "interessado": "Interessado",
    "orientado": "Orientado",
    "cadastrado_no_redome": "Cadastrado no REDOME",
    "quer_ajudar": "Quer ajudar",
    "sem_resposta": "Sem resposta",
    "descadastrado": "Descadastrado",
    "invalido": "Inválido"
  };
  return statuses[status] || escapeHtml(status) || '-';
}

export function formatJourneyStatus(status) {
  return getStatusLabel(status);
}

export function getStatusClass(status) {
  const mapping = {
    "novo": "badge-blue",
    "boas_vindas_enviada": "badge-gray",
    "em_educacao": "badge-yellow",
    "interessado": "badge-blue",
    "orientado": "badge-green",
    "cadastrado_no_redome": "badge-green-outline",
    "quer_ajudar": "badge-blue",
    "sem_resposta": "badge-red",
    "descadastrado": "badge-red",
    "invalido": "badge-gray"
  };
  return mapping[status] || "badge-gray";
}

export function getLeadTypeClass(type) {
  const mapping = {
    "ja_sou_doador": "text-green",
    "nao_sou_doador_ainda": "text-orange",
    "quero_ajudar_divulgar": "text-blue",
    "instituicao_ou_parceiro": "text-purple"
  };
  return mapping[type] || "";
}

export function isLeadNeedsFollowUp(lead) {
  const followUpStatuses = ["novo", "boas_vindas_enviada", "em_educacao", "interessado"];
  if (!followUpStatuses.includes(lead.status_jornada)) return false;
  
  const updatedDate = new Date(lead.updated_at);
  const now = new Date();
  const diffTime = Math.abs(now - updatedDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 3;
}

/**
 * Converte dados de leads para CSV.
 * Dados PII são MASCARADOS por padrão para proteger privacidade.
 * @param {Array} data - Array de leads
 * @param {boolean} unmask - Se true, exporta dados sem máscara (apenas admin)
 */
export function convertToCSV(data, unmask = false) {
  if (!data || !data.length) return "";
  
  const headers = ["Nome", "Email", "WhatsApp", "Cidade", "Estado", "Tipo de cadastro", "Status", "Origem", "Campanha", "Opt-in WhatsApp", "Data de cadastro"];
  
  const rows = data.map(lead => [
    lead.nome,
    unmask ? lead.email : maskEmail(lead.email),
    unmask ? lead.whatsapp : maskPhone(lead.whatsapp),
    lead.cidade,
    lead.estado,
    getLeadTypeLabel(lead.tipo_cadastro),
    getStatusLabel(lead.status_jornada),
    lead.origem || "",
    lead.utm_campaign || "",
    lead.whatsapp_optin ? "Sim" : "Não",
    formatDateTime(lead.created_at)
    // observacoes NUNCA é incluído no export
  ]);
  
  const csvContent = [
    headers.join(","),
    ...rows.map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(","))
  ].join("\n");
  
  return csvContent;
}

export function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Limpar o object URL para liberar memória
  URL.revokeObjectURL(url);
}

export function groupBy(array, key) {
  return array.reduce((result, currentValue) => {
    (result[currentValue[key]] = result[currentValue[key]] || []).push(currentValue);
    return result;
  }, {});
}

export function countBy(array, key) {
  return array.reduce((result, currentValue) => {
    const val = currentValue[key];
    result[val] = (result[val] || 0) + 1;
    return result;
  }, {});
}

export function percentage(value, total) {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

// Re-export security functions for convenience
export { escapeHtml, maskEmail, maskPhone } from './security.js';
