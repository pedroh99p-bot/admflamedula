import {
  deleteDonorRecord,
  deletePatientRecord,
  getDashboardData,
  updateDonorContactStatus,
  updateDonorRecord,
  updatePatientRecord
} from "./api.js";
import { handleLogout, requireAuth } from "./auth.js";
import { renderDonationChart, renderOverviewCharts, renderRegionCharts } from "./charts.js";
import { demoDonations, demoDonors, demoPatients } from "./demo-data.js";
import { showToast } from "./toast.js";
import {
  countBy,
  downloadCSV,
  escapeHtml,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getDonorStatusLabel,
  getPatientStatusLabel,
  getPaymentStatusLabel,
  includesQuery,
  isWithinDays,
  normalizeText,
  sortEntriesByValue,
  statusClass,
  sumBy,
  toCsv,
  uniqueSorted,
  yesNo
} from "./utils.js";

const bloodCompatibility = {
  "O-": ["O-"],
  "O+": ["O-", "O+"],
  "A-": ["O-", "A-"],
  "A+": ["O-", "O+", "A-", "A+"],
  "B-": ["O-", "B-"],
  "B+": ["O-", "O+", "B-", "B+"],
  "AB-": ["O-", "A-", "B-", "AB-"],
  "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
};

const bloodTypes = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"];
const donorStatuses = ["novo", "em_contato", "apto", "aguardando_documentos", "encaminhado_redome", "inativo"];
const patientStatuses = ["em_analise", "urgente", "acompanhamento", "compatibilidade_encontrada"];

const state = {
  activeTab: "overview",
  session: null,
  globalQuery: "",
  donorFilters: {
    estado: "",
    tipo_sanguineo: "",
    quer_doar_medula: "",
    status: "",
    contato_whatsapp: ""
  },
  reportFilters: {
    periodo: "all",
    estado: "",
    tipo_sanguineo: ""
  },
  donationFilter: "",
  demoMode: false,
  donors: [],
  patients: [],
  donations: [],
  dataErrors: [],
  matchingContext: null,
  formContext: null,
  isUpdatingMatch: false
};

const donorSearchFields = [
  "nome",
  "email",
  "telefone",
  "cidade",
  "estado",
  "tipo_sanguineo",
  "status",
  "origem",
  "observacoes"
];

const patientSearchFields = [
  "nome_paciente",
  "diagnostico",
  "hospital",
  "cidade",
  "estado",
  "tipo_sanguineo",
  "nome_medico",
  "crm_medico",
  "status",
  "origem",
  "observacoes"
];

const donationSearchFields = [
  "nome",
  "email",
  "telefone",
  "metodo_pagamento",
  "status_pagamento",
  "payment_id",
  "origem"
];

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  if (window.__flamedulaBootstrap) {
    await window.__flamedulaBootstrap;
  }

  state.session = await requireAuth();
  if (!state.session) return;

  document.documentElement.classList.remove("auth-checking", "redirect-login");
  document.documentElement.classList.add("auth-ready");

  applySavedTheme();
  applySavedDemoMode();
  bindEvents();
  await loadDashboardData();
  setActiveTab(location.hash.replace("#", "") || "overview", false);
}

async function loadDashboardData() {
  const dashboardData = await getDashboardData();
  state.donors = dashboardData.donorLeads || [];
  state.patients = dashboardData.patients || [];
  state.donations = dashboardData.monetaryDonations || [];
  state.dataErrors = dashboardData.errors || [];

  populateFilters();
  renderAll();
}

function applySavedTheme() {
  const theme = localStorage.getItem("flamedula_theme");
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

function applySavedDemoMode() {
  state.demoMode = localStorage.getItem("flamedula_demo_mode") === "true";
  document.documentElement.classList.toggle("demo-mode-active", state.demoMode);
  const toggle = document.getElementById("demoModeToggle");
  if (toggle) toggle.checked = state.demoMode;
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });

  document.getElementById("btnMobileMenu")?.addEventListener("click", toggleSidebar);
  document.getElementById("sidebarScrim")?.addEventListener("click", closeSidebar);
  document.getElementById("btnLogout")?.addEventListener("click", () => handleLogout());
  document.getElementById("btnTheme")?.addEventListener("click", toggleTheme);
  document.getElementById("demoModeToggle")?.addEventListener("change", toggleDemoMode);
  document.getElementById("btnExportCsv")?.addEventListener("click", exportActiveTab);
  document.getElementById("btnReportExport")?.addEventListener("click", exportReportCsv);
  document.getElementById("btnCloseModal")?.addEventListener("click", closeModal);
  document.getElementById("detailModal")?.addEventListener("click", (event) => {
    if (event.target.id === "detailModal") closeModal();
  });

  document.getElementById("globalSearch")?.addEventListener("input", (event) => {
    state.globalQuery = event.target.value;
    renderAll();
  });

  bindFilter("donorStateFilter", "donorFilters", "estado");
  bindFilter("donorBloodFilter", "donorFilters", "tipo_sanguineo");
  bindFilter("donorStatusFilter", "donorFilters", "status");
  bindFilter("donorMarrowFilter", "donorFilters", "quer_doar_medula");
  bindFilter("donorWhatsappFilter", "donorFilters", "contato_whatsapp");
  bindDonationFilter();
  bindFilter("reportPeriodFilter", "reportFilters", "periodo");
  bindFilter("reportStateFilter", "reportFilters", "estado");
  bindFilter("reportBloodFilter", "reportFilters", "tipo_sanguineo");

  document.getElementById("btnClearDonorFilters")?.addEventListener("click", () => {
    state.donorFilters = {
      estado: "",
      tipo_sanguineo: "",
      quer_doar_medula: "",
      status: "",
      contato_whatsapp: ""
    };

    [
      "donorStateFilter",
      "donorBloodFilter",
      "donorStatusFilter",
      "donorMarrowFilter",
      "donorWhatsappFilter"
    ].forEach((id) => {
      const field = document.getElementById(id);
      if (field) field.value = "";
    });

    renderAll();
  });

  document.addEventListener("click", handleClickActions);
  document.addEventListener("submit", handleEntityFormSubmit);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });
}

function bindFilter(id, group, key) {
  const field = document.getElementById(id);
  field?.addEventListener("change", () => {
    state[group][key] = field.value;
    renderAll();
  });
}

function bindDonationFilter() {
  const field = document.getElementById("donationTypeFilter");
  field?.addEventListener("change", () => {
    state.donationFilter = field.value;
    renderAll();
  });
}

function toggleDemoMode(event) {
  state.demoMode = Boolean(event.target.checked);
  localStorage.setItem("flamedula_demo_mode", state.demoMode ? "true" : "false");
  document.documentElement.classList.toggle("demo-mode-active", state.demoMode);
  populateFilters();
  renderAll();
  showToast(state.demoMode
    ? "Modo Demo/Teste ativo. Dados FIC aparecem apenas no front-end."
    : "Modo Demo/Teste desligado. Exibindo somente dados reais.");
}

function setActiveTab(tab, updateHash = true) {
  const target = document.getElementById(`tab-${tab}`) ? tab : "overview";
  state.activeTab = target;

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === target);
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${target}`);
  });

  const panel = document.getElementById(`tab-${target}`);
  document.getElementById("pageTitle").textContent = panel?.dataset.title || "Dashboard";
  document.getElementById("pageKicker").textContent = panel?.dataset.kicker || "Flamedula ADM";

  if (updateHash) {
    history.replaceState(null, "", `#${target}`);
  }

  closeSidebar();
  renderActiveCharts();
  createIcons();
}

function renderAll() {
  renderDashboardAlert();
  renderDemoModeBanner();
  renderOverview();
  renderDonors();
  renderPatients();
  renderDonations();
  renderRegions();
  renderReports();
  renderActiveCharts();

  if (state.formContext) {
    syncFormContext();
    if (state.formContext) {
      renderEntityFormModal();
    }
  } else if (state.matchingContext) {
    syncMatchingContext();
    if (state.matchingContext) {
      renderMatchingModal();
    }
  }

  createIcons();
}

function renderDemoModeBanner() {
  const banner = document.getElementById("demoModeBanner");
  if (!banner) return;
  banner.hidden = !state.demoMode;
}

function renderDashboardAlert() {
  const alert = document.getElementById("dashboardAlert");
  if (!alert) return;

  if (!state.dataErrors.length) {
    alert.hidden = true;
    alert.innerHTML = "";
    return;
  }

  const messages = [...new Set(state.dataErrors.map((error) => error.message))];
  alert.hidden = false;
  alert.innerHTML = messages.map((message) => `<p>${escapeHtml(message)}</p>`).join("");
}

function renderOverview() {
  const donors = getGlobalDonors();
  const patients = getGlobalPatients();
  const donations = getGlobalDonations();
  const paidDonations = donations.filter(isConfirmedDonation);
  const pendingDonations = donations.filter((donation) => donation.status_pagamento === "pendente");
  const whatsappDone = donors.filter((donor) => donor.contato_whatsapp_realizado).length;
  const whatsappPending = donors.length - whatsappDone;
  const sourceDetail = state.demoMode ? "Real + FIC no front" : "Registros reais";

  renderMetrics("overviewMetrics", [
    { label: "Total de doadores", value: donors.length, detail: sourceDetail, icon: "users", tone: "red", featured: true },
    { label: "Ja doam sangue", value: donors.filter((donor) => donor.ja_doador_sangue).length, detail: "Historico positivo", icon: "droplet", tone: "green" },
    { label: "Interessados em medula", value: donors.filter((donor) => donor.quer_doar_medula).length, detail: "Leads reais", icon: "heart", tone: "red" },
    { label: "Pacientes cadastrados", value: patients.length, detail: state.demoMode ? "Casos reais + FIC" : "Casos em acompanhamento", icon: "activity", tone: "blue" },
    { label: "WhatsApp realizado", value: whatsappDone, detail: "Contatos com doadores", icon: "message-circle", tone: "green" },
    { label: "WhatsApp pendente", value: whatsappPending, detail: "Doadores sem retorno", icon: "clock", tone: "yellow" },
    { label: "Valor total arrecadado", value: sumBy(paidDonations, "valor"), detail: "Pagamentos confirmados", icon: "dollar-sign", tone: "green", format: "currency" },
    { label: "Doacoes pendentes", value: pendingDonations.length, detail: "Status doacao pendente", icon: "clock", tone: "yellow" }
  ]);

  const update = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date());
  document.getElementById("lastUpdate").textContent = `Atualizado em ${update}`;
}

