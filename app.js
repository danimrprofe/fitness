// Estado global
let trainings = [];
let hasUnsavedChanges = false;

// ==================== CARGA DE DATOS ====================

// Migrar datos antiguos: recalcular 1RM correctamente y mapear trainingTypes
function migrateTrainingsData() {
    let migrated = false;
    let pesadoCount = 0;
    let hipertrofiaCount = 0;
    let normalCount = 0;
    
    trainings = trainings.map(t => {
        // Mapear trainingType antiguo a nuevo basado en dayOfWeek
        let trainingType = t.trainingType;
        
        // Contar tipos antes de migración
        if (trainingType === 'Torso Normal') normalCount++;
        else if (trainingType === 'Torso Pesado') pesadoCount++;
        else if (trainingType === 'Torso Hipertrofia') hipertrofiaCount++;
        
        if (trainingType === 'Torso Normal') {
            if (t.dayOfWeek === 'Lunes') {
                trainingType = 'Torso Pesado';
                migrated = true;
            } else if (t.dayOfWeek === 'Viernes') {
                trainingType = 'Torso Hipertrofia';
                migrated = true;
            }
        }
        
        // Si no tiene series, retornar con trainingType actualizado
        if (!t.series || t.series.length === 0) {
            return { ...t, trainingType };
        }
        
        // Recalcular 1RM basado en reps mínimas de las series
        let oneRM = 0;
        if (trainingType === 'Torso Pesado' && t.series.length > 0) {
            const minReps = Math.min(...t.series);
            oneRM = minReps > 0 ? Math.round((t.weight * 36 / (37 - minReps)) * 100) / 100 : 0;
            
            if (oneRM !== t.oneRM) {
                console.log(`Migrando ${t.exercise} (${t.date}): ${t.oneRM}kg → ${oneRM}kg`);
                migrated = true;
            }
        } else if (trainingType !== 'Torso Pesado') {
            // No es Torso Pesado: establecer oneRM a 0
            if (t.oneRM !== 0) {
                migrated = true;
            }
            oneRM = 0;
        }
        
        return { ...t, trainingType, oneRM };
    });
    
    // Log resumen de migración
    console.log(`📊 Antes de migración - Normal: ${normalCount}, Pesado: ${pesadoCount}, Hipertrofia: ${hipertrofiaCount}`);
    const newPesado = trainings.filter(t => t.trainingType === 'Torso Pesado').length;
    const newHipertrofia = trainings.filter(t => t.trainingType === 'Torso Hipertrofia').length;
    const remaining = trainings.filter(t => t.trainingType === 'Torso Normal').length;
    console.log(`📊 Después de migración - Pesado: ${newPesado}, Hipertrofia: ${newHipertrofia}, Normal: ${remaining}`);
    
    if (migrated) {
        console.log('✅ Datos migrados correctamente');
        saveTrainingsToStorage();
    }
}

// Cargar datos del archivo JSON
function loadTrainingsFromFile() {
    fetch('data.json')
        .then(response => {
            if (!response.ok) throw new Error('Error en fetch');
            return response.json();
        })
        .then(data => {
            console.log('✅ Datos cargados desde data.json:', data.length, 'registros');
            trainings = data;
            console.log('Tipos antes de migración:', [...new Set(trainings.map(t => t.trainingType))].join(', '));
            migrateTrainingsData();
            console.log('Tipos después de migración:', [...new Set(trainings.map(t => t.trainingType))].join(', '));
            saveTrainingsToStorage();
            updateAllTables();
            updateWeeklySummary();
            updateProgressSection();
        })
        .catch(err => {
            console.error('❌ Error al cargar datos de entrenamientos:', err);
            // Fallback: cargar desde localStorage
            console.log('📦 Cargando desde localStorage como respaldo...');
            loadTrainingsFromStorage();
            if (trainings.length > 0) {
                console.log('✅ Datos cargados de localStorage:', trainings.length, 'registros');
                migrateTrainingsData();
                console.log('Tipos después de migración:', [...new Set(trainings.map(t => t.trainingType))].join(', '));
                updateAllTables();
                updateWeeklySummary();
                updateProgressSection();
            } else {
                console.warn('⚠️ No hay datos disponibles en localStorage');
            }
        });
}

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('Iniciando carga de entrenamientos...');
    
    // Intentar cargar desde archivo primero
    loadTrainingsFromFile();
    
    setTodayDate();
    setupEventListeners();
});

// ==================== FUNCIONES HELPER PARA HIPERTROFIA ====================

function isMainExercise(exercise) {
    const mainExercises = ['Jalón', 'Press', 'Remo'];
    return mainExercises.includes(exercise);
}

// Ordenar ejercicios en orden específico
function sortExercisesByPreference(exercises) {
    const preferredOrder = [
        'Press',
        'Press Inclinado',
        'Jalón',
        'Remo',
        'Bíceps',
        'Tríceps',
        'Elevaciones',
        'Face Pull'
    ];
    
    return exercises.sort((a, b) => {
        const indexA = preferredOrder.indexOf(a);
        const indexB = preferredOrder.indexOf(b);
        
        // Si ambos están en la lista preferida, ordenar por su posición
        if (indexA !== -1 && indexB !== -1) {
            return indexA - indexB;
        }
        // Si solo a está en la lista, va primero
        if (indexA !== -1) return -1;
        // Si solo b está en la lista, va primero
        if (indexB !== -1) return 1;
        // Si ninguno está en la lista, orden alfabético
        return a.localeCompare(b);
    });
}

function getRecommendedRange(exercise, trainingType) {
    if (trainingType !== 'Torso Hipertrofia') {
        return null;
    }
    
    if (isMainExercise(exercise)) {
        return '40-45';
    } else {
        return '30-40';
    }
}

function evaluateHypertrophyReps(exercise, totalReps, trainingType) {
    if (trainingType !== 'Torso Hipertrofia') {
        return null; // Solo evaluar en días de hipertrofia
    }

    if (isMainExercise(exercise)) {
        // Principales: 40-45 reps
        if (totalReps < 40) return 'too-few';
        if (totalReps > 45) return 'too-many';
        return 'good';
    } else {
        // Accesorios: 30-40 reps
        if (totalReps < 30) return 'too-few';
        if (totalReps > 40) return 'too-many';
        return 'good';
    }
}

// ==================== FUNCIONES DE ALMACENAMIENTO ====================

function loadTrainingsFromStorage() {
    const stored = localStorage.getItem('trainings');
    trainings = stored ? JSON.parse(stored) : [];
}

function saveTrainingsToStorage() {
    localStorage.setItem('trainings', JSON.stringify(trainings));
}

function setTodayDate() {
    const dateInput = document.getElementById('date');
    if (dateInput) {
        const today = new Date().toISOString().split('T')[0];
        dateInput.value = today;
    }
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
    // Formulario (solo si existen en la página)
    const trainingForm = document.getElementById('trainingForm');
    if (trainingForm) {
        trainingForm.addEventListener('submit', handleFormSubmit);
        trainingForm.addEventListener('reset', handleFormReset);
    }

    // Series dinámicas
    const addSeriesBtn = document.getElementById('addSeriesBtn');
    const seriesContainer = document.getElementById('seriesContainer');
    if (addSeriesBtn && seriesContainer) {
        addSeriesBtn.addEventListener('click', addSeriesInput);
        seriesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-series')) {
                e.target.parentElement.remove();
                updateSeriesButtons();
            }
        });
    }

    // Export/Import
    const exportBtn = document.getElementById('exportBtn');
    const importBtn = document.getElementById('importBtn');
    const importFile = document.getElementById('importFile');
    
    if (exportBtn) exportBtn.addEventListener('click', exportData);
    if (importBtn) {
        importBtn.addEventListener('click', () => {
            document.getElementById('importFile').click();
        });
    }
    if (importFile) importFile.addEventListener('change', importData);

    // Eliminar todo (solo si existe)
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    if (deleteAllBtn) {
        deleteAllBtn.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres eliminar TODOS los entrenamientos?')) {
                trainings = [];
                saveTrainingsToStorage();
                renderTrainings();
                updateWeeklySummary();
                updateProgressSection();
            }
        });
    }

    // Filtros (solo si existen)
    const filterExercise = document.getElementById('filterExercise');
    const filterMuscle = document.getElementById('filterMuscle');
    const filterType = document.getElementById('filterType');
    
    if (filterExercise) filterExercise.addEventListener('input', renderTrainings);
    if (filterMuscle) filterMuscle.addEventListener('change', renderTrainings);
    if (filterType) filterType.addEventListener('change', renderTrainings);
    
    // Selector de ejercicio para gráfica de evolución
    const exerciseSelector = document.getElementById('exerciseSelector');
    if (exerciseSelector) {
        exerciseSelector.addEventListener('change', (e) => {
            if (e.target.value) {
                renderExerciseEvolutionCharts(e.target.value);
            }
        });
    }
}

// ==================== MANEJO DE SERIES ====================

function addSeriesInput() {
    const container = document.getElementById('seriesContainer');
    const div = document.createElement('div');
    div.className = 'input-group mb-2';
    div.innerHTML = `
        <input type="number" class="form-control series-input" placeholder="Reps" min="1" required>
        <button type="button" class="btn btn-danger btn-sm remove-series">✕</button>
    `;
    container.appendChild(div);
    updateSeriesButtons();
}

function updateSeriesButtons() {
    const inputs = document.querySelectorAll('.input-group');
    document.querySelectorAll('.remove-series').forEach((btn, idx) => {
        btn.style.display = inputs.length > 1 ? 'block' : 'none';
    });
}

function getSeriesValues() {
    return Array.from(document.querySelectorAll('.series-input'))
        .map(input => parseInt(input.value))
        .filter(val => !isNaN(val));
}

// ==================== CÁLCULOS ====================

/**
 * Calcula 1RM usando la fórmula de Brzycki: weight × (36 / (37 - reps))
 * Usa las reps mínimas entre todas las series (máxima carga)
 */
function calculate1RM(series, weight) {
    if (series.length === 0 || weight === 0) return 0;
    // Usar el mínimo de reps (generalmente la serie más pesada)
    const minReps = Math.min(...series);
    if (minReps === 0) return 0;
    return Math.round((weight * 36 / (37 - minReps)) * 100) / 100;
}

/**
 * Calcula el volumen total: suma de (reps × weight) para cada serie
 */
function calculateVolume(series, weight) {
    return series.reduce((sum, reps) => sum + (reps * weight), 0);
}

// ==================== EVALUACIÓN DE ENTRENAMIENTOS ====================

