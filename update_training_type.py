import json
from datetime import datetime

# Leer el JSON
with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Fecha límite: antes e inclusive del 9 de enero 2026 son Torso Normal
limit_date = datetime.strptime('2026-01-09', '%Y-%m-%d')

# Cambiar trainingType a "Torso Normal" para entrenamientos antes del 9 de enero
updated_count = 0

for item in data:
    item_date = datetime.strptime(item['date'], '%Y-%m-%d')
    
    # Si es torso y es antes o inclusive del 9 de enero
    if 'Torso' in item['trainingType'] and item_date <= limit_date:
        item['trainingType'] = 'Torso Normal'
        updated_count += 1

# Guardar el JSON actualizado
with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f"Entrenamientos actualizados: {updated_count}")
print(f"Ahora los entrenamientos antes del 9 de enero son 'Torso Normal'")