function renderDonors() {
  const donors = getFilteredDonors();
  document.getElementById("donorResultCount").textContent = `${formatNumber(donors.length)} registros`;

  const list = document.getElementById("donorsList");
  if (!list) return;

  list.innerHTML = donors
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(renderDonorCard)
    .join("") || emptyListState("Nenhum doador encontrado no filtro atual.");
}

function renderPatients() {
  const patients = getGlobalPatients();
  const sourceDetail = state.demoMode ? "Inclui FIC no front" : "Triagem ativa";
  renderMetrics("patientMetrics", [
    { label: "Pacientes em analise", value: patients.filter((patient) => patient.status === "em_analise").length, detail: sourceDetail, icon: "clipboard", tone: "yellow" },
    { label: "Pacientes urgentes", value: patients.filter((patient) => patient.status === "urgente").length, detail: "Prioridade clinica", icon: "alert-triangle", tone: "red", featured: true },
    { label: "Precisam de medula", value: patients.filter((patient) => patient.necessita_medula).length, detail: "Demanda real", icon: "activity", tone: "blue" },
    { label: "Hospitais cadastrados", value: uniqueSorted(patients, "hospital").length, detail: "Rede atendida", icon: "building", tone: "green" },
    { label: "WhatsApp realizado", value: patients.filter((patient) => patient.contato_whatsapp_realizado).length, detail: "Contato com pacientes", icon: "message-circle", tone: "green" },
    { label: "WhatsApp pendente", value: patients.filter((patient) => !patient.contato_whatsapp_realizado).length, detail: "Aguardando orientacao", icon: "clock", tone: "yellow" }
  ]);

  const list = document.getElementById("patientsList");
  if (!list) return;

  list.innerHTML = patients
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(renderPatientCard)
    .join("") || emptyListState("Nenhum paciente encontrado.");
}

function renderDonations() {
  const donations = getFilteredDonations();
  const paidDonations = donations.filter(isConfirmedDonation);
  const total = sumBy(paidDonations, "valor");
  const potentialTotal = sumBy(donations, "valor");
  const ranking = buildSupporterRanking(donations);

  renderMetrics("donationMetrics", [
    { label: "Intencoes registradas", value: donations.length, detail: state.demoMode ? "Real + FIC no front" : "Somente Supabase", icon: "receipt", tone: "blue" },
    { label: "Valor potencial", value: potentialTotal, detail: "Soma das intencoes", icon: "dollar-sign", tone: "green", featured: true, format: "currency" },
    { label: "Ticket medio", value: paidDonations.length ? total / paidDonations.length : 0, detail: "Media real", icon: "calculator", tone: "red", format: "currency" },
    { label: "Recorrentes", value: donations.filter(isRecurringDonation).length, detail: "Pix/cartao/intencao", icon: "repeat", tone: "blue" },
    { label: "Redirecionados", value: donations.filter(isPlatformDonation).length, detail: "Plataforma externa", icon: "external-link", tone: "yellow" },
    { label: "Apoiadores no ranking", value: ranking.length, detail: "Agrupados por contato", icon: "trophy", tone: "green" }
  ]);

  const list = document.getElementById("donationsList");
  if (!list) return;

  list.innerHTML = donations
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map(renderDonationCard)
    .join("") || emptyListState("Nenhuma doacao monetaria encontrada.");

  renderSupporterRanking(donations, ranking);
}

function renderDonorCard(donor) {
  const phoneAvailable = Boolean(getWhatsAppPhone(donor.telefone));

  return `
    <article class="record-card">
      <div class="record-main">
        <div class="record-title-row">
          <div>
            <strong>${escapeHtml(donor.nome || "-")}</strong>
            <small>${escapeHtml(donor.telefone || "Telefone nao informado")}</small>
          </div>
          <span class="blood-chip">${escapeHtml(donor.tipo_sanguineo || "-")}</span>
        </div>
        <div class="record-meta">
          <span><i data-lucide="map-pin"></i>${escapeHtml(donor.cidade || "-")} / ${escapeHtml(donor.estado || "-")}</span>
          <span><i data-lucide="mail"></i>${escapeHtml(donor.email || "-")}</span>
          <span><i data-lucide="calendar"></i>${formatDate(donor.created_at)}</span>
        </div>
        <div class="record-badges">
          ${demoBadge(donor)}
          <span class="badge ${donor.ja_doador_sangue ? "positive" : "info"}">${donor.ja_doador_sangue ? "Ja doador" : "Interessado"}</span>
          <span class="badge ${donor.quer_doar_medula ? "positive" : "info"}">Medula: ${yesNo(donor.quer_doar_medula)}</span>
          <span class="badge ${donor.consentimento_contato === false ? "danger" : "positive"}">Contato: ${donor.consentimento_contato === false ? "Nao" : "Sim"}</span>
          ${donor.opt_out ? `<span class="badge danger">Opt-out</span>` : ""}
          <span class="badge ${donor.contato_whatsapp_realizado ? "positive" : "warning"}">${donor.contato_whatsapp_realizado ? "WhatsApp realizado" : "WhatsApp pendente"}</span>
          <span class="badge ${statusClass(donor.status)}">${getDonorStatusLabel(donor.status)}</span>
        </div>
      </div>
      <div class="record-actions">
        <button class="action-button primary" type="button" data-detail-type="donor" data-id="${escapeHtml(donor.id)}">
          <i data-lucide="panel-right-open"></i>
          <span>Ver detalhes</span>
        </button>
        <button class="icon-button" type="button" title="WhatsApp" ${phoneAvailable ? "" : "disabled"} data-donor-whatsapp-id="${escapeHtml(donor.id)}"><i data-lucide="message-circle"></i></button>
        <button class="icon-button" type="button" title="Editar" data-edit-entity="donor" data-id="${escapeHtml(donor.id)}"><i data-lucide="pencil"></i></button>
        <button class="icon-button soft-danger" type="button" title="Excluir" data-delete-entity="donor" data-id="${escapeHtml(donor.id)}" data-name="${escapeHtml(donor.nome || "doador")}"><i data-lucide="trash-2"></i></button>
      </div>
    </article>
  `;
}

function renderPatientCard(patient) {
  const phoneAvailable = Boolean(getWhatsAppPhone(patient.telefone_responsavel));

  return `
    <article class="record-card">
      <div class="record-main">
        <div class="record-title-row">
          <div>
            <strong>${escapeHtml(patient.nome_paciente || "-")}</strong>
            <small>${escapeHtml(patient.hospital || "Hospital nao informado")}</small>
          </div>
          <span class="blood-chip">${escapeHtml(patient.tipo_sanguineo || "-")}</span>
        </div>
        <div class="record-meta">
          <span><i data-lucide="map-pin"></i>${escapeHtml(patient.cidade || "-")} / ${escapeHtml(patient.estado || "-")}</span>
          <span><i data-lucide="activity"></i>${escapeHtml(patient.diagnostico || "Necessidade nao informada")}</span>
          <span><i data-lucide="user-round"></i>${escapeHtml(patient.nome_medico || "Medico nao informado")}</span>
        </div>
        <div class="record-badges">
          ${demoBadge(patient)}
          <span class="badge ${patient.necessita_medula ? "positive" : "info"}">Medula: ${yesNo(patient.necessita_medula)}</span>
          <span class="badge info">${escapeHtml(patient.tipo_necessidade || "Necessidade nao informada")}</span>
          <span class="badge ${patient.urgencia === "alta" ? "danger" : patient.urgencia === "media" ? "warning" : "info"}">Urgencia: ${escapeHtml(patient.urgencia || "-")}</span>
          <span class="badge ${patient.contato_whatsapp_realizado ? "positive" : "warning"}">${patient.contato_whatsapp_realizado ? "WhatsApp realizado" : "WhatsApp pendente"}</span>
          <span class="badge ${statusClass(patient.status)}">${getPatientStatusLabel(patient.status)}</span>
        </div>
      </div>
      <div class="record-actions">
        <button class="action-button primary" type="button" data-detail-type="patient" data-id="${escapeHtml(patient.id)}">
          <i data-lucide="panel-right-open"></i>
          <span>Ver detalhes</span>
        </button>
        <button class="action-button secondary" type="button" data-match-patient-id="${escapeHtml(patient.id)}">
          <i data-lucide="search-check"></i>
          <span>Encontrar doadores</span>
        </button>
        <button class="icon-button" type="button" title="WhatsApp responsavel" ${phoneAvailable ? "" : "disabled"} data-patient-whatsapp-id="${escapeHtml(patient.id)}"><i data-lucide="message-circle"></i></button>
        <button class="icon-button" type="button" title="Editar" data-edit-entity="patient" data-id="${escapeHtml(patient.id)}"><i data-lucide="pencil"></i></button>
        <button class="icon-button soft-danger" type="button" title="Excluir" data-delete-entity="patient" data-id="${escapeHtml(patient.id)}" data-name="${escapeHtml(patient.nome_paciente || "paciente")}"><i data-lucide="trash-2"></i></button>
      </div>
    </article>
  `;
}

