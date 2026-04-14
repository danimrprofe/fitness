import pandas as pd
import json
from datetime import datetime

# Read the CSV file with all header rows
df = pd.read_csv(r'h:\02_Descargas\Entrenamiento - Torso.csv', encoding='utf-8')

# Print first 20 rows to understand structure
print("Shape:", df.shape)
print("\nColumn names:")
for i, col in enumerate(df.columns):
    print(f"{i}: {col}")

print("\n\nFirst 5 rows:")
print(df.head())
