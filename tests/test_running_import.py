import unittest

from convert_running_activities import parse_running_activities


class TestRunningImport(unittest.TestCase):
    def test_parses_apple_health_running_export(self):
        csv_text = '''Tipo de actividad,Fecha,Favorito,Título,Distancia,Calorías,Tiempo,Frecuencia cardiaca media,FC máxima,TE aeróbico,Cadencia de carrera media,Cadencia de carrera máxima,Ritmo medio,Ritmo óptimo,Ascenso total,Descenso total,Longitud media de zancada,Relación vertical media,Oscilación vertical media,Tiempo medio de contacto con el suelo,GAP medio,Normalized Power® (NP®),Training Stress Score®,Potencia media máxima (20 minutos),Potencia media,Potencia máxima,Pasos,Descarga de Body Battery,Temperatura mínima,Descompresión,Mejor tiempo de vuelta,Número de vueltas,Temperatura máxima,Estrés medio,Estrés máximo,Tiempo en movimiento,Tiempo transcurrido,Altura mínima,Altura máxima
Carrera,2026-10-01 19:31:34,false,"Palma Carrera","7.94","575","00:51:05","143","171","3.3","157","174","6:26","4:56","85","88","0.99","9.1","8.9","275","6:16","295","0.0","--","278","458","8,090","'-9","29.0","No","00:06:12.2","8","31.0","--","--","00:50:09","00:51:05","10","44"
Entrenamiento en cinta,2026-09-08 20:05:00,false,"Entrenamiento en cinta","9.00","569","00:48:00","152","177","3.7","164","182","5:20","4:36","--","--","1.12","8.3","9.3","261","--","312","0.0","--","302","370","8,196","'-9","29.0","No","00:01:45.0","10","32.0","--","--","00:48:42","00:49:53","--","--"
'''

        activities = parse_running_activities(csv_text)

        self.assertEqual(len(activities), 2)
        self.assertEqual(activities[0]["activityType"], "Carrera")
        self.assertEqual(activities[0]["title"], "Palma Carrera")
        self.assertEqual(activities[0]["distance"], 7.94)
        self.assertEqual(activities[0]["time"], "00:51:05")
        self.assertEqual(activities[0]["paceAvg"], "6:26")
        self.assertEqual(activities[0]["dayOfWeek"], "Jueves")
        self.assertEqual(activities[1]["activityType"], "Entrenamiento en cinta")


if __name__ == "__main__":
    unittest.main()
