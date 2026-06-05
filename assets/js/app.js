// assets/js/app.js
import { getLeads, getLeadDetails, getPartners } from './api.js';
import { updateCharts } from './charts.js';
import { showToast } from './toast.js';
import { 
  formatDate, formatDateTime, getLeadTypeLabel, getStatusLabel, 
  getLeadTypeClass, getStatusClass, isLeadNeedsFollowUp, 
  countBy, groupBy, percentage, convertToCSV, downloadCSV,
  escapeHtml
} from './utils.js';
import { requireAuth, handleLogout } from './auth.js';
import { logAuditEvent, getUserRole, hasPermission } from './security.js';

let leads = [];
let partners = [];
let filteredLeads = [];

// Pagination state
let currentPage = 1;
const itemsPerPage = 15;

document.addEventListener("DOMContentLoaded", initApp);

async function initApp() {
  // 1. Verificar se usuário está logado
  const user = await requireAuth();
  if (!user) return; // Se não tem usuário, o auth.js já redirecionou para o login

  bindEvents();
  
  // Handle initial theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');

  // Show loading skeleton
  const tbody = document.getElementById('leadsTableBody');
  if (tbody) {
    let skeletons = '';
    for(let i=0; i<5; i++) {
      skeletons += `
        <tr>
          <td><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width: 60%"></div></td>
          <td><div class="skeleton skeleton-text"></div><div class="skeleton skeleton-text" style="width: 80%"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 70%"></div></td>
          <td><div class="skeleton skeleton-badge"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 50%"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 60%"></div></td>
          <td><div class="skeleton skeleton-text" style="width: 40px; float: right;"></div></td>
        </tr>
      `;
    }
    tbody.innerHTML = skeletons;
  }
  
  try {
    // Fetch data via API
    leads = await getLeads();
    partners = await getPartners();
    
    filteredLeads = [...leads];
    renderDashboard();
  } catch (error) {
    showToast("Erro ao carregar dados. Tente novamente.", "error");
  }
}

