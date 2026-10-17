// Estado global
let legWorkouts = [];

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  console.log("Iniciando carga de datos de pierna...");
  setupLegEventListeners();
  loadLegFromFile();
});

// Cargar datos del archivo JSON
function loadLegFromFile() {
  fetch("data-pierna.json")
    .then((response) => {
      if (!response.ok) throw new Error("Error en fetch");
      return response.json();
    })
    .then((data) => {
      console.log("Datos de pierna cargados:", data.length);
      legWorkouts = data;
      saveLegToStorage();
      renderLeg();
      updateLegStats();
    })
    .catch((err) => {
      console.error("Error al cargar datos de pierna:", err);
    });
}

// ==================== ALMACENAMIENTO ====================

function loadLegFromStorage() {
  const stored = localStorage.getItem("legWorkouts");
  legWorkouts = stored ? JSON.parse(stored) : [];
}

function saveLegToStorage() {
  localStorage.setItem("legWorkouts", JSON.stringify(legWorkouts));
}

// ==================== EVENT LISTENERS ====================

function setupLegEventListeners() {
  const filterExercise = document.getElementById("filterLegExercise");
  const clearBtn = document.getElementById("clearLegFiltersBtn");
  const exportBtn = document.getElementById("exportLegBtn");
  const importBtn = document.getElementById("importLegBtn");
  const importFile = document.getElementById("importLegFile");

  if (filterExercise) filterExercise.addEventListener("input", renderLeg);
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (filterExercise) filterExercise.value = "";
      renderLeg();
    });
  }

  if (exportBtn) exportBtn.addEventListener("click", exportLeg);
  if (importBtn)
    importBtn.addEventListener("click", () => {
      if (importFile) importFile.click();
    });
  if (importFile) importFile.addEventListener("change", importLeg);
}

// ==================== IMPORT/EXPORT ====================

function exportLeg() {
  const json = JSON.stringify(legWorkouts, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pierna-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importLeg(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      legWorkouts = JSON.parse(event.target.result);
      saveLegToStorage();
      renderLeg();
      updateLegStats();
      e.target.value = "";
    } catch (err) {
      alert("Error al importar: " + err.message);
    }
  };
  reader.readAsText(file);
}

// ==================== RENDERIZADO ====================

