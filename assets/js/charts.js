// assets/js/charts.js
import { countBy, getLeadTypeLabel, getStatusLabel } from './utils.js';

let dailyChartInstance = null;
let typeChartInstance = null;
let statusChartInstance = null;
let campaignChartInstance = null;

export function destroyCharts() {
  if (dailyChartInstance) dailyChartInstance.destroy();
  if (typeChartInstance) typeChartInstance.destroy();
  if (statusChartInstance) statusChartInstance.destroy();
  if (campaignChartInstance) campaignChartInstance.destroy();
}

export function initCharts(filteredLeads) {
  destroyCharts();
  renderDailyLeadsChart(filteredLeads);
  renderLeadTypeChart(filteredLeads);
  renderJourneyStatusChart(filteredLeads);
  renderCampaignChart(filteredLeads);
}

export function updateCharts(filteredLeads) {
  initCharts(filteredLeads);
}

function getChartTextColor() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return isDark ? '#f8fafc' : '#64748b';
}

function getChartGridColor() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return isDark ? '#334155' : '#e2e8f0';
}

export function renderDailyLeadsChart(leads) {
  const ctx = document.getElementById('dailyChart');
  if (!ctx) return;

  // Agrupar leads por data
  const leadsByDate = {};
  leads.forEach(lead => {
    const dateStr = lead.created_at.split('T')[0];
    leadsByDate[dateStr] = (leadsByDate[dateStr] || 0) + 1;
  });

  const sortedDates = Object.keys(leadsByDate).sort();
  const labels = sortedDates.map(date => {
    const [y, m, d] = date.split('-');
    return `${d}/${m}`;
  });
  const data = sortedDates.map(date => leadsByDate[date]);

  // Create gradient
  const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 300);
  gradient.addColorStop(0, 'rgba(220, 38, 38, 0.5)'); // Top: Strong Red
  gradient.addColorStop(1, 'rgba(220, 38, 38, 0.0)'); // Bottom: Transparent

  const textColor = getChartTextColor();
  const gridColor = getChartGridColor();

  dailyChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Cadastros',
        data: data,
        borderColor: '#dc2626', // Vermelho Flamengo
        backgroundColor: gradient,
        borderWidth: 2,
        pointBackgroundColor: '#ffffff',
        pointBorderColor: '#dc2626',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Outfit', size: 14, weight: 'bold' },
          padding: 10,
          cornerRadius: 8,
          displayColors: false
        }
      },
      scales: {
        x: { 
          grid: { display: false, drawBorder: false },
          ticks: { color: textColor, font: { family: 'Outfit' } }
        },
        y: { 
          beginAtZero: true, 
          grid: { color: gridColor, borderDash: [5, 5] },
          ticks: { precision: 0, color: textColor, font: { family: 'Outfit' } }
        }
      }
    }
  });
}

export function renderLeadTypeChart(leads) {
  const ctx = document.getElementById('typeChart');
  if (!ctx) return;

  const counts = countBy(leads, 'tipo_cadastro');
  const labels = Object.keys(counts).map(k => getLeadTypeLabel(k));
  const data = Object.values(counts);

  const textColor = getChartTextColor();

  typeChartInstance = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ['#16a34a', '#ea580c', '#2563eb', '#9333ea'],
        borderWidth: 2,
        borderColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#1e293b' : '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { position: 'right', labels: { color: textColor, font: { family: 'Outfit' } } },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Outfit', size: 14, weight: 'bold' },
          padding: 10,
          cornerRadius: 8
        }
      }
    }
  });
}

export function renderJourneyStatusChart(leads) {
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;

  const counts = countBy(leads, 'status_jornada');
  // Ordenar do maior para o menor
  const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const labels = sortedEntries.map(e => getStatusLabel(e[0]));
  const data = sortedEntries.map(e => e[1]);

  const textColor = getChartTextColor();
  const gridColor = getChartGridColor();

  statusChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Quantidade',
        data: data,
        backgroundColor: '#475569',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Outfit', size: 14, weight: 'bold' },
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: { ticks: { display: false }, grid: { display: false, drawBorder: false } },
        y: { beginAtZero: true, grid: { color: gridColor }, ticks: { precision: 0, color: textColor, font: { family: 'Outfit' } } }
      }
    }
  });
}

export function renderCampaignChart(leads) {
  const ctx = document.getElementById('campaignChart');
  if (!ctx) return;

  const counts = countBy(leads, 'utm_campaign');
  const sortedEntries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5); // Top 5
  const labels = sortedEntries.map(e => e[0] || 'Sem campanha');
  const data = sortedEntries.map(e => e[1]);

  const textColor = getChartTextColor();
  const gridColor = getChartGridColor();

  campaignChartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Leads',
        data: data,
        backgroundColor: '#dc2626',
        borderRadius: 4
      }]
    },
    options: {
      indexAxis: 'y', // Barra horizontal
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.9)',
          titleFont: { family: 'Outfit', size: 13 },
          bodyFont: { family: 'Outfit', size: 14, weight: 'bold' },
          padding: 10,
          cornerRadius: 8
        }
      },
      scales: {
        x: { beginAtZero: true, grid: { color: gridColor }, ticks: { precision: 0, color: textColor, font: { family: 'Outfit' } } },
        y: { grid: { display: false, drawBorder: false }, ticks: { color: textColor, font: { family: 'Outfit' } } }
      }
    }
  });
}
