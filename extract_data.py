import csv
from datetime import datetime

# Read raw CSV
data = []
with open(r'h:\02_Descargas\Entrenamiento - Torso.csv', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        data.append(row)

# Face Pull columns: 59 (Reps), 60 (kg), 61 (1RM)
# Elevaciones columns: 62-65 (Series), 66 (kg), 67 (vol), 68 (1RM)

# Date is in column 1
# Day of week is in column 0

results = []

# Process data rows (skip header rows 0-2)
for row_idx in range(3, len(data)):
    row = data[row_idx]
    
    # Get date from column 1
    date_str = row[1].strip() if len(row) > 1 else ""
    if not date_str or date_str == "":
        continue
    
    # Parse date (DD/MM/YY format)
    try:
        date_obj = datetime.strptime(date_str, "%d/%m/%y")
        date_formatted = date_obj.strftime("%Y-%m-%d")
    except:
        continue
    
    # Check Face Pull data (column 59: Reps, 60: kg, 61: 1RM)
    face_pull_reps = row[59].strip() if len(row) > 59 else ""
    face_pull_kg = row[60].strip() if len(row) > 60 else ""
    face_pull_1rm = row[61].strip() if len(row) > 61 else ""
    
    if face_pull_reps and face_pull_kg:  # Has data
        # Parse series format (like "12-12-12" or "10-10-10")
        try:
            series = [int(x) for x in face_pull_reps.split('-')]
            weight = float(face_pull_kg.replace(',', '.'))
            volume = sum(series) * weight  # Calculate volume
            oneRM = float(face_pull_1rm.replace(',', '.')) if face_pull_1rm else None
            
            results.append({
                "date": date_formatted,
                "exercise": "Face Pull",
                "series": series,
                "weight": weight,
                "volume": int(volume),
                "oneRM": oneRM if oneRM else None
            })
        except:
            pass
    
    # Check Elevaciones data (columns 62-65: Series, 66: kg, 67: vol, 68: 1RM)
    elev_s1 = row[62].strip() if len(row) > 62 else ""
    elev_s2 = row[63].strip() if len(row) > 63 else ""
    elev_s3 = row[64].strip() if len(row) > 64 else ""
    elev_s4 = row[65].strip() if len(row) > 65 else ""
    elev_kg = row[66].strip() if len(row) > 66 else ""
    elev_vol = row[67].strip() if len(row) > 67 else ""
    elev_1rm = row[68].strip() if len(row) > 68 else ""
    
    # Check if there's data
    if elev_s1 and elev_kg:  # Has data
        try:
            series = []
            for s in [elev_s1, elev_s2, elev_s3, elev_s4]:
                if s:
                    series.append(int(s))
            
            weight = float(elev_kg.replace(',', '.'))
            volume = int(elev_vol.replace(',', '.')) if elev_vol else sum(series) * weight
            oneRM = float(elev_1rm.replace(',', '.')) if elev_1rm else None
            
            results.append({
                "date": date_formatted,
                "exercise": "Elevaciones",
                "series": series,
                "weight": weight,
                "volume": int(volume),
                "oneRM": oneRM if oneRM else None
            })
        except Exception as e:
            print(f"Error processing Elevaciones at row {row_idx}: {e}")
            pass

# Output as JSON
import json
for obj in results:
    print(json.dumps(obj))
