import json

# Cargar datos
with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Cambiar "Press Inclinado" por "Press Banca"
renamed = 0
for item in data:
    if item.get('exercise') == 'Press Inclinado':
        item['exercise'] = 'Press Banca'
        renamed += 1

# Guardar cambios
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print(f"Ejercicios renombrados: {renamed}")
