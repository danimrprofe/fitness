import json

# Leer el JSON
with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Eliminar duplicados manteniendo el orden
seen = {}
unique_data = []

for item in data:
    # Crear una clave única basada en date + exercise
    key = (item['date'], item['exercise'])
    
    if key not in seen:
        seen[key] = True
        unique_data.append(item)
    else:
        print(f"Duplicado encontrado: {item['date']} - {item['exercise']}")

# Guardar el JSON limpio
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(unique_data, f, indent=2, ensure_ascii=False)

print(f"\nOriginal: {len(data)} registros")
print(f"Limpio: {len(unique_data)} registros")
print(f"Duplicados removidos: {len(data) - len(unique_data)}")
