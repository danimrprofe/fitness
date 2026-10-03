// Estado global
let runningActivities = [];
const RUNNING_PAGE_SIZE = 15;
let runningCurrentPage = 1;

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  console.log("Iniciando carga de datos...");
  setupRunningEventListeners();

  // Siempre cargar desde archivo para asegurar datos actualizados
  loadRunningFromFile();
});

// Cargar datos del archivo JSON
function loadRunningFromFile() {
  fetch("data-running.json")
    .then((response) => {
      if (!response.ok) throw new Error("Error en fetch");
      return response.json();
    })
    .then((data) => {
      console.log("Datos cargados:", data.length);
      runningActivities = data;
      saveRunningToStorage();
      renderRunning();
      updateRunningStats();
    })
    .catch((err) => {
      console.error("Error al cargar datos de running:", err);
    });
}

// ==================== PATRÓN DE ENTRENAMIENTOS ====================

function getExpectedTrainingType(dayOfWeek) {
  switch (dayOfWeek.toLowerCase()) {
    case "martes":
      return { type: "Series/Intervalos", icon: "⚡", color: "#0d6efd" };
    case "jueves":
      return { type: "Tempo", icon: "🔥", color: "#ffc107" };
    case "sábado":
    case "domingo":
      return { type: "Tirada Larga", icon: "🏃", color: "#28a745" };
    default:
      return { type: "Recuperación", icon: "🟢", color: "#6c757d" };
  }
}

function categorizeWorkout(activity) {
  const expected = getExpectedTrainingType(activity.dayOfWeek);
  const title = (activity.title || "").toLowerCase();

  let actual = expected.type;

  if (
    title.includes("serie") ||
    title.includes("1000") ||
    title.includes("interval")
  ) {
    actual = "Series/Intervalos";
  } else if (title.includes("tempo")) {
    actual = "Tempo";
  } else if (
    title.includes("tirada larga") ||
    title.includes("larga") ||
    (activity.distance > 14 && activity.distance !== expected.distance)
  ) {
    actual = "Tirada Larga";
  }

  const followsPattern = actual === expected.type;
  return {
    expected: expected.type,
    actual,
    followsPattern,
    expected_info: expected,
  };
}

// ==================== ALMACENAMIENTO ====================

function loadRunningFromStorage() {
  const stored = localStorage.getItem("running");
  runningActivities = stored ? JSON.parse(stored) : [];
}

function saveRunningToStorage() {
  localStorage.setItem("running", JSON.stringify(runningActivities));
}

// ==================== EVENT LISTENERS ====================

function setupRunningEventListeners() {
  const filterType = document.getElementById("filterRunningType");
  const filterTitle = document.getElementById("filterRunningTitle");
  const clearBtn = document.getElementById("clearRunningBtn");
  const exportBtn = document.getElementById("exportRunningBtn");
  const importBtn = document.getElementById("importRunningBtn");
  const importFile = document.getElementById("importRunningFile");
  const paginationContainer = document.getElementById("runningPagination");
  const dashboardPeriod = document.getElementById("dashboardPeriod");

  if (dashboardPeriod) {
    dashboardPeriod.addEventListener("change", renderRunningDashboard);
  }

  if (filterType)
    filterType.addEventListener("change", () => {
      runningCurrentPage = 1;
      renderRunning();
    });
  if (filterTitle)
    filterTitle.addEventListener("input", () => {
      runningCurrentPage = 1;
      renderRunning();
    });
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      if (filterType) filterType.value = "";
      if (filterTitle) filterTitle.value = "";
      runningCurrentPage = 1;
      renderRunning();
    });
  }

  if (paginationContainer) {
    paginationContainer.addEventListener("click", (event) => {
      const button = event.target.closest("[data-page]");
      if (!button) return;

      const page = Number(button.dataset.page);
      if (Number.isNaN(page)) return;

      runningCurrentPage = page;
      renderRunning();
    });
  }

  if (exportBtn) exportBtn.addEventListener("click", exportRunning);
  if (importBtn)
    importBtn.addEventListener("click", () => {
      if (importFile) importFile.click();
    });
  if (importFile) importFile.addEventListener("change", importRunning);
}

// ==================== IMPORT/EXPORT ====================