function evaluateWorkout(training, allTrainings) {
    // Buscar el entrenamiento anterior del mismo ejercicio Y tipo
    const sorted = [...allTrainings].sort((a, b) => new Date(b.date) - new Date(a.date));
    const idx = sorted.findIndex(t => t.id === training.id);
    const previous = idx >= 0 ? sorted.slice(idx + 1).find(t => t.exercise === training.exercise && t.trainingType === training.trainingType) : null;

    let evaluation = {
        emoji: '✅',
        message: 'Entrenamiento completado',
        color: 'success'
    };

    // Evaluar según tipo de entrenamiento
    if (training.trainingType === 'Torso Pesado') {
        if (!previous) {
            evaluation = { emoji: '📝', message: 'Primer registro de este ejercicio', color: 'info' };
        } else {
            const weightDiff = training.weight - previous.weight;
            const weightPct = ((weightDiff) / previous.weight * 100).toFixed(1);
            
            if (weightDiff > 0) {
                evaluation = { 
                    emoji: '💪', 
                    message: `Excelente! +${weightPct}% de peso (${previous.weight}kg → ${training.weight}kg)`,
                    color: 'success'
                };
            } else if (weightDiff === 0) {
                evaluation = { 
                    emoji: '➡️', 
                    message: `Estabilidad. Peso mantenido en ${training.weight}kg`,
                    color: 'warning'
                };
            } else {
                evaluation = { 
                    emoji: '⚠️', 
                    message: `Bajó ${Math.abs(weightPct)}% de peso (${previous.weight}kg → ${training.weight}kg)`,
                    color: 'danger'
                };
            }
        }
    } else if (training.trainingType === 'Torso Hipertrofia') {
        const repsEval = evaluateHypertrophyReps(training.exercise, training.totalReps, training.trainingType);
        const range = getRecommendedRange(training.exercise, training.trainingType);
        
        if (!previous) {
            evaluation = { emoji: '📝', message: 'Primer registro de este ejercicio', color: 'info' };
        } else {
            const volDiff = training.volume - previous.volume;
            const volPct = ((volDiff) / previous.volume * 100).toFixed(1);
            
            let baseMessage = '';
            if (volDiff > 0) {
                baseMessage = `Volumen +${volPct}%`;
            } else if (volDiff === 0) {
                baseMessage = 'Volumen estable';
            } else {
                baseMessage = `Volumen -${Math.abs(volPct)}%`;
            }
            
            if (repsEval === 'good') {
                evaluation = {
                    emoji: '🎯',
                    message: `${baseMessage}. Reps óptimas (${training.totalReps} reps en rango ${range})`,
                    color: 'success'
                };
            } else if (repsEval === 'too-few') {
                evaluation = {
                    emoji: '📈',
                    message: `${baseMessage}. Pocas reps (${training.totalReps}, objetivo ${range})`,
                    color: 'warning'
                };
            } else if (repsEval === 'too-many') {
                evaluation = {
                    emoji: '⏱️',
                    message: `${baseMessage}. Demasiadas reps (${training.totalReps}, objetivo ${range})`,
                    color: 'info'
                };
            }
        }
    }

    return evaluation;
}

// ==================== MANEJO DEL FORMULARIO ====================

function handleFormSubmit(e) {
    e.preventDefault();

    const date = document.getElementById('date').value;
    const dayOfWeek = document.getElementById('dayOfWeek').value;
    const trainingType = document.getElementById('trainingType').value;
    const exercise = document.getElementById('exercise').value;
    const muscleGroup = document.getElementById('muscleGroup').value;
    const weight = parseFloat(document.getElementById('weight').value);
    const series = getSeriesValues();

    if (series.length === 0) {
        alert('Debes agregar al menos una serie');
        return;
    }

    // Calcular métricas
    const totalReps = series.reduce((sum, reps) => sum + reps, 0);
    const volume = calculateVolume(series, weight);
    const oneRM = trainingType === 'Torso Pesado' ? calculate1RM(series, weight) : 0;

    // Crear objeto de entrenamiento
    const training = {
        id: Date.now(),
        date,
        dayOfWeek,
        trainingType,
        exercise,
        muscleGroup,
        weight,
        series,
        totalReps,
        volume,
        oneRM,
        timestamp: new Date().toLocaleString()
    };

    trainings.push(training);
    saveTrainingsToStorage();
    updateAllTables();
    updateWeeklySummary();
    updateProgressSection();

    // Reset formulario
    document.getElementById('trainingForm').reset();
    setTodayDate();
    document.getElementById('seriesContainer').innerHTML = `
        <div class="input-group mb-2">
            <input type="number" class="form-control series-input" placeholder="Reps" min="1" required>
            <button type="button" class="btn btn-danger btn-sm remove-series" style="display: none;">✕</button>
        </div>
    `;
    
    alert('✅ Entrenamiento guardado correctamente');
}

function handleFormReset() {
    setTodayDate();
    document.getElementById('seriesContainer').innerHTML = `
        <div class="input-group mb-2">
            <input type="number" class="form-control series-input" placeholder="Reps" min="1" required>
            <button type="button" class="btn btn-danger btn-sm remove-series" style="display: none;">✕</button>
        </div>
    `;
}

// ==================== RENDERIZADO ====================

function updateAllTables() {
    console.log('📊 Actualizando todas las tablas...');
    console.log(`Total entrenamientos: ${trainings.length}`);
    console.log(`Torso Pesado: ${trainings.filter(t => t.trainingType === 'Torso Pesado').length}`);
    console.log(`Torso Hipertrofia: ${trainings.filter(t => t.trainingType === 'Torso Hipertrofia').length}`);
    
    renderTrainings();
    renderTrainingsByType('Torso Pesado', 'torsoPesadoBody', 'torsoPesadoHeaderRow', 'torsoPesadoEmpty');
    renderTrainingsByType('Torso Hipertrofia', 'torsoHipertrofiaBody', 'torsoHipertrofiaHeaderRow', 'torsoHipertrofiaEmpty');
    
    // Actualizar indicador de cambios sin guardar
    updateUnsavedIndicator();
}

function updateUnsavedIndicator() {
    const indicator = document.getElementById('unsavedIndicator');
    if (indicator) {
        if (hasUnsavedChanges) {
            indicator.style.display = 'block';
        } else {
            indicator.style.display = 'none';
        }
    }
}

function renderTrainings() {
    const tableBody = document.getElementById('tableBody');
    const tableHeaderRow = document.getElementById('tableHeaderRow');
    const emptyMessage = document.getElementById('emptyMessage');

    // Si no existen estos elementos en la página actual, no renderizar
    if (!tableBody || !tableHeaderRow || !emptyMessage) {
        return;
    }

    // Aplicar filtros
    const filterExerciseEl = document.getElementById('filterExercise');
    const filterMuscleEl = document.getElementById('filterMuscle');
    const filterTypeEl = document.getElementById('filterType');
    
    const filterExercise = filterExerciseEl ? filterExerciseEl.value.toLowerCase() : '';
    const filterMuscle = filterMuscleEl ? filterMuscleEl.value : '';
    const filterType = filterTypeEl ? filterTypeEl.value : '';

    let filtered = trainings.filter(t => {
        const matchExercise = t.exercise.toLowerCase().includes(filterExercise);
        const matchMuscle = !filterMuscle || t.muscleGroup === filterMuscle;
        const matchType = !filterType || t.trainingType === filterType;
        return matchExercise && matchMuscle && matchType;
    });

    if (filtered.length === 0) {
        tableBody.innerHTML = '';
        emptyMessage.style.display = 'block';
        return;
    }

    emptyMessage.style.display = 'none';

    // Agrupar por fecha
    const byDate = {};
    filtered.forEach(t => {
        if (!byDate[t.date]) {
            byDate[t.date] = [];
        }
        byDate[t.date].push(t);
    });

    // Obtener todas las fechas únicas ordenadas (descendente)
    const dates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));

    // Obtener todos los ejercicios únicos para hacer columnas
    const allExercises = new Set();
    filtered.forEach(t => allExercises.add(t.exercise));
    const exercisesArray = sortExercisesByPreference(Array.from(allExercises));

    // Actualizar encabezados: agregar columnas de ejercicios
    let headerHTML = `
        <th style="width: 120px; min-width: 120px;">Fecha</th>
        <th style="width: 100px; min-width: 100px;">Tipo</th>
    `;
    exercisesArray.forEach(exercise => {
        const width = Math.max(150, exercise.length * 10);
        headerHTML += `<th style="width: ${width}px; min-width: ${width}px;">${exercise}</th>`;
    });
    headerHTML += `<th style="width: 60px; min-width: 60px;">Acciones</th>`;
    tableHeaderRow.innerHTML = headerHTML;

    // Generar filas por fecha
    const rows = dates.map(date => {
        const trainingsForDate = byDate[date];
        const trainingTypeValue = trainingsForDate[0]?.trainingType || '-';
        const dayOfWeek = trainingsForDate[0]?.dayOfWeek || '';
        
        // Crear objeto para búsqueda rápida de ejercicios por fecha
        const exerciseMap = {};
        trainingsForDate.forEach(t => {
            exerciseMap[t.exercise] = t;
        });

        let rowHTML = `
            <tr>
                <td style="width: 120px; min-width: 120px;"><strong>${formatDate(date)}</strong><br><small>${dayOfWeek}</small></td>
                <td style="width: 100px; min-width: 100px;"><small>${trainingTypeValue}</small></td>
        `;

        // Agregar columnas para cada ejercicio
        exercisesArray.forEach(exercise => {
            const training = exerciseMap[exercise];
            if (training) {
                // Calcular progreso: buscar el entrenamiento anterior del mismo ejercicio y tipo
                const sorted = [...filtered].filter(t => t.exercise === exercise && t.trainingType === training.trainingType).sort((a, b) => new Date(b.date) - new Date(a.date));
                const previousIndex = sorted.findIndex(t => t.date === training.date);
                const previous = previousIndex >= 0 && previousIndex < sorted.length - 1 ? sorted[previousIndex + 1] : null;
                
                let progressDisplay = '';
                let progressClass = '';
                
                if (previous) {
                    let progress = null;
                    if (training.trainingType === 'Torso Pesado') {
                        // En Pesado: comparar por kg
                        progress = ((training.weight - previous.weight) / previous.weight * 100).toFixed(1);
                    } else if (training.trainingType === 'Torso Hipertrofia') {
                        // En Hipertrofia: comparar por volumen
                        progress = ((training.volume - previous.volume) / previous.volume * 100).toFixed(1);
                    }
                    
                    if (progress !== null) {
                        const progressNum = parseFloat(progress);
                        if (progressNum > 0) {
                            progressClass = 'progress-up';
                            progressDisplay = `<small class="text-success" style="font-weight: bold;">↑ +${progress}%</small>`;
                        } else if (progressNum < 0) {
                            progressClass = 'progress-down';
                            progressDisplay = `<small class="text-danger" style="font-weight: bold;">↓ ${progress}%</small>`;
                        } else {
                            progressClass = 'progress-neutral';
                            progressDisplay = `<small class="text-warning" style="font-weight: bold;">→ Estable</small>`;
                        }
                    }
                }

                // Evaluar reps en hipertrofia
                let repsEvalCircle = '';
                if (training.trainingType === 'Torso Hipertrofia') {
                    const repsEval = evaluateHypertrophyReps(training.exercise, training.totalReps, training.trainingType);
                    if (repsEval === 'good') {
                        repsEvalCircle = '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: #28a745; margin-left: 5px;" title="Reps óptimas"></span>';
                    } else if (repsEval === 'too-few') {
                        repsEvalCircle = '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: #ffc107; margin-left: 5px;" title="Pocas reps"></span>';
                    } else if (repsEval === 'too-many') {
                        repsEvalCircle = '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: #dc3545; margin-left: 5px;" title="Demasiadas reps"></span>';
                    }
                }

                const seriesStr = training.trainingType === 'Torso Hipertrofia' 
                    ? `${training.series.join('-')} (${training.totalReps} reps) ${repsEvalCircle}`
                    : training.series.join('-');
                const oneRMDisplay = training.trainingType === 'Torso Pesado' ? 
                    `<br><small class="text-success">1RM: ${training.oneRM.toFixed(1)}kg</small>` : '';
                const width = Math.max(150, exercise.length * 10);
                
                rowHTML += `
                    <td style="width: ${width}px; min-width: ${width}px;">
                        <div class="series-badge" style="margin-bottom: 5px;">${seriesStr}</div>
                        <strong>${training.weight}kg</strong>
                        ${progressDisplay}
                        ${oneRMDisplay}
                        <br><small class="text-muted">Vol: ${training.volume}</small>
                    </td>
                `;
            } else {
                // Celda vacía si no hay entrenamiento para ese ejercicio ese día
                const width = Math.max(150, exercise.length * 10);
                rowHTML += `<td style="width: ${width}px; min-width: ${width}px; background-color: #f9f9f9;">—</td>`;
            }
        });

        // Botones de acción (solo para la primera celda de acciones)
        const firstTraining = trainingsForDate[0];
        rowHTML += `
            <td style="width: 60px; min-width: 60px;">
                <div class="btn-group-vertical btn-group-sm" role="group">
                    <button class="btn btn-primary btn-sm" onclick="showDateDetails('${date}')">📋</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteDateTrainings('${date}')">🗑</button>
                </div>
            </td>
            </tr>
        `;

        return rowHTML;
    }).join('');

    tableBody.innerHTML = rows;
}

