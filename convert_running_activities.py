import csv
import io
import json
from datetime import datetime

RUNNING_KEYWORDS = ("carrera", "corrida", "correr", "running", "run", "treadmill", "cinta")


def clean_cell(value):
    if value is None:
        return ""
    return str(value).strip()


def parse_float(value):
    if value is None:
        return 0

    cleaned = clean_cell(value).replace("'", "").replace(" ", "")
    if cleaned in {"", "--", "-", "—", "No", "NO"}:
        return 0

    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        if len(cleaned.split(",")[-1]) == 3 and cleaned.count(",") >= 1:
            cleaned = cleaned.replace(",", "")
        else:
            cleaned = cleaned.replace(",", ".")

    try:
        return float(cleaned)
    except ValueError:
        return 0


def parse_int(value):
    result = parse_float(value)
    if result == 0:
        return 0
    return int(round(result))


def parse_date(value):
    date_text = clean_cell(value)
    if not date_text:
        raise ValueError("Fecha vacía")

    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d", "%d/%m/%Y %H:%M:%S", "%d/%m/%Y"):
        try:
            return datetime.strptime(date_text, fmt)
        except ValueError:
            continue

    raise ValueError(f"No se pudo parsear la fecha: {date_text}")


def parse_running_activities(csv_text):
    reader = csv.DictReader(io.StringIO(csv_text))
    activities = []

    for row in reader:
        activity_type = clean_cell(row.get("Tipo de actividad"))
        if not activity_type:
            continue
        if not any(keyword in activity_type.lower() for keyword in RUNNING_KEYWORDS):
            continue

        try:
            dt = parse_date(row.get("Fecha", ""))
        except ValueError:
            continue

        title = clean_cell(row.get("Título"))
        if not title:
            title = activity_type

        distance = parse_float(row.get("Distancia"))
        time_value = clean_cell(row.get("Tiempo")) or "00:00:00"
        pace_avg = clean_cell(row.get("Ritmo medio"))
        hr_avg = parse_int(row.get("Frecuencia cardiaca media"))
        hr_max = parse_int(row.get("FC máxima"))
        calories = parse_int(row.get("Calorías"))
        cadence = parse_int(row.get("Cadencia de carrera media"))
        elevation = parse_int(row.get("Ascenso total"))

        activity = {
            "id": int(dt.timestamp() * 1000),
            "date": dt.strftime("%Y-%m-%d"),
            "dayOfWeek": [
                "Lunes",
                "Martes",
                "Miércoles",
                "Jueves",
                "Viernes",
                "Sábado",
                "Domingo",
            ][dt.weekday()],
            "activityType": activity_type,
            "title": title,
            "distance": round(distance, 2),
            "time": time_value,
            "paceAvg": pace_avg,
            "hrAvg": hr_avg,
            "hrMax": hr_max,
            "calories": calories,
            "cadence": cadence,
            "elevation": elevation,
            "notes": "",
        }
        activities.append(activity)

    activities.sort(key=lambda item: item["date"], reverse=True)
    return activities


def convert_file(csv_path, output_path="data-running.json"):
    with open(csv_path, "r", encoding="utf-8") as file:
        csv_text = file.read()

    activities = parse_running_activities(csv_text)

    with open(output_path, "w", encoding="utf-8") as file:
        json.dump(activities, file, ensure_ascii=False, indent=2)

    return activities


if __name__ == "__main__":
    convert_file("Activities (3).csv", "data-running.json")