function exportRunning() {
  const json = JSON.stringify(runningActivities, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `running-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function parseRunningCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) return [];

  const parseCsvLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        values.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    values.push(current);
    return values.map((value) => value.trim());
  };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(parseCsvLine);

  return rows
    .map((row) => {
      const record = {};
      headers.forEach((header, idx) => {
        record[header] = row[idx] ?? "";
      });
      return record;
    })
    .filter((row) => {
      const type = (row["Tipo de actividad"] || "").toLowerCase();
      return /(carrera|corrida|correr|running|run|treadmill|cinta)/i.test(type);
    })
    .map((row) => {
      const rawDate = row["Fecha"] || "";
      const datePart = rawDate.split(" ")[0];
      const date = new Date(rawDate.replace(" ", "T"));
      const day =
        date instanceof Date && !isNaN(date)
          ? date.toLocaleDateString("es-ES", { weekday: "long" })
          : "";

      const normalizeNumber = (value) => {
        const raw = String(value ?? "").trim();
        if (!raw || raw === "--" || raw === "-" || raw === "—") return 0;

        let cleaned = raw.replace(/['\s]/g, "").replace(/\u00A0/g, "");
        if (!cleaned) return 0;

        if (cleaned.includes(",") && cleaned.includes(".")) {
          cleaned =
            cleaned.lastIndexOf(",") > cleaned.lastIndexOf(".")
              ? cleaned.replace(/\./g, "").replace(",", ".")
              : cleaned.replace(/,/g, "");
        } else if (cleaned.includes(",")) {
          cleaned =
            cleaned.split(",").at(-1).length === 3
              ? cleaned.replace(/,/g, "")
              : cleaned.replace(",", ".");
        }

        return Number.parseFloat(cleaned) || 0;
      };

      return {
        id: date.getTime(),
        date: datePart,
        dayOfWeek: day ? day.charAt(0).toUpperCase() + day.slice(1) : "",
        activityType: row["Tipo de actividad"] || "",
        title: row["Título"] || row["Tipo de actividad"] || "",
        distance: normalizeNumber(row["Distancia"]),
        time: row["Tiempo"] || "00:00:00",
        paceAvg: row["Ritmo medio"] || "",
        hrAvg: Number.parseInt(
          normalizeNumber(row["Frecuencia cardiaca media"]) || 0,
          10,
        ),
        hrMax: Number.parseInt(normalizeNumber(row["FC máxima"]) || 0, 10),
        calories: Number.parseInt(normalizeNumber(row["Calorías"]) || 0, 10),
        cadence: Number.parseInt(
          normalizeNumber(row["Cadencia de carrera media"]) || 0,
          10,
        ),
        elevation: Number.parseInt(
          normalizeNumber(row["Ascenso total"]) || 0,
          10,
        ),
        notes: "",
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function importRunning(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const text = event.target.result;
      const isCsv = file.name.toLowerCase().endsWith(".csv");
      const imported = isCsv ? parseRunningCsv(text) : JSON.parse(text);

      if (!Array.isArray(imported) || imported.length === 0) {
        throw new Error("No se encontraron actividades válidas para importar");
      }

      runningActivities = imported;
      saveRunningToStorage();
      renderRunning();
      updateRunningStats();
    } catch (err) {
      alert("Error al importar: " + err.message);
    }
  };
  reader.readAsText(file);
}

// ==================== RENDERIZADO ====================

function renderRunning() {
  const tableBody = document.getElementById("runningTableBody");
  const emptyMessage = document.getElementById("emptyRunningMessage");
  const paginationContainer = document.getElementById("runningPagination");

  if (!tableBody) {
    console.warn("runningTableBody no encontrado");
    return;
  }

  const filterTypeSelect = document.getElementById("filterRunningType");
  const filterTitleInput = document.getElementById("filterRunningTitle");

  const filterType = filterTypeSelect ? filterTypeSelect.value : "";
  const filterTitle = filterTitleInput
    ? filterTitleInput.value.toLowerCase()
    : "";

  const filtered = runningActivities.filter((a) => {
    const matchType = !filterType || a.activityType === filterType;
    const matchTitle =
      !filterTitle || (a.title && a.title.toLowerCase().includes(filterTitle));
    return matchType && matchTitle;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = "";
    if (paginationContainer) paginationContainer.innerHTML = "";
    if (emptyMessage) emptyMessage.style.display = "block";
    return;
  }

  if (emptyMessage) emptyMessage.style.display = "none";

  const sorted = [...filtered].sort(
    (a, b) => new Date(b.date) - new Date(a.date),
  );

  const withProgress = sorted.map((activity, idx) => {
    const previous = sorted
      .slice(idx + 1)
      .find(
        (a) =>
          a.activityType === activity.activityType &&
          a.distance > 0 &&
          activity.distance > 0,
      );

    let progress = null;
    if (previous) {
      progress = (
        ((activity.distance - previous.distance) / previous.distance) *
        100
      ).toFixed(1);
    }

    const originalIndex = runningActivities.findIndex(
      (item) =>
        item.id === activity.id &&
        item.date === activity.date &&
        item.title === activity.title,
    );

    return { ...activity, progress, __originalIndex: originalIndex };
  });

  const totalPages = Math.max(
    1,
    Math.ceil(withProgress.length / RUNNING_PAGE_SIZE),
  );
  if (runningCurrentPage > totalPages) runningCurrentPage = totalPages;

  const startIndex = (runningCurrentPage - 1) * RUNNING_PAGE_SIZE;
  const visibleRows = withProgress.slice(
    startIndex,
    startIndex + RUNNING_PAGE_SIZE,
  );

  tableBody.innerHTML = visibleRows
    .map((activity) => {
      const progressClass = activity.progress
        ? parseFloat(activity.progress) > 0
          ? "progress-up"
          : parseFloat(activity.progress) < 0
            ? "progress-down"
            : "progress-neutral"
        : "";
      const progressSign = activity.progress
        ? parseFloat(activity.progress) > 0
          ? "+"
          : ""
        : "";

      const workout = categorizeWorkout(activity);
      const patternBg = workout.followsPattern ? "bg-light" : "table-warning";
      const patternIcon = workout.followsPattern ? "✅" : "⚠️";

      const variationMarkup = activity.progress
        ? `<span class="${progressClass}" style="font-size: 0.7rem; opacity: 0.65;">${progressSign + activity.progress + "%"}</span>`
        : "";

      return `
            <tr class="${patternBg}">
                <td><small>${new Date(activity.date).toLocaleDateString("es-ES")}</small></td>
                <td><small>${activity.activityType}</small></td>
                <td><strong>${activity.title}</strong> <small style="color: gray;">${patternIcon} ${workout.actual}</small></td>
                <td><strong>${activity.distance.toFixed(2)}</strong> ${variationMarkup}</td>
                <td><small>${activity.time}</small></td>
                <td><small>${activity.paceAvg}</small></td>
                <td><small>${activity.hrAvg > 0 ? activity.hrAvg : "--"}</small></td>
                <td><small>${activity.calories}</small></td>
                <td><small>${activity.elevation}m</small></td>
                <td>
                    <button class="btn btn-sm btn-primary btn-expand" onclick="showRunningDetails(${activity.__originalIndex})">→</button>
                </td>
            </tr>
        `;
    })
    .join("");

  const startItem = (runningCurrentPage - 1) * RUNNING_PAGE_SIZE + 1;
  const endItem = Math.min(
    runningCurrentPage * RUNNING_PAGE_SIZE,
    withProgress.length,
  );

  if (paginationContainer) {
    const pageNumbers = Array.from({ length: totalPages }, (_, idx) => idx + 1)
      .slice(
        Math.max(0, runningCurrentPage - 2),
        Math.min(totalPages, runningCurrentPage + 2),
      )
      .map(
        (page) => `
        <li class="page-item ${page === runningCurrentPage ? "active" : ""}">
          <button class="page-link" type="button" data-page="${page}">${page}</button>
        </li>
      `,
      )
      .join("");

    paginationContainer.innerHTML = `
      <div class="d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 mt-3 pt-2 border-top">
        <small class="text-muted">Mostrando ${startItem}-${endItem} de ${withProgress.length} entrenamientos</small>
        <nav aria-label="Paginación de entrenamientos">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item ${runningCurrentPage === 1 ? "disabled" : ""}">
              <button class="page-link" type="button" data-page="${Math.max(1, runningCurrentPage - 1)}">Anterior</button>
            </li>
            ${pageNumbers}
            <li class="page-item ${runningCurrentPage === totalPages ? "disabled" : ""}">
              <button class="page-link" type="button" data-page="${Math.min(totalPages, runningCurrentPage + 1)}">Siguiente</button>
            </li>
          </ul>
        </nav>
      </div>
    `;
  }
}

function showRunningDetails(idx) {
  const activity = runningActivities[idx];
  if (!activity) return;

  const modal = new bootstrap.Modal(
    document.getElementById("detailsRunningModal"),
  );
  document.getElementById("modalRunningTitle").textContent =
    `${activity.title} - ${new Date(activity.date).toLocaleDateString("es-ES")}`;

  const html = `
        <div class="detail-row">
            <strong>Fecha:</strong>
            <span>${new Date(activity.date).toLocaleDateString("es-ES")} (${activity.dayOfWeek})</span>
        </div>
        <div class="detail-row">
            <strong>Tipo:</strong>
            <span>${activity.activityType}</span>
        </div>
        <div class="detail-row">
            <strong>Título:</strong>
            <span>${activity.title}</span>
        </div>
        <div class="detail-row">
            <strong>Distancia:</strong>
            <span>${activity.distance.toFixed(2)} km</span>
        </div>
        <div class="detail-row">
            <strong>Tiempo:</strong>
            <span>${activity.time}</span>
        </div>
        <div class="detail-row">
            <strong>Ritmo Promedio:</strong>
            <span>${activity.paceAvg} /km</span>
        </div>
        <div class="detail-row">
            <strong>FC Media:</strong>
            <span>${activity.hrAvg} bpm</span>
        </div>
        <div class="detail-row">
            <strong>FC Máxima:</strong>
            <span>${activity.hrMax} bpm</span>
        </div>
        <div class="detail-row">
            <strong>Calorías:</strong>
            <span>${activity.calories} kcal</span>
        </div>
        <div class="detail-row">
            <strong>Cadencia:</strong>
            <span>${activity.cadence} pasos/min</span>
        </div>
        <div class="detail-row">
            <strong>Elevación:</strong>
            <span>${activity.elevation} m</span>
        </div>
        ${activity.notes ? `<div class="detail-row"><strong>Notas:</strong><span>${activity.notes}</span></div>` : ""}
    `;

  document.getElementById("modalRunningBody").innerHTML = html;
  modal.show();
}

// ==================== ESTADÍSTICAS ====================

function updateRunningStats() {
  renderRunningDashboard();

  if (runningActivities.length === 0) {
    document.getElementById("totalRuns").textContent = "-";
    document.getElementById("totalDistance").textContent = "-";
    document.getElementById("avgPace").textContent = "-";
    document.getElementById("avgHR").textContent = "-";
    renderTrainingTypeAnalysis();
    renderRunningCharts();
    return;
  }

  document.getElementById("totalRuns").textContent = runningActivities.length;

  const totalDist = runningActivities.reduce(
    (sum, a) => sum + (a.distance || 0),
    0,
  );
  document.getElementById("totalDistance").textContent = totalDist.toFixed(1);

  const validPaces = runningActivities.filter(
    (a) => a.paceAvg && paceToMinutes(a.paceAvg) > 0,
  );
  const avgPaceNum = validPaces.length
    ? validPaces.reduce((sum, a) => sum + paceToMinutes(a.paceAvg), 0) /
      validPaces.length
    : 0;
  document.getElementById("avgPace").textContent =
    avgPaceNum > 0 ? minutesToPace(avgPaceNum) : "-";

  const validHr = runningActivities.filter((a) => Number(a.hrAvg) > 0);
  const avgHR = validHr.length
    ? Math.round(
        validHr.reduce((sum, a) => sum + Number(a.hrAvg), 0) / validHr.length,
      )
    : 0;
  document.getElementById("avgHR").textContent = avgHR > 0 ? avgHR : "-";

  renderTrainingTypeAnalysis();
  renderRunningCharts();
  renderPatternAnalysis();
}

function paceToMinutes(paceStr) {
  if (!paceStr || typeof paceStr !== "string") return 0;
  const parts = paceStr.split(":").map(Number);
  if (parts.length < 2) return 0;
  const [min, sec] = parts;
  return min + (sec || 0) / 60;
}

function minutesToPace(minutes) {
  const min = Math.floor(minutes);
  const sec = Math.round((minutes - min) * 60);
  return `${min}:${sec.toString().padStart(2, "0")}`;
}

function parseRunningDate(value) {
  if (!value) return null;

  const dateParts = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateParts) {
    return new Date(
      Number(dateParts[1]),
      Number(dateParts[2]) - 1,
      Number(dateParts[3]),
    );
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? null
    : new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

function parseRunningDuration(value) {
  if (typeof value !== "string") return 0;
  const parts = value.split(":").map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && parts.every(Number.isFinite)) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function formatRunningDuration(totalSeconds) {
  if (!(totalSeconds > 0)) return "0 min";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  return hours > 0 ? `${hours} h ${minutes} min` : `${minutes} min`;
}

function formatRunningTime(totalSeconds) {
  let remainingSeconds = Math.round(totalSeconds);
  const hours = Math.floor(remainingSeconds / 3600);
  remainingSeconds %= 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const time = [hours, minutes, seconds].map((part) =>
    String(part).padStart(2, "0"),
  );
  return hours > 0 ? time.join(":") : time.slice(1).join(":");
}

function formatDashboardDate(date) {
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDashboardDateRange(period, today) {
  const start = new Date(today);
  if (period === "week") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  } else if (period === "30days") {
    start.setDate(start.getDate() - 29);
  } else if (period === "month") {
    start.setDate(1);
  } else {
    start.setMonth(0, 1);
  }
  return { start, end: new Date(today) };
}

function getPreviousDashboardDateRange(period, currentRange) {
  const start = new Date(currentRange.start);
  const end = new Date(currentRange.end);

  if (period === "week") {
    start.setDate(start.getDate() - 7);
    end.setDate(end.getDate() - 7);
  } else if (period === "30days") {
    start.setDate(start.getDate() - 30);
    end.setDate(end.getDate() - 30);
  } else if (period === "month") {
    const previousMonthLastDay = new Date(
      start.getFullYear(),
      start.getMonth(),
      0,
    ).getDate();
    start.setMonth(start.getMonth() - 1, 1);
    end.setFullYear(start.getFullYear(), start.getMonth(), 1);
    end.setDate(Math.min(currentRange.end.getDate(), previousMonthLastDay));
  } else {
    const previousYear = start.getFullYear() - 1;
    const previousEndDay = Math.min(
      end.getDate(),
      new Date(previousYear, end.getMonth() + 1, 0).getDate(),
    );
    start.setFullYear(previousYear);
    end.setFullYear(previousYear, end.getMonth(), previousEndDay);
  }

  return { start, end };
}

function getActivitiesInDashboardRange(range) {
  return runningActivities.filter((activity) => {
    const date = parseRunningDate(activity.date);
    return date && date >= range.start && date <= range.end;
  });
}

function setDashboardText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function formatDashboardDistance(distance) {
  return distance.toLocaleString("es-ES", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}

function updateDashboardRecord(targetKm, valueId, detailsId) {
  const tolerance = targetKm * 0.03;
  const candidates = runningActivities
    .map((activity) => {
      const distance = Number(activity.distance);
      const duration = parseRunningDuration(activity.time);
      const date = parseRunningDate(activity.date);
      if (
        !Number.isFinite(distance) ||
        distance <= 0 ||
        duration <= 0 ||
        !date ||
        Math.abs(distance - targetKm) > tolerance
      ) {
        return null;
      }
      return {
        activity,
        date,
        distance,
        estimatedTime: (duration * targetKm) / distance,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.estimatedTime - b.estimatedTime);

  const best = candidates[0];
  if (!best) {
    setDashboardText(valueId, "Sin marca");
    setDashboardText(
      detailsId,
      `Sin actividad cercana a ${formatDashboardDistance(targetKm)} km`,
    );
    return;
  }

  setDashboardText(valueId, `~${formatRunningTime(best.estimatedTime)}`);
  setDashboardText(
    detailsId,
    `${formatDashboardDate(best.date)} · ${formatDashboardDistance(best.distance)} km · ${best.activity.title || "Carrera"}`,
  );
}

function renderRunningDashboard() {
  const periodSelect = document.getElementById("dashboardPeriod");
  const period = periodSelect?.value || "week";
  const periodNames = {
    week: "Semana en curso",
    "30days": "Últimos 30 días",
    month: "Mes en curso",
    year: "Año en curso",
  };
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentRange = getDashboardDateRange(period, today);
  const previousRange = getPreviousDashboardDateRange(period, currentRange);
  const currentActivities = getActivitiesInDashboardRange(currentRange);
  const previousActivities = getActivitiesInDashboardRange(previousRange);
  const currentKm = currentActivities.reduce(
    (sum, activity) => sum + (Number(activity.distance) || 0),
    0,
  );
  const previousKm = previousActivities.reduce(
    (sum, activity) => sum + (Number(activity.distance) || 0),
    0,
  );
  const currentSeconds = currentActivities.reduce(
    (sum, activity) => sum + parseRunningDuration(activity.time),
    0,
  );
  const positiveElevation = currentActivities.reduce(
    (sum, activity) => sum + Math.max(0, Number(activity.elevation) || 0),
    0,
  );

  setDashboardText(
    "dashboardPeriodRange",
    `${periodNames[period] || periodNames.week} · ${formatDashboardDate(currentRange.start)} – ${formatDashboardDate(currentRange.end)}`,
  );
  setDashboardText("dashboardDistance", formatDashboardDistance(currentKm));
  setDashboardText("dashboardTime", formatRunningDuration(currentSeconds));
  setDashboardText("dashboardRuns", String(currentActivities.length));
  setDashboardText(
    "dashboardElevation",
    Math.round(positiveElevation).toLocaleString("es-ES"),
  );
  setDashboardText(
    "dashboardCurrentKm",
    `${formatDashboardDistance(currentKm)} km`,
  );
  setDashboardText(
    "dashboardPreviousKm",
    `${formatDashboardDistance(previousKm)} km`,
  );
  setDashboardText(
    "dashboardComparisonDates",
    `${formatDashboardDate(previousRange.start)} – ${formatDashboardDate(previousRange.end)}`,
  );

  const changeElement = document.getElementById("dashboardComparisonChange");
  if (changeElement) {
    if (previousKm > 0) {
      const change = ((currentKm - previousKm) / previousKm) * 100;
      const sign = change > 0 ? "+" : "";
      changeElement.textContent = `${sign}${change.toFixed(1)}%`;
      changeElement.className =
        change > 0
          ? "text-success"
          : change < 0
            ? "text-danger"
            : "text-secondary";
    } else {
      changeElement.textContent =
        currentKm > 0
          ? "Sin actividad en el periodo anterior"
          : "Sin kilómetros";
      changeElement.className = "text-secondary small";
    }
  }

  const maxKm = Math.max(currentKm, previousKm);
  const currentBar = document.getElementById("dashboardCurrentBar");
  const previousBar = document.getElementById("dashboardPreviousBar");
  if (currentBar) {
    currentBar.style.width = `${maxKm ? (currentKm / maxKm) * 100 : 0}%`;
  }
  if (previousBar) {
    previousBar.style.width = `${maxKm ? (previousKm / maxKm) * 100 : 0}%`;
  }

  const todayStart = new Date(today);
  todayStart.setDate(todayStart.getDate() - 29);
  const recentActivities = getActivitiesInDashboardRange({
    start: todayStart,
    end: today,
  });
  const longestRecent = recentActivities.reduce(
    (longest, activity) =>
      Number(activity.distance) > Number(longest?.distance || 0)
        ? activity
        : longest,
    null,
  );
  if (longestRecent) {
    setDashboardText(
      "dashboardLongestTitle",
      `${formatDashboardDistance(Number(longestRecent.distance))} km · ${longestRecent.title || "Carrera"}`,
    );
    setDashboardText(
      "dashboardLongestDetails",
      `${formatDashboardDate(parseRunningDate(longestRecent.date))} · ${longestRecent.time || "Duración no disponible"}`,
    );
  } else {
    setDashboardText("dashboardLongestTitle", "Sin entrenamientos recientes");
    setDashboardText("dashboardLongestDetails", "");
  }

  const latestActivity = [...runningActivities]
    .filter((activity) => parseRunningDate(activity.date))
    .sort((a, b) => parseRunningDate(b.date) - parseRunningDate(a.date))[0];
  if (latestActivity) {
    setDashboardText(
      "dashboardLastRunTitle",
      latestActivity.title || latestActivity.activityType || "Carrera",
    );
    setDashboardText(
      "dashboardLastRunDetails",
      `${formatDashboardDate(parseRunningDate(latestActivity.date))} · ${formatDashboardDistance(Number(latestActivity.distance) || 0)} km · ${latestActivity.time || "Duración no disponible"}`,
    );
  } else {
    setDashboardText("dashboardLastRunTitle", "Sin entrenamientos");
    setDashboardText("dashboardLastRunDetails", "");
  }

  updateDashboardRecord(5, "dashboardBest5k", "dashboardBest5kDetails");
  updateDashboardRecord(10, "dashboardBest10k", "dashboardBest10kDetails");
  updateDashboardRecord(
    21.0975,
    "dashboardBestHalf",
    "dashboardBestHalfDetails",
  );
}

// ==================== ANÁLISIS DE PATRONES ====================

function renderPatternAnalysis() {
  const container = document.getElementById("patternAnalysisContainer");
  if (!container) {
    console.warn("Container patternAnalysisContainer no encontrado");
    return;
  }

  if (runningActivities.length === 0) {
    container.innerHTML = '<p class="text-muted">Cargando análisis...</p>';
    return;
  }

  try {
    // Agrupar por día y analizar patrón
    const byDay = {
      martes: {
        expected: "Series/Intervalos",
        actual: {},
        total: 0,
        correct: 0,
      },
      jueves: { expected: "Tempo", actual: {}, total: 0, correct: 0 },
      sábado: { expected: "Tirada Larga", actual: {}, total: 0, correct: 0 },
      domingo: { expected: "Tirada Larga", actual: {}, total: 0, correct: 0 },
    };

    runningActivities.forEach((activity) => {
      const day = activity.dayOfWeek.toLowerCase();
      if (byDay[day]) {
        const workout = categorizeWorkout(activity);
        byDay[day].total++;
        if (workout.followsPattern) {
          byDay[day].correct++;
        }
        byDay[day].actual[workout.actual] =
          (byDay[day].actual[workout.actual] || 0) + 1;
      }
    });

    const html = `
            <div class="row row-cols-1 row-cols-sm-2 row-cols-xl-4 g-3">
                ${Object.entries(byDay)
                  .map(([day, data]) => {
                    if (data.total === 0) return "";
                    const percentage = Math.round(
                      (data.correct / data.total) * 100,
                    );
                    const percentClass =
                      percentage >= 80
                        ? "bg-success"
                        : percentage >= 60
                          ? "bg-warning"
                          : "bg-danger";

                    return `
                        <div class="col">
                            <div class="card border-0 shadow-sm pattern-card h-100">
                                <div class="card-body p-3">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <h6 class="text-capitalize mb-0 fw-bold text-dark">${day}</h6>
                                        <span class="badge rounded-pill bg-success-subtle text-success-emphasis px-2 py-1">${percentage}%</span>
                                    </div>
                                    <div class="small text-secondary mb-2">Esperado: ${data.expected}</div>
                                    <div class="progress rounded-pill" style="height: 14px; background-color: rgba(13, 110, 253, 0.08);">
                                        <div class="progress-bar ${percentClass} rounded-pill" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100" style="width: ${percentage}%"></div>
                                    </div>
                                    <div class="d-flex justify-content-between align-items-center mt-2 small">
                                        <span class="text-muted">${data.correct}/${data.total}</span>
                                        <span class="text-muted">cumplidas</span>
                                    </div>
                                    <div class="mt-2 small text-secondary">
                                        ${Object.entries(data.actual)
                                          .map(
                                            ([type, count]) =>
                                              `<div class="d-flex justify-content-between gap-2"><span>${type}</span><span class="text-muted">${count}</span></div>`,
                                          )
                                          .join("")}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                  })
                  .join("")}
            </div>
        `;

    container.innerHTML = html;
  } catch (err) {
    console.error("Error en renderPatternAnalysis:", err);
    container.innerHTML = '<p class="text-danger">Error al cargar análisis</p>';
  }
}

// ==================== ANÁLISIS POR TIPO ====================

function classifyTrainingType(activity) {
  const title = (activity.title || "").toLowerCase();

  if (title.includes("tempo")) {
    return "Tempo";
  } else if (
    title.includes("tirada larga") ||
    title.includes("larga portixol") ||
    title.includes("larga palmanova") ||
    activity.distance > 14
  ) {
    return "Tirada Larga";
  } else if (
    title.includes("serie") ||
    title.includes("1000") ||
    title.includes("interval") ||
    title.includes("6x") ||
    title.includes("5x")
  ) {
    return "Series/Intervalos";
  }
  return "Otro";
}

function renderTrainingTypeAnalysis() {
  const container = document.getElementById("trainingTypeTable");
  if (!container) return;

  if (runningActivities.length === 0) {
    container.innerHTML = '<p class="text-muted text-center">Sin datos</p>';
    return;
  }

  const byType = {
    "Series/Intervalos": {
      count: 0,
      distances: [],
      paces: [],
      hrs: [],
      calories: 0,
    },
    Tempo: { count: 0, distances: [], paces: [], hrs: [], calories: 0 },
    "Tirada Larga": {
      count: 0,
      distances: [],
      paces: [],
      hrs: [],
      calories: 0,
    },
  };

  runningActivities.forEach((a) => {
    const type = classifyTrainingType(a);
    if (byType[type]) {
      byType[type].count++;
      byType[type].distances.push(a.distance);
      byType[type].paces.push(paceToMinutes(a.paceAvg));
      byType[type].hrs.push(a.hrAvg);
      byType[type].calories += a.calories;
    }
  });

  container.innerHTML = Object.entries(byType)
    .filter(([type, data]) => data.count > 0)
    .map(([type, data]) => {
      const avgDist = (
        data.distances.reduce((a, b) => a + b, 0) / data.count
      ).toFixed(2);
      const avgPace = minutesToPace(
        data.paces.reduce((a, b) => a + b, 0) / data.count,
      );
      const avgHR = Math.round(
        data.hrs.reduce((a, b) => a + b, 0) / data.count,
      );

      return `
                <tr>
                    <td><strong>${type}</strong></td>
                    <td class="text-center"><small>${data.count}</small></td>
                    <td class="text-center"><small>${avgDist} km</small></td>
                    <td class="text-center"><small>${avgPace}</small></td>
                    <td class="text-center"><small>${avgHR} bpm</small></td>
                    <td class="text-center"><strong>${data.calories} kcal</strong></td>
                </tr>
            `;
    })
    .join("");
}

// ==================== GRÁFICAS ====================

let distanceChartInstance, caloriesChartInstance, monthlyKmChartInstance;

function renderRunningCharts() {
  if (runningActivities.length === 0) return;

  try {
    const sorted = [...runningActivities].sort(
      (a, b) => new Date(a.date) - new Date(b.date),
    );

    const labels = sorted.map((a) =>
      new Date(a.date).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
      }),
    );
    const distances = sorted.map((a) => a.distance || 0);
    const calories = sorted.map((a) => a.calories || 0);

    // Gráfica de Distancia
    const distCtx = document.getElementById("distanceChart")?.getContext("2d");
    if (distCtx) {
      if (distanceChartInstance) distanceChartInstance.destroy();
      distanceChartInstance = new Chart(distCtx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Distancia (km)",
              data: distances,
              backgroundColor: "#0d6efd",
              borderColor: "#0d6efd",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: {
                autoSkip: true,
                maxTicksLimit: 8,
                maxRotation: 0,
                minRotation: 0,
                font: { size: 10 },
              },
              grid: { display: false },
            },
            y: { beginAtZero: true },
          },
        },
      });
    }

    // Gráfica de Calorías
    const caloriesCtx = document
      .getElementById("caloriesChart")
      ?.getContext("2d");
    if (caloriesCtx) {
      if (caloriesChartInstance) caloriesChartInstance.destroy();
      caloriesChartInstance = new Chart(caloriesCtx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Calorías (kcal)",
              data: calories,
              backgroundColor: "#fd7e14",
              borderColor: "#fd7e14",
              borderWidth: 1,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: {
              ticks: {
                autoSkip: true,
                maxTicksLimit: 8,
                maxRotation: 0,
                minRotation: 0,
                font: { size: 10 },
              },
              grid: { display: false },
            },
            y: { beginAtZero: true },
          },
        },
      });
    }

    // Gráfica de Kilómetros por mes
    renderMonthlyKmChart();
  } catch (err) {
    console.error("Error en renderRunningCharts:", err);
  }
}