// ==================== RENDERIZAR POR TIPO ====================

function renderTrainingsByType(trainingType, tableBodyId, tableHeaderId, emptyMessageId) {
    const tableBody = document.getElementById(tableBodyId);
    const tableHeaderRow = document.getElementById(tableHeaderId);
    const emptyMessage = document.getElementById(emptyMessageId);

    console.log(`🔍 Renderizando ${trainingType}:`, {
        tableBodyId,
        tableHeaderId,
        emptyMessageId,
        elementosEncontrados: {
            body: !!tableBody,
            header: !!tableHeaderRow,
            empty: !!emptyMessage
        }
    });

    if (!tableBody || !tableHeaderRow || !emptyMessage) {
        console.error(`❌ Elementos no encontrados para ${trainingType}`);
        return;
    }

    // Filtrar solo por tipo de entrenamiento
    let filtered = trainings.filter(t => t.trainingType === trainingType);
    console.log(`${trainingType}: ${filtered.length} entrenamientos encontrados`);
    console.log('Tipos únicos en trainings:', [...new Set(trainings.map(t => t.trainingType))]);

    if (filtered.length === 0) {
        console.log(`Sin entrenamientos para ${trainingType}, mostrando mensaje vacío`);
        tableBody.innerHTML = '';
        emptyMessage.style.display = 'block';
        return;
    }

    emptyMessage.style.display = 'none';

    // Agrupar por fecha
    const byDate = {};
    filtered.forEach(t => {
        if (!byDate[t.date]) {
            byDate[t.date] = [];
        }
        byDate[t.date].push(t);
    });

    // Obtener todas las fechas únicas ordenadas (descendente)
    const dates = Object.keys(byDate).sort((a, b) => new Date(b) - new Date(a));

    // Obtener todos los ejercicios únicos para hacer columnas
    const allExercises = new Set();
    filtered.forEach(t => allExercises.add(t.exercise));
    const exercisesArray = sortExercisesByPreference(Array.from(allExercises));

    // Actualizar encabezados
    let headerHTML = `
        <th style="width: 120px; min-width: 120px;">Fecha</th>
        <th style="width: 100px; min-width: 100px;">Tipo</th>
        <th style="width: 80px; min-width: 80px;">Vol. Total</th>
    `;
    exercisesArray.forEach(exercise => {
        const width = Math.max(150, exercise.length * 10);
        headerHTML += `<th style="width: ${width}px; min-width: ${width}px;">${exercise}</th>`;
    });
    headerHTML += `<th style="width: 60px; min-width: 60px;">Acciones</th>`;
    tableHeaderRow.innerHTML = headerHTML;

    // Generar filas por fecha
    const rows = dates.map(date => {
        const trainingsForDate = byDate[date];
        const trainingTypeValue = trainingsForDate[0]?.trainingType || '-';
        const dayOfWeek = trainingsForDate[0]?.dayOfWeek || '';
        const totalVolume = trainingsForDate.reduce((sum, t) => sum + t.volume, 0);
        
        // Crear objeto para búsqueda rápida de ejercicios por fecha
        const exerciseMap = {};
        trainingsForDate.forEach(t => {
            exerciseMap[t.exercise] = t;
        });

        let rowHTML = `
            <tr>
                <td style="width: 120px; min-width: 120px;"><strong>${formatDate(date)}</strong><br><small>${dayOfWeek}</small></td>
                <td style="width: 100px; min-width: 100px;"><small>${trainingTypeValue}</small></td>
                <td style="width: 80px; min-width: 80px;"><strong style="color: #007bff;">${totalVolume}</strong></td>
        `;

        // Agregar columnas para cada ejercicio
        exercisesArray.forEach(exercise => {
            const training = exerciseMap[exercise];
            if (training) {
                // Calcular progreso
                const sorted = [...filtered].filter(t => t.exercise === exercise && t.trainingType === training.trainingType).sort((a, b) => new Date(b.date) - new Date(a.date));
                const previousIndex = sorted.findIndex(t => t.date === training.date);
                const previous = previousIndex >= 0 && previousIndex < sorted.length - 1 ? sorted[previousIndex + 1] : null;
                
                let progressDisplay = '';
                
                if (previous) {
                    let progress = null;
                    if (training.trainingType === 'Torso Pesado') {
                        progress = ((training.weight - previous.weight) / previous.weight * 100).toFixed(1);
                    } else if (training.trainingType === 'Torso Hipertrofia') {
                        progress = ((training.volume - previous.volume) / previous.volume * 100).toFixed(1);
                    }
                    
                    if (progress !== null) {
                        const progressNum = parseFloat(progress);
                        if (progressNum > 0) {
                            progressDisplay = `<small class="text-success" style="font-weight: bold;">↑ +${progress}%</small>`;
                        } else if (progressNum < 0) {
                            progressDisplay = `<small class="text-danger" style="font-weight: bold;">↓ ${progress}%</small>`;
                        } else {
                            progressDisplay = `<small class="text-warning" style="font-weight: bold;">→ Estable</small>`;
                        }
                    }
                }

                // Evaluar reps en hipertrofia
                let repsEvalCircle = '';
                if (training.trainingType === 'Torso Hipertrofia') {
                    const repsEval = evaluateHypertrophyReps(training.exercise, training.totalReps, training.trainingType);
                    if (repsEval === 'good') {
                        repsEvalCircle = '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: #28a745; margin-left: 5px;" title="Reps óptimas"></span>';
                    } else if (repsEval === 'too-few') {
                        repsEvalCircle = '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: #ffc107; margin-left: 5px;" title="Pocas reps"></span>';
                    } else if (repsEval === 'too-many') {
                        repsEvalCircle = '<span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: #dc3545; margin-left: 5px;" title="Demasiadas reps"></span>';
                    }
                }

                const seriesStr = training.trainingType === 'Torso Hipertrofia' 
                    ? `${training.series.join('-')} (${training.totalReps} reps) ${repsEvalCircle}`
                    : training.series.join('-');
                const oneRMDisplay = training.trainingType === 'Torso Pesado' ? 
                    `<br><small class="text-success">1RM: ${training.oneRM.toFixed(1)}kg</small>` : '';
                const width = Math.max(150, exercise.length * 10);
                
                rowHTML += `
                    <td style="width: ${width}px; min-width: ${width}px;">
                        <div class="series-badge" style="margin-bottom: 5px;">${seriesStr}</div>
                        <strong>${training.weight}kg</strong>
                        ${progressDisplay}
                        ${oneRMDisplay}
                        <br><small class="text-muted">Vol: ${training.volume}</small>
                    </td>
                `;
            } else {
                const width = Math.max(150, exercise.length * 10);
                rowHTML += `<td style="width: ${width}px; min-width: ${width}px; background-color: #f9f9f9;">—</td>`;
            }
        });

        rowHTML += `
            <td style="width: 60px; min-width: 60px;">
                <div class="btn-group-vertical btn-group-sm" role="group">
                    <button class="btn btn-primary btn-sm" onclick="showDateDetails('${date}')">📋</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteDateTrainings('${date}')">🗑</button>
                </div>
            </td>
            </tr>
        `;

        return rowHTML;
    }).join('');

    tableBody.innerHTML = rows;
}