function renderDashboard() {
  renderMetrics();
  updateCharts(filteredLeads);
  renderLeadsTable();
  renderCampaignsSection();
  renderPartnersSection();
  
  // Atualizar data de última atualização
  const dateEl = document.getElementById('lastUpdateDate');
  if (dateEl) {
    const now = new Date();
    dateEl.innerHTML = `<i data-lucide="clock" class="inline-icon"></i> Atualizado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}`;
    // Re-render Lucide icons for the new element
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function renderMetrics() {
  document.getElementById('metricTotalLeads').textContent = filteredLeads.length;
  
  const now = new Date();
  const startOfDay = new Date(now.setHours(0,0,0,0));
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now);
  startOfMonth.setDate(startOfMonth.getDate() - 30);
  
  let leadsToday = 0;
  let leads7Days = 0;
  let leads30Days = 0;
  let optinWpp = 0;
  let followUpCount = 0;
  
  const typeCounts = countBy(filteredLeads, 'tipo_cadastro');
  
  filteredLeads.forEach(lead => {
    const createdDate = new Date(lead.created_at);
    if (createdDate >= startOfDay) leadsToday++;
    if (createdDate >= startOfWeek) leads7Days++;
    if (createdDate >= startOfMonth) leads30Days++;
    
    if (lead.whatsapp_optin) optinWpp++;
    if (isLeadNeedsFollowUp(lead)) followUpCount++;
  });
  
  document.getElementById('metricLeadsToday').textContent = leadsToday;
  document.getElementById('metricLeads7Days').textContent = leads7Days;
  document.getElementById('metricLeads30Days').textContent = leads30Days;
  
  document.getElementById('metricDoador').textContent = typeCounts["ja_sou_doador"] || 0;
  document.getElementById('metricNaoDoador').textContent = typeCounts["nao_sou_doador_ainda"] || 0;
  document.getElementById('metricAjudar').textContent = typeCounts["quero_ajudar_divulgar"] || 0;
  document.getElementById('metricParceiro').textContent = typeCounts["instituicao_ou_parceiro"] || 0;
  
  document.getElementById('metricOptin').textContent = `${optinWpp} (${percentage(optinWpp, filteredLeads.length)}%)`;
  document.getElementById('metricFollowUp').textContent = followUpCount;
}

function applyFilters() {
  const searchInput = document.getElementById('filterSearch').value.toLowerCase().trim();
  const typeFilter = document.getElementById('filterType').value;
  const statusFilter = document.getElementById('filterStatus').value;
  const optinFilter = document.getElementById('filterOptin').value;
  
  filteredLeads = leads.filter(lead => {
    const matchesSearch = !searchInput || 
      (lead.nome && lead.nome.toLowerCase().includes(searchInput)) || 
      (lead.email && lead.email.toLowerCase().includes(searchInput)) || 
      (lead.whatsapp && lead.whatsapp.includes(searchInput));
      
    const matchesType = !typeFilter || lead.tipo_cadastro === typeFilter;
    const matchesStatus = !statusFilter || lead.status_jornada === statusFilter;
    
    let matchesOptin = true;
    if (optinFilter === 'sim') matchesOptin = lead.whatsapp_optin === true;
    if (optinFilter === 'nao') matchesOptin = lead.whatsapp_optin === false;
    
    return matchesSearch && matchesType && matchesStatus && matchesOptin;
  });
  
  currentPage = 1; // Reset to first page
  renderDashboard();
}

function renderLeadsTable() {
  const tbody = document.getElementById('leadsTableBody');
  const paginationContainer = document.getElementById('paginationContainer');
  if (!tbody) return;
  
  tbody.innerHTML = '';
  
  if (filteredLeads.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7">
          <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              <line x1="11" y1="8" x2="11" y2="14"></line>
              <line x1="8" y1="11" x2="14" y2="11"></line>
            </svg>
            <h3>Nenhum cadastro encontrado</h3>
            <p>Tente ajustar os filtros ou os termos de busca.</p>
          </div>
        </td>
      </tr>
    `;
    if (paginationContainer) paginationContainer.innerHTML = '';
    return;
  }
  
  // Pagination logic
  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayLeads = filteredLeads.slice(startIndex, startIndex + itemsPerPage);
  
  displayLeads.forEach(lead => {
    const tr = document.createElement('tr');
    // Todos os dados dinâmicos são sanitizados com escapeHtml()
    const safeName = escapeHtml(lead.nome);
    const safeCity = escapeHtml(lead.cidade);
    const safeState = escapeHtml(lead.estado);
    const safeWhatsapp = escapeHtml(lead.whatsapp);
    const safeEmail = escapeHtml(lead.email);
    const safeOrigin = escapeHtml(lead.origem || '-');
    const safeId = escapeHtml(lead.id);

    tr.innerHTML = `
      <td>
        <div class="font-medium">${safeName}</div>
        <div class="text-small text-muted">${safeCity} - ${safeState}</div>
      </td>
      <td>
        <div class="cursor-pointer copy-trigger" data-copy="${safeWhatsapp}" title="Clique para copiar">
          ${safeWhatsapp} 
          ${lead.whatsapp_optin ? '<span class="text-green text-small" title="Opt-in">✓</span>' : ''}
          <span class="text-muted text-small ml-2">📋</span>
        </div>
        <div class="text-small text-muted">${safeEmail}</div>
      </td>
      <td><span class="${getLeadTypeClass(lead.tipo_cadastro)} text-small font-medium">${getLeadTypeLabel(lead.tipo_cadastro)}</span></td>
      <td><span class="badge ${getStatusClass(lead.status_jornada)}">${getStatusLabel(lead.status_jornada)}</span></td>
      <td class="text-small">${safeOrigin}</td>
      <td class="text-small text-muted">${formatDate(lead.created_at)}</td>
      <td class="text-right">
        <button class="btn btn-pill-ghost btn-sm view-detail-btn" data-lead-id="${safeId}">Ver</button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  // Bind click events via delegation (mais seguro que inline onclick)
  bindTableEvents(tbody);
  renderPagination(totalPages);
}

/**
 * Bind de eventos na tabela via delegação (evita inline onclick — mais seguro contra XSS)
 */
function bindTableEvents(tbody) {
  tbody.addEventListener('click', async (e) => {
    // Handler para copiar
    const copyEl = e.target.closest('.copy-trigger');
    if (copyEl) {
      const text = copyEl.getAttribute('data-copy');
      try {
        await navigator.clipboard.writeText(text);
        showToast('Número copiado para a área de transferência.');
        // Audit: registrar cópia de PII sem expor o dado
        await logAuditEvent('COPY_PII', { field: 'whatsapp' });
      } catch {
        showToast('Não foi possível copiar.', 'error');
      }
      return;
    }

    // Handler para ver detalhes
    const detailBtn = e.target.closest('.view-detail-btn');
    if (detailBtn) {
      const leadId = detailBtn.getAttribute('data-lead-id');
      await openLeadModal(leadId);
    }
  });
}

// Manter compatibilidade global (para empty state button)
window.openLeadModal = openLeadModal;

async function openLeadModal(leadId) {
  if (!leadId) return;

  // Buscar detalhes completos sob demanda (não usar cache local)
  let lead;
  try {
    lead = await getLeadDetails(leadId);
  } catch {
    // Fallback para dados locais se getLeadDetails falhar (ex: tabela sem a coluna)
    lead = leads.find(l => l.id === leadId);
  }
  if (!lead) {
    showToast('Cadastro não encontrado.', 'error');
    return;
  }

  // Registrar auditoria de visualização de detalhes
  await logAuditEvent('VIEW_LEAD_DETAIL', { lead_id: leadId });

  // Todos os campos sanitizados antes de renderizar
  document.getElementById('modalLeadName').textContent = lead.nome || '-';
  document.getElementById('modalLeadStatus').className = `badge ${getStatusClass(lead.status_jornada)}`;
  document.getElementById('modalLeadStatus').textContent = getStatusLabel(lead.status_jornada);
  
  document.getElementById('modalLeadEmail').textContent = lead.email || '-';
  document.getElementById('modalLeadWhatsapp').textContent = lead.whatsapp || '-';
  document.getElementById('modalLeadLocation').textContent = `${lead.cidade || '-'} - ${lead.estado || '-'}`;
  document.getElementById('modalLeadType').textContent = getLeadTypeLabel(lead.tipo_cadastro);
  
  document.getElementById('modalLeadOrigin').textContent = lead.origem || '-';
  document.getElementById('modalLeadCampaign').textContent = lead.utm_campaign || '-';
  document.getElementById('modalLeadPartner').textContent = lead.parceiro || '-';
  
  document.getElementById('modalOptinWpp').textContent = lead.whatsapp_optin ? "Sim" : "Não";
  document.getElementById('modalOptinEmail').textContent = lead.email_optin ? "Sim" : "Não";
  document.getElementById('modalPrivacy').textContent = lead.privacy_policy_version || '-';
  
  document.getElementById('modalObs').textContent = lead.observacoes || 'Nenhuma observação registrada.';
  document.getElementById('modalCreatedAt').textContent = formatDateTime(lead.created_at);
  document.getElementById('modalUpdatedAt').textContent = formatDateTime(lead.updated_at);
  
  document.getElementById('leadModal').classList.add('open');
}

function closeLeadModal() {
  document.getElementById('leadModal').classList.remove('open');
}

function renderPagination(totalPages) {
  const container = document.getElementById('paginationContainer');
  if (!container) return;
  
  container.innerHTML = `
    <div class="pagination text-small text-muted">
      <div>Mostrando página ${currentPage} de ${totalPages}</div>
      <div class="pagination-controls">
        <button class="btn btn-sm btn-pill-ghost" id="btnPrevPage" ${currentPage === 1 ? 'disabled' : ''}>Anterior</button>
        <button class="btn btn-sm btn-pill-ghost" id="btnNextPage" ${currentPage === totalPages ? 'disabled' : ''}>Próxima</button>
      </div>
    </div>
  `;
  
  const btnPrev = document.getElementById('btnPrevPage');
  const btnNext = document.getElementById('btnNextPage');
  
  if (btnPrev) btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderLeadsTable();
    }
  });
  
  if (btnNext) btnNext.addEventListener('click', () => {
    if (currentPage < totalPages) {
      currentPage++;
      renderLeadsTable();
    }
  });
}

