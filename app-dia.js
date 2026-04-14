// Estado global
let allTrainings = [];
let selectedDate = null;

// Función helper para obtener fecha en formato YYYY-MM-DD (local, no UTC)
function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('🎯 Iniciando página de entrenamiento del día...');
    
    // Establecer fecha seleccionada a HOY
    selectedDate = new Date();
    selectedDate.setHours(0, 0, 0, 0);
    
    // Establecer valor del input con fecha local correcta
    const today = getLocalDateString(selectedDate);
    document.getElementById('dateSelect').value = today;
    
    // Cargar datos
    loadAllTrainings();
});

// ==================== CARGA DE DATOS ====================

function loadAllTrainings() {
    fetch('data.json')
        .then(response => {
            console.log('Respuesta fetch:', response);
            if (!response.ok) throw new Error('Error en fetch');
            return response.json();
        })
        .then(data => {
            console.log('✅ Datos cargados desde data.json:', data.length);
            allTrainings = data;
            completeInitialization();
        })
        .catch(err => {
            console.error('❌ Error cargando data.json:', err);
            console.log('💾 Intentando cargar desde localStorage...');
            allTrainings = JSON.parse(localStorage.getItem('trainings') || '[]');
            console.log('✅ Datos cargados desde localStorage:', allTrainings.length);
            completeInitialization();
        });
}

function completeInitialization() {
    console.log('🔧 Completando inicialización...');
    setupDateButtons();
    setupEventListeners();
    updatePage();
    console.log('✅ Página lista');
}

// ==================== SELECTOR DE FECHA ====================

function setupDateButtons() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    document.getElementById('todayBtn').addEventListener('click', () => {
        selectedDate = new Date();
        selectedDate.setHours(0, 0, 0, 0);
        document.getElementById('dateSelect').value = getLocalDateString(selectedDate);
        updatePage();
    });

    document.getElementById('yesterdayBtn').addEventListener('click', () => {
        selectedDate = new Date();
        selectedDate.setDate(selectedDate.getDate() - 1);
        selectedDate.setHours(0, 0, 0, 0);
        document.getElementById('dateSelect').value = getLocalDateString(selectedDate);
        updatePage();
    });

    document.getElementById('tomorrowBtn').addEventListener('click', () => {
        selectedDate = new Date();
        selectedDate.setDate(selectedDate.getDate() + 1);
        selectedDate.setHours(0, 0, 0, 0);
        document.getElementById('dateSelect').value = getLocalDateString(selectedDate);
        updatePage();
    });

    document.getElementById('dateSelect').addEventListener('change', (e) => {
        const [year, month, day] = e.target.value.split('-');
        selectedDate = new Date(year, month - 1, day);
        selectedDate.setHours(0, 0, 0, 0);
        updatePage();
    });
}

// ==================== INFORMACIÓN DEL DÍA ====================

function getDayInfo() {
    const days = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
    const dayName = days[selectedDate.getDay()];

    const daysInfo = {
        'lunes': {
            emoji: '🔴',
            type: 'Torso Pesado',
            focus: 'Fuerza',
            exercises: ['Press', 'Remo', 'Jalón'],
            repsRange: '5-6 reps',
            intensity: 'Muy Alta (85-90%)',
            duration: '~55 min'
        },
        'martes': {
            emoji: '🏃',
            type: 'Running',
            focus: 'Recuperación',
            exercises: ['Carrera suave'],
            intensity: 'Baja-Moderada',
            duration: '30-35 min'
        },
        'miércoles': {
            emoji: '🦵',
            type: 'Pierna',
            focus: 'Fuerza + Volumen',
            exercises: ['Sentadilla/Principal', 'Hip Thrust', 'Accesorios'],
            repsRange: '5-8 reps',
            intensity: 'Alta',
            duration: '~50 min'
        },
        'jueves': {
            emoji: '🏃',
            type: 'Running',
            focus: 'Entrenamiento',
            exercises: ['Series/Tempo'],
            intensity: 'Moderada',
            duration: '40-45 min'
        },
        'viernes': {
            emoji: '🟢',
            type: 'Torso Hipertrofia',
            focus: 'Volumen',
            exercises: ['Press', 'Remo', 'Jalón', 'Accesorios'],
            repsRange: '8-12 reps',
            intensity: 'Moderada-Alta (70-80%)',
            duration: '~55 min'
        },
        'sábado': {
            emoji: '🏃',
            type: 'Running',
            focus: 'Moderado',
            exercises: ['Carrera'],
            intensity: 'Moderada',
            duration: '35-40 min'
        },
        'domingo': {
            emoji: '🛌',
            type: 'Descanso Total',
            focus: 'Recuperación',
            exercises: ['Descansar'],
            intensity: 'Ninguna',
            duration: 'N/A'
        }
    };

    return daysInfo[dayName] || daysInfo['domingo'];
}