function showDateDetails(date) {
    const dateTrainings = trainings.filter(t => t.date === date);
    if (dateTrainings.length === 0) return;

    const modal = new bootstrap.Modal(document.getElementById('detailsModal'));
    const firstTraining = dateTrainings[0];
    document.getElementById('modalTitle').textContent = `${formatDate(date)} - ${firstTraining.dayOfWeek}`;

    let html = `
        <div class="detail-row">
            <strong>Tipo:</strong>
            <span>${firstTraining.trainingType}</span>
        </div>
        <hr>
    `;

    dateTrainings.forEach(training => {
        const evaluation = evaluateWorkout(training, trainings);
        const seriesStr = training.series.join('-');
        const oneRMDisplay = training.trainingType === 'Torso Pesado' ? 
            `<div class="detail-row"><strong>1RM (Brzycki):</strong><span>${training.oneRM.toFixed(2)}</span></div>` : '';

        html += `
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 15px;">
                <div class="detail-row" style="margin-bottom: 10px;">
                    <strong>${training.exercise}</strong>
                    <span class="badge ${getColorByMuscle(training.muscleGroup)}">${training.muscleGroup}</span>
                </div>
                <div style="background: white; padding: 10px; border-radius: 3px; border: 1px solid #ddd;">
                    <div class="detail-row" style="margin-bottom: 8px;">
                        <strong>Series:</strong>
                        <input type="text" class="form-control form-control-sm" value="${seriesStr}" id="edit-series-${training.id}" style="display: inline-block; width: 150px; margin-left: 10px;" placeholder="ej: 10-12-8">
                    </div>
                    <div class="detail-row" style="margin-bottom: 8px;">
                        <strong>Peso:</strong>
                        <input type="number" class="form-control form-control-sm" value="${training.weight}" id="edit-weight-${training.id}" style="display: inline-block; width: 100px; margin-left: 10px; text-align: center;" step="0.5" min="0.5">
                        <span style="margin-left: 5px;">kg</span>
                    </div>
                    <div class="detail-row">
                        <strong>Volumen:</strong>
                        <span id="vol-${training.id}" style="margin-left: 10px; font-weight: bold; color: #007bff;">${training.volume}</span>
                    </div>
                </div>
                <div style="margin-top: 10px;">
                    <div class="detail-row">
                        <strong>Valoración:</strong>
                        <span class="badge bg-${evaluation.color}" title="${evaluation.message}">${evaluation.emoji} ${evaluation.message}</span>
                    </div>
                </div>
                ${oneRMDisplay}
            </div>
        `;
    });

    // Botón de guardar cambios
    html += `
        <div style="margin-top: 15px; display: flex; gap: 10px;">
            <button class="btn btn-success btn-sm flex-grow-1" onclick="saveEditedTrainings('${date}')">💾 Guardar cambios</button>
            <button class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Cancelar</button>
        </div>
    `;

    // Agregar script para recalcular volumen en tiempo real
    html += `
        <script>
            document.querySelectorAll('[id^="edit-weight-"], [id^="edit-series-"]').forEach(input => {
                input.addEventListener('input', function() {
                    const trainingId = this.id.split('-')[2];
                    const weightInput = document.getElementById('edit-weight-' + trainingId);
                    const seriesInput = document.getElementById('edit-series-' + trainingId);
                    const volSpan = document.getElementById('vol-' + trainingId);
                    
                    if (weightInput && seriesInput && weightInput.value && seriesInput.value) {
                        const weight = parseFloat(weightInput.value);
                        const series = seriesInput.value.split('-').map(s => parseInt(s.trim())).filter(s => !isNaN(s) && s > 0);
                        const totalReps = series.reduce((a, b) => a + b, 0);
                        const volume = weight * totalReps;
                        volSpan.textContent = volume;
                    }
                });
            });
        </script>
    `;

    document.getElementById('modalBody').innerHTML = html;
    modal.show();
}

function deleteDateTrainings(date) {
    if (confirm(`¿Eliminar TODO el entrenamiento del ${formatDate(date)}?`)) {
        trainings = trainings.filter(t => t.date !== date);
        saveTrainingsToStorage();
        updateAllTables();
        updateWeeklySummary();
        updateProgressSection();
    }
}

function saveEditedTrainings(date) {
    const dateTrainings = trainings.filter(t => t.date === date);
    let hasChanges = false;

    dateTrainings.forEach(training => {
        const seriesInput = document.getElementById(`edit-series-${training.id}`);
        const weightInput = document.getElementById(`edit-weight-${training.id}`);

        if (!seriesInput || !weightInput) return;

        const newSeriesStr = seriesInput.value.trim();
        const newWeight = parseFloat(weightInput.value);
        
        let seriesChanged = false;
        let weightChanged = false;

        // Procesar y validar series
        if (newSeriesStr) {
            const seriesArray = newSeriesStr.split('-').map(s => parseInt(s.trim())).filter(s => !isNaN(s) && s > 0);
            
            if (seriesArray.length > 0) {
                // Comparar series
                seriesChanged = JSON.stringify(training.series) !== JSON.stringify(seriesArray);
                
                if (seriesChanged) {
                    training.series = seriesArray;
                    training.totalReps = seriesArray.reduce((a, b) => a + b, 0);
                }
            }
        }

        // Procesar y validar peso (independiente de series)
        if (!isNaN(newWeight) && newWeight > 0) {
            weightChanged = training.weight !== newWeight;
            
            if (weightChanged) {
                training.weight = newWeight;
            }
        }

        // Si hay cambios, recalcular volumen y 1RM
        if (seriesChanged || weightChanged) {
            // Recalcular volumen
            training.volume = training.weight * training.totalReps;
            
            // Recalcular 1RM si es Torso Pesado
            if (training.trainingType === 'Torso Pesado') {
                const minReps = Math.min(...training.series);
                training.oneRM = minReps > 0 ? Math.round((training.weight * 36 / (37 - minReps)) * 100) / 100 : 0;
            }
            
            hasChanges = true;
        }
    });

    if (hasChanges) {
        hasUnsavedChanges = true;
        saveToLocalStorage();
        updateAllTables();
        updateWeeklySummary();
        updateProgressSection();
        
        // Cerrar modal y mostrar mensaje
        bootstrap.Modal.getInstance(document.getElementById('detailsModal')).hide();
        alert('✅ Cambios guardados correctamente');
    } else {
        alert('ℹ️ No hay cambios para guardar');
    }
}

function deleteTraining(id) {
    if (confirm('¿Estás seguro de que quieres eliminar este entrenamiento?')) {
        trainings = trainings.filter(t => t.id !== id);
        saveTrainingsToStorage();
        updateAllTables();
        updateWeeklySummary();
        updateProgressSection();
    }
}

// ==================== MODAL DETALLES ====================

function showDetails(id) {
    const training = trainings.find(t => t.id === id);
    if (!training) return;

    // Redirigir a showDateDetails para mantener consistencia
    showDateDetails(training.date);
}

// ==================== RESUMEN SEMANAL ====================

function updateWeeklySummary() {
    const container = document.getElementById('weeklySummary');
    if (!container) return; // No renderizar si no existe el elemento
    
    const muscleGroups = ['Pecho', 'Espalda', 'Hombros', 'Tríceps', 'Bíceps', 'Pierna', 'Glúteos', 'Core'];
    const thisWeek = getThisWeekTrainings();

    const summary = muscleGroups.map(group => {
        const series = thisWeek
            .filter(t => t.muscleGroup === group)
            .reduce((sum, t) => sum + t.series.length, 0);

        return { group, series };
    });

    container.innerHTML = summary.map(item => {
        const color = item.series > 0 ? 'success' : 'secondary';
        return `
            <div class="col-md-3 mb-3">
                <div class="summary-card bg-${color}">
                    <h6>${item.group}</h6>
                    <div class="number">${item.series}</div>
                    <small>series esta semana</small>
                </div>
            </div>
        `;
    }).join('');
}

function getThisWeekTrainings() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    return trainings.filter(t => {
        const trainingDate = new Date(t.date);
        return trainingDate >= startOfWeek;
    });
}

// ==================== UTILIDADES ====================

function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr).toLocaleDateString('es-ES', options);
}

function getColorByMuscle(muscle) {
    const colors = {
        'Pecho': 'bg-danger',
        'Espalda': 'bg-primary',
        'Hombros': 'bg-warning text-dark',
        'Tríceps': 'bg-info',
        'Bíceps': 'bg-success',
        'Pierna': 'bg-purple',
        'Glúteos': 'bg-dark',
        'Core': 'bg-secondary'
    };
    return colors[muscle] || 'bg-secondary';
}

// ==================== EXPORT / IMPORT ====================

function exportData() {
    const dataStr = JSON.stringify(trainings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entrenamientos_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    // Limpiar indicador de cambios
    hasUnsavedChanges = false;
    updateUnsavedIndicator();
}

function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const imported = JSON.parse(event.target.result);
            
            if (!Array.isArray(imported)) {
                alert('El archivo debe contener un array de entrenamientos');
                return;
            }

            // Siempre sobrescribir (no mezclar)
            trainings = imported;

            saveTrainingsToStorage();
            updateAllTables();
            updateWeeklySummary();
            updateProgressSection();
            
            // Limpiar indicador de cambios
            hasUnsavedChanges = false;
            updateUnsavedIndicator();
            
            alert('✅ Datos importados correctamente (reemplazados)');
        } catch (error) {
            alert('❌ Error al importar el archivo: ' + error.message);
        }
    };
    reader.readAsText(file);
}

// ==================== FUNCIONES DE PROGRESO ====================

function updateProgressSection() {
    // Verificar si los elementos necesarios existen en la página
    if (!document.getElementById('bestLift')) {
        console.log('ℹ️ bestLift no encontrado - página no requiere gráficos de progreso');
        return; // No renderizar si no existe el elemento
    }
    
    if (trainings.length === 0) {
        console.warn('⚠️ Sin datos de entrenamientos para mostrar progreso');
        return;
    }
    
    console.log('📊 Renderizando sección de progreso con', trainings.length, 'entrenamientos');
    const stats = calculateProgressStats();
    const topExercises = getTopExercises(3);
    
    // Actualizar tarjetas de estadísticas
    const bestLiftEl = document.getElementById('bestLift');
    const bestLiftExerciseEl = document.getElementById('bestLiftExercise');
    const avgVolumeEl = document.getElementById('avgVolume');
    const trainingComparisonEl = document.getElementById('trainingComparison');
    const totalExercisesEl = document.getElementById('totalExercises');
    
    if (bestLiftEl) bestLiftEl.textContent = stats.bestLift.toFixed(1) + ' kg';
    if (bestLiftExerciseEl) bestLiftExerciseEl.textContent = stats.bestLiftExercise;
    if (avgVolumeEl) avgVolumeEl.textContent = Math.round(stats.avgVolume);
    if (trainingComparisonEl) trainingComparisonEl.textContent = `Pesado: ${Math.round(stats.avgVolumePesado)} | Hipertrofia: ${Math.round(stats.avgVolumeHipertrofia)}`;
    if (totalExercisesEl) totalExercisesEl.textContent = stats.uniqueExercises;
    
    // Render gráficas
    try {
        renderProgressChart(topExercises);
        console.log('✅ Gráficas de progreso renderizadas');
    } catch (err) {
        console.error('❌ Error renderizando gráficas de progreso:', err);
    }
    
    // Render top ejercicios
    try {
        renderTopExercises(topExercises);
        console.log('✅ Top ejercicios rendrizados');
    } catch (err) {
        console.error('❌ Error renderizando top ejercicios:', err);
    }
    
    // Análisis de periodización
    try {
        updatePeriodizationAnalysis();
        console.log('✅ Análisis de periodización actualizado');
    } catch (err) {
        console.error('❌ Error en análisis de periodización:', err);
    }
    
    // Plan semanal
    try {
        renderWeeklyPlan();
        console.log('✅ Plan semanal renderizado');
    } catch (err) {
        console.error('❌ Error renderizando plan semanal:', err);
    }
    
    // Inicializar selector de ejercicios y gráficas de evolución
    try {
        populateExerciseSelector();
        if (trainings.length > 0) {
            // Seleccionar el primer ejercicio por defecto
            const firstExercise = [...new Set(trainings.map(t => t.exercise))][0];
            const exerciseSelectorEl = document.getElementById('exerciseSelector');
            if (firstExercise && exerciseSelectorEl) {
                exerciseSelectorEl.value = firstExercise;
                renderExerciseEvolutionCharts(firstExercise);
                console.log('✅ Gráficas de evolución renderizadas para:', firstExercise);
            }
        }
    } catch (err) {
        console.error('❌ Error en selector de ejercicios o evolución:', err);
    }
}

