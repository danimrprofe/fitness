
import matplotlib.pyplot as plt
import numpy as np
from matplotlib.ticker import FuncFormatter

# 1. Definición de datos usando segundos por kilómetro (escala lineal real)
# Ejemplo: 6:00 min/km = 360s, 5:30 min/km = 330s, 5:00 min/km = 300s, 4:48 min/km = 288s
ritmos_seg = [360, 360, 330, 300, 300, 288]
pulsaciones = [150, 157, 165, 170, 172, 177]

plt.figure(figsize=(10, 6))
plt.style.use('seaborn-v0_8-whitegrid' if 'seaborn-v0_8-whitegrid' in plt.style.available else 'default')

# 2. Gráfico de dispersión con los puntos empíricos
plt.scatter(ritmos_seg, pulsaciones, color='#e63946', s=120, zorder=5, label='Datos empíricos (Entrenos)')

# 3. Ajuste polinómico de grado 2 sobre la escala de segundos
coeffs = np.polyfit(ritmos_seg, pulsaciones, 2)
poly_func = np.poly1d(coeffs)
ritmos_smooth_seg = np.linspace(280, 370, 100)
pulsaciones_smooth = poly_func(ritmos_smooth_seg)

plt.plot(ritmos_smooth_seg, pulsaciones_smooth, color='#1d3557', linewidth=2.8, linestyle='-', label='Curva de Esfuerzo Ajustada')

# 4. Franjas de zonas de entrenamiento (con intervalos espaciales constantes en segundos)
plt.axvspan(345, 375, color='#a8dede', alpha=0.25, label='Zona 2: Aeróbica Base')
plt.axvspan(315, 345, color='#ffe3a8', alpha=0.25, label='Zona 3: Tempo / Transición')
plt.axvspan(275, 315, color='#ffb3b3', alpha=0.25, label='Zona 4/5: Umbral / Anaeróbica')

# 5. Invertir el eje X (ritmos más lentos a la izquierda, más rápidos a la derecha)
plt.xlim(375, 275)
plt.ylim(140, 185)

# 6. Formateador para mostrar el eje X en formato min:seg
def sec_to_pace(x, pos):
    mins = int(x // 60)
    secs = int(x % 60)
    return f"{mins}:{secs:02d}"

plt.gca().xaxis.set_major_formatter(FuncFormatter(sec_to_pace))

# 7. Estética y etiquetas
plt.title('Curva de Ritmo vs. Frecuencia Cardíaca (Eje X Lineal Constante)', fontsize=13, fontweight='bold', pad=15)
plt.xlabel('Ritmo (min/km) [← Más lento | Más rápido →]', fontsize=11, labelpad=10)
plt.ylabel('Frecuencia Cardíaca (ppm)', fontsize=11, labelpad=10)
plt.legend(frameon=True, facecolor='white', framealpha=0.95, loc='upper right')
plt.tight_layout()

# Mostrar la gráfica
plt.show()