function renderDayInfo() {
    const info = getDayInfo();
    const dayInfoPanel = document.getElementById('dayInfoPanel');

    let html = `
        <div class="mb-3">
            <h5>${info.emoji} ${info.type}</h5>
            <div class="mb-2">
                <small class="badge bg-primary">${info.focus}</small>
                <small class="badge bg-info">${info.repsRange || info.intensity}</small>
                <small class="badge bg-secondary">${info.duration}</small>
            </div>
        </div>
    `;

    if (info.exercises[0] !== 'Descansar') {
        html += `
            <div class="mb-2">
                <small class="d-block text-muted mb-1"><strong>Ejercicios típicos:</strong></small>
                <ul class="mb-0 ps-3">
                    ${info.exercises.map(ex => `<li><small>${ex}</small></li>`).join('')}
                </ul>
            </div>
        `;
    }

    dayInfoPanel.innerHTML = html;
}

// ==================== PLAN DEL DÍA ====================

function getPlanForDay() {
    const info = getDayInfo();

    const plans = {
        'Torso Pesado': `
            <ol class="ps-3 mb-0">
                <li><strong>Press/Press Inclinado</strong> - 5×5 @ 85-90%</li>
                <li><strong>Remo</strong> - 4×6 @ 85-90%</li>
                <li><strong>Jalón</strong> - 4×6 @ 85-90%</li>
                <li><strong>Accesorios (superseries):</strong>
                    <ul class="mt-2">
                        <li>Bíceps + Tríceps (6-8 reps, 1:30 descanso)</li>
                        <li>Face Pull + Elevaciones (10 reps, 1 min descanso)</li>
                    </ul>
                </li>
            </ol>
        `,
        'Torso Hipertrofia': `
            <ol class="ps-3 mb-0">
                <li><strong>Press</strong> - 3×10 @ 70-80%</li>
                <li><strong>Remo</strong> - 3×10 @ 70-80%</li>
                <li><strong>Jalón</strong> - 3×10 @ 70-80%</li>
                <li><strong>Accesorios</strong> - 3×10-15 reps
                    <ul class="mt-2">
                        <li>Bíceps (enfoque reps)</li>
                        <li>Tríceps (enfoque reps)</li>
                        <li>Hombros/Laterales</li>
                    </ul>
                </li>
            </ol>
        `,
        'Pierna': `
            <ol class="ps-3 mb-0">
                <li><strong>Principal (Sentadilla/Press)</strong> - 4×5-6</li>
                <li><strong>Hip Thrust/Complementario</strong> - 3×8</li>
                <li><strong>Accesorios</strong> - 3×10-15
                    <ul class="mt-2">
                        <li>Leg Curl</li>
                        <li>Prensa/Step</li>
                        <li>Gemelos</li>
                    </ul>
                </li>
            </ol>
        `,
        'Running': `
            <div>
                <p><small>Adaptado al tipo de sesión</small></p>
                <ul class="ps-3 mb-0">
                    <li><strong>Martes (Recuperación):</strong> 30-35 min ritmo conversacional</li>
                    <li><strong>Jueves (Entrenamiento):</strong> Tempo o series</li>
                    <li><strong>Sábado (Moderado):</strong> 35-40 min ritmo conversacional-moderado</li>
                </ul>
            </div>
        `,
        'Descanso Total': `
            <div>
                <p class="mb-0"><small>Descansa, recupera y come bien 💪</small></p>
            </div>
        `
    };

    return plans[info.type] || plans['Descanso Total'];
}

function renderPlan() {
    document.getElementById('planPanel').innerHTML = getPlanForDay();
}

// ==================== CONSEJOS TÉCNICOS ====================