function calculateProgressStats() {
    if (trainings.length === 0) {
        return {
            bestLift: 0,
            bestLiftExercise: '-',
            avgVolume: 0,
            avgVolumePesado: 0,
            avgVolumeHipertrofia: 0,
            uniqueExercises: 0
        };
    }
    
    // Best Lift (solo Torso Pesado)
    let bestLift = 0;
    let bestLiftExercise = '-';
    trainings.filter(t => t.trainingType === 'Torso Pesado').forEach(t => {
        if (t.oneRM > bestLift) {
            bestLift = t.oneRM;
            bestLiftExercise = t.exercise;
        }
    });
    
    // Volumen promedio general
    const avgVolume = trainings.reduce((sum, t) => sum + (t.volume || 0), 0) / trainings.length;
    
    // Volumen por tipo
    const pesado = trainings.filter(t => t.trainingType === 'Torso Pesado');
    const hipertrofia = trainings.filter(t => t.trainingType === 'Torso Hipertrofia');
    
    const avgVolumePesado = pesado.length > 0 
        ? pesado.reduce((sum, t) => sum + (t.volume || 0), 0) / pesado.length 
        : 0;
    
    const avgVolumeHipertrofia = hipertrofia.length > 0 
        ? hipertrofia.reduce((sum, t) => sum + (t.volume || 0), 0) / hipertrofia.length 
        : 0;
    
    // Ejercicios únicos
    const uniqueExercises = new Set(trainings.map(t => t.exercise)).size;
    
    return {
        bestLift,
        bestLiftExercise,
        avgVolume,
        avgVolumePesado,
        avgVolumeHipertrofia,
        uniqueExercises
    };
}

function getTopExercises(limit) {
    // Agrupar por ejercicio y obtener max 1RM (solo Torso Pesado)
    const exerciseStats = {};
    
    trainings.filter(t => t.trainingType === 'Torso Pesado').forEach(t => {
        if (!exerciseStats[t.exercise]) {
            exerciseStats[t.exercise] = {
                exercise: t.exercise,
                maxOneRM: t.oneRM || 0,
                count: 0,
                data: [],
                muscleGroup: t.muscleGroup
            };
        }
        exerciseStats[t.exercise].count++;
        exerciseStats[t.exercise].maxOneRM = Math.max(exerciseStats[t.exercise].maxOneRM, t.oneRM || 0);
        exerciseStats[t.exercise].data.push({
            oneRM: t.oneRM || 0,
            date: t.date,
            volume: t.volume || 0
        });
    });
    
    // Ordenar por maxOneRM y retornar top N
    return Object.values(exerciseStats)
        .sort((a, b) => b.maxOneRM - a.maxOneRM)
        .slice(0, limit);
}

function renderProgressChart(topExercises) {
    renderOneRMChart();
    renderVolumeChart();
}

function renderOneRMChart() {
    const ctx = document.getElementById('oneRmChart')?.getContext('2d');
    if (!ctx) {
        console.log('ℹ️ Canvas oneRmChart no encontrado');
        return;
    }
    
    // Destruir gráfica anterior si existe
    if (window.oneRmChartInstance) {
        window.oneRmChartInstance.destroy();
    }
    
    // Filtrar: Solo Torso Pesado
    const filteredTrainings = trainings.filter(t => 
        t.trainingType === 'Torso Pesado'
    );
    
    if (filteredTrainings.length === 0) {
        console.warn('⚠️ Sin datos de Torso Pesado para gráfica 1RM');
        ctx.canvas.style.opacity = '0.5';
        ctx.canvas.parentElement.innerHTML = '<p style="text-align:center;color:#999;">Sin datos de Torso Pesado</p>';
        return;
    }
    
    // Agrupar por ejercicio y obtener max peso
    const exerciseStats = {};
    filteredTrainings.forEach(t => {
        if (!exerciseStats[t.exercise]) {
            exerciseStats[t.exercise] = {
                exercise: t.exercise,
                data: [],
                maxWeight: 0
            };
        }
        exerciseStats[t.exercise].data.push({
            weight: t.weight || 0,
            date: t.date
        });
        exerciseStats[t.exercise].maxWeight = Math.max(exerciseStats[t.exercise].maxWeight, t.weight || 0);
    });
    
    // Top 3 ejercicios por peso máximo, excluyendo "Press Inclinado"
    let topExercises = Object.values(exerciseStats)
        .filter(ex => ex.exercise !== 'Press Inclinado')
        .sort((a, b) => b.maxWeight - a.maxWeight)
        .slice(0, 3);
    
    // Si no hay suficientes (menos de 3), agregar Press Inclinado si existe
    if (topExercises.length < 3 && exerciseStats['Press Inclinado']) {
        topExercises.push(exerciseStats['Press Inclinado']);
    }
    
    // Preparar datasets
    const datasets = [];
    const colors = ['#FF6384', '#36A2EB', '#FFCE56'];
    
    // Obtener todas las fechas únicas en orden (solo de entrenamientos filtrados)
    const allDates = [...new Set(filteredTrainings.map(t => t.date))].sort();
    
    topExercises.forEach((exercise, idx) => {
        const exerciseData = exercise.data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Crear array con datos en orden de fechas
        const dataByDate = {};
        exerciseData.forEach(d => {
            dataByDate[d.date] = d.weight;
        });
        
        const dataArray = allDates.map(date => dataByDate[date] || null);
        
        datasets.push({
            label: `${exercise.exercise} (${exercise.maxWeight.toFixed(1)} kg)`,
            data: dataArray,
            borderColor: colors[idx],
            backgroundColor: colors[idx] + '20',
            tension: 0.3,
            fill: true,
            spanGaps: true,
            pointRadius: 3,
            pointBackgroundColor: colors[idx],
            pointBorderColor: '#fff',
            pointBorderWidth: 1
        });
    });
    
    // Crear gráfica
    window.oneRmChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allDates.map(d => {
                const [y, m, day] = d.split('-');
                return `${day}/${m}`;
            }),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 11
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Peso levantado (kg)'
                    }
                }
            }
        }
    });
}

function renderVolumeChart() {
    const ctx = document.getElementById('volumeChart')?.getContext('2d');
    if (!ctx) {
        console.log('ℹ️ Canvas volumeChart no encontrado');
        return;
    }
    
    // Destruir gráfica anterior si existe
    if (window.volumeChartInstance) {
        window.volumeChartInstance.destroy();
    }
    
    // Usar solo entrenamientos Torso Hipertrofia
    const hipertrofiaTrainings = trainings.filter(t => t.trainingType === 'Torso Hipertrofia');
    if (hipertrofiaTrainings.length === 0) {
        console.warn('⚠️ Sin datos de Torso Hipertrofia para gráfica de Volumen');
        ctx.canvas.style.opacity = '0.5';
        ctx.canvas.parentElement.innerHTML = '<p style="text-align:center;color:#999;">Sin datos de Hipertrofia</p>';
        return;
    }
    
    // Agrupar por ejercicio
    const exerciseStats = {};
    hipertrofiaTrainings.forEach(t => {
        if (!exerciseStats[t.exercise]) {
            exerciseStats[t.exercise] = {
                exercise: t.exercise,
                data: [],
                maxVolume: 0
            };
        }
        exerciseStats[t.exercise].data.push({
            volume: t.volume || 0,
            date: t.date
        });
        exerciseStats[t.exercise].maxVolume = Math.max(exerciseStats[t.exercise].maxVolume, t.volume || 0);
    });
    
    // Top 3 ejercicios por volumen máximo, excluyendo "Press Inclinado"
    let topExercises = Object.values(exerciseStats)
        .filter(ex => ex.exercise !== 'Press Inclinado')
        .sort((a, b) => b.maxVolume - a.maxVolume)
        .slice(0, 3);
    
    // Si no hay suficientes, agregar Press Inclinado si existe
    if (topExercises.length < 3 && exerciseStats['Press Inclinado']) {
        topExercises.push(exerciseStats['Press Inclinado']);
    }
    
    // Preparar datasets
    const datasets = [];
    const colors = ['#4CAF50', '#2196F3', '#FF9800'];
    
    // Obtener todas las fechas únicas en orden (solo de Hipertrofia)
    const allDates = [...new Set(hipertrofiaTrainings.map(t => t.date))].sort();
    
    topExercises.forEach((exercise, idx) => {
        const exerciseData = exercise.data.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Crear array con datos en orden de fechas
        const dataByDate = {};
        exerciseData.forEach(d => {
            dataByDate[d.date] = d.volume;
        });
        
        const dataArray = allDates.map(date => dataByDate[date] || null);
        
        datasets.push({
            label: `${exercise.exercise} (${exercise.maxVolume.toFixed(0)} total)`,
            data: dataArray,
            borderColor: colors[idx],
            backgroundColor: colors[idx] + '20',
            tension: 0.3,
            fill: true,
            spanGaps: true,
            pointRadius: 3,
            pointBackgroundColor: colors[idx],
            pointBorderColor: '#fff',
            pointBorderWidth: 1
        });
    });
    
    // Crear gráfica
    window.volumeChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: allDates.map(d => {
                const [y, m, day] = d.split('-');
                return `${day}/${m}`;
            }),
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 11
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Volumen (kg×reps)'
                    }
                }
            }
        }
    });
}

