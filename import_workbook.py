import argparse
import json
import shutil
from datetime import date, datetime
from pathlib import Path

from openpyxl import load_workbook


ROOT = Path(__file__).resolve().parent
WORKBOOK = ROOT / "Entrenamiento.xlsx"
TORSO_UNIFICATION_DATE = "2026-06-15"
DUMBBELL_INCLINE_DATE = "2026-07-31"
WEEKDAYS = ("Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo")

TORSO_EXERCISES = (
    ("Press", (5, 6, 7, 8), ((9, "Press"),), "Pecho"),
    ("Jalón", (12, 13, 14, 15), ((16, "Jalón"),), "Espalda"),
    ("Press Inclinado", (19, 20, 21, 22), ((23, "Press Inclinado"),), "Pecho"),
    ("Remo", (29, 30, 31, 32), ((33, "Remo"),), "Espalda"),
    ("Elevaciones", (36, 37, 38, 39), ((40, "Elevaciones"),), "Hombros"),
    ("Bíceps", (43, 44, 45, 46), ((47, "Bíceps"),), "Bíceps"),
    (
        "Tríceps",
        (50, 51, 52),
        ((53, "Tríceps Cuerda"), (55, "Tríceps Barra")),
        "Tríceps",
    ),
    ("Face Pull", (58, 59, 60), ((61, "Face Pull"),), "Espalda"),
    ("Aperturas", (64, 65, 66), ((68, "Aperturas"),), "Pecho"),
)

LEG_EXERCISES = (
    ("Hip Thrust", (6, 7, 8), ((10, "Hip thrust"),), "Glúteos"),
    ("RDL", (12, 13, 14), ((16, "RDL"),), "Pierna"),
    (
        "Prensa Unilateral",
        (18, 19, 20),
        ((21, "Prensa unilateral"),),
        "Pierna",
    ),
    (
        "Prensa Bilateral",
        (18, 19, 20),
        ((23, "Press pierna"),),
        "Pierna",
    ),
    ("Extensión Cuádriceps", (25, 26, 27), ((28, "Extensión Cuádriceps"),), "Pierna"),
    ("Leg Curl", (30, 31, 32), ((33, "Leg curl"),), "Pierna"),
    ("Crunch Polea", (35, 36, 37), ((38, "Crunch Polea"),), "Core"),
    ("Gemelos", (46, 47, 48), ((49, "Gemelos"),), "Pierna"),
    ("Step Up", (51, 52, 53), ((54, "Step Up"),), "Pierna"),
)


def iso_date(value):
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return None


def day_name(value, workout_date):
    if isinstance(value, str) and value.strip():
        normalized = value.strip().casefold()
        for weekday in WEEKDAYS:
            if normalized == weekday.casefold():
                return weekday
    return WEEKDAYS[datetime.fromisoformat(workout_date).weekday()]


def number(value):
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    return float(value)


def value_at(row, column):
    return row[column - 1] if column <= len(row) else None


def estimate_one_rm(series, weight):
    minimum_reps = min(series)
    if minimum_reps <= 0 or minimum_reps >= 37:
        return 0
    return round(weight * 36 / (37 - minimum_reps), 2)


def make_key(training, kind):
    if kind == "torso":
        return training["date"], training["exercise"]
    return training["date"], training["exercise"]


def read_torso(sheet):
    imported = []
    skipped_days = set()

    for row in sheet.iter_rows(min_row=3, values_only=True):
        workout_date = iso_date(row[0] if row else None)
        if not workout_date:
            continue

        weekday = day_name(row[1], workout_date)
        if weekday not in ("Lunes", "Martes", "Viernes"):
            skipped_days.add(weekday)
            continue

        if workout_date >= TORSO_UNIFICATION_DATE:
            training_type = "Torso"
        else:
            training_type = (
                "Torso Pesado" if weekday in ("Lunes", "Martes") else "Torso Hipertrofia"
            )
        for exercise, rep_columns, weight_columns, muscle_group in TORSO_EXERCISES:
            equipment = None
            if exercise == "Press Inclinado" and workout_date >= DUMBBELL_INCLINE_DATE:
                weight_columns = ((26, "Press Inclinado"),)
                equipment = "Mancuernas"

            series = [
                int(value)
                for column in rep_columns
                if (value := number(value_at(row, column))) is not None and value > 0
            ]
            if not series:
                continue

            for weight_column, exercise_name in weight_columns:
                weight = number(value_at(row, weight_column))
                if weight is None or weight <= 0:
                    continue

                total_reps = sum(series)
                record = {
                        "date": workout_date,
                        "dayOfWeek": weekday,
                        "trainingType": training_type,
                        "exercise": exercise_name,
                        "equipment": equipment,
                        "muscleGroup": muscle_group,
                        "weight": weight,
                        "series": series,
                        "totalReps": total_reps,
                        "volume": round(weight * total_reps, 2),
                        "oneRM": estimate_one_rm(series, weight)
                        if training_type == "Torso Pesado"
                        else 0,
                        "timestamp": workout_date,
                    }
                imported.append(record)

    return imported, skipped_days