function getTechnicalTips() {
    const info = getDayInfo();

    const tips = {
        'Torso Pesado': `
            <div class="alert alert-light border-start border-danger">
                <h6>🧠 Press Banca - Técnica Clave</h6>
                <ul class="small mb-0 ps-3">
                    <li><strong>Posición:</strong> Pecho arriba, escápulas juntas</li>
                    <li><strong>Bajada:</strong> Control, 2 segundos (NO rebotes)</li>
                    <li><strong>Codos:</strong> 45-60° (no pegados, no abiertos)</li>
                    <li><strong>Empuje:</strong> Con pecho, no solo brazos</li>
                    <li><strong>⚠️ Si bajas poco:</strong> Baja peso + mejora ROI completo</li>
                </ul>
            </div>
            <div class="alert alert-light border-start border-warning">
                <h6>🔁 Superseries en Accesorios</h6>
                <ul class="small mb-0 ps-3">
                    <li>✔️ Bíceps + Tríceps sin descanso</li>
                    <li>✔️ Face Pull + Elevaciones laterales</li>
                    <li>❌ NO en básicos (press, remo, jalón)</li>
                </ul>
            </div>
        `,
        'Torso Hipertrofia': `
            <div class="alert alert-light border-start border-success">
                <h6>🎯 Objetivo: Volumen + Reps</h6>
                <ul class="small mb-0 ps-3">
                    <li><strong>Básicos:</strong> 3×10 reps mínimo</li>
                    <li><strong>Accesorios:</strong> 3-4×10-15 reps</li>
                    <li><strong>Descanso:</strong> 60-90 seg entre series</li>
                    <li>🧠 Control > peso absoluto</li>
                </ul>
            </div>
            <div class="alert alert-light border-start border-info">
                <h6>💡 Elevaciones Laterales</h6>
                <ul class="small mb-0 ps-3">
                    <li>Mantén 7 kg (poco margen de carga)</li>
                    <li>Progresa en reps: 10→12 reps</li>
                    <li>Hoy: 2×10-12 con control</li>
                    <li>Mejor ejecución > peso</li>
                </ul>
            </div>
        `,
        'Pierna': `
            <div class="alert alert-light border-start border-success">
                <h6>💪 Principal - Máxima Intensidad</h6>
                <ul class="small mb-0 ps-3">
                    <li>Profundidad completa</li>
                    <li>Espalda neutral</li>
                    <li>Rodillas alineadas con tobillos</li>
                </ul>
            </div>
            <div class="alert alert-light border-start border-info">
                <h6>🦵 Accesorios</h6>
                <ul class="small mb-0 ps-3">
                    <li>Leg curl: control de bajada</li>
                    <li>Hip Thrust: contracción arriba</li>
                    <li>Gemelos: amplitud de movimiento</li>
                </ul>
            </div>
        `,
        'Running': `
            <div class="alert alert-light border-start border-info">
                <h6>🏃 Forma Ejecutiva</h6>
                <ul class="small mb-0 ps-3">
                    <li>Cadencia: 160-180 pasos/min</li>
                    <li>Zancada natural (no forzar)</li>
                    <li>Escalada: relaja hombros</li>
                    <li>Mantén conversacional en suave</li>
                </ul>
            </div>
        `,
        'Descanso Total': `
            <div class="alert alert-light border-start border-success">
                <h6>✅ Prioridades Hoy</h6>
                <ul class="small mb-0 ps-3">
                    <li>Duerme 7-9 horas</li>
                    <li>Come proteína adecuada</li>
                    <li>Hidratación completa</li>
                    <li>Estira si quieres (30 min max)</li>
                </ul>
            </div>
        `
    };

    return tips[info.type] || tips['Descanso Total'];
}

function renderTips() {
    document.getElementById('tipsPanel').innerHTML = getTechnicalTips();
}

// ==================== ENTRENAMIENTOS HOY ====================

function getTrainingsForToday() {
    const dateStr = getLocalDateString(selectedDate);
    console.log(`🔍 Buscando entrenamientos para ${dateStr}`);
    console.log(`Total de entrenamientos: ${allTrainings.length}`);
    
    const todayTrainings = allTrainings.filter(t => t.date === dateStr);
    console.log(`📋 Entrenamientos encontrados: ${todayTrainings.length}`, todayTrainings);
    
    return todayTrainings;
}

function getTrainingTypeForToday() {
    const todayTrainings = getTrainingsForToday();
    if (todayTrainings.length === 0) return null;
    
    // Agrupar por trainingType y obtener el más frecuente
    const types = {};
    todayTrainings.forEach(t => {
        types[t.trainingType] = (types[t.trainingType] || 0) + 1;
    });
    
    return Object.keys(types).reduce((a, b) => types[a] > types[b] ? a : b);
}

function getPreviousTrainingOfSameType() {
    const trainingType = getTrainingTypeForToday();
    if (!trainingType) return null;
    
    // Buscar el entrenamiento anterior del mismo tipo
    const currentDateStr = getLocalDateString(selectedDate);
    const sameTypeTrainings = allTrainings
        .filter(t => t.trainingType === trainingType && t.date < currentDateStr)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    if (sameTypeTrainings.length === 0) return null;
    
    // Agrupar por fecha y obtener la última sesión
    const dateGroups = {};
    sameTypeTrainings.forEach(t => {
        if (!dateGroups[t.date]) {
            dateGroups[t.date] = [];
        }
        dateGroups[t.date].push(t);
    });
    
    const previousDate = Object.keys(dateGroups)[0];
    return dateGroups[previousDate];
}

