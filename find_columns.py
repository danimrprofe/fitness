import csv

# Read raw CSV
data = []
with open(r'h:\02_Descargas\Entrenamiento - Torso.csv', encoding='utf-8') as f:
    reader = csv.reader(f)
    for row in reader:
        data.append(row)

# Find where Face Pull and Elevaciones are
print("Looking for Face Pull and Elevaciones columns...")
print("\n" + "="*100)
print("Header row (Row 0 - Groups):")
for i, col in enumerate(data[0]):
    if col.strip():
        print(f"Col {i}: {col}")

print("\n" + "="*100)
print("Subheader row (Row 1 - Specific headers):")
for i, col in enumerate(data[1]):
    if i >= 40:  # Focus on later columns
        print(f"Col {i}: '{col}'")

print("\n" + "="*100)
# Find which columns have data for Face Pull and Elevaciones
print("Row 0 content for analysis:")
print(data[0])

# Search for indices
face_pull_idx = None
elevaciones_idx = None
for i, col in enumerate(data[0]):
    if 'face' in col.lower():
        face_pull_idx = i
        print(f"\nFace Pull starts at column {i}")
    if 'elev' in col.lower():
        elevaciones_idx = i
        print(f"Elevaciones starts at column {i}")

# Show some data rows to understand structure
print("\n" + "="*100)
print("Sample data rows:")
for row_idx in [3, 5, 7, 15]:
    if row_idx < len(data):
        print(f"\nRow {row_idx} (Date: {data[row_idx][1]}): cols 45-70")
        print(data[row_idx][45:70])
