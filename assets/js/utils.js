export function formatDate(isoString) {
  if (!isoString) return "-";
  return new Intl.DateTimeFormat("pt-BR").format(new Date(isoString));
}

export function formatDateTime(isoString) {
  if (!isoString) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(isoString));
}

export function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value || 0);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("pt-BR").format(value || 0);
}

export function yesNo(value) {
  return value ? "Sim" : "Não";
}

export function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function includesQuery(record, fields, query) {
  const normalizedQuery = normalizeText(query).trim();
  if (!normalizedQuery) return true;

  return fields.some((field) => normalizeText(record[field]).includes(normalizedQuery));
}

export function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] ?? "Não informado";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

export function sumBy(items, key) {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

export function uniqueSorted(items, key) {
  return [...new Set(items.map((item) => item[key]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b)));
}

export function sortEntriesByValue(counts, limit = 10) {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function groupByDate(items, dateKey, valueKey = null) {
  const grouped = {};
  items.forEach((item) => {
    const date = item[dateKey]?.slice(0, 10);
    if (!date) return;
    grouped[date] = (grouped[date] || 0) + (valueKey ? Number(item[valueKey] || 0) : 1);
  });

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
}

export function isWithinDays(isoString, days) {
  if (!days || days === "all") return true;
  const date = new Date(isoString);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - Number(days));
  return date >= start;
}

export function getDonorStatusLabel(status) {
  const labels = {
    novo: "Novo",
    contatado: "Contatado",
    acionavel: "Acionavel",
    aguardando_retorno: "Aguardando retorno",
    arquivado: "Arquivado",
    em_contato: "Em contato",
    apto: "Apto",
    aguardando_documentos: "Aguardando docs",
    encaminhado_redome: "Encaminhado REDOME",
    inativo: "Inativo"
  };
  return labels[status] || status || "-";
}

export function getPatientStatusLabel(status) {
  const newSchemaLabels = {
    novo: "Novo",
    aguardando_informacao: "Aguardando informacao",
    mobilizacao_ativa: "Mobilizacao ativa",
    encerrado: "Encerrado",
    arquivado: "Arquivado"
  };
  if (newSchemaLabels[status]) return newSchemaLabels[status];
  const labels = {
    em_analise: "Em análise",
    urgente: "Urgente",
    acompanhamento: "Acompanhamento",
    compatibilidade_encontrada: "Mobilizacao encontrada"
  };
  return labels[status] || status || "-";
}

export function getPaymentStatusLabel(status) {
  const newSchemaLabels = {
    pending_payment_setup: "Aguardando PIX",
    paid: "Pagamento confirmado",
    failed: "Falhou",
    canceled: "Cancelado",
    arquivado: "Arquivado"
  };
  if (newSchemaLabels[status]) return newSchemaLabels[status];
  const labels = {
    pago: "Pagamento confirmado",
    pendente: "Pendente",
    cancelado: "Cancelado",
    confirmado: "Pagamento confirmado",
    confirmado_demo: "Pagamento confirmado",
    intencao_recorrente: "Intenção recorrente",
    redirecionado_plataforma: "Redirecionado plataforma"
  };
  return labels[status] || status || "-";
}

export function statusClass(status) {
  return `status-${String(status || "neutro").replace(/_/g, "-")}`;
}

export function escapeHtml(value) {
  const div = document.createElement("div");
  div.textContent = String(value ?? "");
  return div.innerHTML;
}

export function toCsv(rows, columns) {
  const header = columns.map((column) => column.label).join(",");
  const body = rows.map((row) => columns
    .map((column) => {
      const raw = typeof column.value === "function" ? column.value(row) : row[column.value];
      return `"${String(raw ?? "").replace(/"/g, '""')}"`;
    })
    .join(","));

  return [header, ...body].join("\n");
}

export function downloadCSV(csv, filename) {
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
