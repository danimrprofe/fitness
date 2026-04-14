// Variables globales
let trainingData = null;
let laps = [];
let charts = {
    pace: null,
    hr: null,
    calories: null,
    time: null
};

// Inicialización
document.getElementById('loadBtn').addEventListener('click', loadTCX);
document.getElementById('tcxFile').addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        document.getElementById('loadBtn').click();
    }
});

// Cargar y parsear TCX
function loadTCX() {
    const file = document.getElementById('tcxFile').files[0];
    if (!file) {
        alert('Selecciona un archivo TCX');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const xml = e.target.result;
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xml, 'text/xml');
            
            if (xmlDoc.getElementsByTagName('parsererror').length > 0) {
                alert('Error al parsear el archivo TCX');
                return;
            }

            parseTCX(xmlDoc);
            displayTrainingData();
            renderCharts();
            displaySplitsTable();
            displayStats();

        } catch (err) {
            console.error('Error:', err);
            alert('Error al procesar el archivo');
        }
    };
    reader.readAsText(file);
}

// Parsear datos del TCX
function parseTCX(xmlDoc) {
    laps = [];
    
    const lapElements = xmlDoc.getElementsByTagName('Lap');
    
    for (let i = 0; i < lapElements.length; i++) {
        const lap = lapElements[i];
        
        // Extraer datos básicos
        const timeSeconds = parseFloat(lap.getElementsByTagName('TotalTimeSeconds')[0]?.textContent || 0);
        const distanceMeters = parseFloat(lap.getElementsByTagName('DistanceMeters')[0]?.textContent || 0);
        const calories = parseInt(lap.getElementsByTagName('Calories')[0]?.textContent || 0);
        const hrAvg = parseInt(lap.getElementsByTagName('AverageHeartRateBpm')[0]?.getElementsByTagName('Value')[0]?.textContent || 0);
        const hrMax = parseInt(lap.getElementsByTagName('MaximumHeartRateBpm')[0]?.getElementsByTagName('Value')[0]?.textContent || 0);
        
        // Calcular derivados
        const distanceKm = distanceMeters / 1000;
        const paceMinutes = distanceKm > 0 ? (timeSeconds / 60) / distanceKm : 0;
        const paceStr = minutesToPace(paceMinutes);
        const speedKmh = distanceKm > 0 ? (distanceKm / (timeSeconds / 3600)) : 0;
        
        laps.push({
            lapNumber: i + 1,
            distance: distanceKm,
            time: timeSeconds,
            pace: paceMinutes,
            paceStr: paceStr,
            hrAvg: hrAvg,
            hrMax: hrMax,
            calories: calories,
            speed: speedKmh
        });
    }

    // Guardar información general
    trainingData = {
        totalDistance: laps.reduce((sum, lap) => sum + lap.distance, 0),
        totalTime: laps.reduce((sum, lap) => sum + lap.time, 0),
        totalCalories: laps.reduce((sum, lap) => sum + lap.calories, 0),
        avgPace: laps.length > 0 ? laps.reduce((sum, lap) => sum + lap.pace, 0) / laps.length : 0,
        avgHR: laps.length > 0 ? Math.round(laps.reduce((sum, lap) => sum + lap.hrAvg, 0) / laps.length) : 0,
        maxHR: Math.max(...laps.map(l => l.hrMax)),
        numLaps: laps.length,
        startTime: lapElements[0]?.getAttribute('StartTime') || new Date().toISOString()
    };
}

// Mostrar información general
function displayTrainingData() {
    document.getElementById('summaryCard').style.display = 'block';
    document.getElementById('totalDistance').textContent = trainingData.totalDistance.toFixed(2) + ' km';
    document.getElementById('totalTime').textContent = formatTime(trainingData.totalTime);
    document.getElementById('avgPace').textContent = minutesToPace(trainingData.avgPace);
    document.getElementById('avgHR').textContent = trainingData.avgHR + ' bpm';
    document.getElementById('maxHR').textContent = trainingData.maxHR + ' bpm';
    document.getElementById('totalCalories').textContent = trainingData.totalCalories + ' kcal';
    document.getElementById('numLaps').textContent = trainingData.numLaps;
    
    const date = new Date(trainingData.startTime);
    document.getElementById('trainingTime').textContent = date.toLocaleTimeString('es-ES');
}

