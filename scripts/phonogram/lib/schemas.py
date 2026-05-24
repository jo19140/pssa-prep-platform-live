"""Shared helpers for phonogram pipeline records and exports."""

from __future__ import annotations

import csv
import json
import sqlite3
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = ROOT / "data" / "phonogram"
CACHE_DIR = ROOT / ".cache" / "phonogram"


def ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    CACHE_DIR.mkdir(parents=True, exist_ok=True)


def csv_value(value: Any) -> Any:
    if isinstance(value, list):
        if value and isinstance(value[0], dict):
            return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
        return "|".join(str(item) for item in value)
    if isinstance(value, bool):
        return "true" if value else "false"
    return value


def write_json(path: Path, records: list[dict[str, Any]]) -> None:
    path.write_text(json.dumps(records, ensure_ascii=False, indent=2) + "\n")


def write_csv(path: Path, records: list[dict[str, Any]], fields: list[str]) -> None:
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for record in records:
            writer.writerow({field: csv_value(record.get(field, "")) for field in fields})


def sqlite_type(values: Iterable[Any]) -> str:
    seen = [value for value in values if value is not None]
    if not seen:
        return "TEXT"
    if all(isinstance(value, bool) for value in seen):
        return "INTEGER"
    if all(isinstance(value, int) and not isinstance(value, bool) for value in seen):
        return "INTEGER"
    if all(isinstance(value, (int, float)) and not isinstance(value, bool) for value in seen):
        return "REAL"
    return "TEXT"


def sqlite_value(value: Any) -> Any:
    if isinstance(value, bool):
        return 1 if value else 0
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return value


def write_sqlite(path: Path, table: str, records: list[dict[str, Any]], fields: list[str], index_field: str = "word") -> None:
    if path.exists():
        path.unlink()
    connection = sqlite3.connect(path)
    try:
        types = {field: sqlite_type(record.get(field) for record in records) for field in fields}
        columns = ", ".join(f"{field} {types[field]}" for field in fields)
        connection.execute(f"CREATE TABLE {table} ({columns})")
        placeholders = ", ".join("?" for _ in fields)
        connection.executemany(
            f"INSERT INTO {table} ({', '.join(fields)}) VALUES ({placeholders})",
            [[sqlite_value(record.get(field)) for field in fields] for record in records],
        )
        if index_field in fields:
            connection.execute(f"CREATE INDEX idx_{table}_{index_field} ON {table}({index_field})")
        connection.commit()
    finally:
        connection.close()


def export_dataset(name: str, records: list[dict[str, Any]], fields: list[str], *, index_field: str = "word") -> None:
    ensure_dirs()
    write_json(DATA_DIR / f"{name}.json", records)
    write_csv(DATA_DIR / f"{name}.csv", records, fields)
    write_sqlite(DATA_DIR / f"{name}.sqlite", name, records, fields, index_field=index_field)


def download(urls: list[str], cache_name: str) -> Path:
    import subprocess
    import urllib.request

    ensure_dirs()
    path = CACHE_DIR / cache_name
    if path.exists() and path.stat().st_size:
        return path

    errors: list[str] = []
    for url in urls:
        try:
            subprocess.run(
                ["curl", "-L", "--fail", "--max-time", "120", "-o", str(path), url],
                check=True,
                capture_output=True,
                text=True,
            )
            if path.exists() and path.stat().st_size:
                return path
        except Exception as exc:  # pragma: no cover - environment dependent
            errors.append(f"{url} via curl: {exc}")
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "synesis-phonogram-builder/1.0"})
            with urllib.request.urlopen(request, timeout=90) as response:
                path.write_bytes(response.read())
            if path.stat().st_size:
                return path
        except Exception as exc:  # pragma: no cover - network dependent
            errors.append(f"{url}: {exc}")
    raise RuntimeError("Unable to download source:\n" + "\n".join(errors))


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))