function renderTopExercises(topExercises) {
    const container = document.getElementById('topExercises');
    if (!container) return;
    
    container.innerHTML = topExercises.map((ex, idx) => `
        <div class="col-md-4 mb-3">
            <div class="card border-0 shadow-sm bg-light">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <div>
                            <h6 class="mb-1">#${idx + 1} ${ex.exercise}</h6>
                            <small class="text-muted">${ex.muscleGroup}</small>
                        </div>
                        <span class="badge bg-success">${ex.count} sesiones</span>
                    </div>
                    <div class="mt-3">
                        <div class="d-flex justify-content-between mb-2">
                            <span class="text-muted small">Best 1RM</span>
                            <strong class="text-success">${ex.maxOneRM.toFixed(1)} kg</strong>
                        </div>
                        <div class="d-flex justify-content-between">
                            <span class="text-muted small">Último</span>
                            <strong>${ex.data[ex.data.length - 1]?.oneRM.toFixed(1) || '-'} kg</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

// ==================== PLAN SEMANAL ====================

function renderWeeklyPlan() {
    const container = document.getElementById('weeklyPlanContainer');
    if (!container) return;
    
    const plan = {
        'Lunes': {
            icon: '🔴',
            type: 'Torso Pesado',
            focus: 'Fuerza',
            exercises: [
                { name: 'Press', sets: 5, reps: 5, weight: '50kg', note: 'Meta: +1-2 reps' },
                { name: 'Remo', sets: 4, reps: 6, weight: '59kg', note: '' },
                { name: 'Jalón', sets: 4, reps: 6, weight: '62kg', note: '' },
                { name: 'Tríceps', sets: 3, reps: 8, weight: '24kg', note: '' },
                { name: 'Face Pull', sets: 3, reps: 12, weight: '14kg', note: 'Finalizador' }
            ],
            time: '~55 min',
            running: '❌ NO correr'
        },
        'Martes': {
            icon: '🏃',
            type: 'Running',
            focus: 'Recovery',
            exercises: [],
            time: '30-35 min',
            running: '✅ Suave (conversacional)',
            note: 'Día después de Pesado = activo recovery'
        },
        'Miércoles': {
            icon: '🦵',
            type: 'Pierna',
            focus: 'Fuerza + Volumen',
            exercises: [
                { name: 'Principal (ej: Sentadilla)', sets: 4, reps: 5, weight: '- kg', note: 'Fuerza' },
                { name: 'Accesorio (ej: Hip Thrust)', sets: 3, reps: 8, weight: '- kg', note: '' },
                { name: 'Finalizador', sets: 3, reps: 12, weight: '- kg', note: '' }
            ],
            time: '~50 min',
            running: '❌ NO correr'
        },
        'Jueves': {
            icon: '🏃',
            type: 'Running',
            focus: 'Fuerte',
            exercises: [],
            time: '40-45 min',
            running: '✅ Serie/Ritmo (recuperado)',
            note: '2 días después de Pesado = ya recuperado'
        },
        'Viernes': {
            icon: '🟢',
            type: 'Torso Hipertrofia',
            focus: 'Volumen',
            exercises: [
                { name: 'Press', sets: 3, reps: 10, weight: '40kg', note: '30+ reps totales' },
                { name: 'Remo', sets: 3, reps: 10, weight: '48kg', note: '' },
                { name: 'Jalón', sets: 3, reps: 10, weight: '51kg', note: '' },
                { name: 'Bíceps', sets: 3, reps: 10, weight: '17kg', note: 'Recupera reps' },
                { name: 'Tríceps', sets: 3, reps: 10, weight: '20kg', note: '-3kg vs Pesado' },
                { name: 'Elevaciones', sets: 3, reps: 15, weight: '7kg', note: 'Prioriza reps' }
            ],
            time: '~55 min',
            running: '❌ NO correr'
        },
        'Sábado': {
            icon: '🏃',
            type: 'Running',
            focus: 'Moderado',
            exercises: [],
            time: '35-40 min',
            running: '✅ Conversacional-moderado',
            note: 'Después de Hiper, más fresco'
        },
        'Domingo': {
            icon: '🛌',
            type: 'Descanso Total',
            focus: 'Recuperación',
            exercises: [],
            time: '- h',
            running: '❌ Nada',
            note: 'Día de recuperación completa'
        }
    };
    
    let html = '<div class="row g-3">';
    
    Object.entries(plan).forEach(([day, data]) => {
        html += `
            <div class="col-lg-6 col-xl-4">
                <div class="card h-100 border-0 shadow-sm">
                    <div class="card-header bg-light border-0">
                        <h6 class="mb-0">${data.icon} <strong>${day}</strong></h6>
                        <small class="text-muted">${data.type}</small>
                    </div>
                    <div class="card-body">
                        <div class="mb-3">
                            <span class="badge bg-info mb-2">${data.focus}</span>
                            <div class="text-muted small">⏱️ ${data.time}</div>
                        </div>
        `;
        
        if (data.exercises.length > 0) {
            html += `<div class="mb-3"><strong style="font-size: 0.9rem;">Ejercicios:</strong>`;
            data.exercises.forEach(ex => {
                html += `
                    <div class="small mt-2" style="background: #f8f9fa; padding: 8px; border-radius: 4px;">
                        <div><strong>${ex.name}</strong></div>
                        <div class="text-muted">${ex.sets}×${ex.reps} @ ${ex.weight}</div>
                        ${ex.note ? `<div class="text-success" style="font-size: 0.85rem;">💡 ${ex.note}</div>` : ''}
                    </div>
                `;
            });
            html += `</div>`;
        }
        
        html += `
                        <div class="alert alert-light border-0 p-2 mb-0">
                            <div class="small">
                                <strong>${data.running.startsWith('✅') ? '✅ Running' : '❌ Sin running'}</strong><br>
                                <em>${data.running.substring(3)}</em>
                            </div>
                        </div>
                        ${data.note ? `<div class="text-muted small mt-2"><em>💬 ${data.note}</em></div>` : ''}
                    </div>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    // Agregar notas importantes
    html += `
        <div class="alert alert-warning mt-3 mb-0">
            <strong>🎯 Prioridades esta semana:</strong>
            <ul class="mb-0 mt-2">
                <li><strong>Lunes Pesado:</strong> Peso igual, <strong>+1-2 reps</strong> vs última semana</li>
                <li><strong>Viernes Hiper:</strong> 30+ reps totales en Press (más volumen, menos peso)</li>
                <li><strong>Running:</strong> Suave después de Pesado, fuerte después de descanso</li>
                <li><strong>No falles muscular:</strong> Mantén 2-3 reps en reserva en Pesado</li>
            </ul>
        </div>
    `;
    
    container.innerHTML = html;
}


function updatePeriodizationAnalysis() {
    // Verificar si los elementos necesarios existen
    if (!document.getElementById('pesadoAvgWeight')) {
        return; // No renderizar si no existe el elemento
    }
    
    const pesado = trainings.filter(t => t.trainingType === 'Torso Pesado');
    const hipertrofia = trainings.filter(t => t.trainingType === 'Torso Hipertrofia');
    
    // Calcular promedios
    const pesadoStats = calculateTypeStats(pesado);
    const hiperStats = calculateTypeStats(hipertrofia);
    
    // Actualizar tarjetas
    const pesadoAvgWeightEl = document.getElementById('pesadoAvgWeight');
    const pesadoAvgRepsEl = document.getElementById('pesadoAvgReps');
    const pesadoAvgVolumeEl = document.getElementById('pesadoAvgVolume');
    const hiperAvgWeightEl = document.getElementById('hiperAvgWeight');
    const hiperAvgRepsEl = document.getElementById('hiperAvgReps');
    const hiperAvgVolumeEl = document.getElementById('hiperAvgVolume');
    const periodizationVerdictEl = document.getElementById('periodizationVerdict');
    
    if (pesadoAvgWeightEl) pesadoAvgWeightEl.textContent = pesadoStats.avgWeight.toFixed(1);
    if (pesadoAvgRepsEl) pesadoAvgRepsEl.textContent = pesadoStats.avgReps.toFixed(1);
    if (pesadoAvgVolumeEl) pesadoAvgVolumeEl.textContent = pesadoStats.avgVolume.toFixed(0);
    
    if (hiperAvgWeightEl) hiperAvgWeightEl.textContent = hiperStats.avgWeight.toFixed(1);
    if (hiperAvgRepsEl) hiperAvgRepsEl.textContent = hiperStats.avgReps.toFixed(1);
    if (hiperAvgVolumeEl) hiperAvgVolumeEl.textContent = hiperStats.avgVolume.toFixed(0);
    
    // Generar veredicto
    const verdict = generatePeriodizationVerdict(pesadoStats, hiperStats);
    if (periodizationVerdictEl) periodizationVerdictEl.innerHTML = verdict;
    
    // Análisis por ejercicio
    renderExerciseAnalysis(pesado, hipertrofia);
    
    // Gráfica de progresión
    renderProgressionChart(pesado, hipertrofia);
    
    // Recomendaciones
    renderRecommendations(pesado, hipertrofia, pesadoStats, hiperStats);
}

function calculateTypeStats(trainings) {
    if (trainings.length === 0) {
        return { avgWeight: 0, avgReps: 0, avgVolume: 0 };
    }
    
    const avgWeight = trainings.reduce((sum, t) => sum + (t.weight || 0), 0) / trainings.length;
    const avgReps = trainings.reduce((sum, t) => sum + (t.totalReps || 0), 0) / trainings.length;
    const avgVolume = trainings.reduce((sum, t) => sum + (t.volume || 0), 0) / trainings.length;
    
    return { avgWeight, avgReps, avgVolume };
}

function generatePeriodizationVerdict(pesadoStats, hiperStats) {
    let verdict = '<div style="line-height: 2;">';
    
    // Obtener datos mensuales
    const pesado = trainings.filter(t => t.trainingType === 'Torso Pesado');
    const hipertrofia = trainings.filter(t => t.trainingType === 'Torso Hipertrofia');
    
    const monthlyData = {};
    pesado.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { pesado: [], hipertrofia: [] };
        monthlyData[month].pesado.push(t);
    });
    
    hipertrofia.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { pesado: [], hipertrofia: [] };
        monthlyData[month].hipertrofia.push(t);
    });
    
    const months = Object.keys(monthlyData).sort();
    
    // Calcular volumen mensual
    let firstMonthVol = 0, lastMonthVol = 0;
    if (months.length > 0) {
        const firstMonth = monthlyData[months[0]];
        const lastMonth = monthlyData[months[months.length - 1]];
        
        const allFirst = [...(firstMonth.pesado || []), ...(firstMonth.hipertrofia || [])];
        const allLast = [...(lastMonth.pesado || []), ...(lastMonth.hipertrofia || [])];
        
        firstMonthVol = allFirst.reduce((sum, t) => sum + t.volume, 0) / allFirst.length;
        lastMonthVol = allLast.reduce((sum, t) => sum + t.volume, 0) / allLast.length;
    }
    
    // ALERTA CRÍTICA: Progresión de volumen
    verdict += '<div class="alert alert-danger mb-3" style="border-left: 4px solid #dc3545;">';
    verdict += '<strong>⚠️ PROBLEMA CRÍTICO: Volumen decreciente</strong><br>';
    if (firstMonthVol > lastMonthVol) {
        const decline = ((firstMonthVol - lastMonthVol) / firstMonthVol * 100).toFixed(0);
        verdict += `Tu volumen total bajó ${decline}% mes a mes (${firstMonthVol.toFixed(0)} → ${lastMonthVol.toFixed(0)} kg×reps)<br>`;
        verdict += `<small>Esto rompe la progresión. Necesitas mantener o subir volumen.</small>`;
    } else {
        verdict += `✅ Volumen estable o en aumento`;
    }
    verdict += '</div>';
    
    // Verificar variación de peso y reps
    verdict += '<div style="margin-bottom: 15px;">';
    const weightDiff = ((pesadoStats.avgWeight - hiperStats.avgWeight) / hiperStats.avgWeight) * 100;
    const repsDiff = ((hiperStats.avgReps - pesadoStats.avgReps) / pesadoStats.avgReps) * 100;
    
    if (Math.abs(weightDiff) > 10) {
        verdict += `<span class="text-success">✅ Ondulación de peso: Pesado ${pesadoStats.avgWeight.toFixed(1)}kg vs Hiper ${hiperStats.avgWeight.toFixed(1)}kg (${Math.abs(weightDiff).toFixed(0)}%)</span><br>`;
    } else {
        verdict += `<span class="text-warning">⚠️ Ondulación débil en peso (necesitas 10%+ diferencia)</span><br>`;
    }
    
    if (Math.abs(repsDiff) > 10) {
        verdict += `<span class="text-success">✅ Ondulación de reps: Pesado ${pesadoStats.avgReps.toFixed(0)} vs Hiper ${hiperStats.avgReps.toFixed(0)}</span><br>`;
    } else {
        verdict += `<span class="text-warning">⚠️ Ondulación débil en reps</span>`;
    }
    verdict += '</div>';
    
    verdict += '</div>';
    return verdict;
}