function renderCampaignsSection() {
  const container = document.getElementById('campaignsContainer');
  if (!container) return;
  
  const campaigns = groupBy(filteredLeads, 'utm_campaign');
  container.innerHTML = '';
  
  Object.keys(campaigns).forEach(campName => {
    const cLeads = campaigns[campName];
    const types = countBy(cLeads, 'tipo_cadastro');
    const optins = cLeads.filter(l => l.whatsapp_optin).length;
    
    // Sanitizar nome da campanha
    const safeCampName = escapeHtml(campName || 'Sem campanha');
    
    const div = document.createElement('div');
    div.className = 'card campaign-card';
    div.innerHTML = `
      <div class="card-header border-bottom">
        <h3 class="card-title">${safeCampName}</h3>
      </div>
      <div class="card-body">
        <div class="metric-row"><span>Total Leads:</span> <span class="font-bold">${cLeads.length}</span></div>
        <div class="metric-row"><span>Já doador:</span> <span>${types['ja_sou_doador'] || 0}</span></div>
        <div class="metric-row"><span>Não doador:</span> <span>${types['nao_sou_doador_ainda'] || 0}</span></div>
        <div class="metric-row"><span>Opt-in Wpp:</span> <span>${percentage(optins, cLeads.length)}%</span></div>
      </div>
    `;
    container.appendChild(div);
  });
}

