import { getDashboardData } from "./api.js";
import { handleLogout, requireAuth } from "./auth.js";
import { renderDonationChart, renderOverviewCharts, renderRegionCharts } from "./charts.js";
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
  sortEntriesByValue,
  statusClass,
  sumBy,
  toCsv,
  uniqueSorted,
  yesNo
} from "./utils.js";

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
  donors: [],
  patients: [],
  donations: []
};

const donorSearchFields = ["nome", "telefone", "email", "cidade", "estado", "tipo_sanguineo", "status"];
const patientSearchFields = ["nome_paciente", "diagnostico", "hospital", "cidade", "estado", "tipo_sanguineo", "nome_medico", "crm_medico", "status"];
const donationSearchFields = ["nome", "email", "telefone", "metodo_pagamento", "status_pagamento"];

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  state.session = requireAuth();
  if (!state.session) return;

  document.documentElement.classList.remove("auth-checking");
  document.documentElement.classList.add("auth-ready");
  applySavedTheme();
  bindEvents();

  const data = await getDashboardData();
  state.donors = data.donorLeads;
  state.patients = data.patients;
  state.donations = data.monetaryDonations;

  populateFilters();
  setActiveTab(location.hash.replace("#", "") || "overview", false);
  renderAll();
  createIcons();
}

function applySavedTheme() {
  const theme = localStorage.getItem("flamedula_theme");
  if (theme === "dark") {
    document.documentElement.setAttribute("data-theme", "dark");
  }
}

function bindEvents() {
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => setActiveTab(button.dataset.tab));
  });

  document.getElementById("btnMobileMenu")?.addEventListener("click", toggleSidebar);
  document.getElementById("sidebarScrim")?.addEventListener("click", closeSidebar);
  document.getElementById("btnLogout")?.addEventListener("click", handleLogout);
  document.getElementById("btnTheme")?.addEventListener("click", toggleTheme);
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
  bindFilter("reportPeriodFilter", "reportFilters", "periodo");
  bindFilter("reportStateFilter", "reportFilters", "estado");
  bindFilter("reportBloodFilter", "reportFilters", "tipo_sanguineo");

  document.getElementById("btnClearDonorFilters")?.addEventListener("click", () => {
    state.donorFilters = { estado: "", tipo_sanguineo: "", quer_doar_medula: "", status: "", contato_whatsapp: "" };
    ["donorStateFilter", "donorBloodFilter", "donorStatusFilter", "donorMarrowFilter", "donorWhatsappFilter"].forEach((id) => {
      document.getElementById(id).value = "";
    });
    renderAll();
  });

  document.addEventListener("click", handleTableAction);
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

  if (updateHash) history.replaceState(null, "", `#${target}`);
  closeSidebar();
  renderActiveCharts();
  createIcons();
}

function renderAll() {
  renderOverview();
  renderDonors();
  renderPatients();
  renderDonations();
  renderRegions();
  renderReports();
  renderActiveCharts();
  createIcons();
}

function renderOverview() {
  const donors = getGlobalDonors();
  const patients = getGlobalPatients();
  const donations = getGlobalDonations();
  const paidDonations = donations.filter((donation) => donation.status_pagamento === "pago");
  const pendingDonations = donations.filter((donation) => donation.status_pagamento === "pendente");
  const whatsappDone = donors.filter((donor) => donor.contato_whatsapp_realizado).length;
  const whatsappPending = donors.length - whatsappDone;

  renderMetrics("overviewMetrics", [
    { label: "Total de doadores", value: donors.length, detail: "Leads mockados", icon: "users", tone: "red", featured: true },
    { label: "Já doam sangue", value: donors.filter((donor) => donor.ja_doador_sangue).length, detail: "Histórico positivo", icon: "droplet", tone: "green" },
    { label: "Interessados em medula", value: donors.filter((donor) => donor.quer_doar_medula).length, detail: "Potencial REDOME", icon: "heart", tone: "red" },
    { label: "Pacientes cadastrados", value: patients.length, detail: "Casos em acompanhamento", icon: "activity", tone: "blue" },
    { label: "WhatsApp realizado", value: whatsappDone, detail: "Contatos já orientados", icon: "message-circle", tone: "green" },
    { label: "WhatsApp pendente", value: whatsappPending, detail: "Contatos aguardando retorno", icon: "clock", tone: "yellow" },
    { label: "Valor total arrecadado", value: sumBy(paidDonations, "valor"), detail: "Pagamentos confirmados", icon: "dollar-sign", tone: "green", format: "currency" },
    { label: "Doações pendentes", value: pendingDonations.length, detail: "Aguardando confirmação", icon: "clock", tone: "yellow" }
  ]);

  const update = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date());
  document.getElementById("lastUpdate").textContent = `Atualizado em ${update}`;
}

