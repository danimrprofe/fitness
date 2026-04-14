import csv
import json
from datetime import datetime
from collections import defaultdict

# Read raw CSV
data = []
with open(r'h:\02_Descargas\Entrenamiento - Torso.csv', encoding='utf-8') as f:
    reader = csv.reader(f)
    for i, row in enumerate(reader):
        data.append(row)
        if i < 5:
            print(f"Row {i} ({len(row)} cols): {row[:15]}")

print(f"\nTotal rows: {len(data)}")

# Find header rows
print("\n\nAnalyzing structure...")
print("Row 0 grouping:", data[0][:20])
print("\nRow 1 details:", data[1][:20])
print("\nRow 2 (main header):", data[2][:20])
print("\nRow 3 (first data):", data[3][:20])

# Look for Face Pull columns
for i, col in enumerate(data[2]):
    if 'face' in str(col).lower() or 'elevacion' in str(col).lower():
        print(f"Column {i}: {col}")