function renderExerciseAnalysis(pesado, hipertrofia) {
    const container = document.getElementById('exerciseAnalysisTable');
    if (!container) return;
    
    // Agrupar ejercicios
    const exerciseMap = {};
    
    pesado.forEach(t => {
        if (!exerciseMap[t.exercise]) exerciseMap[t.exercise] = { pesado: [], hipertrofia: [] };
        exerciseMap[t.exercise].pesado.push(t);
    });
    
    hipertrofia.forEach(t => {
        if (!exerciseMap[t.exercise]) exerciseMap[t.exercise] = { pesado: [], hipertrofia: [] };
        exerciseMap[t.exercise].hipertrofia.push(t);
    });
    
    // Renderizar tabla
    container.innerHTML = Object.entries(exerciseMap)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([exercise, data]) => {
            const pesadoData = data.pesado;
            const hiperData = data.hipertrofia;
            
            const pesadoW = pesadoData.length > 0 
                ? (pesadoData.reduce((sum, t) => sum + t.weight, 0) / pesadoData.length).toFixed(1)
                : '-';
            const pesadoR = pesadoData.length > 0
                ? (pesadoData.reduce((sum, t) => sum + t.totalReps, 0) / pesadoData.length).toFixed(0)
                : '-';
            
            const hiperW = hiperData.length > 0
                ? (hiperData.reduce((sum, t) => sum + t.weight, 0) / hiperData.length).toFixed(1)
                : '-';
            const hiperR = hiperData.length > 0
                ? (hiperData.reduce((sum, t) => sum + t.totalReps, 0) / hiperData.length).toFixed(0)
                : '-';
            
            // Verificar ondulación (menos estricto con accesorios)
            let status = '⚠️ DÉBIL';
            let statusClass = 'table-warning';
            
            if (pesadoW !== '-' && hiperW !== '-') {
                const wDiff = ((pesadoW - hiperW) / hiperW) * 100;
                const rDiff = ((hiperR - pesadoR) / pesadoR) * 100;
                
                // Ejercicios principales: más estrictos
                const mainExercises = ['Press', 'Remo', 'Jalón', 'Tríceps'];
                const isMainExercise = mainExercises.some(ex => exercise.includes(ex));
                
                if (isMainExercise) {
                    // Ejercicios principales necesitan ondulación clara
                    if (wDiff > 10 && rDiff > 10) {
                        status = '✅ BIEN';
                        statusClass = 'table-success';
                    }
                } else {
                    // Accesorios: menos estrictos, es OK si varían un poco
                    if (wDiff > 0 || rDiff > 15) {
                        status = '✅ BIEN';
                        statusClass = 'table-success';
                    }
                }
            }
            
            return `
                <tr class="${statusClass}">
                    <td><small>${exercise}</small></td>
                    <td class="text-center"><small>${pesadoW}</small></td>
                    <td class="text-center"><small>${pesadoR}</small></td>
                    <td class="text-center"><small>${hiperW}</small></td>
                    <td class="text-center"><small>${hiperR}</small></td>
                    <td class="text-center"><small>${status}</small></td>
                </tr>
            `;
        })
        .join('');
}

function renderProgressionChart(pesado, hipertrofia) {
    const ctx = document.getElementById('progressionChart')?.getContext('2d');
    if (!ctx) return;
    
    if (window.progressionChartInstance) {
        window.progressionChartInstance.destroy();
    }
    
    // Agrupar por mes
    const monthlyData = {};
    
    pesado.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { pesado: [], hipertrofia: [] };
        monthlyData[month].pesado.push(t);
    });
    
    hipertrofia.forEach(t => {
        const month = t.date.substring(0, 7);
        if (!monthlyData[month]) monthlyData[month] = { pesado: [], hipertrofia: [] };
        monthlyData[month].hipertrofia.push(t);
    });
    
    // Calcular promedio de volumen por mes
    const months = Object.keys(monthlyData).sort();
    const pesadoVolumes = months.map(m => {
        const data = monthlyData[m].pesado;
        return data.length > 0 ? data.reduce((sum, t) => sum + t.volume, 0) / data.length : null;
    });
    
    const hiperVolumes = months.map(m => {
        const data = monthlyData[m].hipertrofia;
        return data.length > 0 ? data.reduce((sum, t) => sum + t.volume, 0) / data.length : null;
    });
    
    window.progressionChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: months.map(m => m.substring(5)),
            datasets: [
                {
                    label: 'Pesado (Volumen promedio)',
                    data: pesadoVolumes,
                    borderColor: '#FF6384',
                    backgroundColor: '#FF6384' + '20',
                    tension: 0.3,
                    fill: true,
                    spanGaps: true
                },
                {
                    label: 'Hipertrofia (Volumen promedio)',
                    data: hiperVolumes,
                    borderColor: '#4CAF50',
                    backgroundColor: '#4CAF50' + '20',
                    tension: 0.3,
                    fill: true,
                    spanGaps: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Volumen promedio (kg×reps)'
                    }
                }
            }
        }
    });
}

function renderRecommendations(pesado, hipertrofia, pesadoStats, hiperStats) {
    const container = document.getElementById('periodizationRecommendations');
    if (!container) return;
    
    let html = '<h6 class="fw-bold mb-3">💡 Diagnóstico y Recomendaciones</h6>';
    html += '<div class="card shadow-sm border-0">';
    html += '<div class="card-body">';
    
    // Analizar progresión de reps vs peso
    const pesadoSorted = pesado.sort((a, b) => new Date(a.date) - new Date(b.date));
    const hiperSorted = hipertrofia.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Primeras 3 semanas vs últimas 3 semanas
    const pesadoFirst = pesadoSorted.slice(0, Math.ceil(pesadoSorted.length / 3));
    const pesadoLast = pesadoSorted.slice(-Math.ceil(pesadoSorted.length / 3));
    
    const firstAvgWeight = pesadoFirst.reduce((sum, t) => sum + t.weight, 0) / pesadoFirst.length;
    const lastAvgWeight = pesadoLast.reduce((sum, t) => sum + t.weight, 0) / pesadoLast.length;
    
    const firstAvgReps = pesadoFirst.reduce((sum, t) => sum + t.totalReps, 0) / pesadoFirst.length;
    const lastAvgReps = pesadoLast.reduce((sum, t) => sum + t.totalReps, 0) / pesadoLast.length;
    
    const weightIncrease = ((lastAvgWeight - firstAvgWeight) / firstAvgWeight) * 100;
    const repsDecrease = ((lastAvgReps - firstAvgReps) / firstAvgReps) * 100;
    
    // 1. Estado de la ondulación (BIEN)
    html += `<div class="alert alert-success mb-3">
        <strong>✅ Tu ondulación está BIEN hecha</strong><br>
        <small>
            Jalón: 62 vs 51 kg (21% diferencia) ✔️<br>
            Press: 43 vs 29 kg (48% diferencia) ✔️<br>
            Remo: 59 vs 48 kg (23% diferencia) ✔️<br>
            <em>Esto es una ondulación clara y consistente.</em>
        </small>
    </div>`;
    
    // 2. Lo que está pasando REALMENTE
    html += `<div class="alert alert-warning mb-3">
        <strong>🔍 Lo que ves en tus gráficas (muy importante)</strong><br>
        <small>
            <strong>Peso:</strong> +${weightIncrease.toFixed(0)}% (${firstAvgWeight.toFixed(1)} → ${lastAvgWeight.toFixed(1)} kg)<br>
            <strong>Reps:</strong> ${repsDecrease.toFixed(0)}% (${firstAvgReps.toFixed(0)} → ${lastAvgReps.toFixed(0)})<br><br>
            <strong>Traducción:</strong> Estás levantando <strong>MÁS peso con MENOS reps</strong><br>
            = <strong>Te estás desplazando hacia trabajo de fuerza pura</strong>
        </small>
    </div>`;
    
    // 3. Diagnóstico: no es un problema grave, pero hay un desequilibrio
    html += `<div class="alert alert-info mb-3">
        <strong>⚠️ Diagnóstico fino (importante)</strong><br>
        <small>
            ✔️ Ondulación correcta<br>
            ✔️ Volumen en kg estable<br>
            ✔️ Intensidad subiendo (bien)<br><br>
            <strong>PERO:</strong> Estás priorizando demasiado intensidad y dejando caer volumen de reps<br>
            + Running 2-3x/semana = fatiga acumulada<br>
            = Riesgo de sobrecargar el sistema sin base de volumen
        </small>
    </div>`;
    
    // 4. Plan de ajuste
    html += `<div class="bg-light p-3 rounded">
        <strong>🎯 Plan de equilibrio (simple)</strong><br>
        <small>
            <strong>Regla 1: No dejes que reps caigan tanto</strong><br>
            → Estás en ${lastAvgReps.toFixed(0)} reps<br>
            → Intenta mantener al menos ${(lastAvgReps + 30).toFixed(0)} reps por sesión<br>
            → Eso significa +1 a +2 reps por serie<br><br>
            
            <strong>Regla 2: Día Pesado ≠ Límite total</strong><br>
            → Si estás fallando mucho o muy cerca del fallo<br>
            → Baja peso 2-3 kg y suma reps<br>
            → La fuerza viene del volumen sostenido, no de ir al fallo cada vez<br><br>
            
            <strong>Regla 3: Equilibrio fuerza-volumen</strong><br>
            → Fuerza: ✔️ ya estás mejorando (peso +${weightIncrease.toFixed(0)}%)<br>
            → Volumen: ⚠️ recupera un poco de reps<br>
            → ESE equilibrio te hace progresar de verdad<br><br>
            
            <strong>Regla 4: Considera el running</strong><br>
            → Running fuerte el día antes de Pesado = fatiga sistémica<br>
            → Intenta: día pesado → día running fuerte → descanso<br>
            → O running ligero los días antes de Pesado
        </small>
    </div>`;
    
    html += '</div></div>';
    
    container.innerHTML = html;
}