function renderDonationCard(donation) {
  const type = getDonationTypeLabel(donation);

  return `
    <article class="record-card donation-card">
      <div class="record-main">
        <div class="record-title-row">
          <div>
            <strong>${escapeHtml(donation.nome || "Apoiador sem nome")}</strong>
            <small>${escapeHtml(donation.email || donation.telefone || "Contato nao informado")}</small>
          </div>
          <span class="amount-chip">${formatCurrency(donation.valor)}</span>
        </div>
        <div class="record-meta">
          <span><i data-lucide="credit-card"></i>${escapeHtml(donation.metodo_pagamento || "-")}</span>
          <span><i data-lucide="calendar"></i>${formatDate(donation.created_at)}</span>
          <span><i data-lucide="phone"></i>${escapeHtml(donation.telefone || "-")}</span>
        </div>
        <div class="record-badges">
          ${demoBadge(donation)}
          <span class="badge ${statusClass(donation.status_pagamento)}">${getPaymentStatusLabel(donation.status_pagamento)}</span>
          <span class="badge info">${escapeHtml(type)}</span>
          <span class="badge ${isRecurringDonation(donation) ? "positive" : "info"}">${isRecurringDonation(donation) ? "Recorrente" : "Apoio unico"}</span>
        </div>
      </div>
      <div class="record-actions">
        <button class="action-button primary" type="button" data-detail-type="donation" data-id="${escapeHtml(donation.id)}">
          <i data-lucide="panel-right-open"></i>
          <span>Ver detalhes</span>
        </button>
      </div>
    </article>
  `;
}

function renderSupporterRanking(donations, ranking = buildSupporterRanking(donations)) {
  const container = document.getElementById("supporterRanking");
  if (!container) return;

  if (!ranking.length) {
    container.innerHTML = `
      <div class="supporter-ranking-header">
        <div>
          <p class="eyebrow">Ranking MVP</p>
          <h3>Ranking de apoiadores</h3>
        </div>
        <span class="badge info">Sem dados</span>
      </div>
      <p class="demo-note">Sem apoios para ranquear. Ative o Modo Demo/Teste para visualizar dados FIC apenas no front-end.</p>
    `;
    return;
  }

  container.innerHTML = `
    <div class="supporter-ranking-header">
      <div>
        <p class="eyebrow">${state.demoMode ? "Ranking real + FIC" : "Ranking real"}</p>
        <h3>Ranking de apoiadores</h3>
      </div>
      <span class="badge ${state.demoMode ? "warning" : "positive"}">${state.demoMode ? "Demo ativo" : "Supabase"}</span>
    </div>
    <p class="demo-note">Ranking MVP - recompensas/mimos ainda dependem de validacao operacional.</p>
    <div class="supporter-list">
      ${ranking.map((supporter, index) => renderSupporterRow(supporter, index)).join("")}
    </div>
  `;
}

function renderSupporterRow(supporter, index) {
  const level = getSupporterLevel(supporter.points);

  return `
    <article class="supporter-row">
      <span class="supporter-position">${index + 1}</span>
      <div>
        <strong>${escapeHtml(supporter.name)}</strong>
        <small>${formatCurrency(supporter.total)} em ${formatNumber(supporter.count)} apoio(s)</small>
        <span>${escapeHtml(level.reward)}${supporter.hasDemo ? " - inclui FIC" : ""}</span>
      </div>
      <div class="supporter-score">
        <strong>${formatNumber(supporter.points)}</strong>
        <span class="badge ${level.className}">${escapeHtml(level.label)}</span>
      </div>
    </article>
  `;
}

function buildSupporterRanking(donations) {
  const groups = new Map();

  donations.forEach((donation) => {
    const key = getSupporterKey(donation);
    if (!key) return;

    const current = groups.get(key) || {
      name: donation.nome || donation.email || donation.telefone || "Apoiador",
      total: 0,
      count: 0,
      recurring: false,
      platform: false,
      hasDemo: false
    };

    current.total += Number(donation.valor || 0);
    current.count += 1;
    current.recurring = current.recurring || isRecurringDonation(donation);
    current.platform = current.platform || isPlatformDonation(donation);
    current.hasDemo = current.hasDemo || isDemoRecord(donation);
    groups.set(key, current);
  });

  return [...groups.values()]
    .map((supporter) => ({
      ...supporter,
      points: Math.round(
        supporter.total
        + (supporter.recurring ? 50 : 0)
        + (supporter.count * 10)
        + (supporter.platform ? 25 : 0)
      )
    }))
    .filter((supporter) => supporter.total > 0 || supporter.count > 0)
    .sort((left, right) => right.points - left.points)
    .slice(0, 5);
}

function getSupporterKey(donation) {
  return normalizeText(donation.email || donation.telefone || donation.nome).trim();
}

function isRecurringDonation(donation) {
  const method = normalizeText(donation.metodo_pagamento);
  const status = normalizeText(donation.status_pagamento);
  return method.includes("recorrente")
    || status === "intencao_recorrente";
}

function isPlatformDonation(donation) {
  const method = normalizeText(donation.metodo_pagamento);
  const status = normalizeText(donation.status_pagamento);
  return method === "plataforma_doacao"
    || status === "redirecionado_plataforma";
}

function isConfirmedDonation(donation) {
  const status = normalizeText(donation.status_pagamento);
  return status === "pago"
    || status === "confirmado"
    || status === "confirmado_demo";
}

function getDonationTypeLabel(donation) {
  const method = normalizeText(donation.metodo_pagamento);
  if (method.includes("pix")) return method.includes("recorrente") ? "Pix recorrente" : "Pix unico";
  if (method.includes("cartao")) return method.includes("recorrente") ? "Cartao recorrente" : "Cartao";
  if (method.includes("plataforma")) return "Plataforma externa";
  return "Apoio financeiro";
}

function demoBadge(record) {
  return isDemoRecord(record) ? `<span class="badge demo">FIC</span>` : "";
}

function isDemoRecord(record) {
  return Boolean(record?.__isDemo || String(record?.id || "").startsWith("fic-"));
}

function isDemoId(id) {
  return String(id || "").startsWith("fic-");
}

function getSupporterLevel(points) {
  if (points >= 500) return { label: "Embaixador", reward: "Camisa + bone + destaque especial", className: "positive" };
  if (points >= 300) return { label: "Ouro", reward: "Camisa Flamedula", className: "warning" };
  if (points >= 150) return { label: "Prata", reward: "Certificado + destaque no painel", className: "info" };
  if (points >= 50) return { label: "Bronze", reward: "Certificado digital", className: "info" };
  return { label: "Inicial", reward: "Reconhecimento em construcao", className: "info" };
}

function renderRegions() {
  const donors = getGlobalDonors();
  const patients = getGlobalPatients();

  renderRanking("stateRanking", sortEntriesByValue(countBy(donors, "estado"), 6));
  renderRanking("cityRanking", sortEntriesByValue(countBy(donors.map((donor) => ({ cidade_estado: `${donor.cidade || "-"} / ${donor.estado || "-"}` })), "cidade_estado"), 6));
  renderRanking("patientStateRanking", sortEntriesByValue(countBy(patients, "estado"), 6));
  renderRanking("bloodDemandRanking", sortEntriesByValue(countBy(patients, "tipo_sanguineo"), 8));
}

function renderReports() {
  const donors = getReportDonors();
  const patients = getReportPatients();
  const donations = getReportDonations();
  const paid = donations.filter(isConfirmedDonation);
  const marrow = donors.filter((donor) => donor.quer_doar_medula).length;
  const urgent = patients.filter((patient) => patient.status === "urgente").length;
  const raised = sumBy(paid, "valor");

  document.getElementById("reportSummaryText").textContent =
    `No recorte atual, ha ${formatNumber(donors.length)} doadores, ${formatNumber(marrow)} interessados em doar medula, `
    + `${formatNumber(patients.length)} pacientes acompanhados e ${formatCurrency(raised)} confirmados em doacoes monetarias. `
    + `${formatNumber(urgent)} pacientes estao marcados como urgentes.`;

  renderMetrics("reportMetrics", [
    { label: "Doadores no recorte", value: donors.length, detail: "Filtro aplicado", icon: "users", tone: "red" },
    { label: "Interesse em medula", value: marrow, detail: "Dentro do recorte", icon: "heart", tone: "blue" },
    { label: "Pacientes urgentes", value: urgent, detail: "Prioridade", icon: "alert-triangle", tone: "red", featured: true },
    { label: "Arrecadacao no periodo", value: raised, detail: "Pagos", icon: "dollar-sign", tone: "green", format: "currency" }
  ]);
}

function renderMetrics(containerId, metrics) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = metrics.map((metric) => `
    <article class="metric-card ${metric.featured ? "featured" : ""}">
      <div class="metric-top">
        <p>${escapeHtml(metric.label)}</p>
        <span class="metric-icon ${metric.tone || ""}"><i data-lucide="${metric.icon}"></i></span>
      </div>
      <div>
        <strong data-metric-target="${Number(metric.value) || 0}" data-format="${metric.format || "number"}">0</strong>
        <small>${escapeHtml(metric.detail || "")}</small>
      </div>
    </article>
  `).join("");

  animateMetrics(container);
}