function renderLeg() {
  const tableBody = document.getElementById("legTableBody");
  const tableHeaderRow = document.getElementById("legTableHeaderRow");
  const emptyMessage = document.getElementById("emptyLegMessage");

  if (!tableBody || !tableHeaderRow) {
    console.warn("legTableBody o legTableHeaderRow no encontrados");
    return;
  }

  const filterExerciseInput = document.getElementById("filterLegExercise");
  const filterExercise = filterExerciseInput
    ? filterExerciseInput.value.toLowerCase()
    : "";

  let filtered = legWorkouts.filter((w) => {
    const matchExercise =
      !filterExercise ||
      (w.exercise && w.exercise.toLowerCase().includes(filterExercise));
    return matchExercise;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = "";
    if (emptyMessage) emptyMessage.style.display = "block";
    return;
  }

  if (emptyMessage) emptyMessage.style.display = "none";

  const byDate = {};
  filtered.forEach((workout) => {
    if (!byDate[workout.date]) byDate[workout.date] = [];
    byDate[workout.date].push(workout);
  });

  const dates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));
  const preferredOrder = [
    "Hip Thrust",
    "RDL",
    "Prensa Unilateral",
    "Extensión Cuádriceps",
    "Leg Curl",
    "Crunch Polea",
  ];
  const allExercises = [...new Set(filtered.map((w) => w.exercise))];
  const sortedExercises = allExercises.sort((a, b) => {
    const indexA = preferredOrder.indexOf(a);
    const indexB = preferredOrder.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  let headerHTML = `
        <th style="width: 120px; min-width: 120px;">Fecha</th>
        <th style="width: 100px; min-width: 100px;">Día</th>
    `;
  sortedExercises.forEach((exercise) => {
    const width = Math.max(150, exercise.length * 10);
    headerHTML += `<th style="width: ${width}px; min-width: ${width}px;">${exercise}</th>`;
  });
  tableHeaderRow.innerHTML = headerHTML;

  const rows = dates
    .map((date) => {
      const workoutsForDate = byDate[date];
      const dayOfWeek = workoutsForDate[0]?.dayOfWeek || "";
      const workoutMap = {};
      workoutsForDate.forEach((w) => {
        workoutMap[w.exercise] = w;
      });

      let rowHTML = `
            <tr>
                <td style="width: 120px; min-width: 120px;">
                    <div style="display: flex; align-items: center; gap: 0.4rem; white-space: nowrap;">
                        <strong>${formatDate(date)}</strong>
                        <small>${dayOfWeek}</small>
                    </div>
                </td>
                <td style="width: 100px; min-width: 100px;"><small>${dayOfWeek}</small></td>
        `;

      sortedExercises.forEach((exercise) => {
        const workout = workoutMap[exercise];
        if (!workout) {
          const width = Math.max(150, exercise.length * 10);
          rowHTML += `<td style="width: ${width}px; min-width: ${width}px; background-color: #f9f9f9;">—</td>`;
          return;
        }

        const sorted = [...filtered]
          .filter((w) => w.exercise === exercise)
          .sort((a, b) => new Date(b.date) - new Date(a.date));
        const previousIndex = sorted.findIndex((w) => w.date === workout.date);
        const previous =
          previousIndex >= 0 && previousIndex < sorted.length - 1
            ? sorted[previousIndex + 1]
            : null;

        let progressDisplay = "";
        let weightUpHighlight = false;

        if (previous) {
          const progress = (
            ((workout.weight - previous.weight) / previous.weight) *
            100
          ).toFixed(1);
          const progressNum = parseFloat(progress);
          if (progressNum > 0) {
            weightUpHighlight = true;
            progressDisplay = `<small class="text-success" style="font-weight: bold;">${workout.weight}kg↑ +${progress}%</small>`;
          } else if (progressNum < 0) {
            progressDisplay = `<small class="text-danger" style="font-weight: bold;">${workout.weight}kg↓ ${progress}%</small>`;
          }
        }

        const seriesStr = workout.series ? workout.series.join("-") : "-";
        const totalRepsText = `(${workout.totalReps || 0} reps)`;
        const status =
          previous && workout.totalReps >= 30 && workout.totalReps <= 45
            ? "good"
            : workout.totalReps < 30
              ? "too-few"
              : "too-many";
        let repsMarkup = totalRepsText;
        if (status === "good") {
          repsMarkup = `<span class="reps-status reps-good">${totalRepsText}</span>`;
        } else if (status === "too-few") {
          repsMarkup = `<span class="reps-status reps-too-few">${totalRepsText}</span>`;
        } else if (status === "too-many") {
          repsMarkup = `<span class="reps-status reps-too-many">${totalRepsText}</span>`;
        }

        const compactMetrics = [
          `<span class="series-badge">${seriesStr} ${repsMarkup}</span>`,
          `<strong>${workout.weight}kg</strong>`,
          progressDisplay || "—",
        ];

        const width = Math.max(150, exercise.length * 10);
        const weightUpClass = weightUpHighlight ? " exercise-cell-up" : "";

        rowHTML += `
                <td class="${weightUpClass}" style="width: ${width}px; min-width: ${width}px; vertical-align: top; padding: 0.35rem 0.25rem;">
                    <div class="exercise-inline-metrics">
                        ${compactMetrics
                          .map(
                            (metric, index) => `
                            <span class="exercise-inline-metric">${metric}</span>
                            ${index < compactMetrics.length - 1 ? '<span class="exercise-inline-separator">·</span>' : ""}
                        `,
                          )
                          .join("")}
                    </div>
                </td>
            `;
      });

      rowHTML += "</tr>";
      return rowHTML;
    })
    .join("");

  tableBody.innerHTML = rows;
}

function showLegDetails(idx) {
  const workout = legWorkouts[idx];
  if (!workout) return;

  const modal = new bootstrap.Modal(document.getElementById("detailsLegModal"));
  document.getElementById("modalLegTitle").textContent =
    `${workout.exercise} - ${new Date(workout.date).toLocaleDateString("es-ES")}`;

  const seriesStr = workout.series ? workout.series.join(" - ") : "-";

  const html = `
        <div class="detail-row">
            <strong>Fecha:</strong>
            <span>${new Date(workout.date).toLocaleDateString("es-ES")} (${workout.dayOfWeek})</span>
        </div>
        <div class="detail-row">
            <strong>Ejercicio:</strong>
            <span>${workout.exercise}</span>
        </div>
        <div class="detail-row">
            <strong>Series:</strong>
            <span>${workout.series ? workout.series.length : "-"}</span>
        </div>
        <div class="detail-row">
            <strong>Reps por serie:</strong>
            <span>${seriesStr}</span>
        </div>
        <div class="detail-row">
            <strong>Reps totales:</strong>
            <span>${workout.totalReps}</span>
        </div>
        <div class="detail-row">
            <strong>Peso:</strong>
            <span>${workout.weight} kg</span>
        </div>
        <div class="detail-row">
            <strong>Volumen:</strong>
            <span>${workout.volume} kg×reps</span>
        </div>
        <div class="detail-row">
            <strong>1RM Estimado:</strong>
            <span>${workout.oneRM.toFixed(1)} kg</span>
        </div>
    `;

  document.getElementById("modalLegBody").innerHTML = html;
  modal.show();
}

// ==================== ESTADÍSTICAS ====================

function updateLegStats() {
  if (legWorkouts.length === 0) {
    document.getElementById("totalLegWorkouts").textContent = "-";
    document.getElementById("totalLegVolume").textContent = "-";
    document.getElementById("maxLeg1RM").textContent = "-";
    document.getElementById("maxLeg1RMExercise").textContent = "";
    document.getElementById("totalLegExercises").textContent = "-";
    renderLegExerciseAnalysis();
    renderLegCharts();
    return;
  }

  // Total de entrenamientos
  document.getElementById("totalLegWorkouts").textContent = legWorkouts.length;

  // Volumen total
  const totalVol = legWorkouts.reduce((sum, w) => sum + (w.volume || 0), 0);
  document.getElementById("totalLegVolume").textContent =
    totalVol.toLocaleString("es-ES");

  // 1RM máximo
  const max1RM = Math.max(...legWorkouts.map((w) => w.oneRM || 0));
  const max1RMExercise =
    legWorkouts.find((w) => w.oneRM === max1RM)?.exercise || "-";
  document.getElementById("maxLeg1RM").textContent = max1RM.toFixed(1);
  document.getElementById("maxLeg1RMExercise").textContent = max1RMExercise;

  // Ejercicios únicos
  const uniqueExercises = new Set(legWorkouts.map((w) => w.exercise));
  document.getElementById("totalLegExercises").textContent =
    uniqueExercises.size;

  renderLegExerciseAnalysis();
  renderLegCharts();
}

// ==================== ANÁLISIS POR EJERCICIO ====================

function renderLegExerciseAnalysis() {
  const container = document.getElementById("legExerciseTable");
  if (!container) return;

  if (legWorkouts.length === 0) {
    container.innerHTML =
      '<tr><td colspan="6" class="text-muted text-center">Sin datos</td></tr>';
    return;
  }

  const byExercise = {};

  legWorkouts.forEach((w) => {
    if (!byExercise[w.exercise]) {
      byExercise[w.exercise] = {
        count: 0,
        weights: [],
        oneRMs: [],
        volumes: [],
        reps: [],
      };
    }
    byExercise[w.exercise].count++;
    byExercise[w.exercise].weights.push(w.weight);
    byExercise[w.exercise].oneRMs.push(w.oneRM);
    byExercise[w.exercise].volumes.push(w.volume);
    byExercise[w.exercise].reps.push(w.totalReps);
  });

  container.innerHTML = Object.entries(byExercise)
    .map(([exercise, data]) => {
      const avgWeight = (
        data.weights.reduce((a, b) => a + b, 0) / data.count
      ).toFixed(1);
      const max1RM = Math.max(...data.oneRMs).toFixed(1);
      const totalVol = data.volumes.reduce((a, b) => a + b, 0);
      const avgReps = (
        data.reps.reduce((a, b) => a + b, 0) / data.count
      ).toFixed(1);

      return `
                <tr>
                    <td><strong>${exercise}</strong></td>
                    <td class="text-center"><small>${data.count}</small></td>
                    <td class="text-center"><small>${avgWeight} kg</small></td>
                    <td class="text-center"><small>${max1RM} kg</small></td>
                    <td class="text-center"><strong>${totalVol.toLocaleString("es-ES")}</strong></td>
                    <td class="text-center"><small>${avgReps}</small></td>
                </tr>
            `;
    })
    .join("");
}

// ==================== GRÁFICAS ====================

let legVolumeChartInstance,
  leg1RMChartInstance,
  legWeightChartInstance,
  monthlyLegVolumeChartInstance;

function renderLegCharts() {
  if (legWorkouts.length === 0) return;

  const sorted = [...legWorkouts].sort(
    (a, b) => new Date(a.date) - new Date(b.date),
  );

  const labels = sorted.map((w) =>
    new Date(w.date).toLocaleDateString("es-ES"),
  );
  const volumes = sorted.map((w) => w.volume);
  const oneRMs = sorted.map((w) => w.oneRM);
  const weights = sorted.map((w) => w.weight);

  // Gráfica de Volumen
  const volCtx = document.getElementById("legVolumeChart")?.getContext("2d");
  if (volCtx) {
    if (legVolumeChartInstance) legVolumeChartInstance.destroy();
    legVolumeChartInstance = new Chart(volCtx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Volumen (kg×reps)",
            data: volumes,
            backgroundColor: "#9c27b0",
            borderColor: "#9c27b0",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  // Gráfica de 1RM
  const oneRMCtx = document.getElementById("leg1RMChart")?.getContext("2d");
  if (oneRMCtx) {
    if (leg1RMChartInstance) leg1RMChartInstance.destroy();
    leg1RMChartInstance = new Chart(oneRMCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "1RM (kg)",
            data: oneRMs,
            borderColor: "#f44336",
            backgroundColor: "rgba(244, 67, 54, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  // Gráfica de Peso
  const weightCtx = document.getElementById("legWeightChart")?.getContext("2d");
  if (weightCtx) {
    if (legWeightChartInstance) legWeightChartInstance.destroy();
    legWeightChartInstance = new Chart(weightCtx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Peso Promedio (kg)",
            data: weights,
            borderColor: "#4caf50",
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            spanGaps: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  }

  // Gráfica de Volumen por Mes
  renderMonthlyLegVolumeChart();
}

// ==================== VOLUMEN POR MES ====================

function renderMonthlyLegVolumeChart() {
  const ctx = document
    .getElementById("monthlyLegVolumeChart")
    ?.getContext("2d");
  if (!ctx) return;

  if (legWorkouts.length === 0) return;

  // Agrupar por mes
  const monthlyVol = {};
  legWorkouts.forEach((w) => {
    const date = new Date(w.date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const monthLabel = date.toLocaleDateString("es-ES", {
      month: "short",
      year: "numeric",
    });

    if (!monthlyVol[monthKey]) {
      monthlyVol[monthKey] = { label: monthLabel, volume: 0, date };
    }
    monthlyVol[monthKey].volume += w.volume;
  });

  // Ordenar por fecha
  const sorted = Object.values(monthlyVol).sort((a, b) => a.date - b.date);

  const labels = sorted.map((m) => m.label);
  const data = sorted.map((m) => m.volume);

  if (monthlyLegVolumeChartInstance) monthlyLegVolumeChartInstance.destroy();

  monthlyLegVolumeChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Volumen por Mes",
          data,
          backgroundColor: "#2196f3",
          borderColor: "#2196f3",
          borderWidth: 1,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

// ==================== UTILIDADES ====================

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-ES");
}