// Renderizar gráficos
function renderCharts() {
    document.getElementById('chartsCard').style.display = 'block';
    
    const labels = laps.map((_, i) => 'Split ' + (i + 1));
    const paceData = laps.map(l => l.pace);
    const hrData = laps.map(l => l.hrAvg);
    const caloriesData = laps.map(l => l.calories);
    const timeData = laps.map(l => l.time / 60); // en minutos

    // Gráfica de Ritmo
    const paceCtx = document.getElementById('paceProgressChart')?.getContext('2d');
    if (paceCtx) {
        if (charts.pace) charts.pace.destroy();
        charts.pace = new Chart(paceCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'Ritmo (min/km)',
                    data: paceData,
                    borderColor: '#6f42c1',
                    backgroundColor: 'rgba(111, 66, 193, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return 'Ritmo: ' + minutesToPace(context.parsed.y);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        reverse: true,
                        ticks: {
                            callback: function(value) {
                                return minutesToPace(value);
                            }
                        }
                    }
                }
            }
        });
    }

    // Gráfica de FC
    const hrCtx = document.getElementById('hrProgressChart')?.getContext('2d');
    if (hrCtx) {
        if (charts.hr) charts.hr.destroy();
        charts.hr = new Chart(hrCtx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    label: 'FC Media (bpm)',
                    data: hrData,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { min: 100 } }
            }
        });
    }

    // Gráfica de Calorías
    const caloriesCtx = document.getElementById('caloriesProgressChart')?.getContext('2d');
    if (caloriesCtx) {
        if (charts.calories) charts.calories.destroy();
        charts.calories = new Chart(caloriesCtx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Calorías (kcal)',
                    data: caloriesData,
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

    // Gráfica de Tiempo
    const timeCtx = document.getElementById('timeProgressChart')?.getContext('2d');
    if (timeCtx) {
        if (charts.time) charts.time.destroy();
        charts.time = new Chart(timeCtx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Tiempo (minutos)',
                    data: timeData,
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
}

// Mostrar tabla de splits
function displaySplitsTable() {
    document.getElementById('splitsCard').style.display = 'block';
    const tbody = document.getElementById('splitsTableBody');
    tbody.innerHTML = '';

    laps.forEach(lap => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${lap.lapNumber}</strong></td>
            <td>${lap.distance.toFixed(2)} km</td>
            <td>${formatTime(lap.time)}</td>
            <td>${lap.paceStr}</td>
            <td><span style="color: ${getHRColor(lap.hrAvg)}">${lap.hrAvg}</span></td>
            <td><span style="color: ${getHRColor(lap.hrMax)}">${lap.hrMax}</span></td>
            <td>${lap.calories}</td>
            <td>${lap.speed.toFixed(2)} km/h</td>
        `;
        tbody.appendChild(row);
    });
}

// Mostrar estadísticas
function displayStats() {
    document.getElementById('statsCard').style.display = 'block';
    
    const paces = laps.map(l => l.pace).filter(p => p > 0);
    const hrs = laps.map(l => l.hrAvg).filter(h => h > 0);
    
    const fastestPace = Math.min(...paces);
    const slowestPace = Math.max(...paces);
    const paceVariability = ((slowestPace - fastestPace) / (fastestPace + slowestPace) * 100).toFixed(1);
    
    const avgHR = hrs.length > 0 ? hrs.reduce((a, b) => a + b) / hrs.length : 0;
    const hrVariability = hrs.length > 0 ? ((Math.max(...hrs) - Math.min(...hrs)) / avgHR * 100).toFixed(1) : 0;

    document.getElementById('fastestPace').textContent = minutesToPace(fastestPace);
    document.getElementById('slowestPace').textContent = minutesToPace(slowestPace);
    document.getElementById('paceVariability').textContent = paceVariability + '%';
    document.getElementById('hrVariability').textContent = hrVariability + '%';
}

// ==================== UTILIDADES ====================

function minutesToPace(minutes) {
    if (minutes <= 0) return '--:--';
    const mins = Math.floor(minutes);
    const secs = Math.round((minutes - mins) * 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    
    if (hours > 0) {
        return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function getHRColor(hr) {
    if (hr >= 160) return '#dc3545'; // Rojo
    if (hr >= 140) return '#fd7e14'; // Naranja
    if (hr >= 120) return '#ffc107'; // Amarillo
    return '#28a745'; // Verde
}