function animateMetrics(container) {
  container.querySelectorAll("[data-metric-target]").forEach((element) => {
    const target = Number(element.dataset.metricTarget);
    const format = element.dataset.format;
    const duration = 720;
    const start = performance.now();

    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      element.textContent = format === "currency"
        ? formatCurrency(value)
        : formatNumber(Math.round(value));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

function matchesRecordQuery(record, fields, query) {
  if (includesQuery(record, fields, query)) return true;

  const normalizedQuery = normalizeText(query).trim();
  if (!normalizedQuery) return true;

  const whatsappTerms = record.contato_whatsapp_realizado
    ? "whatsapp contato realizado orientacao"
    : "whatsapp contato pendente orientacao";

  return whatsappTerms.includes(normalizedQuery);
}

function getGlobalDonors() {
  return getDisplayDonors().filter((donor) => matchesRecordQuery(donor, donorSearchFields, state.globalQuery));
}

function getGlobalPatients() {
  return getDisplayPatients().filter((patient) => matchesRecordQuery(patient, patientSearchFields, state.globalQuery));
}

function getGlobalDonations() {
  return getDisplayDonations().filter((donation) => includesQuery(donation, donationSearchFields, state.globalQuery));
}

function getDisplayDonors() {
  return state.demoMode ? [...state.donors, ...demoDonors] : state.donors;
}

function getDisplayPatients() {
  return state.demoMode ? [...state.patients, ...demoPatients] : state.patients;
}

function getDisplayDonations() {
  return state.demoMode ? [...state.donations, ...demoDonations] : state.donations;
}

function getFilteredDonors() {
  return getGlobalDonors().filter((donor) => {
    const marrow = state.donorFilters.quer_doar_medula;
    const whatsapp = state.donorFilters.contato_whatsapp;
    return (!state.donorFilters.estado || donor.estado === state.donorFilters.estado)
      && (!state.donorFilters.tipo_sanguineo || donor.tipo_sanguineo === state.donorFilters.tipo_sanguineo)
      && (!state.donorFilters.status || donor.status === state.donorFilters.status)
      && (!marrow || donor.quer_doar_medula === (marrow === "sim"))
      && (!whatsapp || donor.contato_whatsapp_realizado === (whatsapp === "realizado"));
  });
}

function getReportDonors() {
  return getGlobalDonors().filter((donor) =>
    isWithinDays(donor.created_at, state.reportFilters.periodo)
    && (!state.reportFilters.estado || donor.estado === state.reportFilters.estado)
    && (!state.reportFilters.tipo_sanguineo || donor.tipo_sanguineo === state.reportFilters.tipo_sanguineo)
  );
}

function getReportPatients() {
  return getGlobalPatients().filter((patient) =>
    isWithinDays(patient.created_at, state.reportFilters.periodo)
    && (!state.reportFilters.estado || patient.estado === state.reportFilters.estado)
    && (!state.reportFilters.tipo_sanguineo || patient.tipo_sanguineo === state.reportFilters.tipo_sanguineo)
  );
}

function getReportDonations() {
  return getGlobalDonations().filter((donation) => isWithinDays(donation.created_at, state.reportFilters.periodo));
}

function getFilteredDonations() {
  return getGlobalDonations().filter(matchesDonationFilter);
}

function matchesDonationFilter(donation) {
  const filter = state.donationFilter;
  if (!filter) return true;

  const method = normalizeText(donation.metodo_pagamento);
  const status = normalizeText(donation.status_pagamento);

  const checks = {
    pix: method.includes("pix"),
    cartao: method.includes("cartao"),
    plataforma: method.includes("plataforma") || status.includes("plataforma"),
    recorrente: isRecurringDonation(donation),
    pendente: status.includes("pendente"),
    confirmado: status.includes("confirmado") || status === "pago",
    redirecionado: status.includes("redirecionado")
  };

  return Boolean(checks[filter]);
}

function populateFilters() {
  const donors = getDisplayDonors();
  setOptions("donorStateFilter", uniqueSorted(donors, "estado"), "Todos os estados");
  setOptions("donorBloodFilter", uniqueSorted(donors, "tipo_sanguineo"), "Todos os tipos");
  setOptions("donorStatusFilter", uniqueSorted(donors, "status"), "Todos os status", getDonorStatusLabel);
  setOptions("reportStateFilter", uniqueSorted(donors, "estado"), "Todos os estados");
  setOptions("reportBloodFilter", uniqueSorted(donors, "tipo_sanguineo"), "Todos os tipos");
}

function setOptions(id, values, placeholder, labelFn = (value) => value) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = `<option value="">${placeholder}</option>`
    + values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(labelFn(value))}</option>`).join("");
}

function renderRanking(id, entries) {
  const list = document.getElementById(id);
  if (!list) return;

  if (!entries.length) {
    list.innerHTML = `<li><strong>Nenhum registro encontrado</strong><span>0</span></li>`;
    return;
  }

  list.innerHTML = entries.map(([label, count], index) => `
    <li>
      <strong>${index + 1}. ${escapeHtml(label)}</strong>
      <span>${formatNumber(count)}</span>
    </li>
  `).join("");
}

function renderActiveCharts() {
  if (state.activeTab === "overview") {
    renderOverviewCharts(getGlobalDonors(), getGlobalPatients(), getGlobalDonations());
  }

  if (state.activeTab === "donations") {
    renderDonationChart(getGlobalDonations());
  }

  if (state.activeTab === "regions") {
    renderRegionCharts(getGlobalDonors(), getGlobalPatients());
  }
}

function handleClickActions(event) {
  const deleteButton = event.target.closest("[data-delete-entity]");
  if (deleteButton) {
    handleDeleteEntity(deleteButton.dataset.deleteEntity, deleteButton.dataset.id, deleteButton.dataset.name);
    return;
  }

  const editButton = event.target.closest("[data-edit-entity]");
  if (editButton) {
    openEditModal(editButton.dataset.editEntity, editButton.dataset.id);
    return;
  }

  const detailButton = event.target.closest("[data-detail-type]");
  if (detailButton) {
    openDetails(detailButton.dataset.detailType, detailButton.dataset.id);
    return;
  }

  const donorWhatsappButton = event.target.closest("[data-donor-whatsapp-id]");
  if (donorWhatsappButton) {
    openDonorWhatsApp(donorWhatsappButton.dataset.donorWhatsappId);
    return;
  }

  const patientWhatsappButton = event.target.closest("[data-patient-whatsapp-id]");
  if (patientWhatsappButton) {
    openPatientWhatsApp(patientWhatsappButton.dataset.patientWhatsappId);
    return;
  }

  const markDonorButton = event.target.closest("[data-mark-donor-contacted]");
  if (markDonorButton) {
    const donor = findRecordById(getDisplayDonors(), markDonorButton.dataset.markDonorContacted);
    if (donor) updateMatchingDonor(donor, true);
    return;
  }

  const matchButton = event.target.closest("[data-match-patient-id]");
  if (matchButton) {
    openMatchingModal(matchButton.dataset.matchPatientId);
    return;
  }

  const matchingAction = event.target.closest("[data-matching-action]");
  if (matchingAction) {
    handleMatchingAction(matchingAction.dataset.matchingAction, matchingAction);
  }
}

function openDetails(type, id) {
  const record = {
    donor: findRecordById(getDisplayDonors(), id),
    patient: findRecordById(getDisplayPatients(), id),
    donation: findRecordById(getDisplayDonations(), id)
  }[type];

  if (!record) return;

  state.formContext = null;
  state.matchingContext = null;

  const detailMap = {
    donor: {
      kicker: "Doador",
      title: record.nome || "Registro",
      fields: [
        ["Email", record.email],
        ["Telefone", record.telefone],
        ["Cidade/Estado", `${record.cidade || "-"} / ${record.estado || "-"}`],
        ["Idade", record.idade],
        ["Peso", record.peso ? `${record.peso} kg` : "-"],
        ["Tipo sanguineo", record.tipo_sanguineo],
        ["Ja doa sangue", yesNo(record.ja_doador_sangue)],
        ["Quer doar sangue", yesNo(record.quer_doar_sangue)],
        ["Quer doar medula", yesNo(record.quer_doar_medula)],
        ["Contato WhatsApp", record.contato_whatsapp_realizado ? "Realizado" : "Pendente"],
        ["Status", getDonorStatusLabel(record.status)],
        ["Tipo de dado", isDemoRecord(record) ? "FIC - demonstracao front-end" : "Real - Supabase"],
        ["Bairro", record.bairro || "-"],
        ["Canal preferido", record.canal_preferido || "-"],
        ["Opt-out", yesNo(record.opt_out)],
        ["Origem", record.origem || "-"],
        ["Observacoes", record.observacoes || "-"],
        ["Cadastro", formatDateTime(record.created_at)]
      ]
    },
    patient: {
      kicker: "Paciente",
      title: record.nome_paciente || "Registro",
      fields: [
        ["Idade", record.idade],
        ["Diagnostico", record.diagnostico],
        ["Tipo sanguineo", record.tipo_sanguineo],
        ["Necessita medula", yesNo(record.necessita_medula)],
        ["Contato WhatsApp", record.contato_whatsapp_realizado ? "Realizado" : "Pendente"],
        ["Hospital", record.hospital],
        ["Cidade/Estado", `${record.cidade || "-"} / ${record.estado || "-"}`],
        ["Medico", record.nome_medico],
        ["CRM", record.crm_medico],
        ["Telefone responsavel", record.telefone_responsavel],
        ["Status", getPatientStatusLabel(record.status)],
        ["Tipo de dado", isDemoRecord(record) ? "FIC - demonstracao front-end" : "Real - Supabase"],
        ["Tipo necessidade", record.tipo_necessidade || "-"],
        ["Urgencia", record.urgencia || "-"],
        ["Autorizacao divulgacao", yesNo(record.autorizacao_divulgacao)],
        ["Origem", record.origem || "-"],
        ["Observacoes", record.observacoes || "-"],
        ["Cadastro", formatDateTime(record.created_at)]
      ]
    },
    donation: {
      kicker: "Doacao monetaria",
      title: record.nome || "Registro",
      fields: [
        ["Email", record.email],
        ["Telefone", record.telefone],
        ["Valor", formatCurrency(record.valor)],
        ["Metodo", record.metodo_pagamento],
        ["Status", getPaymentStatusLabel(record.status_pagamento)],
        ["Tipo de dado", isDemoRecord(record) ? "FIC - demonstracao front-end" : "Real - Supabase"],
        ["Interpretacao", getDonationTypeLabel(record)],
        ["Payment ID", record.payment_id || "-"],
        ["Origem", record.origem || "-"],
        ["Data", formatDateTime(record.created_at)]
      ]
    }
  };

  const details = detailMap[type];
  openModal({
    kicker: details.kicker,
    title: details.title,
    bodyMarkup: `
      ${buildDetailActions(type, record)}
      ${details.fields.map(([label, value]) => `
      <div class="detail-tile">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
    `).join("")}
    `,
    modalClass: "",
    bodyClass: ""
  });
}

function buildDetailActions(type, record) {
  if (type === "donor") {
    const phoneAvailable = Boolean(getWhatsAppPhone(record.telefone));
    return `
      <div class="detail-actions">
        <button class="action-button primary" type="button" ${phoneAvailable ? "" : "disabled"} data-donor-whatsapp-id="${escapeHtml(record.id)}">
          <i data-lucide="message-circle"></i>
          <span>Enviar WhatsApp</span>
        </button>
        <button class="action-button secondary" type="button" data-mark-donor-contacted="${escapeHtml(record.id)}">
          <i data-lucide="check-check"></i>
          <span>Marcar contato realizado</span>
        </button>
        <button class="action-button ghost" type="button" data-edit-entity="donor" data-id="${escapeHtml(record.id)}">
          <i data-lucide="pencil"></i>
          <span>Editar</span>
        </button>
        <button class="action-button ghost danger-text" type="button" data-delete-entity="donor" data-id="${escapeHtml(record.id)}" data-name="${escapeHtml(record.nome || "doador")}">
          <i data-lucide="trash-2"></i>
          <span>Excluir</span>
        </button>
      </div>
    `;
  }

  if (type === "patient") {
    const phoneAvailable = Boolean(getWhatsAppPhone(record.telefone_responsavel));
    return `
      <div class="detail-actions">
        <button class="action-button primary" type="button" data-match-patient-id="${escapeHtml(record.id)}">
          <i data-lucide="search-check"></i>
          <span>Encontrar doadores compativeis</span>
        </button>
        <button class="action-button secondary" type="button" ${phoneAvailable ? "" : "disabled"} data-patient-whatsapp-id="${escapeHtml(record.id)}">
          <i data-lucide="message-circle"></i>
          <span>WhatsApp responsavel</span>
        </button>
        <button class="action-button ghost" type="button" data-edit-entity="patient" data-id="${escapeHtml(record.id)}">
          <i data-lucide="pencil"></i>
          <span>Editar</span>
        </button>
        <button class="action-button ghost danger-text" type="button" data-delete-entity="patient" data-id="${escapeHtml(record.id)}" data-name="${escapeHtml(record.nome_paciente || "paciente")}">
          <i data-lucide="trash-2"></i>
          <span>Excluir</span>
        </button>
      </div>
    `;
  }

  return `<div class="detail-actions"><span class="badge info">Detalhes do apoio financeiro</span></div>`;
}

function openEditModal(entityType, id, options = {}) {
  if (isDemoId(id)) {
    showToast("Este e um registro ficticio de demonstracao e nao pode ser editado no banco.", "error");
    return;
  }

  state.matchingContext = null;
  state.formContext = {
    entityType,
    recordId: String(id),
    submitting: false,
    returnToMatchingPatientId: options.returnToMatchingPatientId || null
  };
  renderEntityFormModal();
}

function syncFormContext() {
  if (!state.formContext) return;
  const record = getRecordForEntity(state.formContext.entityType, state.formContext.recordId);
  if (!record) {
    state.formContext = null;
    closeModal();
  }
}

function renderEntityFormModal() {
  if (!state.formContext) return;

  const { entityType, recordId, submitting } = state.formContext;
  const record = getRecordForEntity(entityType, recordId);
  if (!record) return;

  const title = entityType === "donor"
    ? `Editar doador: ${record.nome || "Registro"}`
    : `Editar paciente: ${record.nome_paciente || "Registro"}`;

  openModal({
    kicker: entityType === "donor" ? "Editar doador" : "Editar paciente",
    title,
    bodyMarkup: buildEntityFormMarkup(entityType, record, submitting),
    modalClass: "form-modal",
    bodyClass: "form-body"
  });
}

function buildEntityFormMarkup(entityType, record, submitting) {
  const isDonor = entityType === "donor";

  return `
    <form id="entityForm" class="entity-form" data-entity-type="${entityType}" data-record-id="${escapeHtml(record.id)}">
      <div class="form-grid">
        ${isDonor ? `
          ${renderTextField("Nome", "nome", record.nome)}
          ${renderTextField("Email", "email", record.email, "email")}
          ${renderTextField("Telefone", "telefone", record.telefone, "tel")}
          ${renderTextField("Cidade", "cidade", record.cidade)}
          ${renderTextField("Estado", "estado", record.estado)}
          ${renderNumberField("Idade", "idade", record.idade, 0, 120, 1)}
          ${renderNumberField("Peso", "peso", record.peso, 0, 300, "0.1")}
          ${renderSelectField("Tipo sanguineo", "tipo_sanguineo", record.tipo_sanguineo, bloodTypes)}
          ${renderBooleanField("Ja doador de sangue", "ja_doador_sangue", record.ja_doador_sangue)}
          ${renderBooleanField("Quer doar sangue", "quer_doar_sangue", record.quer_doar_sangue)}
          ${renderBooleanField("Quer doar medula", "quer_doar_medula", record.quer_doar_medula)}
          ${renderBooleanField("Contato WhatsApp", "contato_whatsapp_realizado", record.contato_whatsapp_realizado, "Realizado", "Pendente")}
          ${renderSelectField("Status", "status", record.status, donorStatuses, getDonorStatusLabel)}
        ` : `
          ${renderTextField("Nome do paciente", "nome_paciente", record.nome_paciente)}
          ${renderNumberField("Idade", "idade", record.idade, 0, 120, 1)}
          ${renderTextField("Diagnostico", "diagnostico", record.diagnostico)}
          ${renderSelectField("Tipo sanguineo", "tipo_sanguineo", record.tipo_sanguineo, bloodTypes)}
          ${renderBooleanField("Necessita medula", "necessita_medula", record.necessita_medula)}
          ${renderTextField("Hospital", "hospital", record.hospital)}
          ${renderTextField("Cidade", "cidade", record.cidade)}
          ${renderTextField("Estado", "estado", record.estado)}
          ${renderTextField("Nome do medico", "nome_medico", record.nome_medico)}
          ${renderTextField("CRM do medico", "crm_medico", record.crm_medico)}
          ${renderTextField("Telefone responsavel", "telefone_responsavel", record.telefone_responsavel, "tel")}
          ${renderBooleanField("Contato WhatsApp", "contato_whatsapp_realizado", record.contato_whatsapp_realizado, "Realizado", "Pendente")}
          ${renderSelectField("Status", "status", record.status, patientStatuses, getPatientStatusLabel)}
        `}
      </div>
      ${renderTextareaField("Observacoes", "observacoes", record.observacoes)}
      <div class="form-actions">
        <button class="action-button ghost" type="button" id="btnCancelEntityForm">Cancelar</button>
        <button class="action-button primary" type="submit" ${submitting ? "disabled" : ""}>
          <i data-lucide="${submitting ? "loader-circle" : "save"}"></i>
          <span>${submitting ? "Salvando..." : "Salvar alteracoes"}</span>
        </button>
      </div>
    </form>
  `;
}

async function handleEntityFormSubmit(event) {
  if (event.target.id !== "entityForm" || !state.formContext) return;
  event.preventDefault();

  const { entityType, recordId, returnToMatchingPatientId } = state.formContext;
  const record = getRecordForEntity(entityType, recordId);
  if (!record) return;

  const formData = new FormData(event.target);
  const payload = entityType === "donor"
    ? buildDonorPayload(formData)
    : buildPatientPayload(formData);

  state.formContext = {
    ...state.formContext,
    submitting: true
  };
  renderEntityFormModal();

  try {
    const updatedRecord = entityType === "donor"
      ? await updateDonorRecord(recordId, payload)
      : await updatePatientRecord(recordId, payload);

    replaceRecordInState(entityType, updatedRecord);
    populateFilters();
    state.formContext = null;
    renderAll();
    showToast(entityType === "donor" ? "Doador atualizado com sucesso." : "Paciente atualizado com sucesso.");

    if (entityType === "donor" && returnToMatchingPatientId) {
      openMatchingModal(returnToMatchingPatientId);
    } else {
      closeModal();
    }
  } catch (error) {
    console.error(`[${entityType}] handleEntityFormSubmit`, error);
    state.formContext = {
      ...state.formContext,
      submitting: false
    };
    renderEntityFormModal();
    showToast(error.message || "Nao foi possivel salvar as alteracoes.", "error");
  }
}

async function handleDeleteEntity(entityType, id, name) {
  if (isDemoId(id)) {
    showToast("Este e um registro ficticio de demonstracao e nao pode ser excluido no banco.", "error");
    return;
  }

  const label = entityType === "donor" ? "doador" : "paciente";
  const confirmed = window.confirm(`Excluir ${label} ${name || "selecionado"}?`);
  if (!confirmed) return;

  try {
    if (entityType === "donor") {
      await deleteDonorRecord(id);
    } else {
      await deletePatientRecord(id);
    }

    removeRecordFromState(entityType, id);
    populateFilters();
    state.formContext = null;
    state.matchingContext = null;
    renderAll();
    closeModal();
    showToast(entityType === "donor" ? "Doador excluido com sucesso." : "Paciente excluido com sucesso.");
  } catch (error) {
    console.error(`[${entityType}] handleDeleteEntity`, error);
    showToast(error.message || "Nao foi possivel excluir o registro.", "error");
  }
}

function openMatchingModal(patientId) {
  const patient = findRecordById(getDisplayPatients(), patientId);
  if (!patient) return;

  state.formContext = null;
  state.matchingContext = {
    patientId: String(patient.id),
    patient,
    matches: findCompatibleDonors(patient)
  };

  renderMatchingModal();
}

function syncMatchingContext() {
  if (!state.matchingContext?.patientId) return;

  const patient = findRecordById(getDisplayPatients(), state.matchingContext.patientId);
  if (!patient) {
    state.matchingContext = null;
    closeModal();
    return;
  }

  state.matchingContext = {
    patientId: String(patient.id),
    patient,
    matches: findCompatibleDonors(patient)
  };
}

function renderMatchingModal() {
  if (!state.matchingContext) return;

  const { patient, matches } = state.matchingContext;
  openModal({
    kicker: "Matching",
    title: `Doadores compativeis para ${patient.nome_paciente || "Paciente"}`,
    bodyMarkup: buildMatchingModalMarkup(patient, matches),
    modalClass: "matching-modal",
    bodyClass: "matching-body"
  });
}

function buildMatchingModalMarkup(patient, matches) {
  const cityState = `${patient.cidade || "-"} / ${patient.estado || "-"}`;
  const groups = groupMatchesByPriority(matches);
  const emptyState = `
    <div class="matching-empty">
      <strong>Nao encontramos doadores recomendados.</strong>
      <p>Ative o Modo Demo/Teste para validar cenarios FIC ou acompanhe novos cadastros reais.</p>
    </div>
  `;

  return `
    <div class="matching-shell">
      <section class="matching-summary-card">
        <div class="matching-summary-header">
          <div>
            <p class="eyebrow">Paciente ${isDemoRecord(patient) ? "- FIC" : "- real"}</p>
            <h3>${escapeHtml(patient.nome_paciente || "-")}</h3>
            <p class="modal-subtitle">Lista por score: proximidade, consentimento, canal, historico e necessidade clinica.</p>
          </div>
          <button class="action-button secondary" type="button" data-matching-action="export-csv">
            <i data-lucide="file-down"></i>
            <span>Exportar lista CSV</span>
          </button>
        </div>
        <div class="matching-summary-grid">
          ${summaryTile("Hospital", patient.hospital || "-")}
          ${summaryTile("Cidade/Estado", cityState)}
          ${summaryTile("Necessidade", patient.tipo_necessidade || "-")}
          ${summaryTile("Urgencia", patient.urgencia || "-")}
          ${summaryTile("Tipo sanguineo", patient.tipo_sanguineo || "-")}
          ${summaryTile("Total encontrados", formatNumber(matches.length))}
          ${summaryTile("Alta prioridade", formatNumber(groups.high.length))}
          ${summaryTile("Media prioridade", formatNumber(groups.medium.length))}
          ${summaryTile("Baixa prioridade", formatNumber(groups.low.length))}
        </div>
      </section>
      <section class="matching-results">
        ${matches.length ? buildMatchingPrioritySections(patient, groups) : emptyState}
      </section>
    </div>
  `;
}

function buildMatchingPrioritySections(patient, groups) {
  return [
    ["Alta prioridade", groups.high],
    ["Media prioridade", groups.medium],
    ["Baixa prioridade", groups.low]
  ].filter(([, items]) => items.length)
    .map(([title, items]) => `
      <div class="priority-section">
        <div class="priority-section-header">
          <h4>${escapeHtml(title)}</h4>
          <span class="badge info">${formatNumber(items.length)}</span>
        </div>
        ${items.map((match) => buildMatchingRow(patient, match)).join("")}
      </div>
    `).join("");
}

function buildMatchingRow(patient, match) {
  const donor = match.donor;
  const phoneAvailable = Boolean(getWhatsAppPhone(donor.telefone));
  const priority = getPriorityLabel(match.score);

  return `
    <article class="matching-row">
      <div class="matching-row-main">
        <div class="matching-row-title">
          <strong>${escapeHtml(donor.nome || "-")}</strong>
          ${demoBadge(donor)}
          <span class="badge ${priority.className}">${priority.label}</span>
          <span class="badge ${donor.contato_whatsapp_realizado ? "positive" : "warning"}">${donor.contato_whatsapp_realizado ? "Realizado" : "Pendente"}</span>
          <span class="badge ${donor.consentimento_contato === false ? "danger" : "positive"}">Consentimento: ${donor.consentimento_contato === false ? "Nao" : "Sim"}</span>
          ${donor.quer_doar_medula ? `<span class="badge positive">Medula</span>` : ""}
        </div>
        <div class="matching-row-meta">
          <span>${escapeHtml(donor.telefone || "-")}</span>
          <span>${escapeHtml(donor.cidade || "-")} / ${escapeHtml(donor.estado || "-")}</span>
          <span>${escapeHtml(donor.bairro || "Bairro nao informado")}</span>
          <span>${escapeHtml(donor.tipo_sanguineo || "-")}</span>
          <span>Score ${formatNumber(match.score)}</span>
        </div>
        <div class="matching-tags">
          ${match.reasons.map((item) => `<span class="matching-tag">${escapeHtml(item)}</span>`).join("")}
        </div>
      </div>
      <div class="matching-row-actions">
        <button class="action-button primary" type="button" ${phoneAvailable ? "" : "disabled"} data-matching-action="open-whatsapp" data-donor-id="${escapeHtml(donor.id)}">
          <i data-lucide="message-circle"></i>
          <span>Enviar WhatsApp</span>
        </button>
        <button class="action-button secondary" type="button" data-matching-action="copy-message" data-donor-id="${escapeHtml(donor.id)}">
          <i data-lucide="copy"></i>
          <span>Copiar mensagem</span>
        </button>
        <button class="action-button ghost" type="button" data-matching-action="mark-contacted" data-donor-id="${escapeHtml(donor.id)}" ${state.isUpdatingMatch ? "disabled" : ""}>
          <i data-lucide="check-check"></i>
          <span>Marcar contato realizado</span>
        </button>
        <button class="action-button ghost" type="button" data-matching-action="view-donor" data-donor-id="${escapeHtml(donor.id)}">
          <i data-lucide="eye"></i>
          <span>Ver detalhes do doador</span>
        </button>
        <button class="action-button ghost" type="button" data-matching-action="edit-donor" data-donor-id="${escapeHtml(donor.id)}" ${isDemoRecord(donor) ? "disabled" : ""}>
          <i data-lucide="pencil"></i>
          <span>Editar doador</span>
        </button>
      </div>
    </article>
  `;
}

function summaryTile(label, value) {
  return `
    <div class="detail-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function findCompatibleDonors(patient) {
  const compatibleTypes = bloodCompatibility[patient.tipo_sanguineo] || [];
  const normalizedPatientCity = normalizeText(patient.cidade).trim();
  const normalizedPatientState = normalizeText(patient.estado).trim();
  const normalizedPatientNeighborhood = normalizeText(patient.bairro).trim();
  const marrowNeed = isMarrowNeed(patient);

  return getDisplayDonors()
    .map((donor) => {
      const result = scoreDonorForPatient({
        donor,
        compatibleTypes,
        marrowNeed,
        normalizedPatientCity,
        normalizedPatientState,
        normalizedPatientNeighborhood
      });

      return { donor, ...result };
    })
    .filter((match) => match.score > 0 && !match.blocked)
    .sort((left, right) => right.score - left.score)
    .slice(0, 30);
}

function scoreDonorForPatient({
  donor,
  compatibleTypes,
  marrowNeed,
  normalizedPatientCity,
  normalizedPatientState,
  normalizedPatientNeighborhood
}) {
  let score = 0;
  const reasons = [];
  const donorCity = normalizeText(donor.cidade).trim();
  const donorState = normalizeText(donor.estado).trim();
  const donorNeighborhood = normalizeText(donor.bairro).trim();
  const sameCity = donorCity && donorCity === normalizedPatientCity;
  const sameState = donorState && donorState === normalizedPatientState;
  const sameNeighborhood = donorNeighborhood && donorNeighborhood === normalizedPatientNeighborhood;
  const bloodCompatible = compatibleTypes.includes(donor.tipo_sanguineo);

  if (sameCity) addScore(50, "Mesma cidade");
  if (sameNeighborhood) addScore(25, "Mesmo bairro");
  if (sameState) addScore(20, "Mesmo estado");

  if (!marrowNeed && bloodCompatible) addScore(25, "Tipo sanguineo compativel");
  if (donor.ja_doador_sangue) addScore(20, "Ja doa sangue");
  if (donor.quer_doar_sangue) addScore(20, "Quer doar sangue");
  if (donor.consentimento_contato) addScore(25, "Consentimento ativo");
  if (donor.quer_receber_campanhas) addScore(20, "Aceita campanhas");
  if (marrowNeed && donor.quer_doar_medula) addScore(20, "Interesse em medula");
  if (normalizeText(donor.canal_preferido).includes("whatsapp")) addScore(10, "Canal WhatsApp");
  if (!donor.contato_whatsapp_realizado) addScore(10, "WhatsApp pendente");

  if (wasRecentlyNotified(donor.ultima_notificacao_em)) {
    score -= 30;
    reasons.push("Contato recente -30");
  }

  if (donor.opt_out) {
    score -= 100;
    reasons.push("Opt-out -100");
  }

  if (!marrowNeed && !bloodCompatible) score -= 40;
  if (!sameState) score -= 20;

  return {
    score,
    reasons,
    blocked: Boolean(donor.opt_out)
  };

  function addScore(points, reason) {
    score += points;
    reasons.push(reason);
  }
}

function isMarrowNeed(patient) {
  const need = normalizeText(patient.tipo_necessidade);
  return Boolean(patient.necessita_medula)
    || need.includes("medula")
    || need.includes("campanha_cadastro_medula");
}

function wasRecentlyNotified(value) {
  if (!value) return false;
  const notifiedAt = new Date(value);
  if (Number.isNaN(notifiedAt.getTime())) return false;
  return (Date.now() - notifiedAt.getTime()) <= 7 * 24 * 60 * 60 * 1000;
}

function groupMatchesByPriority(matches) {
  return {
    high: matches.filter((match) => match.score >= 120),
    medium: matches.filter((match) => match.score >= 80 && match.score < 120),
    low: matches.filter((match) => match.score < 80)
  };
}

function getPriorityLabel(score) {
  if (score >= 120) return { label: "Alta prioridade", className: "positive" };
  if (score >= 80) return { label: "Media prioridade", className: "warning" };
  return { label: "Baixa prioridade", className: "info" };
}

function handleMatchingAction(action, button) {
  if (!state.matchingContext?.patient) return;

  const donorId = button.dataset.donorId;
  const donor = donorId ? findRecordById(getDisplayDonors(), donorId) : null;
  const patient = state.matchingContext.patient;

  if (action === "export-csv") {
    exportMatchingCsv();
    return;
  }

  if (!donor) return;

  if (action === "copy-message") {
    copyMatchingMessage(patient, donor);
    return;
  }

  if (action === "open-whatsapp") {
    const link = getWhatsAppLink(patient, donor);
    if (!link) {
      showToast("Telefone do doador nao disponivel para WhatsApp.", "error");
      return;
    }
    if (isDemoRecord(patient) || isDemoRecord(donor)) {
      showToast("Dado ficticio de demonstracao.", "success");
    }
    window.open(link, "_blank", "noopener,noreferrer");
    return;
  }

  if (action === "mark-contacted") {
    updateMatchingDonor(donor, true);
    return;
  }

  if (action === "view-donor") {
    openDetails("donor", donor.id);
    return;
  }

  if (action === "edit-donor") {
    openEditModal("donor", donor.id, {
      returnToMatchingPatientId: patient.id
    });
  }
}

async function copyMatchingMessage(patient, donor) {
  const message = buildWhatsAppMessage(patient, donor);
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(message);
    } else {
      const field = document.createElement("textarea");
      field.value = message;
      document.body.appendChild(field);
      field.select();
      document.execCommand("copy");
      field.remove();
    }
    showToast("Mensagem copiada.");
  } catch (error) {
    console.error("[Matching] copyMatchingMessage", error);
    showToast("Nao foi possivel copiar a mensagem.", "error");
  }
}

