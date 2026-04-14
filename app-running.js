// Estado global
let runningActivities = [];

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('Iniciando carga de datos...');
    setupRunningEventListeners();
    
    // Siempre cargar desde archivo para asegurar datos actualizados
    loadRunningFromFile();
});

// Cargar datos del archivo JSON
function loadRunningFromFile() {
    fetch('data-running.json')
        .then(response => {
            if (!response.ok) throw new Error('Error en fetch');
            return response.json();
        })
        .then(data => {
            console.log('Datos cargados:', data.length);
            runningActivities = data;
            saveRunningToStorage();
            renderRunning();
            updateRunningStats();
        })
        .catch(err => {
            console.error('Error al cargar datos de running:', err);
        });
}

// ==================== PATRÓN DE ENTRENAMIENTOS ====================

function getExpectedTrainingType(dayOfWeek) {
    switch(dayOfWeek.toLowerCase()) {
        case 'martes':
            return { type: 'Series/Intervalos', icon: '⚡', color: '#0d6efd' };
        case 'jueves':
            return { type: 'Tempo', icon: '🔥', color: '#ffc107' };
        case 'sábado':
        case 'domingo':
            return { type: 'Tirada Larga', icon: '🏃', color: '#28a745' };
        default:
            return { type: 'Recuperación', icon: '🟢', color: '#6c757d' };
    }
}

function categorizeWorkout(activity) {
    const expected = getExpectedTrainingType(activity.dayOfWeek);
    const title = (activity.title || '').toLowerCase();
    
    let actual = expected.type;
    
    if (title.includes('serie') || title.includes('1000') || title.includes('interval')) {
        actual = 'Series/Intervalos';
    } else if (title.includes('tempo')) {
        actual = 'Tempo';
    } else if (title.includes('tirada larga') || title.includes('larga') || 
               (activity.distance > 14 && activity.distance !== expected.distance)) {
        actual = 'Tirada Larga';
    }
    
    const followsPattern = actual === expected.type;
    return { expected: expected.type, actual, followsPattern, expected_info: expected };
}

// ==================== ALMACENAMIENTO ====================

function loadRunningFromStorage() {
    const stored = localStorage.getItem('running');
    runningActivities = stored ? JSON.parse(stored) : [];
}

function saveRunningToStorage() {
    localStorage.setItem('running', JSON.stringify(runningActivities));
}

// ==================== EVENT LISTENERS ====================

function setupRunningEventListeners() {
    const filterType = document.getElementById('filterRunningType');
    const filterTitle = document.getElementById('filterRunningTitle');
    const clearBtn = document.getElementById('clearRunningBtn');
    const exportBtn = document.getElementById('exportRunningBtn');
    const importBtn = document.getElementById('importRunningBtn');
    const importFile = document.getElementById('importRunningFile');

    if (filterType) filterType.addEventListener('change', renderRunning);
    if (filterTitle) filterTitle.addEventListener('input', renderRunning);
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (filterType) filterType.value = '';
            if (filterTitle) filterTitle.value = '';
            renderRunning();
        });
    }

    if (exportBtn) exportBtn.addEventListener('click', exportRunning);
    if (importBtn) importBtn.addEventListener('click', () => {
        if (importFile) importFile.click();
    });
    if (importFile) importFile.addEventListener('change', importRunning);
}

// ==================== IMPORT/EXPORT ====================

