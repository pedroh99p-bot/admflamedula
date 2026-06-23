import { listDonors } from "./donorService.js";
import { listPatientCases } from "./patientService.js";
import { listDonationIntents, listSupportLeads } from "./supportService.js";
import { fetchTable } from "./supabaseService.js";

function normalizeDonor(row) {
  const bloodStatus = row.blood_donor_status || "";
  const marrowInterest = row.medula_interest || "";
  return {
    ...row,
    nome: row.nome,
    telefone: row.telefone,
    email: row.email,
    cidade: row.cidade,
    estado: row.estado,
    tipo_sanguineo: row.tipo_sanguineo || "",
    ja_doador_sangue: ["ja_doador", "doador_recorrente", "sim"].includes(bloodStatus),
    quer_doar_sangue: ["quero_comecar", "interessado", "sim"].includes(bloodStatus),
    quer_doar_medula: ["sim", "interessado", "quero_saber"].includes(marrowInterest),
    consentimento_contato: row.consent_lgpd,
    contato_whatsapp_realizado: Boolean(row.contacted_at),
    canal_preferido: row.contact_preference,
    origem: row.origem,
    observacoes: row.internal_notes,
    status: row.status,
    created_at: row.created_at
  };
}

function normalizePatientCase(row) {
  return {
    ...row,
    nome_paciente: row.patient_identifier || row.requester_name || "Caso sinalizado",
    telefone_responsavel: row.requester_phone,
    email: row.requester_email,
    diagnostico: row.campaign_context,
    tipo_sanguineo: row.tipo_sanguineo || "",
    tipo_necessidade: row.need_type,
    urgencia: row.urgency_level,
    necessita_medula: ["medula", "campanha_cadastro_medula"].includes(row.need_type),
    hospital: row.hospital,
    cidade: row.cidade,
    estado: row.estado,
    nome_medico: "",
    crm_medico: "",
    autorizacao_divulgacao: row.consent_authorized,
    usar_nome_paciente: false,
    mensagem_publica: row.campaign_context,
    contato_whatsapp_realizado: false,
    status: row.status,
    origem: row.origem,
    observacoes: row.private_notes,
    created_at: row.created_at
  };
}

function normalizeDonationIntent(row) {
  const amount = Number(row.custom_amount || row.amount || 0);
  const name = row.donor_type === "company"
    ? row.company_name || row.responsible_name || "Empresa"
    : row.name || "Apoiador";
  return {
    ...row,
    nome: name,
    email: row.email,
    telefone: row.phone,
    valor: amount,
    metodo_pagamento: row.payment_method,
    status_pagamento: row.status,
    payment_id: row.provider_reference,
    origem: row.source,
    created_at: row.created_at
  };
}

export async function getDashboardData() {
  try {
    const [
      donorResult,
      patientResult,
      donationResult,
      supportResult,
      auditResult,
      metricsResult,
      regionResult
    ] = await Promise.all([
      listDonors(),
      listPatientCases(),
      listDonationIntents(),
      listSupportLeads(),
      fetchTable("audit_logs", { orderBy: "created_at", ascending: false }),
      getDashboardMetrics(),
      getRegionSummary()
    ]);

    return {
      donorLeads: donorResult.data.map(normalizeDonor),
      patients: patientResult.data.map(normalizePatientCase),
      monetaryDonations: donationResult.data.map(normalizeDonationIntent),
      supportLeads: supportResult.data || [],
      auditLogs: auditResult.data || [],
      dashboardMetrics: metricsResult.data,
      regionSummary: regionResult.data,
      contentSummary: [],
      errors: [
        donorResult.error,
        patientResult.error,
        donationResult.error,
        supportResult.error,
        auditResult.error,
        metricsResult.error,
        regionResult.error
      ].filter(Boolean)
    };
  } catch (error) {
    console.error("[Supabase] getDashboardData", error);
    return {
      donorLeads: [],
      patients: [],
      monetaryDonations: [],
      supportLeads: [],
      auditLogs: [],
      dashboardMetrics: [],
      regionSummary: [],
      contentSummary: [],
      errors: [{
        source: "dashboard",
        raw: error,
        isRls: false,
        message: "Nao foi possivel carregar os dados do novo Supabase."
      }]
    };
  }
}

export function getDashboardMetrics() {
  return fetchTable("v_dashboard_metrics", { orderBy: null });
}

export function getRegionSummary() {
  return fetchTable("v_donor_region_summary", { orderBy: null });
}