function renderComparisonWithPrevious() {
    const todayTrainings = getTrainingsForToday();
    const previousTrainings = getPreviousTrainingOfSameType();
    const comparisonPanel = document.getElementById('comparisonPanel');
    
    if (todayTrainings.length === 0) {
        comparisonPanel.innerHTML = '<p class="text-muted text-center">No hay entrenamientos registrados hoy aún</p>';
        return;
    }
    
    if (!previousTrainings || previousTrainings.length === 0) {
        comparisonPanel.innerHTML = '<p class="text-muted text-center">No hay entrenamientos anteriores del mismo tipo para comparar</p>';
        return;
    }
    
    // Crear maps para fácil búsqueda
    const previousMap = {};
    previousTrainings.forEach(t => {
        previousMap[t.exercise] = t;
    });
    
    const previousDate = previousTrainings[0].date;
    
    let html = `<p class="text-muted mb-3">Comparación con <strong>${new Date(previousDate).toLocaleDateString('es-ES')}</strong></p>`;
    html += '<table class="table table-sm table-striped">';
    html += '<thead class="table-dark"><tr><th>Ejercicio</th><th>Anterior</th><th>Hoy</th><th>Cambio</th></tr></thead>';
    html += '<tbody>';
    
    todayTrainings.forEach(today => {
        const previous = previousMap[today.exercise];
        
        const row = {
            exercise: today.exercise,
            previousWeight: previous?.weight || '-',
            todayWeight: today.weight,
            previousVolume: previous?.volume || '-',
            todayVolume: today.volume,
            previousOneRM: previous?.oneRM || '-',
            todayOneRM: today.oneRM.toFixed(1)
        };
        
        // Calcular cambio en peso
        let weightChange = '-';
        let weightChangeColor = '';
        if (previous) {
            const diff = today.weight - previous.weight;
            const pct = ((diff / previous.weight) * 100).toFixed(1);
            weightChange = diff > 0 ? `+${diff.toFixed(1)} kg (+${pct}%)` : `${diff.toFixed(1)} kg (${pct}%)`;
            weightChangeColor = diff > 0 ? 'text-success' : (diff < 0 ? 'text-danger' : 'text-secondary');
        }
        
        // Calcular cambio en volumen
        let volumeChange = '-';
        let volumeChangeColor = '';
        if (previous) {
            const diff = today.volume - previous.volume;
            const pct = ((diff / previous.volume) * 100).toFixed(1);
            volumeChange = diff > 0 ? `+${diff.toFixed(0)} kg (+${pct}%)` : `${diff.toFixed(0)} kg (${pct}%)`;
            volumeChangeColor = diff > 0 ? 'text-success' : (diff < 0 ? 'text-danger' : 'text-secondary');
        }
        
        html += `
            <tr>
                <td><small><strong>${row.exercise}</strong></small></td>
                <td><small>${row.previousWeight} kg${previous ? '<br><small class="text-muted">Vol: ' + row.previousVolume + ' kg</small>' : ''}</small></td>
                <td><small>${row.todayWeight} kg<br><small class="text-muted">Vol: ${row.todayVolume} kg</small></small></td>
                <td><small><span class="${weightChangeColor}">${weightChange}</span><br><span class="${volumeChangeColor}">${volumeChange}</span></small></td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    
    comparisonPanel.innerHTML = html;
}

function renderTodayTrainings() {
    const trainings = getTrainingsForToday();
    const previousTrainings = getPreviousTrainingOfSameType();
    const tableBody = document.getElementById('todayTableBody');
    const emptyMsg = document.getElementById('emptyTodayMessage');

    if (trainings.length === 0) {
        console.log('⚠️ No hay entrenamientos para hoy');
        tableBody.innerHTML = '';
        emptyMsg.style.display = 'block';
        renderDaySummary();
        return;
    }

    console.log('✅ Mostrando', trainings.length, 'entrenamientos');
    emptyMsg.style.display = 'none';
    renderDaySummary();

    // Crear mapa de ejercicios anteriores
    const previousMap = {};
    if (previousTrainings && previousTrainings.length > 0) {
        previousTrainings.forEach(t => {
            previousMap[t.exercise] = t;
        });
    }

    tableBody.innerHTML = trainings.map(t => {
        const series = Array.isArray(t.series) ? t.series.join('-') : t.series;
        const volume = t.volume || 0;
        const totalReps = t.totalReps || 0;
        
        // Mostrar 1RM solo si es fiable (≤12 reps)
        let oneRMHtml = '—';
        if (totalReps <= 10) {
            const oneRM = t.oneRM || 0;
            oneRMHtml = `<small>${oneRM.toFixed(1)} kg</small>`;
        } else if (totalReps <= 12) {
            const oneRM = t.oneRM || 0;
            oneRMHtml = `<small title="Reps altas: estimación menos precisa">${oneRM.toFixed(1)} kg <small style="color: #ff9800;">⚠️</small></small>`;
        }
        
        const previous = previousMap[t.exercise];

        // Calcular cambios
        let weightChangeHtml = '-';
        let volumeChangeHtml = '-';
        
        if (previous) {
            const weightDiff = t.weight - previous.weight;
            const weightPct = ((weightDiff / previous.weight) * 100).toFixed(1);
            const weightColor = weightDiff > 0 ? '#28a745' : (weightDiff < 0 ? '#dc3545' : '#6c757d');
            const weightSymbol = weightDiff > 0 ? '🔼' : (weightDiff < 0 ? '🔽' : '=');
            
            // Mostrar de forma compacta (menos ruido)
            if (Math.abs(weightPct) < 0.5) {
                weightChangeHtml = `<span style="color: #6c757d; font-weight: bold;">${t.weight} kg <small>=</small></span>`;
            } else {
                weightChangeHtml = `<span style="color: ${weightColor}; font-weight: bold;">
                    ${weightSymbol} ${t.weight} kg <small>(${weightDiff > 0 ? '+' : ''}${weightPct}%)</small>
                </span>`;
            }
            
            const volumeDiff = t.volume - previous.volume;
            const volumePct = ((volumeDiff / previous.volume) * 100).toFixed(1);
            const volumeColor = volumeDiff > 0 ? '#28a745' : (volumeDiff < 0 ? '#dc3545' : '#6c757d');
            const volumeSymbol = volumeDiff > 0 ? '🔼' : (volumeDiff < 0 ? '🔽' : '=');
            
            // Mostrar de forma compacta
            if (Math.abs(volumePct) < 0.5) {
                volumeChangeHtml = `<span style="color: #6c757d; font-weight: bold;">${volume} <small>=</small></span>`;
            } else {
                volumeChangeHtml = `<span style="color: ${volumeColor}; font-weight: bold;">
                    ${volumeSymbol} ${volume} <small>(${volumeDiff > 0 ? '+' : ''}${volumePct}%)</small>
                </span>`;
            }
        } else {
            weightChangeHtml = `${t.weight} kg`;
            volumeChangeHtml = `${volume}`;
        }

        // Fila de hoy
        let html = `
            <tr style="background-color: #f8f9fa;">
                <td><small><strong>${t.exercise}</strong></small></td>
                <td><small>${series}</small></td>
                <td><small>${weightChangeHtml}</small></td>
                <td>${oneRMHtml}</td>
                <td><small>${volumeChangeHtml}</small></td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteTraining(${t.id})">✕</button>
                </td>
            </tr>`;
        
        return html;
    }).join('');
}

// ==================== ANÁLISIS INTELIGENTE (TIPO ENTRENADOR) ====================

function analyzeExerciseProgress(exercise, current, previous) {
    if (!previous) return { status: 'new', progress: 0, text: 'Primera vez' };
    
    const weightDiff = current.weight - previous.weight;
    const repsDiff = (current.totalReps || 0) - (previous.totalReps || 0);
    const volumeDiff = current.volume - previous.volume;
    
    // Lógica tipo entrenador
    if (weightDiff > 0) {
        return { status: 'improve', progress: 1, text: '🟢 Mejora' };
    } else if (weightDiff < 0 && volumeDiff >= 0) {
        return { status: 'neutral', progress: 0, text: '🟡 Ajuste' };
    } else if (weightDiff === 0 && repsDiff > 0 && volumeDiff > 0) {
        return { status: 'maintain', progress: 0, text: '🟡 Mantenimiento' };
    } else if (weightDiff < 0 && volumeDiff < 0) {
        return { status: 'decline', progress: -1, text: '🔴 Retroceso' };
    } else {
        return { status: 'maintain', progress: 0, text: '⚪ Igual' };
    }
}

function getStimulationType(totalReps) {
    if (totalReps <= 5) return { name: 'Fuerza máxima', emoji: '💪' };
    if (totalReps <= 12) return { name: 'Hipertrofia', emoji: '📈' };
    return { name: 'Resistencia', emoji: '⏱️' };
}

function analyzeSession(trainings, previousTrainings) {
    const previousMap = {};
    if (previousTrainings && previousTrainings.length > 0) {
        previousTrainings.forEach(t => {
            previousMap[t.exercise] = t;
        });
    }
    
    // Análisis por ejercicio
    const exerciseAnalysis = trainings.map(t => {
        const previous = previousMap[t.exercise];
        const progress = analyzeExerciseProgress(t.exercise, t, previous);
        const stimulus = getStimulationType(t.totalReps || 0);
        
        return {
            exercise: t.exercise,
            muscleGroup: t.muscleGroup,
            progress: progress.progress,
            stimulus: stimulus,
            previous: previous,
            current: t
        };
    });
    
    // Contadores
    const improved = exerciseAnalysis.filter(e => e.progress === 1).length;
    const declined = exerciseAnalysis.filter(e => e.progress === -1).length;
    const maintained = exerciseAnalysis.filter(e => e.progress === 0).length;
    
    const totalVolume = trainings.reduce((sum, t) => sum + (t.volume || 0), 0);
    const previousVolume = previousTrainings ? previousTrainings.reduce((sum, t) => sum + (t.volume || 0), 0) : 0;
    const volumeDiff = previousVolume > 0 ? ((totalVolume - previousVolume) / previousVolume) * 100 : 0;
    
    // Score de progreso
    const progressScore = improved - declined;
    
    // Detectar patrones por grupo muscular
    const muscleGroupProgress = {};
    exerciseAnalysis.forEach(e => {
        const group = e.muscleGroup;
        if (!muscleGroupProgress[group]) {
            muscleGroupProgress[group] = [];
        }
        muscleGroupProgress[group].push(e.progress);
    });
    
    // Detección de fatiga localizada
    const fatigueAreas = [];
    Object.entries(muscleGroupProgress).forEach(([group, progresses]) => {
        const avgProgress = progresses.reduce((a, b) => a + b, 0) / progresses.length;
        if (avgProgress < -0.3 && progresses.length >= 2) {
            fatigueAreas.push(group);
        }
    });
    
    return {
        exerciseAnalysis,
        improved,
        declined,
        maintained,
        totalVolume,
        volumeDiff,
        progressScore,
        fatigueAreas,
        improvementPct: trainings.length > 0 ? (improved / trainings.length) * 100 : 0
    };
}

function generateConclusions(analysis, trainings) {
    const conclusions = [];
    
    // Evaluación global del día
    if (analysis.improvementPct >= 50) {
        conclusions.push('✔ Buen renderimiento general');
    } else if (analysis.improvementPct <= 20) {
        conclusions.push('⚠ Día con dificultades');
    }
    
    // Volumen
    if (analysis.volumeDiff > 10) {
        conclusions.push('✔ Volumen superior a sesión anterior');
    } else if (analysis.volumeDiff < -10) {
        conclusions.push('⚠ Volumen reducido respecto a anterior');
    }
    
    // Áreas con fatiga
    if (analysis.fatigueAreas.length > 0) {
        conclusions.push(`⚠ Posible fatiga en: ${analysis.fatigueAreas.join(', ')}`);
    }
    
    // Distribución de estímulo
    const stimuliCount = {};
    trainings.forEach(t => {
        const stimulus = getStimulationType(t.totalReps || 0).name;
        stimuliCount[stimulus] = (stimuliCount[stimulus] || 0) + 1;
    });
    
    const dominantStimulus = Object.keys(stimuliCount).reduce((a, b) => 
        stimuliCount[a] > stimuliCount[b] ? a : b, '');
    
    if (stimuliCount[dominantStimulus] >= trainings.length * 0.5) {
        conclusions.push(`→ Enfoque: ${dominantStimulus}`);
    }
    
    return conclusions;
}

function generateRecommendations(analysis, trainings, previousTrainings) {
    const recommendations = [];
    
    // Si hubo mejoras, mantener estímulo
    if (analysis.improved >= 2) {
        recommendations.push('✓ Mantener intensidad en ejercicios que mejoraron');
    }
    
    // Si hay fatiga, reducir volumen
    if (analysis.fatigueAreas.length > 0) {
        recommendations.push(`→ Reducir volumen en ${analysis.fatigueAreas[0]} próxima sesión`);
    }
    
    // Si hay retrocesos, identifica objetivo
    if (analysis.declined > 0) {
        const declinedExercises = analysis.exerciseAnalysis
            .filter(e => e.progress === -1)
            .map(e => e.exercise);
        
        if (declinedExercises.length > 0) {
            recommendations.push(`🎯 Objetivo: Recuperar rendimiento en ${declinedExercises[0]}`);
        }
    }
    
    return recommendations;
}

function renderDaySummary() {
    const trainings = getTrainingsForToday();
    const previousTrainings = getPreviousTrainingOfSameType();
    const summaryPanel = document.getElementById('summaryPanel');
    
    if (trainings.length === 0) {
        summaryPanel.innerHTML = '<p class="text-muted text-center">Sin entrenamientos registrados</p>';
        return;
    }
    
    // Realizar análisis inteligente
    const analysis = analyzeSession(trainings, previousTrainings);
    const conclusions = generateConclusions(analysis, trainings);
    const recommendations = generateRecommendations(analysis, trainings, previousTrainings);
    
    // Determinar estado del día
    let dayStatus = '⚪';
    let dayStatusColor = '#6c757d';
    
    if (analysis.improvementPct >= 50) {
        dayStatus = '🟢';
        dayStatusColor = '#28a745';
    } else if (analysis.improvementPct <= 30) {
        dayStatus = '🔴';
        dayStatusColor = '#dc3545';
    } else {
        dayStatus = '🟡';
        dayStatusColor = '#ffc107';
    }
    
    // Encontrar mejor progreso
    let bestProgressExercise = null;
    let bestProgressPct = -Infinity;
    analysis.exerciseAnalysis.forEach(e => {
        if (e.previous) {
            const pct = ((e.current.weight - e.previous.weight) / e.previous.weight) * 100;
            if (pct > bestProgressPct) {
                bestProgressPct = pct;
                bestProgressExercise = e.exercise;
            }
        }
    });
    
    // ===== GENERAR HTML =====
    let html = `
        <div style="background: linear-gradient(135deg, ${dayStatusColor}20 0%, transparent 100%); padding: 15px; border-radius: 8px; border-left: 4px solid ${dayStatusColor};">
            
            <!-- MÉTRICAS CLAVE -->
            <div class="row mb-3">
                <div class="col-md-2 text-center">
                    <h5 style="color: ${dayStatusColor}; font-weight: bold;">${dayStatus}</h5>
                    <small class="text-muted">Estado del día</small>
                </div>
                <div class="col-md-2 text-center">
                    <h5 style="color: #0d6efd; font-weight: bold;">${analysis.progressScore}</h5>
                    <small class="text-muted">Score</small>
                </div>
                <div class="col-md-2 text-center">
                    <h5 style="color: #28a745; font-weight: bold;">${analysis.improved}</h5>
                    <small class="text-muted">Mejoras</small>
                </div>
                <div class="col-md-2 text-center">
                    <h5 style="color: #dc3545; font-weight: bold;">${analysis.declined}</h5>
                    <small class="text-muted">Retrocesos</small>
                </div>
                <div class="col-md-2 text-center">
                    <h5 style="color: #17a2b8; font-weight: bold;">${analysis.totalVolume.toLocaleString()} kg</h5>
                    <small class="text-muted">Volumen</small>
                </div>
                <div class="col-md-2 text-center">
                    <h5 style="color: #ffc107; font-weight: bold;">${bestProgressExercise ? `+${bestProgressPct.toFixed(1)}%` : '—'}</h5>
                    <small class="text-muted">${bestProgressExercise || 'N/A'}</small>
                </div>
            </div>
            
            <!-- CONCLUSIONES (TEXTO CLARO) -->
            <div style="background: white; padding: 12px; border-radius: 6px; margin-bottom: 12px;">
                <h6 style="color: #333; margin-bottom: 10px; font-weight: bold;">🧠 Interpretación</h6>
                ${conclusions.map(c => `<small style="display: block; margin-bottom: 5px; color: #555;">${c}</small>`).join('')}
            </div>
            
            <!-- RECOMENDACIONES -->
            <div style="background: #e3f2fd; padding: 12px; border-radius: 6px; border-left: 3px solid #0d6efd;">
                <h6 style="color: #0d6efd; margin-bottom: 10px; font-weight: bold;">💡 Recomendaciones</h6>
                ${recommendations.map(r => `<small style="display: block; margin-bottom: 5px; color: #1565c0;">${r}</small>`).join('')}
                ${recommendations.length === 0 ? '<small style="color: #1565c0;"><i>Sesión equilibrada, mantén el ritmo</i></small>' : ''}
            </div>
        </div>
    `;
    
    summaryPanel.innerHTML = html;
}

function deleteTraining(id) {
    console.log('🗑️ Eliminando entrenamiento:', id);
    allTrainings = allTrainings.filter(t => t.id !== id);
    localStorage.setItem('trainings', JSON.stringify(allTrainings));
    renderTodayTrainings();
}

// ==================== HISTORIAL DEL DÍA ====================

function renderHistoricalData() {
    const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][selectedDate.getDay()];
    
    // Obtener últimas 4 semanas
    const last4Weeks = [];
    for (let i = 0; i < 28; i += 7) {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - i);
        last4Weeks.push(date);
    }

    const historyByMuscle = {};

    // Agrupar por semana
    last4Weeks.forEach((date, weekIdx) => {
        const dateStr = getLocalDateString(date);
        const weekTrainings = allTrainings.filter(t => t.date === dateStr);

        weekTrainings.forEach(t => {
            if (!historyByMuscle[t.exercise]) {
                historyByMuscle[t.exercise] = [];
            }
            historyByMuscle[t.exercise].push({
                date: dateStr,
                week: weekIdx,
                weight: t.weight,
                oneRM: t.oneRM,
                series: t.series,
                totalReps: t.totalReps,
                volume: t.volume
            });
        });
    });

    let html = '<div class="row">';

    Object.entries(historyByMuscle).forEach(([exercise, data]) => {
        const sorted = data.sort((a, b) => b.week - a.week);
        
        html += `
            <div class="col-md-6 mb-3">
                <div class="card bg-light border-0">
                    <div class="card-body">
                        <h6 class="mb-3"><strong>${exercise}</strong></h6>
                        <div class="small">
                            ${sorted.map((d, idx) => `
                                <div class="mb-2 pb-2 ${idx < sorted.length - 1 ? 'border-bottom' : ''}">
                                    <small class="text-muted">${new Date(d.date).toLocaleDateString('es-ES')}</small><br>
                                    <strong>${d.weight} kg</strong> × ${d.series.join('-')} 
                                    <small class="text-muted">(${d.totalReps} reps)</small><br>
                                    <small class="text-success">1RM: ${d.oneRM.toFixed(1)} kg</small>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    if (Object.keys(historyByMuscle).length === 0) {
        html = '<p class="text-muted text-center">No hay historial para este día</p>';
    }

    html += '</div>';

    document.getElementById('historyPanel').innerHTML = html;
}

// ==================== GRÁFICA DE PROGRESIÓN ====================

function renderProgressChart() {
    const ctx = document.getElementById('progressChart')?.getContext('2d');
    if (!ctx) return;

    const dayName = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][selectedDate.getDay()];
    
    // Obtener últimas 8 semanas
    const last8Weeks = [];
    for (let i = 0; i < 56; i += 7) {
        const date = new Date(selectedDate);
        date.setDate(date.getDate() - i);
        last8Weeks.push(date);
    }

    // Encontrar el ejercicio con más registros
    const exerciseFreq = {};
    last8Weeks.forEach(date => {
        const dateStr = getLocalDateString(date);
        const weekTrainings = allTrainings.filter(t => t.date === dateStr);
        weekTrainings.forEach(t => {
            exerciseFreq[t.exercise] = (exerciseFreq[t.exercise] || 0) + 1;
        });
    });

    const mainExercise = Object.keys(exerciseFreq).reduce((a, b) => 
        exerciseFreq[a] > exerciseFreq[b] ? a : b, '');

    if (!mainExercise) {
        document.getElementById('progressChart').style.display = 'none';
        return;
    }

    // Datos de progresión
    const data = last8Weeks
        .map(date => {
            const dateStr = getLocalDateString(date);
            const training = allTrainings.find(t => t.date === dateStr && t.exercise === mainExercise);
            return {
                date: dateStr,
                training
            };
        })
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (window.progressChartInstance) {
        window.progressChartInstance.destroy();
    }

    window.progressChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: data.map(d => {
                const date = new Date(d.date);
                return date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
            }),
            datasets: [{
                label: `${mainExercise} - Peso`,
                data: data.map(d => d.training?.weight || null),
                borderColor: '#0d6efd',
                backgroundColor: 'rgba(13, 110, 253, 0.1)',
                tension: 0.3,
                fill: true,
                pointRadius: 5,
                spanGaps: true
            }, {
                label: `${mainExercise} - 1RM`,
                data: data.map(d => d.training?.oneRM || null),
                borderColor: '#28a745',
                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                tension: 0.3,
                fill: false,
                pointRadius: 4,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true, position: 'top' }
            },
            scales: {
                y: { beginAtZero: false }
            }
        }
    });
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    document.getElementById('quickTrainingForm').addEventListener('submit', (e) => {
        e.preventDefault();

        const exercise = document.getElementById('quickExercise').value.trim();
        const seriesStr = document.getElementById('quickSeries').value.trim();
        const weight = parseFloat(document.getElementById('quickWeight').value);

        if (!exercise || !seriesStr || !weight) {
            alert('❌ Completa todos los campos');
            return;
        }

        // Parsear formato "5x5" a [5, 5]  (5 series de 5 reps)
        const parts = seriesStr.toLowerCase().split('x').map(s => parseInt(s.trim()));
        
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
            alert('❌ Formato incorrecto. Usa: 5x5 (5 series de 5 reps)');
            return;
        }

        const numSeries = parts[0];
        const repsPerSeries = parts[1];
        const totalReps = numSeries * repsPerSeries;
        const series = Array(numSeries).fill(repsPerSeries);
        
        const volume = series.reduce((sum, r) => sum + (r * weight), 0);
        const oneRM = weight / (1.0278 - 0.0278 * totalReps);

        const training = {
            id: Date.now(),
            date: getLocalDateString(selectedDate),
            dayOfWeek: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][selectedDate.getDay()],
            trainingType: 'Manual',
            exercise,
            muscleGroup: 'Custom',
            weight,
            series,
            totalReps,
            volume,
            oneRM,
            timestamp: new Date().toLocaleString()
        };

        console.log('📝 Registrando entrenamiento:', training);
        allTrainings.push(training);
        localStorage.setItem('trainings', JSON.stringify(allTrainings));

        document.getElementById('quickTrainingForm').reset();
        renderTodayTrainings();
        renderHistoricalData();
        renderProgressChart();
        
        alert(`✅ ${exercise} registrado: ${weight}kg ${series.join('-')}`);
    });
}

// ==================== UPDATE GENERAL ====================

function updatePage() {
    const dateStr = getLocalDateString(selectedDate);
    console.log(`📅 Actualizando página para: ${dateStr}`);
    console.log(`📊 Total entrenamientos cargados: ${allTrainings.length}`);
    
    renderTodayTrainings();
    
    console.log(`✅ Página actualizada`);
}