def read_legs(sheet):
    imported = []

    for row in sheet.iter_rows(min_row=3, values_only=True):
        workout_date = iso_date(row[0] if row else None)
        if not workout_date:
            continue

        weekday = day_name(row[1], workout_date)
        for exercise, rep_columns, weight_columns, _muscle_group in LEG_EXERCISES:
            series = [
                int(value)
                for column in rep_columns
                if (value := number(value_at(row, column))) is not None and value > 0
            ]
            if not series:
                continue

            for weight_column, exercise_name in weight_columns:
                weight = number(value_at(row, weight_column))
                if weight is None or weight <= 0:
                    continue

                total_reps = sum(series)
                imported.append(
                    {
                        "date": workout_date,
                        "dayOfWeek": weekday,
                        "exercise": exercise_name,
                        "weight": weight,
                        "series": series,
                        "totalReps": total_reps,
                        "volume": round(weight * total_reps, 2),
                        "oneRM": estimate_one_rm(series, weight),
                        "timestamp": workout_date,
                    }
                )

    return imported


def merge_records(existing, imported, kind):
    records = list(existing)
    if kind == "torso":
        for record in records:
            training_type = record.get("trainingType")
            if record.get("exercise") == "Press Inclinado Mancuernas":
                record["exercise"] = "Press Inclinado"
                record["equipment"] = "Mancuernas"

            if record["date"] >= TORSO_UNIFICATION_DATE and training_type in (
                "Torso Pesado",
                "Torso Hipertrofia",
                "Torso Normal",
            ):
                record["trainingType"] = "Torso"
                record["oneRM"] = 0
            elif training_type == "Torso Normal":
                weekday = (record.get("dayOfWeek") or "").strip().casefold()
                if weekday in ("lunes", "martes"):
                    record["trainingType"] = "Torso Pesado"
                elif weekday == "viernes":
                    record["trainingType"] = "Torso Hipertrofia"

    index = {make_key(record, kind): position for position, record in enumerate(records)}
    next_id = max((int(record.get("id", 0)) for record in records), default=0) + 1
    added = 0
    updated = 0

    for imported_record in imported:
        key = make_key(imported_record, kind)
        if key in index:
            position = index[key]
            current = records[position]
            records[position] = {
                **current,
                **imported_record,
                "id": current.get("id", next_id),
                "timestamp": current.get("timestamp") or imported_record["timestamp"],
            }
            updated += 1
        else:
            records.append({**imported_record, "id": next_id})
            index[key] = len(records) - 1
            next_id += 1
            added += 1

    return records, added, updated


def load_json(path):
    with path.open(encoding="utf-8") as source:
        return json.load(source)


def main():
    parser = argparse.ArgumentParser(
        description="Fusiona los registros de torso y pierna del Excel con los JSON de la app."
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Escribe los cambios en data.json y data-pierna.json. Sin esta opción solo muestra una vista previa.",
    )
    args = parser.parse_args()

    if not WORKBOOK.exists():
        parser.error(f"No se encuentra {WORKBOOK.name} en la carpeta del proyecto.")

    workbook = load_workbook(WORKBOOK, read_only=True, data_only=True)
    torso_import, skipped_days = read_torso(workbook["Torso"])
    leg_import = read_legs(workbook["Pierna + Core  Accesorios"])

    targets = (
        ("data.json", "torso", torso_import),
        ("data-pierna.json", "pierna", leg_import),
    )
    updates = []
    for filename, kind, imported in targets:
        path = ROOT / filename
        existing = load_json(path)
        merged, added, updated = merge_records(existing, imported, kind)
        updates.append((path, merged))
        print(
            f"{filename}: Excel={len(imported)}, existentes={len(existing)}, "
            f"nuevos={added}, actualizados={updated}, resultado={len(merged)}"
        )

    if skipped_days:
        print("Días de torso ignorados (no son lunes/viernes): " + ", ".join(sorted(skipped_days)))

    if args.apply:
        backup_timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        for path, records in updates:
            backup = path.with_suffix(path.suffix + f".{backup_timestamp}.bak")
            shutil.copy2(path, backup)
            with path.open("w", encoding="utf-8", newline="\n") as target:
                json.dump(records, target, ensure_ascii=False, indent=2)
                target.write("\n")
        print("Importación aplicada. Se guardó una copia fechada de cada JSON anterior.")
    else:
        print("Vista previa: no se modificaron archivos. Usa --apply para aplicar la importación.")


if __name__ == "__main__":
    main()