function renderPartnersSection() {
  const tbody = document.getElementById('partnersTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  partners.forEach(partner => {
    const partnerLeads = leads.filter(l => l.parceiro === partner.nome);
    const optins = partnerLeads.filter(l => l.whatsapp_optin).length;
    const types = countBy(partnerLeads, 'tipo_cadastro');
    const maisComum = Object.keys(types).sort((a,b) => types[b] - types[a])[0] || '-';
    
    // Sanitizar dados do parceiro
    const safeName = escapeHtml(partner.nome);
    const safeType = escapeHtml(partner.tipo);
    const safeLocation = escapeHtml(`${partner.cidade}/${partner.estado}`);
    
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="font-medium">${safeName}</td>
      <td class="capitalize text-small">${safeType}</td>
      <td>${safeLocation}</td>
      <td class="text-right font-bold">${partnerLeads.length}</td>
      <td class="text-right">${getLeadTypeLabel(maisComum)}</td>
      <td class="text-right">${percentage(optins, partnerLeads.length)}%</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * Export CSV com confirmação, auditoria e mascaramento de PII
 */
async function handleCSVExport() {
  if (filteredLeads.length === 0) {
    showToast("Não há dados para exportar com os filtros atuais.", "error");
    return;
  }

  // 1. Confirmar ação — dados sensíveis
  const confirmed = confirm(
    `Você está prestes a exportar ${filteredLeads.length} registros.\n\n` +
    `Dados pessoais serão MASCARADOS por segurança.\n` +
    `Esta ação será registrada na trilha de auditoria.\n\n` +
    `Deseja continuar?`
  );
  if (!confirmed) return;

  // 2. Registrar auditoria
  await logAuditEvent('CSV_EXPORT', { 
    record_count: filteredLeads.length,
    filters: {
      search: document.getElementById('filterSearch')?.value ? 'applied' : 'none',
      type: document.getElementById('filterType')?.value || 'all',
      status: document.getElementById('filterStatus')?.value || 'all',
    }
  });

  // 3. Gerar CSV com dados mascarados
  const csvContent = convertToCSV(filteredLeads, false);
  downloadCSV(csvContent, `leads_flamedula_${new Date().getTime()}.csv`);
  showToast("Download iniciado. Ação registrada na auditoria.");
}

function bindEvents() {
  const filterInputs = ['filterSearch', 'filterType', 'filterStatus', 'filterOptin'];
  filterInputs.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', applyFilters);
    if (el && el.tagName === 'SELECT') el.addEventListener('change', applyFilters);
  });
  
  const clearBtn = document.getElementById('btnClearFilters');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      document.getElementById('filterSearch').value = '';
      document.getElementById('filterType').value = '';
      document.getElementById('filterStatus').value = '';
      document.getElementById('filterOptin').value = '';
      applyFilters();
    });
  }
  
  const exportBtn = document.getElementById('btnExportCsv');
  if (exportBtn) exportBtn.addEventListener('click', handleCSVExport);
  
  const closeBtn = document.getElementById('btnCloseModal');
  if (closeBtn) closeBtn.addEventListener('click', closeLeadModal);
  
  const modal = document.getElementById('leadModal');
  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeLeadModal();
    });
  }

  // Theme Toggle
  const btnTheme = document.getElementById('btnToggleTheme');
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
      updateCharts(filteredLeads); // Re-render charts to adapt colors
      // Re-render Lucide icons
      if (typeof lucide !== 'undefined') lucide.createIcons();
    });
  }

  // Logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', handleLogout);
  }
}