async function updateMatchingDonor(donor, completed) {
  if (isDemoRecord(donor)) {
    showToast("Dado ficticio de demonstracao: o contato nao sera salvo no Supabase.", "error");
    return;
  }

  state.isUpdatingMatch = true;
  renderMatchingModal();

  try {
    const updatedDonor = await updateDonorContactStatus(donor, completed);
    replaceRecordInState("donor", updatedDonor);
    populateFilters();
    renderAll();
    showToast("Contato WhatsApp atualizado.");
  } catch (error) {
    console.error("[Matching] updateMatchingDonor", error);
    showToast(error.message || "Nao foi possivel atualizar o contato do doador.", "error");
  } finally {
    state.isUpdatingMatch = false;
    if (state.matchingContext) {
      renderMatchingModal();
    }
  }
}

function buildWhatsAppMessage(patient, donor) {
  const canDisclose = patient.autorizacao_divulgacao !== false;
  const patientLabel = canDisclose && patient.usar_nome_paciente !== false
    ? patient.nome_paciente || "um paciente"
    : "um paciente";
  const publicBase = canDisclose && patient.mensagem_publica
    ? patient.mensagem_publica
    : `Temos ${patientLabel} precisando de apoio para ${patient.tipo_necessidade || "doacao"} no hospital ${patient.hospital || "-"}, em ${patient.cidade || "-"}/${patient.estado || "-"}.`;

  const bloodLine = canDisclose && patient.tipo_sanguineo
    ? `Tipo sanguineo informado: ${patient.tipo_sanguineo}.`
    : "";

  return `Ola, ${donor.nome || "doador"}. Aqui e da equipe Flamedula.

${publicBase}
${bloodLine}

Voce se cadastrou como possivel doador na nossa base.
Pode receber as orientacoes para verificar se consegue ajudar?

Responda:
1 - Tenho interesse
2 - Nao posso agora
3 - Nao quero receber novos contatos`;
}

function getWhatsAppPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
}

function getWhatsAppLink(patient, donor) {
  const phone = getWhatsAppPhone(donor.telefone);
  if (!phone) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(buildWhatsAppMessage(patient, donor))}`;
}

function openDonorWhatsApp(donorId) {
  const donor = findRecordById(getDisplayDonors(), donorId);
  if (!donor) return;

  const phone = getWhatsAppPhone(donor.telefone);
  if (!phone) {
    showToast("Telefone do doador nao disponivel para WhatsApp.", "error");
    return;
  }

  if (isDemoRecord(donor)) {
    showToast("Dado ficticio de demonstracao.", "success");
  }

  const message = `Ola, ${donor.nome || "doador"}. Aqui e da equipe Flamedula. Podemos falar sobre seu cadastro de doacao?`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function openPatientWhatsApp(patientId) {
  const patient = findRecordById(getDisplayPatients(), patientId);
  if (!patient) return;

  const phone = getWhatsAppPhone(patient.telefone_responsavel);
  if (!phone) {
    showToast("Telefone do responsavel nao disponivel para WhatsApp.", "error");
    return;
  }

  if (isDemoRecord(patient)) {
    showToast("Dado ficticio de demonstracao.", "success");
  }

  const patientLabel = patient.autorizacao_divulgacao !== false && patient.usar_nome_paciente !== false
    ? patient.nome_paciente || "paciente"
    : "um paciente";
  const message = `Ola. Aqui e da equipe Flamedula sobre o caso de ${patientLabel}. Podemos alinhar as informacoes do cadastro?`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function exportMatchingCsv() {
  const context = state.matchingContext;
  if (!context) return;

  if (!context.matches.length) {
    showToast("Nao ha dados para exportar", "error");
    return;
  }

  const rows = context.matches.map((match) => ({
    paciente: context.patient.nome_paciente,
    hospital: context.patient.hospital,
    paciente_cidade: context.patient.cidade,
    paciente_estado: context.patient.estado,
    paciente_tipo_sanguineo: context.patient.tipo_sanguineo,
    doador: match.donor.nome,
    telefone: match.donor.telefone,
    cidade: match.donor.cidade,
    estado: match.donor.estado,
    bairro: match.donor.bairro,
    tipo_sanguineo: match.donor.tipo_sanguineo,
    score: match.score,
    prioridade: getPriorityLabel(match.score).label,
    motivos: match.reasons.join(" | "),
    fic: isDemoRecord(match.donor) ? "Sim" : "Nao",
    quer_doar_medula: yesNo(match.donor.quer_doar_medula),
    contato_whatsapp: match.donor.contato_whatsapp_realizado ? "Realizado" : "Pendente",
    mesma_cidade: match.sameCity ? "Sim" : "Nao"
  }));

  downloadCSV(toCsv(rows, [
    { label: "paciente", value: "paciente" },
    { label: "hospital", value: "hospital" },
    { label: "paciente_cidade", value: "paciente_cidade" },
    { label: "paciente_estado", value: "paciente_estado" },
    { label: "paciente_tipo_sanguineo", value: "paciente_tipo_sanguineo" },
    { label: "doador", value: "doador" },
    { label: "telefone", value: "telefone" },
    { label: "cidade", value: "cidade" },
    { label: "estado", value: "estado" },
    { label: "bairro", value: "bairro" },
    { label: "tipo_sanguineo", value: "tipo_sanguineo" },
    { label: "score", value: "score" },
    { label: "prioridade", value: "prioridade" },
    { label: "motivos", value: "motivos" },
    { label: "fic", value: "fic" },
    { label: "quer_doar_medula", value: "quer_doar_medula" },
    { label: "contato_whatsapp", value: "contato_whatsapp" },
    { label: "mesma_cidade", value: "mesma_cidade" }
  ]), `flamedula_matching_${slugify(context.patient.nome_paciente || "paciente")}.csv`);

  showToast("CSV do matching gerado.");
}

function exportActiveTab() {
  const exporters = {
    overview: () => exportDonorsCsv(getGlobalDonors(), "flamedula_visao_geral_doadores.csv"),
    donors: () => exportDonorsCsv(getFilteredDonors(), "flamedula_doadores.csv"),
    patients: () => exportPatientsCsv(getGlobalPatients(), "flamedula_pacientes.csv"),
    donations: () => exportDonationsCsv(getFilteredDonations(), "flamedula_doacoes.csv"),
    regions: () => exportDonorsCsv(getGlobalDonors(), "flamedula_regioes.csv"),
    reports: exportReportCsv,
    settings: () => showToast("Nao ha dados para exportar", "error")
  };

  exporters[state.activeTab]?.();
}

function exportDonorsCsv(rows, filename) {
  if (!rows.length) {
    showToast("Nao ha dados para exportar", "error");
    return;
  }

  downloadCSV(toCsv(rows, [
    { label: "id", value: "id" },
    { label: "created_at", value: "created_at" },
    { label: "nome", value: "nome" },
    { label: "email", value: "email" },
    { label: "telefone", value: "telefone" },
    { label: "cidade", value: "cidade" },
    { label: "estado", value: "estado" },
    { label: "idade", value: "idade" },
    { label: "peso", value: "peso" },
    { label: "tipo_sanguineo", value: "tipo_sanguineo" },
    { label: "ja_doador_sangue", value: (row) => yesNo(row.ja_doador_sangue) },
    { label: "quer_doar_sangue", value: (row) => yesNo(row.quer_doar_sangue) },
    { label: "quer_doar_medula", value: (row) => yesNo(row.quer_doar_medula) },
    { label: "contato_whatsapp_realizado", value: (row) => row.contato_whatsapp_realizado ? "Realizado" : "Pendente" },
    { label: "status", value: "status" },
    { label: "origem", value: "origem" },
    { label: "observacoes", value: "observacoes" }
  ]), filename);

  showToast("CSV gerado com dados reais.");
}

function exportPatientsCsv(rows, filename) {
  if (!rows.length) {
    showToast("Nao ha dados para exportar", "error");
    return;
  }

  downloadCSV(toCsv(rows, [
    { label: "id", value: "id" },
    { label: "created_at", value: "created_at" },
    { label: "nome_paciente", value: "nome_paciente" },
    { label: "idade", value: "idade" },
    { label: "diagnostico", value: "diagnostico" },
    { label: "tipo_sanguineo", value: "tipo_sanguineo" },
    { label: "necessita_medula", value: (row) => yesNo(row.necessita_medula) },
    { label: "hospital", value: "hospital" },
    { label: "cidade", value: "cidade" },
    { label: "estado", value: "estado" },
    { label: "nome_medico", value: "nome_medico" },
    { label: "crm_medico", value: "crm_medico" },
    { label: "telefone_responsavel", value: "telefone_responsavel" },
    { label: "contato_whatsapp_realizado", value: (row) => row.contato_whatsapp_realizado ? "Realizado" : "Pendente" },
    { label: "status", value: "status" },
    { label: "origem", value: "origem" },
    { label: "observacoes", value: "observacoes" }
  ]), filename);

  showToast("CSV gerado com dados reais.");
}

function exportDonationsCsv(rows, filename) {
  if (!rows.length) {
    showToast("Nao ha dados para exportar", "error");
    return;
  }

  downloadCSV(toCsv(rows, [
    { label: "id", value: "id" },
    { label: "created_at", value: "created_at" },
    { label: "nome", value: "nome" },
    { label: "email", value: "email" },
    { label: "telefone", value: "telefone" },
    { label: "valor", value: "valor" },
    { label: "metodo_pagamento", value: "metodo_pagamento" },
    { label: "status_pagamento", value: "status_pagamento" },
    { label: "payment_id", value: "payment_id" },
    { label: "origem", value: "origem" }
  ]), filename);

  showToast("CSV gerado com dados reais.");
}

function exportReportCsv() {
  const rows = [
    ...getReportDonors().map((row) => ({
      tipo_registro: "donor_leads",
      nome: row.nome,
      estado: row.estado,
      tipo_sanguineo: row.tipo_sanguineo,
      status: row.status,
      valor: "",
      created_at: row.created_at
    })),
    ...getReportPatients().map((row) => ({
      tipo_registro: "patients",
      nome: row.nome_paciente,
      estado: row.estado,
      tipo_sanguineo: row.tipo_sanguineo,
      status: row.status,
      valor: "",
      created_at: row.created_at
    })),
    ...getReportDonations().map((row) => ({
      tipo_registro: "monetary_donations",
      nome: row.nome,
      estado: "",
      tipo_sanguineo: "",
      status: row.status_pagamento,
      valor: row.valor,
      created_at: row.created_at
    }))
  ];

  if (!rows.length) {
    showToast("Nao ha dados para exportar", "error");
    return;
  }

  downloadCSV(toCsv(rows, [
    { label: "tipo_registro", value: "tipo_registro" },
    { label: "nome", value: "nome" },
    { label: "estado", value: "estado" },
    { label: "tipo_sanguineo", value: "tipo_sanguineo" },
    { label: "status", value: "status" },
    { label: "valor", value: "valor" },
    { label: "created_at", value: "created_at" }
  ]), "flamedula_relatorio_consolidado.csv");

  showToast("CSV gerado com dados reais.");
}

function renderTextField(label, name, value, type = "text") {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input type="${type}" name="${escapeHtml(name)}" value="${escapeHtml(value ?? "")}">
    </label>
  `;
}

