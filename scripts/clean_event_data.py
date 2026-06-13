"""
Campus Event Intelligence Platform: data cleaning pipeline

This script turns messy campus event exports into analytics-ready CSV files and a
small JSON quality report. It is intentionally written as a portfolio-quality ETL
utility: clear functions, validation, CLI arguments, derived fields, and audit metrics.

Run:
  python scripts/clean_event_data.py --input data/raw_events_sample.csv --output data/clean_events.csv --report data/quality_report.json
"""

import argparse
import json
from pathlib import Path
from typing import Dict, List

import pandas as pd

REQUIRED_COLUMNS: List[str] = [
    "event_name", "organization_name", "organization_type", "building_name", "room_name",
    "campus_zone", "capacity", "event_category", "event_date", "start_time", "end_time",
    "expected_attendance", "registered_count", "attended_count", "planned_budget",
    "actual_spend", "rating", "feedback_comment"
]

NUMERIC_COLUMNS = [
    "capacity", "expected_attendance", "registered_count", "attended_count",
    "planned_budget", "actual_spend", "rating"
]

TEXT_COLUMNS = [
    "event_name", "organization_name", "organization_type", "building_name", "room_name",
    "campus_zone", "event_category", "feedback_comment"
]

CATEGORY_MAP = {
    "career fair": "Career",
    "career": "Career",
    "academic": "Academic",
    "social": "Social",
    "workshop": "Workshop",
    "fundraiser": "Fundraiser",
    "networking": "Networking",
    "community service": "Community Service",
}

ZONE_MAP = {
    "college ave": "College Ave",
    "college avenue": "College Ave",
    "livingston": "Livingston",
    "busch": "Busch",
    "cook douglass": "Cook/Douglass",
    "cook/douglass": "Cook/Douglass",
    "online": "Online",
}


def clean_text(value) -> str:
    if pd.isna(value):
        return ""
    return " ".join(str(value).strip().split())


def title_case_series(series: pd.Series) -> pd.Series:
    return series.fillna("").astype(str).map(clean_text).str.title()


def normalize_lookup(series: pd.Series, lookup: Dict[str, str], default: str) -> pd.Series:
    normalized = series.fillna("").astype(str).map(clean_text).str.lower()
    return normalized.map(lambda value: lookup.get(value, default))


def standardize_time(series: pd.Series) -> pd.Series:
    parsed = pd.to_datetime(series.astype(str).str.strip(), errors="coerce")
    return parsed.dt.strftime("%H:%M")


def build_quality_report(raw: pd.DataFrame, cleaned: pd.DataFrame, duplicate_count: int, invalid_date_count: int) -> Dict:
    before = len(raw)
    after = len(cleaned)
    return {
        "rows_before": int(before),
        "rows_after": int(after),
        "rows_removed": int(before - after),
        "duplicate_rows_removed": int(duplicate_count),
        "invalid_date_or_time_rows_removed": int(invalid_date_count),
        "reduction_rate_percent": round(((before - after) / before * 100) if before else 0, 2),
        "events_by_category": cleaned["event_category"].value_counts().to_dict(),
        "events_by_zone": cleaned["campus_zone"].value_counts().to_dict(),
        "average_attendance_rate": round(float(cleaned["attendance_rate"].mean(skipna=True)), 2),
        "average_cost_per_attendee": round(float(cleaned["cost_per_attendee"].mean(skipna=True)), 2),
    }


def clean_event_data(input_path: Path, output_path: Path, report_path: Path | None = None) -> pd.DataFrame:
    raw = pd.read_csv(input_path)
    missing = [column for column in REQUIRED_COLUMNS if column not in raw.columns]
    if missing:
        raise ValueError(f"Missing required columns: {missing}")

    df = raw.copy()
    for column in TEXT_COLUMNS:
        df[column] = df[column].map(clean_text)

    df["event_name"] = title_case_series(df["event_name"])
    df["organization_name"] = title_case_series(df["organization_name"])
    df["building_name"] = title_case_series(df["building_name"])
    df["room_name"] = title_case_series(df["room_name"])
    df["event_category"] = normalize_lookup(df["event_category"], CATEGORY_MAP, "Workshop")
    df["campus_zone"] = normalize_lookup(df["campus_zone"], ZONE_MAP, "College Ave")

    df["event_date"] = pd.to_datetime(df["event_date"], errors="coerce").dt.strftime("%Y-%m-%d")
    df["start_time"] = standardize_time(df["start_time"])
    df["end_time"] = standardize_time(df["end_time"])

    for column in NUMERIC_COLUMNS:
        df[column] = pd.to_numeric(df[column], errors="coerce").fillna(0)

    df["capacity"] = df["capacity"].clip(lower=1).round().astype(int)
    df["expected_attendance"] = df["expected_attendance"].clip(lower=0).round().astype(int)
    df["registered_count"] = df["registered_count"].clip(lower=0).round().astype(int)
    df["attended_count"] = df[["attended_count", "registered_count"]].min(axis=1).clip(lower=0).round().astype(int)
    df["rating"] = df["rating"].clip(lower=1, upper=5).round().astype(int)
    df["planned_budget"] = df["planned_budget"].clip(lower=0).round(2)
    df["actual_spend"] = df["actual_spend"].clip(lower=0).round(2)

    invalid_mask = df[["event_date", "start_time", "end_time"]].isna().any(axis=1)
    invalid_count = int(invalid_mask.sum())
    df = df.loc[~invalid_mask].copy()

    duplicate_key = ["event_name", "organization_name", "event_date", "start_time"]
    duplicate_count = int(df.duplicated(subset=duplicate_key).sum())
    df = df.drop_duplicates(subset=duplicate_key, keep="first")

    df["no_show_count"] = (df["registered_count"] - df["attended_count"]).clip(lower=0)
    df["attendance_rate"] = (df["attended_count"] / df["registered_count"].replace(0, pd.NA) * 100).round(2)
    df["room_utilization_rate"] = (df["attended_count"] / df["capacity"].replace(0, pd.NA) * 100).round(2)
    df["budget_variance"] = (df["actual_spend"] - df["planned_budget"]).round(2)
    df["cost_per_attendee"] = (df["actual_spend"] / df["attended_count"].replace(0, pd.NA)).round(2)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(output_path, index=False)

    report = build_quality_report(raw, df, duplicate_count, invalid_count)
    if report_path:
        report_path.parent.mkdir(parents=True, exist_ok=True)
        report_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps(report, indent=2))
    return df


def main() -> None:
    parser = argparse.ArgumentParser(description="Clean campus event data for SQL analytics and Excel reporting.")
    parser.add_argument("--input", required=True, type=Path, help="Path to raw event CSV")
    parser.add_argument("--output", required=True, type=Path, help="Path for cleaned output CSV")
    parser.add_argument("--report", type=Path, help="Optional JSON quality report path")
    args = parser.parse_args()
    clean_event_data(args.input, args.output, args.report)


if __name__ == "__main__":
    main()