function renderDonors() {
  const donors = getFilteredDonors();
  document.getElementById("donorResultCount").textContent = `${formatNumber(donors.length)} registros`;

  const tbody = document.getElementById("donorsTableBody");
  if (!tbody) return;

  tbody.innerHTML = donors
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((donor) => `
      <tr>
        <td><div class="cell-main"><strong>${escapeHtml(donor.nome)}</strong><small>${escapeHtml(donor.id)}</small></div></td>
        <td>${escapeHtml(donor.telefone)}</td>
        <td>${escapeHtml(donor.email)}</td>
        <td>${escapeHtml(donor.cidade)}/${escapeHtml(donor.estado)}</td>
        <td>${donor.idade}</td>
        <td>${donor.peso} kg</td>
        <td><strong>${escapeHtml(donor.tipo_sanguineo)}</strong></td>
        <td>${yesNo(donor.ja_doador_sangue)}</td>
        <td>${yesNo(donor.quer_doar_medula)}</td>
        <td><span class="badge ${donor.contato_whatsapp_realizado ? "positive" : "warning"}">${donor.contato_whatsapp_realizado ? "Realizado" : "Pendente"}</span></td>
        <td><span class="badge ${statusClass(donor.status)}">${getDonorStatusLabel(donor.status)}</span></td>
        <td>${formatDate(donor.created_at)}</td>
        <td>
          <div class="row-actions">
            <button class="icon-button" type="button" title="Visualizar" data-detail-type="donor" data-id="${donor.id}"><i data-lucide="eye"></i></button>
            <button class="icon-button" type="button" title="Editar fake" data-edit-fake="donor"><i data-lucide="pencil"></i></button>
          </div>
        </td>
      </tr>
    `)
    .join("") || emptyRow(13, "Nenhum doador encontrado com os filtros atuais.");
}

function renderPatients() {
  const patients = getGlobalPatients();
  renderMetrics("patientMetrics", [
    { label: "Pacientes em análise", value: patients.filter((patient) => patient.status === "em_analise").length, detail: "Triagem ativa", icon: "clipboard", tone: "yellow" },
    { label: "Pacientes urgentes", value: patients.filter((patient) => patient.status === "urgente").length, detail: "Prioridade clínica", icon: "alert-triangle", tone: "red", featured: true },
    { label: "Precisam de medula", value: patients.filter((patient) => patient.necessita_medula).length, detail: "Demanda compatível", icon: "activity", tone: "blue" },
    { label: "Hospitais cadastrados", value: uniqueSorted(patients, "hospital").length, detail: "Rede de atendimento", icon: "building", tone: "green" }
  ]);

  const tbody = document.getElementById("patientsTableBody");
  if (!tbody) return;

  tbody.innerHTML = patients
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((patient) => `
      <tr>
        <td><div class="cell-main"><strong>${escapeHtml(patient.nome_paciente)}</strong><small>${formatDate(patient.created_at)}</small></div></td>
        <td>${patient.idade}</td>
        <td>${escapeHtml(patient.diagnostico)}</td>
        <td>${escapeHtml(patient.hospital)}</td>
        <td>${escapeHtml(patient.cidade)}/${escapeHtml(patient.estado)}</td>
        <td><strong>${escapeHtml(patient.tipo_sanguineo)}</strong></td>
        <td>${yesNo(patient.necessita_medula)}</td>
        <td><span class="badge ${patient.contato_whatsapp_realizado ? "positive" : "warning"}">${patient.contato_whatsapp_realizado ? "Realizado" : "Pendente"}</span></td>
        <td>${escapeHtml(patient.nome_medico)}</td>
        <td>${escapeHtml(patient.crm_medico)}</td>
        <td><span class="badge ${statusClass(patient.status)}">${getPatientStatusLabel(patient.status)}</span></td>
        <td><button class="icon-button" type="button" title="Visualizar" data-detail-type="patient" data-id="${patient.id}"><i data-lucide="eye"></i></button></td>
      </tr>
    `)
    .join("") || emptyRow(12, "Nenhum paciente encontrado.");
}

