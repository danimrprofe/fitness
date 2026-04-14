import json
from datetime import datetime
from collections import defaultdict

# Cargar datos
with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Separar por tipo
pesado = [t for t in data if t['trainingType'] == 'Torso Pesado']
hipertrofia = [t for t in data if t['trainingType'] == 'Torso Hipertrofia']

print("=" * 60)
print("ANÁLISIS DE PERIODIZACIÓN ONDULANTE")
print("=" * 60)

# 1. Comparativa general
def analyze_type(trainings, name):
    if not trainings:
        print(f"\n{name}: Sin datos")
        return
    
    avg_weight = sum(t['weight'] for t in trainings) / len(trainings)
    avg_reps = sum(t['totalReps'] for t in trainings) / len(trainings)
    avg_volume = sum(t['volume'] for t in trainings) / len(trainings)
    max_weight = max(t['weight'] for t in trainings)
    min_weight = min(t['weight'] for t in trainings)
    
    print(f"\n{name} ({len(trainings)} sesiones):")
    print(f"  Peso promedio: {avg_weight:.1f} kg")
    print(f"  Reps promedio: {avg_reps:.1f}")
    print(f"  Volumen promedio: {avg_volume:.0f} kg×reps")
    print(f"  Rango de peso: {min_weight} - {max_weight} kg")

analyze_type(pesado, "TORSO PESADO (Fuerza)")
analyze_type(hipertrofia, "TORSO HIPERTROFIA (Volumen)")

# 2. Análisis por ejercicio
print("\n" + "=" * 60)
print("ANÁLISIS POR EJERCICIO")
print("=" * 60)

all_exercises = defaultdict(lambda: {'pesado': [], 'hipertrofia': []})

for t in pesado:
    all_exercises[t['exercise']]['pesado'].append(t)

for t in hipertrofia:
    all_exercises[t['exercise']]['hipertrofia'].append(t)

for exercise, types in sorted(all_exercises.items()):
    print(f"\n{exercise}:")
    
    if types['pesado']:
        avg_w = sum(t['weight'] for t in types['pesado']) / len(types['pesado'])
        avg_r = sum(t['totalReps'] for t in types['pesado']) / len(types['pesado'])
        print(f"  Pesado: {avg_w:.1f} kg × {avg_r:.1f} reps")
    
    if types['hipertrofia']:
        avg_w = sum(t['weight'] for t in types['hipertrofia']) / len(types['hipertrofia'])
        avg_r = sum(t['totalReps'] for t in types['hipertrofia']) / len(types['hipertrofia'])
        print(f"  Hipertrofia: {avg_w:.1f} kg × {avg_r:.1f} reps")
    
    # Verificar si realmente ondula
    if types['pesado'] and types['hipertrofia']:
        w_pesado = sum(t['weight'] for t in types['pesado']) / len(types['pesado'])
        w_hiper = sum(t['weight'] for t in types['hipertrofia']) / len(types['hipertrofia'])
        r_pesado = sum(t['totalReps'] for t in types['pesado']) / len(types['pesado'])
        r_hiper = sum(t['totalReps'] for t in types['hipertrofia']) / len(types['hipertrofia'])
        
        if w_pesado > w_hiper and r_pesado < r_hiper:
            print(f"  ✅ Ondulación correcta: más peso, menos reps en Pesado")
        else:
            print(f"  ❌ Ondulación débil: revisa asignación de pesos/reps")

# 3. Progresión temporal
print("\n" + "=" * 60)
print("PROGRESIÓN EN EL TIEMPO")
print("=" * 60)

# Dividir por mes
pesado_sorted = sorted(pesado, key=lambda x: x['date'])
hiper_sorted = sorted(hipertrofia, key=lambda x: x['date'])

monthly_pesado = defaultdict(list)
monthly_hiper = defaultdict(list)

for t in pesado_sorted:
    month = t['date'][:7]  # YYYY-MM
    monthly_pesado[month].append(t)

for t in hiper_sorted:
    month = t['date'][:7]
    monthly_hiper[month].append(t)

print("\nPESADO por mes:")
for month in sorted(monthly_pesado.keys()):
    trainings = monthly_pesado[month]
    avg_vol = sum(t['volume'] for t in trainings) / len(trainings)
    avg_weight = sum(t['weight'] for t in trainings) / len(trainings)
    print(f"  {month}: Peso {avg_weight:.1f} kg, Vol {avg_vol:.0f}")

print("\nHIPERTROFIA por mes:")
for month in sorted(monthly_hiper.keys()):
    trainings = monthly_hiper[month]
    avg_vol = sum(t['volume'] for t in trainings) / len(trainings)
    avg_weight = sum(t['weight'] for t in trainings) / len(trainings)
    print(f"  {month}: Peso {avg_weight:.1f} kg, Vol {avg_vol:.0f}")

# 4. Veredicto
print("\n" + "=" * 60)
print("VEREDICTO")
print("=" * 60)

avg_w_pesado = sum(t['weight'] for t in pesado) / len(pesado) if pesado else 0
avg_w_hiper = sum(t['weight'] for t in hipertrofia) / len(hipertrofia) if hipertrofia else 0
avg_r_pesado = sum(t['totalReps'] for t in pesado) / len(pesado) if pesado else 0
avg_r_hiper = sum(t['totalReps'] for t in hipertrofia) / len(hipertrofia) if hipertrofia else 0

print(f"\n╔" + "=" * 58 + "╗")
if avg_w_pesado > avg_w_hiper * 1.1:  # Al menos 10% más
    print(f"║ ✅ SÍ estás haciendo ondulación: Pesado usa {avg_w_pesado:.1f}kg vs {avg_w_hiper:.1f}kg")
else:
    print(f"║ ⚠️  DÉBIL: El peso no varía lo suficiente entre tipos")

if avg_r_pesado < avg_r_hiper * 0.9:  # Al menos 10% menos
    print(f"║ ✅ Las reps sí varían: Pesado {avg_r_pesado:.0f} reps vs {avg_r_hiper:.0f} reps")
else:
    print(f"║ ⚠️  DÉBIL: Las reps son muy parecidas")

# Progresión
if monthly_pesado:
    months_p = sorted(monthly_pesado.keys())
    vol_first = sum(monthly_pesado[months_p[0]][t]['volume'] for t in range(len(monthly_pesado[months_p[0]]))) / len(monthly_pesado[months_p[0]])
    vol_last = sum(monthly_pesado[months_p[-1]][t]['volume'] for t in range(len(monthly_pesado[months_p[-1]]))) / len(monthly_pesado[months_p[-1]])
    
    if vol_last > vol_first:
        print(f"║ ✅ Progresión: Volumen Pesado {vol_first:.0f} → {vol_last:.0f}")
    else:
        print(f"║ ⚠️  Sin progresión en Pesado: {vol_first:.0f} → {vol_last:.0f}")

print(f"╚" + "=" * 58 + "╝")