function renderNumberField(label, name, value, min, max, step) {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <input type="number" name="${escapeHtml(name)}" value="${escapeHtml(value ?? "")}" min="${min}" max="${max}" step="${step}">
    </label>
  `;
}

function renderSelectField(label, name, selectedValue, options, labelFn = (value) => value) {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <select name="${escapeHtml(name)}">
        <option value="">Selecione</option>
        ${options.map((option) => `
          <option value="${escapeHtml(option)}" ${String(option) === String(selectedValue || "") ? "selected" : ""}>
            ${escapeHtml(labelFn(option))}
          </option>
        `).join("")}
      </select>
    </label>
  `;
}

function renderBooleanField(label, name, value, trueLabel = "Sim", falseLabel = "Nao") {
  return `
    <label class="field">
      <span>${escapeHtml(label)}</span>
      <select name="${escapeHtml(name)}">
        <option value="true" ${value ? "selected" : ""}>${escapeHtml(trueLabel)}</option>
        <option value="false" ${!value ? "selected" : ""}>${escapeHtml(falseLabel)}</option>
      </select>
    </label>
  `;
}

function renderTextareaField(label, name, value) {
  return `
    <label class="field field-span-2">
      <span>${escapeHtml(label)}</span>
      <textarea name="${escapeHtml(name)}" rows="4">${escapeHtml(value ?? "")}</textarea>
    </label>
  `;
}

