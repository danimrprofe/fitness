// Script para agregar el entrenamiento del 10 de Abril 2026 (Viernes - Torso Hipertrofia)
// Pega esto en la consola del navegador (F12 > Console)

const entrenamientos10Abril = [
  {
    date: "2026-04-10",
    dayOfWeek: "Viernes",
    trainingType: "Torso Hipertrofia",
    exercise: "Press Banca",
    muscleGroup: "Pecho",
    weight: 40,
    series: [10, 10, 9, 7]
  },
  {
    date: "2026-04-10",
    dayOfWeek: "Viernes",
    trainingType: "Torso Hipertrofia",
    exercise: "Pecho Inc",
    muscleGroup: "Pecho",
    weight: 36.5,
    series: [8, 8, 8, 9]
  },
  {
    date: "2026-04-10",
    dayOfWeek: "Viernes",
    trainingType: "Torso Hipertrofia",
    exercise: "Jalón",
    muscleGroup: "Espalda",
    weight: 52.5,
    series: [11, 10, 10, 9]
  },
  {
    date: "2026-04-10",
    dayOfWeek: "Viernes",
    trainingType: "Torso Hipertrofia",
    exercise: "Lateral Raise",
    muscleGroup: "Hombros",
    weight: 7,
    series: [11, 11, 11]
  },
  {
    date: "2026-04-10",
    dayOfWeek: "Viernes",
    trainingType: "Torso Hipertrofia",
    exercise: "Remo Sentado",
    muscleGroup: "Espalda",
    weight: 50,
    series: [9, 9, 9, 7]
  },
  {
    date: "2026-04-10",
    dayOfWeek: "Viernes",
    trainingType: "Torso Hipertrofia",
    exercise: "Triceps Rope",
    muscleGroup: "Tríceps",
    weight: 23,
    series: [10, 9, 8]
  },
  {
    date: "2026-04-10",
    dayOfWeek: "Viernes",
    trainingType: "Torso Hipertrofia",
    exercise: "Bicep Curl",
    muscleGroup: "Bíceps",
    weight: 10,
    series: [10, 8, 7]
  },
  {
    date: "2026-04-10",
    dayOfWeek: "Viernes",
    trainingType: "Torso Hipertrofia",
    exercise: "Face Pull",
    muscleGroup: "Espalda",
    weight: 14,
    series: [12, 12, 12]
  }
];

// Agregar cada entrenamiento
entrenamientos10Abril.forEach(e => {
  const totalReps = e.series.reduce((a, b) => a + b, 0);
  const volume = e.series.reduce((sum, reps) => sum + (reps * e.weight), 0);
  const minReps = Math.min(...e.series);
  const oneRM = minReps > 0 ? Math.round((e.weight * 36 / (37 - minReps)) * 100) / 100 : 0;

  const training = {
    id: Date.now() + Math.random(),
    date: e.date,
    dayOfWeek: e.dayOfWeek,
    trainingType: e.trainingType,
    exercise: e.exercise,
    muscleGroup: e.muscleGroup,
    weight: e.weight,
    series: e.series,
    totalReps: totalReps,
    volume: volume,
    oneRM: oneRM,
    timestamp: new Date().toLocaleString()
  };

  trainings.push(training);
  console.log(`✅ Agregado: ${e.exercise} - ${e.weight}kg x ${e.series.join('-')}`);
});

// Guardar y actualizar
saveTrainingsToStorage();
updateAllTables();
updateWeeklySummary();
updateProgressSection();

console.log(`\n✅ Éxito: ${entrenamientos10Abril.length} ejercicios agregados para el 10 de Abril`);