function renderDonations() {
  const donations = getGlobalDonations();
  const paidDonations = donations.filter((donation) => donation.status_pagamento === "pago");
  const total = sumBy(paidDonations, "valor");

  renderMetrics("donationMetrics", [
    { label: "Total arrecadado", value: total, detail: "Pagamentos confirmados", icon: "dollar-sign", tone: "green", featured: true, format: "currency" },
    { label: "Quantidade de doações", value: donations.length, detail: "Registros monetários", icon: "receipt", tone: "blue" },
    { label: "Ticket médio", value: paidDonations.length ? total / paidDonations.length : 0, detail: "Média confirmada", icon: "calculator", tone: "red", format: "currency" },
    { label: "Doações pendentes", value: donations.filter((donation) => donation.status_pagamento === "pendente").length, detail: "Aguardando pagamento", icon: "clock", tone: "yellow" }
  ]);

  const tbody = document.getElementById("donationsTableBody");
  if (!tbody) return;

  tbody.innerHTML = donations
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((donation) => `
      <tr>
        <td><strong>${escapeHtml(donation.nome)}</strong></td>
        <td>${escapeHtml(donation.email)}</td>
        <td>${escapeHtml(donation.telefone)}</td>
        <td>${formatCurrency(donation.valor)}</td>
        <td>${escapeHtml(donation.metodo_pagamento)}</td>
        <td><span class="badge ${statusClass(donation.status_pagamento)}">${getPaymentStatusLabel(donation.status_pagamento)}</span></td>
        <td>${formatDate(donation.created_at)}</td>
        <td><button class="icon-button" type="button" title="Visualizar" data-detail-type="donation" data-id="${donation.id}"><i data-lucide="eye"></i></button></td>
      </tr>
    `)
    .join("") || emptyRow(8, "Nenhuma doação encontrada.");
}

function renderRegions() {
  const donors = getGlobalDonors();
  const patients = getGlobalPatients();

  renderRanking("stateRanking", sortEntriesByValue(countBy(donors, "estado"), 6));
  renderRanking("cityRanking", sortEntriesByValue(countBy(donors.map((donor) => ({ cidade_estado: `${donor.cidade}/${donor.estado}` })), "cidade_estado"), 6));
  renderRanking("patientStateRanking", sortEntriesByValue(countBy(patients, "estado"), 6));
  renderRanking("bloodDemandRanking", sortEntriesByValue(countBy(patients, "tipo_sanguineo"), 8));
}

