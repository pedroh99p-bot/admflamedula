import {
  countBy,
  formatCurrency,
  getPatientStatusLabel,
  groupByDate,
  sortEntriesByValue
} from "./utils.js";

const charts = new Map();
const emptyStatePlugin = {
  id: "flamedulaEmptyState",
  afterDraw(chart, _args, pluginOptions) {
    if (!pluginOptions?.isEmpty) return;

    const { ctx, chartArea } = chart;
    if (!chartArea) return;

    const message = pluginOptions.message || "Nenhum dado disponivel";
    ctx.save();
    ctx.fillStyle = chartColors().muted;
    ctx.font = "700 14px Outfit";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      message,
      chartArea.left + (chartArea.right - chartArea.left) / 2,
      chartArea.top + (chartArea.bottom - chartArea.top) / 2
    );
    ctx.restore();
  }
};

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function chartColors() {
  return {
    red: cssVar("--red") || "#c41230",
    wine: cssVar("--wine") || "#4a0714",
    green: cssVar("--green") || "#178a4d",
    yellow: cssVar("--yellow") || "#b7791f",
    blue: cssVar("--blue") || "#1f6feb",
    muted: cssVar("--muted") || "#667085",
    border: cssVar("--border") || "#e5e7eb",
    surface: cssVar("--surface") || "#ffffff",
    text: cssVar("--text") || "#1f2937"
  };
}

function createChart(id, config) {
  const canvas = document.getElementById(id);
  if (!canvas || typeof Chart === "undefined") return;

  if (charts.has(id)) {
    charts.get(id).destroy();
  }

  charts.set(id, new Chart(canvas, {
    plugins: [emptyStatePlugin],
    ...config
  }));
}

function baseOptions(extra = {}) {
  const colors = chartColors();
  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 900,
      easing: "easeOutQuart"
    },
    plugins: {
      legend: {
        labels: {
          color: colors.text,
          boxWidth: 12,
          font: { family: "Outfit", weight: "700" }
        }
      },
      tooltip: {
        backgroundColor: "rgba(12, 12, 15, 0.92)",
        padding: 12,
        cornerRadius: 8,
        titleFont: { family: "Outfit", weight: "700" },
        bodyFont: { family: "Outfit", weight: "700" }
      }
    },
    scales: {
      x: {
        ticks: { color: colors.muted, font: { family: "Outfit", weight: "700" } },
        grid: { display: false }
      },
      y: {
        beginAtZero: true,
        ticks: { color: colors.muted, precision: 0, font: { family: "Outfit", weight: "700" } },
        grid: { color: colors.border }
      }
    },
    ...extra
  };
}

function shortDate(date) {
  const [, month, day] = date.split("-");
  return `${day}/${month}`;
}

function seriesFromDate(items, dateKey, valueKey = null, limit = 16) {
  const grouped = groupByDate(items, dateKey, valueKey).slice(-limit);
  return {
    labels: grouped.map((item) => shortDate(item.date)),
    values: grouped.map((item) => item.value)
  };
}