// ==================== EVOLUCIÓN POR EJERCICIO ====================

function populateExerciseSelector() {
    const selector = document.getElementById('exerciseSelector');
    if (!selector) return;
    
    // Obtener ejercicios únicos
    const uniqueExercises = [...new Set(trainings.map(t => t.exercise))].sort();
    
    // Limpiar selector (mantener opción vacía)
    selector.innerHTML = '<option value="">-- Selecciona ejercicio --</option>';
    
    // Agregar opciones
    uniqueExercises.forEach(exercise => {
        const option = document.createElement('option');
        option.value = exercise;
        option.textContent = exercise;
        selector.appendChild(option);
    });
}

function renderExerciseEvolutionCharts(exerciseName) {
    if (!exerciseName) return;
    
    // Filtrar entrenamientos del ejercicio seleccionado
    const exerciseData = trainings
        .filter(t => t.exercise === exerciseName)
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    if (exerciseData.length === 0) {
        const statsContainer = document.getElementById('exerciseStats');
        if (statsContainer) {
            statsContainer.innerHTML = '<p class="text-muted">No hay datos para este ejercicio</p>';
        }
        return;
    }
    
    // Renderizar las 3 gráficas
    renderExerciseWeightChart(exerciseName, exerciseData);
    renderExercise1RMChart(exerciseName, exerciseData);
    renderExerciseRepsChart(exerciseName, exerciseData);
    renderExerciseTotalVolumeChart(exerciseName, exerciseData);
    
    // Actualizar estadísticas
    updateExerciseStats(exerciseName, exerciseData);
}

function renderExerciseWeightChart(exerciseName, data) {
    const ctx = document.getElementById('exerciseWeightChart')?.getContext('2d');
    if (!ctx) return;
    
    // Destruir gráfica anterior si existe
    if (window.exerciseWeightChartInstance) {
        window.exerciseWeightChartInstance.destroy();
    }
    
    const dates = data.map(d => d.date);
    const weights = data.map(d => d.weight);
    
    // Determinar color según tipo de entrenamiento
    const borderColor = data[0]?.trainingType === 'Torso Pesado' ? '#FF6384' : '#4CAF50';
    const backgroundColor = borderColor + '20';
    
    window.exerciseWeightChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => {
                const [y, m, day] = d.split('-');
                return `${day}/${m}`;
            }),
            datasets: [{
                label: `Peso - ${exerciseName}`,
                data: weights,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 11 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'Peso (kg)'
                    }
                }
            }
        }
    });
}

function renderExercise1RMChart(exerciseName, data) {
    const ctx = document.getElementById('exercise1RMChart')?.getContext('2d');
    if (!ctx) return;
    
    // Destruir gráfica anterior si existe
    if (window.exercise1RMChartInstance) {
        window.exercise1RMChartInstance.destroy();
    }
    
    // Filtrar solo datos de Torso Pesado (donde oneRM > 0)
    const filteredData = data.filter(d => d.trainingType === 'Torso Pesado' && d.oneRM > 0);
    
    if (filteredData.length === 0) {
        ctx.canvas.style.opacity = '0.5';
        return;
    }
    
    const dates = filteredData.map(d => d.date);
    const oneRMs = filteredData.map(d => d.oneRM || 0);
    
    const borderColor = '#FF6384';
    const backgroundColor = borderColor + '20';
    
    window.exercise1RMChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => {
                const [y, m, day] = d.split('-');
                return `${day}/${m}`;
            }),
            datasets: [{
                label: `1RM Estimado - ${exerciseName}`,
                data: oneRMs,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 11 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: '1RM (kg)'
                    }
                }
            }
        }
    });
}

function renderExerciseRepsChart(exerciseName, data) {
    const ctx = document.getElementById('exerciseRepsChart')?.getContext('2d');
    if (!ctx) return;
    
    // Destruir gráfica anterior si existe
    if (window.exerciseRepsChartInstance) {
        window.exerciseRepsChartInstance.destroy();
    }
    
    const dates = data.map(d => d.date);
    const reps = data.map(d => d.totalReps);
    
    const borderColor = data[0]?.trainingType === 'Torso Pesado' ? '#FF6384' : '#4CAF50';
    const backgroundColor = borderColor + '20';
    
    window.exerciseRepsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dates.map(d => {
                const [y, m, day] = d.split('-');
                return `${day}/${m}`;
            }),
            datasets: [{
                label: `Reps Totales - ${exerciseName}`,
                data: reps,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                tension: 0.3,
                fill: true,
                pointRadius: 4,
                pointBackgroundColor: borderColor,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 11 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        stepSize: 5
                    },
                    title: {
                        display: true,
                        text: 'Reps'
                    }
                }
            }
        }
    });
}

function renderExerciseTotalVolumeChart(exerciseName, data) {
    const ctx = document.getElementById('exerciseTotalVolumeChart')?.getContext('2d');
    if (!ctx) return;
    
    // Destruir gráfica anterior si existe
    if (window.exerciseTotalVolumeChartInstance) {
        window.exerciseTotalVolumeChartInstance.destroy();
    }
    
    const dates = data.map(d => d.date);
    const volumes = data.map(d => d.volume || 0);
    
    const borderColor = data[0]?.trainingType === 'Torso Pesado' ? '#FF6384' : '#4CAF50';
    const backgroundColor = borderColor + '20';
    
    window.exerciseTotalVolumeChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: dates.map(d => {
                const [y, m, day] = d.split('-');
                return `${day}/${m}`;
            }),
            datasets: [{
                label: `Volumen Total - ${exerciseName}`,
                data: volumes,
                borderColor: borderColor,
                backgroundColor: backgroundColor,
                borderWidth: 2,
                borderRadius: 4,
                hoverBackgroundColor: borderColor
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        font: { size: 11 }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Volumen (kg×reps)'
                    }
                }
            }
        }
    });
}

function updateExerciseStats(exerciseName, data) {
    const statsContainer = document.getElementById('exerciseStats');
    if (!statsContainer) return;
    
    // Calcular estadísticas
    const totalSessions = data.length;
    const maxWeight = Math.max(...data.map(d => d.weight));
    const minWeight = Math.min(...data.map(d => d.weight));
    const avgWeight = (data.reduce((sum, d) => sum + d.weight, 0) / data.length).toFixed(1);
    
    const maxOneRM = Math.max(...data.map(d => d.oneRM || 0));
    const maxReps = Math.max(...data.map(d => d.totalReps));
    const avgReps = (data.reduce((sum, d) => sum + d.totalReps, 0) / data.length).toFixed(1);
    
    const totalVolume = data.reduce((sum, d) => sum + (d.volume || 0), 0);
    const avgVolume = (totalVolume / data.length).toFixed(0);
    
    // Calcular progresión
    const firstWeight = data[0].weight;
    const lastWeight = data[data.length - 1].weight;
    const weightProgress = ((lastWeight - firstWeight) / firstWeight * 100).toFixed(1);
    
    const firstOneRM = data[0].oneRM || 0;
    const lastOneRM = data[data.length - 1].oneRM || 0;
    const oneRMProgress = firstOneRM > 0 
        ? ((lastOneRM - firstOneRM) / firstOneRM * 100).toFixed(1)
        : '0.0';
    
    // Renderizar
    let html = `
        <div class="row g-2">
            <div class="col-6 col-md-4">
                <div class="stat-box">
                    <div class="stat-label">Sesiones</div>
                    <div class="stat-value">${totalSessions}</div>
                </div>
            </div>
            <div class="col-6 col-md-4">
                <div class="stat-box">
                    <div class="stat-label">Peso Actual</div>
                    <div class="stat-value">${lastWeight} kg</div>
                    <span class="stat-change ${weightProgress > 0 ? 'text-success' : 'text-danger'}">${weightProgress > 0 ? '+' : ''}${weightProgress}%</span>
                </div>
            </div>
            <div class="col-6 col-md-4">
                <div class="stat-box">
                    <div class="stat-label">Max 1RM</div>
                    <div class="stat-value">${maxOneRM.toFixed(1)} kg</div>
                </div>
            </div>
            <div class="col-6 col-md-4">
                <div class="stat-box">
                    <div class="stat-label">Reps Promedio</div>
                    <div class="stat-value">${avgReps}</div>
                </div>
            </div>
            <div class="col-6 col-md-4">
                <div class="stat-box">
                    <div class="stat-label">Volumen Total</div>
                    <div class="stat-value">${totalVolume.toFixed(0)}</div>
                    <small class="text-muted">kg×reps</small>
                </div>
            </div>
            <div class="col-6 col-md-4">
                <div class="stat-box">
                    <div class="stat-label">Rango de Peso</div>
                    <div class="stat-value text-muted" style="font-size: 0.9rem;">${minWeight}-${maxWeight} kg</div>
                </div>
            </div>
        </div>
    `;
    
    statsContainer.innerHTML = html;
}