function buildDonorPayload(formData) {
  return {
    nome: getStringValue(formData, "nome"),
    email: getStringValue(formData, "email"),
    telefone: getStringValue(formData, "telefone"),
    cidade: getStringValue(formData, "cidade"),
    estado: getStringValue(formData, "estado"),
    idade: getNumberValue(formData, "idade"),
    peso: getNumberValue(formData, "peso"),
    tipo_sanguineo: getStringValue(formData, "tipo_sanguineo"),
    ja_doador_sangue: getBooleanValue(formData, "ja_doador_sangue"),
    quer_doar_sangue: getBooleanValue(formData, "quer_doar_sangue"),
    quer_doar_medula: getBooleanValue(formData, "quer_doar_medula"),
    contato_whatsapp_realizado: getBooleanValue(formData, "contato_whatsapp_realizado"),
    status: getStringValue(formData, "status"),
    observacoes: getNullableStringValue(formData, "observacoes")
  };
}

function buildPatientPayload(formData) {
  return {
    nome_paciente: getStringValue(formData, "nome_paciente"),
    idade: getNumberValue(formData, "idade"),
    diagnostico: getNullableStringValue(formData, "diagnostico"),
    tipo_sanguineo: getStringValue(formData, "tipo_sanguineo"),
    necessita_medula: getBooleanValue(formData, "necessita_medula"),
    hospital: getNullableStringValue(formData, "hospital"),
    cidade: getNullableStringValue(formData, "cidade"),
    estado: getNullableStringValue(formData, "estado"),
    nome_medico: getNullableStringValue(formData, "nome_medico"),
    crm_medico: getNullableStringValue(formData, "crm_medico"),
    telefone_responsavel: getNullableStringValue(formData, "telefone_responsavel"),
    contato_whatsapp_realizado: getBooleanValue(formData, "contato_whatsapp_realizado"),
    status: getStringValue(formData, "status"),
    observacoes: getNullableStringValue(formData, "observacoes")
  };
}

function getStringValue(formData, key) {
  return String(formData.get(key) || "").trim();
}

function getNullableStringValue(formData, key) {
  const value = getStringValue(formData, key);
  return value || null;
}

function getNumberValue(formData, key) {
  const value = String(formData.get(key) || "").trim();
  if (!value) return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function getBooleanValue(formData, key) {
  return String(formData.get(key)) === "true";
}

function getRecordForEntity(entityType, id) {
  return entityType === "donor"
    ? findRecordById(state.donors, id)
    : findRecordById(state.patients, id);
}

function replaceRecordInState(entityType, updatedRecord) {
  if (entityType === "donor") {
    state.donors = state.donors.map((item) => (
      String(item.id) === String(updatedRecord.id) ? { ...item, ...updatedRecord } : item
    ));
    return;
  }

  state.patients = state.patients.map((item) => (
    String(item.id) === String(updatedRecord.id) ? { ...item, ...updatedRecord } : item
  ));
}

function removeRecordFromState(entityType, id) {
  if (entityType === "donor") {
    state.donors = state.donors.filter((item) => String(item.id) !== String(id));
    return;
  }

  state.patients = state.patients.filter((item) => String(item.id) !== String(id));
}

function findRecordById(collection, id) {
  return collection.find((item) => String(item.id) === String(id));
}

function slugify(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    || "registro";
}

function openModal({ kicker, title, bodyMarkup, modalClass = "", bodyClass = "" }) {
  const modal = document.getElementById("detailModal");
  const modalBody = document.getElementById("modalBody");
  if (!modal || !modalBody) return;

  modal.classList.remove("matching-modal", "form-modal");
  modalBody.classList.remove("matching-body", "form-body");

  if (modalClass) modal.classList.add(modalClass);
  if (bodyClass) modalBody.classList.add(bodyClass);

  document.getElementById("modalKicker").textContent = kicker;
  document.getElementById("modalTitle").textContent = title;
  modalBody.innerHTML = bodyMarkup;
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  createIcons();

  document.getElementById("btnCancelEntityForm")?.addEventListener("click", closeModal);
}

function closeModal() {
  state.matchingContext = null;
  state.formContext = null;
  state.isUpdatingMatch = false;

  const modal = document.getElementById("detailModal");
  const modalBody = document.getElementById("modalBody");
  modal?.classList.remove("open", "matching-modal", "form-modal");
  modal?.setAttribute("aria-hidden", "true");
  modalBody?.classList.remove("matching-body", "form-body");
  if (modalBody) modalBody.innerHTML = "";
}

function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}"><div class="empty-row">${escapeHtml(message)}</div></td></tr>`;
}

function emptyListState(message) {
  return `<div class="empty-list-state">${escapeHtml(message)}</div>`;
}

function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
  document.getElementById("sidebarScrim")?.classList.toggle("open");
}

function closeSidebar() {
  document.getElementById("sidebar")?.classList.remove("open");
  document.getElementById("sidebarScrim")?.classList.remove("open");
}

function toggleTheme() {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";
  if (isDark) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("flamedula_theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("flamedula_theme", "dark");
  }
  renderActiveCharts();
}

function createIcons() {
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}