export function renderOverviewCharts(donors, patients, donations) {
  const colors = chartColors();
  const registrations = seriesFromDate(donors, "created_at", null, 18);
  const donationSeries = seriesFromDate(donations, "created_at", "valor", 18);
  const patientStatuses = sortEntriesByValue(countBy(patients, "status"), 8);
  const topStates = sortEntriesByValue(countBy(donors, "estado"), 8);

  createChart("chartRegistrations", {
    type: "line",
    data: {
      labels: registrations.labels,
      datasets: [{
        label: "Cadastros",
        data: registrations.values,
        borderColor: colors.red,
        backgroundColor: "rgba(196, 18, 48, 0.12)",
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: colors.surface,
        pointBorderColor: colors.red,
        tension: 0.35,
        fill: true
      }]
    },
    options: baseOptions({
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        flamedulaEmptyState: { isEmpty: donors.length === 0 }
      }
    })
  });

  createChart("chartBloodDonors", {
    type: "doughnut",
    data: {
      labels: ["Já doam sangue", "Ainda não doam"],
      datasets: [{
        data: [
          donors.filter((donor) => donor.ja_doador_sangue).length,
          donors.filter((donor) => !donor.ja_doador_sangue).length
        ],
        backgroundColor: [colors.green, colors.yellow],
        borderColor: colors.surface,
        borderWidth: 3
      }]
    },
    options: baseOptions({
      cutout: "66%",
      scales: {},
      plugins: {
        ...baseOptions().plugins,
        flamedulaEmptyState: { isEmpty: donors.length === 0 }
      }
    })
  });

  createChart("chartMarrowInterest", {
    type: "bar",
    data: {
      labels: ["Quer doar medula", "Não informou interesse"],
      datasets: [{
        label: "Doadores",
        data: [
          donors.filter((donor) => donor.quer_doar_medula).length,
          donors.filter((donor) => !donor.quer_doar_medula).length
        ],
        backgroundColor: [colors.red, colors.blue],
        borderRadius: 8
      }]
    },
    options: baseOptions({
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        flamedulaEmptyState: { isEmpty: donors.length === 0 }
      }
    })
  });

  createChart("chartPatientStatus", {
    type: "bar",
    data: {
      labels: patientStatuses.map(([status]) => getPatientStatusLabel(status)),
      datasets: [{
        label: "Pacientes",
        data: patientStatuses.map(([, value]) => value),
        backgroundColor: colors.blue,
        borderRadius: 8
      }]
    },
    options: baseOptions({
      indexAxis: "y",
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        flamedulaEmptyState: { isEmpty: patients.length === 0 }
      }
    })
  });

  createChart("chartDonationPeriod", {
    type: "line",
    data: {
      labels: donationSeries.labels,
      datasets: [{
        label: "Arrecadação",
        data: donationSeries.values,
        borderColor: colors.wine,
        backgroundColor: "rgba(74, 7, 20, 0.12)",
        borderWidth: 3,
        tension: 0.35,
        fill: true
      }]
    },
    options: baseOptions({
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: (context) => formatCurrency(context.parsed.y)
          }
        },
        flamedulaEmptyState: { isEmpty: donations.length === 0 }
      }
    })
  });

  createChart("chartOverviewStates", {
    type: "bar",
    data: {
      labels: topStates.map(([state]) => state),
      datasets: [{
        label: "Doadores por estado",
        data: topStates.map(([, value]) => value),
        backgroundColor: colors.red,
        borderRadius: 8
      }]
    },
    options: baseOptions({
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        flamedulaEmptyState: { isEmpty: donors.length === 0 }
      }
    })
  });
}

export function renderDonationChart(donations) {
  const colors = chartColors();
  const donationSeries = seriesFromDate(donations, "created_at", "valor", 22);

  createChart("chartDonationTab", {
    type: "bar",
    data: {
      labels: donationSeries.labels,
      datasets: [{
        label: "Arrecadação",
        data: donationSeries.values,
        backgroundColor: colors.red,
        borderRadius: 8
      }]
    },
    options: baseOptions({
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: {
            label: (context) => formatCurrency(context.parsed.y)
          }
        },
        flamedulaEmptyState: { isEmpty: donations.length === 0 }
      }
    })
  });
}

export function renderRegionCharts(donors, patients) {
  const colors = chartColors();
  const stateEntries = sortEntriesByValue(countBy(donors, "estado"), 8);
  const bloodEntries = sortEntriesByValue(countBy(patients, "tipo_sanguineo"), 8);

  createChart("chartRegionalDistribution", {
    type: "bar",
    data: {
      labels: stateEntries.map(([state]) => state),
      datasets: [{
        label: "Doadores",
        data: stateEntries.map(([, value]) => value),
        backgroundColor: colors.blue,
        borderRadius: 8
      }]
    },
    options: baseOptions({
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        flamedulaEmptyState: { isEmpty: donors.length === 0 }
      }
    })
  });

  createChart("chartBloodDemand", {
    type: "doughnut",
    data: {
      labels: bloodEntries.map(([type]) => type),
      datasets: [{
        data: bloodEntries.map(([, value]) => value),
        backgroundColor: [colors.red, colors.wine, colors.blue, colors.green, colors.yellow, "#64748b", "#0f766e", "#7c3aed"],
        borderColor: colors.surface,
        borderWidth: 3
      }]
    },
    options: baseOptions({
      cutout: "58%",
      scales: {},
      plugins: {
        ...baseOptions().plugins,
        flamedulaEmptyState: { isEmpty: patients.length === 0 }
      }
    })
  });
}

export function destroyAllCharts() {
  charts.forEach((chart) => chart.destroy());
  charts.clear();
}