// ==================== KILÓMETROS POR MES ====================

function renderMonthlyKmChart() {
  try {
    const ctx = document.getElementById("monthlyKmChart")?.getContext("2d");
    if (!ctx) return;

    if (runningActivities.length === 0) return;

    // Agrupar por mes
    const monthlyKm = {};
    runningActivities.forEach((a) => {
      const date = new Date(a.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const monthLabel = date.toLocaleDateString("es-ES", {
        month: "short",
        year: "numeric",
      });

      if (!monthlyKm[monthKey]) {
        monthlyKm[monthKey] = { label: monthLabel, km: 0, date };
      }
      monthlyKm[monthKey].km += a.distance || 0;
    });

    // Ordenar por fecha
    const sorted = Object.values(monthlyKm).sort((a, b) => a.date - b.date);

    const labels = sorted.map((m) => m.label);
    const data = sorted.map((m) => m.km);

    if (monthlyKmChartInstance) monthlyKmChartInstance.destroy();

    monthlyKmChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Kilómetros por Mes",
            data,
            backgroundColor: "#17a2b8",
            borderColor: "#17a2b8",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: {
              autoSkip: true,
              maxTicksLimit: 8,
              maxRotation: 0,
              minRotation: 0,
              font: { size: 10 },
            },
            grid: { display: false },
          },
          y: { beginAtZero: true },
        },
      },
    });
  } catch (err) {
    console.error("Error en renderMonthlyKmChart:", err);
  }
}

// ==================== UTILIDADES ====================

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString("es-ES");
}