function renderReports() {
  const donors = getReportDonors();
  const patients = getReportPatients();
  const donations = getReportDonations();
  const paid = donations.filter((donation) => donation.status_pagamento === "pago");
  const marrow = donors.filter((donor) => donor.quer_doar_medula).length;
  const urgent = patients.filter((patient) => patient.status === "urgente").length;
  const raised = sumBy(paid, "valor");

  document.getElementById("reportSummaryText").textContent =
    `No recorte atual, há ${formatNumber(donors.length)} doadores, ${formatNumber(marrow)} interessados em doar medula, ` +
    `${formatNumber(patients.length)} pacientes acompanhados e ${formatCurrency(raised)} confirmados em doações monetárias. ` +
    `${formatNumber(urgent)} pacientes estão marcados como urgentes.`;

  renderMetrics("reportMetrics", [
    { label: "Doadores no recorte", value: donors.length, detail: "Filtro aplicado", icon: "users", tone: "red" },
    { label: "Interesse em medula", value: marrow, detail: "Dentro do recorte", icon: "heart", tone: "blue" },
    { label: "Pacientes urgentes", value: urgent, detail: "Prioridade", icon: "alert-triangle", tone: "red", featured: true },
    { label: "Arrecadação no período", value: raised, detail: "Pagos", icon: "dollar-sign", tone: "green", format: "currency" }
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
      element.textContent = format === "currency" ? formatCurrency(value) : formatNumber(Math.round(value));
      if (progress < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  });
}

function normalizeSearch(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function matchesRecordQuery(record, fields, query) {
  if (includesQuery(record, fields, query)) return true;

  const normalizedQuery = normalizeSearch(query);
  if (!normalizedQuery) return true;

  const whatsappTerms = record.contato_whatsapp_realizado
    ? "whatsapp contato realizado orientacao"
    : "whatsapp contato pendente orientacao";

  return whatsappTerms.includes(normalizedQuery);
}

function getGlobalDonors() {
  return state.donors.filter((donor) => matchesRecordQuery(donor, donorSearchFields, state.globalQuery));
}

function getGlobalPatients() {
  return state.patients.filter((patient) => matchesRecordQuery(patient, patientSearchFields, state.globalQuery));
}

function getGlobalDonations() {
  return state.donations.filter((donation) => includesQuery(donation, donationSearchFields, state.globalQuery));
}

function getFilteredDonors() {
  return getGlobalDonors().filter((donor) => {
    const marrow = state.donorFilters.quer_doar_medula;
    const whatsapp = state.donorFilters.contato_whatsapp;
    return (!state.donorFilters.estado || donor.estado === state.donorFilters.estado) &&
      (!state.donorFilters.tipo_sanguineo || donor.tipo_sanguineo === state.donorFilters.tipo_sanguineo) &&
      (!state.donorFilters.status || donor.status === state.donorFilters.status) &&
      (!marrow || donor.quer_doar_medula === (marrow === "sim")) &&
      (!whatsapp || donor.contato_whatsapp_realizado === (whatsapp === "realizado"));
  });
}

function getReportDonors() {
  return getGlobalDonors().filter((donor) =>
    isWithinDays(donor.created_at, state.reportFilters.periodo) &&
    (!state.reportFilters.estado || donor.estado === state.reportFilters.estado) &&
    (!state.reportFilters.tipo_sanguineo || donor.tipo_sanguineo === state.reportFilters.tipo_sanguineo)
  );
}

function getReportPatients() {
  return getGlobalPatients().filter((patient) =>
    isWithinDays(patient.created_at, state.reportFilters.periodo) &&
    (!state.reportFilters.estado || patient.estado === state.reportFilters.estado) &&
    (!state.reportFilters.tipo_sanguineo || patient.tipo_sanguineo === state.reportFilters.tipo_sanguineo)
  );
}

function getReportDonations() {
  return getGlobalDonations().filter((donation) => isWithinDays(donation.created_at, state.reportFilters.periodo));
}

function populateFilters() {
  setOptions("donorStateFilter", uniqueSorted(state.donors, "estado"), "Todos os estados");
  setOptions("donorBloodFilter", uniqueSorted(state.donors, "tipo_sanguineo"), "Todos os tipos");
  setOptions("donorStatusFilter", uniqueSorted(state.donors, "status"), "Todos os status", getDonorStatusLabel);
  setOptions("reportStateFilter", uniqueSorted(state.donors, "estado"), "Todos os estados");
  setOptions("reportBloodFilter", uniqueSorted(state.donors, "tipo_sanguineo"), "Todos os tipos");
}

function setOptions(id, values, placeholder, labelFn = (value) => value) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = `<option value="">${placeholder}</option>` +
    values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(labelFn(value))}</option>`).join("");
}

function renderRanking(id, entries) {
  const list = document.getElementById(id);
  if (!list) return;
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

function handleTableAction(event) {
  const detailButton = event.target.closest("[data-detail-type]");
  if (detailButton) {
    openDetails(detailButton.dataset.detailType, detailButton.dataset.id);
    return;
  }

  const editButton = event.target.closest("[data-edit-fake]");
  if (editButton) {
    showToast("Edição fake registrada para o MVP.");
  }
}

function openDetails(type, id) {
  const map = {
    donor: state.donors.find((item) => item.id === id),
    patient: state.patients.find((item) => item.id === id),
    donation: state.donations.find((item) => item.id === id)
  };
  const record = map[type];
  if (!record) return;

  const detailMap = {
    donor: {
      kicker: "Doador",
      title: record.nome,
      fields: [
        ["Email", record.email],
        ["Telefone", record.telefone],
        ["Cidade/Estado", `${record.cidade}/${record.estado}`],
        ["Idade", record.idade],
        ["Peso", `${record.peso} kg`],
        ["Tipo sanguíneo", record.tipo_sanguineo],
        ["Já doa sangue", yesNo(record.ja_doador_sangue)],
        ["Quer doar sangue", yesNo(record.quer_doar_sangue)],
        ["Quer doar medula", yesNo(record.quer_doar_medula)],
        ["Contato WhatsApp", record.contato_whatsapp_realizado ? "Realizado" : "Pendente"],
        ["Status", getDonorStatusLabel(record.status)],
        ["Cadastro", formatDateTime(record.created_at)]
      ]
    },
    patient: {
      kicker: "Paciente",
      title: record.nome_paciente,
      fields: [
        ["Idade", record.idade],
        ["Diagnóstico", record.diagnostico],
        ["Tipo sanguíneo", record.tipo_sanguineo],
        ["Necessita medula", yesNo(record.necessita_medula)],
        ["Contato WhatsApp", record.contato_whatsapp_realizado ? "Realizado" : "Pendente"],
        ["Hospital", record.hospital],
        ["Cidade/Estado", `${record.cidade}/${record.estado}`],
        ["Médico", record.nome_medico],
        ["CRM", record.crm_medico],
        ["Telefone responsável", record.telefone_responsavel],
        ["Status", getPatientStatusLabel(record.status)],
        ["Cadastro", formatDateTime(record.created_at)]
      ]
    },
    donation: {
      kicker: "Doação monetária",
      title: record.nome,
      fields: [
        ["Email", record.email],
        ["Telefone", record.telefone],
        ["Valor", formatCurrency(record.valor)],
        ["Método", record.metodo_pagamento],
        ["Status", getPaymentStatusLabel(record.status_pagamento)],
        ["Data", formatDateTime(record.created_at)]
      ]
    }
  };

  const details = detailMap[type];
  document.getElementById("modalKicker").textContent = details.kicker;
  document.getElementById("modalTitle").textContent = details.title;
  document.getElementById("modalBody").innerHTML = details.fields.map(([label, value]) => `
    <div class="detail-tile">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `).join("");

  document.getElementById("detailModal").classList.add("open");
  document.getElementById("detailModal").setAttribute("aria-hidden", "false");
  createIcons();
}

function closeModal() {
  const modal = document.getElementById("detailModal");
  modal?.classList.remove("open");
  modal?.setAttribute("aria-hidden", "true");
}

function exportActiveTab() {
  const exporters = {
    overview: () => exportDonorsCsv(getGlobalDonors(), "flamedula_visao_geral_doadores.csv"),
    donors: () => exportDonorsCsv(getFilteredDonors(), "flamedula_doadores_filtrados.csv"),
    patients: () => exportPatientsCsv(getGlobalPatients(), "flamedula_pacientes.csv"),
    donations: () => exportDonationsCsv(getGlobalDonations(), "flamedula_doacoes.csv"),
    regions: () => exportDonorsCsv(getGlobalDonors(), "flamedula_regioes_doadores.csv"),
    reports: exportReportCsv,
    settings: () => showToast("Não há CSV para configurações.", "error")
  };

  exporters[state.activeTab]?.();
}

function exportDonorsCsv(rows, filename) {
  downloadCSV(toCsv(rows, [
    { label: "id", value: "id" },
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
    { label: "status", value: (row) => getDonorStatusLabel(row.status) },
    { label: "created_at", value: "created_at" }
  ]), filename);
  showToast("CSV de doadores gerado.");
}

function exportPatientsCsv(rows, filename) {
  downloadCSV(toCsv(rows, [
    { label: "id", value: "id" },
    { label: "nome_paciente", value: "nome_paciente" },
    { label: "idade", value: "idade" },
    { label: "diagnostico", value: "diagnostico" },
    { label: "tipo_sanguineo", value: "tipo_sanguineo" },
    { label: "necessita_medula", value: (row) => yesNo(row.necessita_medula) },
    { label: "contato_whatsapp_realizado", value: (row) => row.contato_whatsapp_realizado ? "Realizado" : "Pendente" },
    { label: "hospital", value: "hospital" },
    { label: "cidade", value: "cidade" },
    { label: "estado", value: "estado" },
    { label: "nome_medico", value: "nome_medico" },
    { label: "crm_medico", value: "crm_medico" },
    { label: "telefone_responsavel", value: "telefone_responsavel" },
    { label: "status", value: (row) => getPatientStatusLabel(row.status) },
    { label: "created_at", value: "created_at" }
  ]), filename);
  showToast("CSV de pacientes gerado.");
}

function exportDonationsCsv(rows, filename) {
  downloadCSV(toCsv(rows, [
    { label: "id", value: "id" },
    { label: "nome", value: "nome" },
    { label: "email", value: "email" },
    { label: "telefone", value: "telefone" },
    { label: "valor", value: "valor" },
    { label: "metodo_pagamento", value: "metodo_pagamento" },
    { label: "status_pagamento", value: (row) => getPaymentStatusLabel(row.status_pagamento) },
    { label: "created_at", value: "created_at" }
  ]), filename);
  showToast("CSV de doações gerado.");
}

function exportReportCsv() {
  const rows = [
    ...getReportDonors().map((row) => ({ tipo_registro: "donor_leads", nome: row.nome, estado: row.estado, tipo_sanguineo: row.tipo_sanguineo, status: getDonorStatusLabel(row.status), valor: "", created_at: row.created_at })),
    ...getReportPatients().map((row) => ({ tipo_registro: "patients", nome: row.nome_paciente, estado: row.estado, tipo_sanguineo: row.tipo_sanguineo, status: getPatientStatusLabel(row.status), valor: "", created_at: row.created_at })),
    ...getReportDonations().map((row) => ({ tipo_registro: "monetary_donations", nome: row.nome, estado: "", tipo_sanguineo: "", status: getPaymentStatusLabel(row.status_pagamento), valor: row.valor, created_at: row.created_at }))
  ];

  downloadCSV(toCsv(rows, [
    { label: "tipo_registro", value: "tipo_registro" },
    { label: "nome", value: "nome" },
    { label: "estado", value: "estado" },
    { label: "tipo_sanguineo", value: "tipo_sanguineo" },
    { label: "status", value: "status" },
    { label: "valor", value: "valor" },
    { label: "created_at", value: "created_at" }
  ]), "flamedula_relatorio_consolidado.csv");
  showToast("Relatório CSV gerado.");
}

function emptyRow(colspan, message) {
  return `<tr><td colspan="${colspan}"><div class="empty-row">${escapeHtml(message)}</div></td></tr>`;
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