function exportRunning() {
    const json = JSON.stringify(runningActivities, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `running-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importRunning(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            runningActivities = JSON.parse(event.target.result);
            saveRunningToStorage();
            renderRunning();
            updateRunningStats();
        } catch (err) {
            alert('Error al importar: ' + err.message);
        }
    };
    reader.readAsText(file);
}

// ==================== RENDERIZADO ====================

function renderRunning() {
    const tableBody = document.getElementById('runningTableBody');
    const emptyMessage = document.getElementById('emptyRunningMessage');

    if (!tableBody) {
        console.warn('runningTableBody no encontrado');
        return;
    }

    const filterTypeSelect = document.getElementById('filterRunningType');
    const filterTitleInput = document.getElementById('filterRunningTitle');
    
    const filterType = filterTypeSelect ? filterTypeSelect.value : '';
    const filterTitle = filterTitleInput ? filterTitleInput.value.toLowerCase() : '';

    let filtered = runningActivities.filter(a => {
        const matchType = !filterType || a.activityType === filterType;
        const matchTitle = !filterTitle || (a.title && a.title.toLowerCase().includes(filterTitle));
        return matchType && matchTitle;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = '';
        if (emptyMessage) emptyMessage.style.display = 'block';
        return;
    }

    if (emptyMessage) emptyMessage.style.display = 'none';

    // Ordenar por fecha descendente
    const sorted = [...filtered].sort((a, b) => new Date(b.date) - new Date(a.date));

    // Calcular progresión
    const withProgress = sorted.map((activity, idx) => {
        const previous = sorted.slice(idx + 1).find(a => 
            a.activityType === activity.activityType && 
            a.distance > 0 && 
            activity.distance > 0
        );
        
        let progress = null;
        if (previous) {
            progress = ((activity.distance - previous.distance) / previous.distance * 100).toFixed(1);
        }
        
        return { ...activity, progress };
    });

    tableBody.innerHTML = withProgress.map(activity => {
        const progressClass = activity.progress ? 
            (parseFloat(activity.progress) > 0 ? 'progress-up' : 
             parseFloat(activity.progress) < 0 ? 'progress-down' : 'progress-neutral') : '';
        const progressSign = activity.progress ? 
            (parseFloat(activity.progress) > 0 ? '+' : '') : '';
        
        const workout = categorizeWorkout(activity);
        const patternBg = workout.followsPattern ? 'bg-light' : 'table-warning';
        const patternIcon = workout.followsPattern ? '✅' : '⚠️';

        return `
            <tr class="${patternBg}">
                <td><small>${new Date(activity.date).toLocaleDateString('es-ES')}</small></td>
                <td><small>${activity.activityType}</small></td>
                <td><strong>${activity.title}</strong> <small style="color: gray;">${patternIcon} ${workout.actual}</small></td>
                <td><strong>${activity.distance.toFixed(2)}</strong> <span class="${progressClass}">${activity.progress ? progressSign + activity.progress + '%' : ''}</span></td>
                <td><small>${activity.time}</small></td>
                <td><small>${activity.paceAvg}</small></td>
                <td><small>${activity.hrAvg}</small></td>
                <td><small>${activity.calories}</small></td>
                <td><small>${activity.elevation}m</small></td>
                <td>
                    <button class="btn btn-sm btn-primary btn-expand" onclick="showRunningDetails(${runningActivities.indexOf(activity)})">→</button>
                </td>
            </tr>
        `;
    }).join('');
}

function showRunningDetails(idx) {
    const activity = runningActivities[idx];
    if (!activity) return;

    const modal = new bootstrap.Modal(document.getElementById('detailsRunningModal'));
    document.getElementById('modalRunningTitle').textContent = `${activity.title} - ${new Date(activity.date).toLocaleDateString('es-ES')}`;

    const html = `
        <div class="detail-row">
            <strong>Fecha:</strong>
            <span>${new Date(activity.date).toLocaleDateString('es-ES')} (${activity.dayOfWeek})</span>
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
        ${activity.notes ? `<div class="detail-row"><strong>Notas:</strong><span>${activity.notes}</span></div>` : ''}
    `;

    document.getElementById('modalRunningBody').innerHTML = html;
    modal.show();
}

// ==================== ESTADÍSTICAS ====================

function updateRunningStats() {
    if (runningActivities.length === 0) {
        document.getElementById('totalRuns').textContent = '-';
        document.getElementById('totalDistance').textContent = '-';
        document.getElementById('avgPace').textContent = '-';
        document.getElementById('avgHR').textContent = '-';
        renderTrainingTypeAnalysis();
        renderRunningCharts();
        return;
    }

    // Total de entrenamientos
    document.getElementById('totalRuns').textContent = runningActivities.length;

    // Distancia total
    const totalDist = runningActivities.reduce((sum, a) => sum + (a.distance || 0), 0);
    document.getElementById('totalDistance').textContent = totalDist.toFixed(1);

    // Ritmo promedio (convertir a número)
    const avgPaceNum = runningActivities.reduce((sum, a) => sum + paceToMinutes(a.paceAvg), 0) / runningActivities.length;
    document.getElementById('avgPace').textContent = minutesToPace(avgPaceNum);

    // FC promedia
    const avgHR = Math.round(runningActivities.reduce((sum, a) => sum + (a.hrAvg || 0), 0) / runningActivities.length);
    document.getElementById('avgHR').textContent = avgHR;

    renderTrainingTypeAnalysis();
    renderRunningCharts();
    renderPatternAnalysis();
}

function paceToMinutes(paceStr) {
    if (!paceStr || typeof paceStr !== 'string') return 0;
    const parts = paceStr.split(':').map(Number);
    if (parts.length < 2) return 0;
    const [min, sec] = parts;
    return min + (sec || 0) / 60;
}

function minutesToPace(minutes) {
    const min = Math.floor(minutes);
    const sec = Math.round((minutes - min) * 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// ==================== ANÁLISIS DE PATRONES ====================

function renderPatternAnalysis() {
    const container = document.getElementById('patternAnalysisContainer');
    if (!container) {
        console.warn('Container patternAnalysisContainer no encontrado');
        return;
    }
    
    if (runningActivities.length === 0) {
        container.innerHTML = '<p class="text-muted">Cargando análisis...</p>';
        return;
    }

    try {
        // Agrupar por día y analizar patrón
        const byDay = {
            'martes': { expected: 'Series/Intervalos', actual: {}, total: 0, correct: 0 },
            'jueves': { expected: 'Tempo', actual: {}, total: 0, correct: 0 },
            'sábado': { expected: 'Tirada Larga', actual: {}, total: 0, correct: 0 },
            'domingo': { expected: 'Tirada Larga', actual: {}, total: 0, correct: 0 }
        };

        runningActivities.forEach(activity => {
            const day = activity.dayOfWeek.toLowerCase();
            if (byDay[day]) {
                const workout = categorizeWorkout(activity);
                byDay[day].total++;
                if (workout.followsPattern) {
                    byDay[day].correct++;
                }
                byDay[day].actual[workout.actual] = (byDay[day].actual[workout.actual] || 0) + 1;
            }
        });

        const html = `
            <div class="row">
                ${Object.entries(byDay).map(([day, data]) => {
                    if (data.total === 0) return '';
                    const percentage = Math.round((data.correct / data.total) * 100);
                    const percentClass = percentage >= 80 ? 'success' : percentage >= 60 ? 'warning' : 'danger';
                    
                    return `
                        <div class="col-md-6 mb-3">
                            <div class="card bg-light border-0">
                                <div class="card-body">
                                    <h6 class="text-capitalize mb-2"><strong>${day}</strong></h6>
                                    <small class="text-muted d-block mb-2">Esperado: ${data.expected}</small>
                                    <div class="progress" style="height: 20px;">
                                        <div class="progress-bar bg-${percentClass}" style="width: ${percentage}%">${percentage}%</div>
                                    </div>
                                    <small class="text-muted d-block mt-2">${data.correct}/${data.total} entrenamientos</small>
                                    <div style="font-size: 0.8rem; margin-top: 0.5rem;">
                                        ${Object.entries(data.actual).map(([type, count]) => 
                                            `<span class="text-muted">${type}: ${count}</span><br>`
                                        ).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        container.innerHTML = html;
    } catch (err) {
        console.error('Error en renderPatternAnalysis:', err);
        container.innerHTML = '<p class="text-danger">Error al cargar análisis</p>';
    }
}

// ==================== ANÁLISIS POR TIPO ====================

function classifyTrainingType(activity) {
    const title = (activity.title || '').toLowerCase();
    
    if (title.includes('tempo')) {
        return 'Tempo';
    } else if (title.includes('tirada larga') || title.includes('larga portixol') || 
               title.includes('larga palmanova') || (activity.distance > 14)) {
        return 'Tirada Larga';
    } else if (title.includes('serie') || title.includes('1000') || title.includes('interval') || 
               title.includes('6x') || title.includes('5x')) {
        return 'Series/Intervalos';
    }
    return 'Otro';
}

function renderTrainingTypeAnalysis() {
    const container = document.getElementById('trainingTypeTable');
    if (!container) return;

    if (runningActivities.length === 0) {
        container.innerHTML = '<p class="text-muted text-center">Sin datos</p>';
        return;
    }

    const byType = {
        'Series/Intervalos': { count: 0, distances: [], paces: [], hrs: [], calories: 0 },
        'Tempo': { count: 0, distances: [], paces: [], hrs: [], calories: 0 },
        'Tirada Larga': { count: 0, distances: [], paces: [], hrs: [], calories: 0 }
    };

    runningActivities.forEach(a => {
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
            const avgDist = (data.distances.reduce((a, b) => a + b, 0) / data.count).toFixed(2);
            const avgPace = minutesToPace(data.paces.reduce((a, b) => a + b, 0) / data.count);
            const avgHR = Math.round(data.hrs.reduce((a, b) => a + b, 0) / data.count);

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
        .join('');
}

// ==================== GRÁFICAS ====================

let distanceChartInstance, paceChartInstance, hrChartInstance, caloriesChartInstance, monthlyKmChartInstance;
let hrByTypeChartInstance;

function renderRunningCharts() {
    if (runningActivities.length === 0) return;

    try {
        const sorted = [...runningActivities].sort((a, b) => new Date(a.date) - new Date(b.date));

        const labels = sorted.map(a => new Date(a.date).toLocaleDateString('es-ES'));
        const distances = sorted.map(a => a.distance || 0);
        const paces = sorted.map(a => paceToMinutes(a.paceAvg));
        const hrs = sorted.map(a => a.hrAvg || 0);
        const calories = sorted.map(a => a.calories || 0);

        // Gráfica de Distancia
        const distCtx = document.getElementById('distanceChart')?.getContext('2d');
        if (distCtx) {
            if (distanceChartInstance) distanceChartInstance.destroy();
            distanceChartInstance = new Chart(distCtx, {
                type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Distancia (km)',
                    data: distances,
                    backgroundColor: '#0d6efd',
                    borderColor: '#0d6efd',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

    // Gráfica de Ritmo
    const paceCtx = document.getElementById('paceChart')?.getContext('2d');
    if (paceCtx) {
        if (paceChartInstance) paceChartInstance.destroy();
        paceChartInstance = new Chart(paceCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Ritmo (min/km)',
                    data: paces,
                    borderColor: '#6f42c1',
                    backgroundColor: 'rgba(111, 66, 193, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { reverse: true } }
            }
        });
    }

    // Gráfica de FC
    const hrCtx = document.getElementById('hrChart')?.getContext('2d');
    if (hrCtx) {
        if (hrChartInstance) hrChartInstance.destroy();
        hrChartInstance = new Chart(hrCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'FC Promedia (bpm)',
                    data: hrs,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    spanGaps: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { min: 120 } }
            }
        });
    }

    // Gráfica de Calorías
    const caloriesCtx = document.getElementById('caloriesChart')?.getContext('2d');
    if (caloriesCtx) {
        if (caloriesChartInstance) caloriesChartInstance.destroy();
        caloriesChartInstance = new Chart(caloriesCtx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Calorías (kcal)',
                    data: calories,
                    backgroundColor: '#fd7e14',
                    borderColor: '#fd7e14',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });
    }

        // Gráfica de Kilómetros por mes
        renderMonthlyKmChart();
    } catch (err) {
        console.error('Error en renderRunningCharts:', err);
    }
}

// ==================== KILÓMETROS POR MES ====================

function renderMonthlyKmChart() {
    try {
        const ctx = document.getElementById('monthlyKmChart')?.getContext('2d');
        if (!ctx) return;

        if (runningActivities.length === 0) return;

        // Agrupar por mes
        const monthlyKm = {};
        runningActivities.forEach(a => {
            const date = new Date(a.date);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            const monthLabel = date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
            
            if (!monthlyKm[monthKey]) {
                monthlyKm[monthKey] = { label: monthLabel, km: 0, date };
            }
            monthlyKm[monthKey].km += a.distance || 0;
        });

        // Ordenar por fecha
        const sorted = Object.values(monthlyKm)
            .sort((a, b) => a.date - b.date);

        const labels = sorted.map(m => m.label);
        const data = sorted.map(m => m.km);

        if (monthlyKmChartInstance) monthlyKmChartInstance.destroy();
        
        monthlyKmChartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Kilómetros por Mes',
                    data,
                    backgroundColor: '#17a2b8',
                    borderColor: '#17a2b8',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true } }
            }
        });

        // Renderizar gráfico combinado de FC por tipo
        renderHRByTypeChart();
    } catch (err) {
        console.error('Error en renderMonthlyKmChart:', err);
    }
}

// ==================== FC POR TIPO DE ENTRENAMIENTO ====================

function renderHRByTypeChart() {
    try {
        const ctx = document.getElementById('hrByTypeChart')?.getContext('2d');
        if (!ctx) return;

        if (runningActivities.length === 0) return;

        // Ordenar todas las actividades por fecha
        const sorted = [...runningActivities].sort((a, b) => new Date(a.date) - new Date(b.date));

        // Generar labels en orden cronológico
        const allLabels = sorted.map(a => new Date(a.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }));

        const types = ['Series/Intervalos', 'Tempo', 'Tirada Larga'];
        const colors = ['#0d6efd', '#ffc107', '#28a745'];
        const datasets = [];

        // Para cada tipo, crear un dataset con datos alineados a la timeline
        types.forEach((trainingType, index) => {
            const data = sorted.map(activity => {
                return classifyTrainingType(activity) === trainingType ? (activity.hrAvg || 0) : null;
            });

            datasets.push({
                label: trainingType,
                data: data,
                borderColor: colors[index],
                backgroundColor: colors[index] + '20',
                borderWidth: 2,
                fill: false,
                tension: 0.3,
                pointRadius: 3,
                spanGaps: true
            });
        });

        if (hrByTypeChartInstance) hrByTypeChartInstance.destroy();
        
        hrByTypeChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: allLabels,
                datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                    legend: { display: true, position: 'top' }
                },
                scales: { y: { min: 120 } }
            }
        });
    } catch (err) {
        console.error('Error en renderHRByTypeChart:', err);
    }
}

// ==================== UTILIDADES ====================

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('es-ES');
}
