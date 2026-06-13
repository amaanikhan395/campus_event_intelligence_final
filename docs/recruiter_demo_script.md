# Recruiter Demo Script

Use this when explaining the project in an interview or recruiter screen.

## 30-second version

I built a full-stack campus event intelligence platform that turns event records into operational insights. The backend uses Node.js and Express, the database is normalized in SQLite with SQL views, constraints, indexes, generated columns, and an audit trigger, and the frontend dashboard shows KPIs, attendance trends, scheduling gaps, budget efficiency, and data-quality checks. I also wrote a Python cleaning script that standardizes messy CSV exports, removes duplicates, and produces an Excel-ready file plus a quality report.

## What to show first

1. Open the dashboard at `http://localhost:4000`.
2. Point out the KPIs: total events, total attendance, attendance rate, utilization, and cost per attendee.
3. Show the event explorer filters.
4. Show scheduling recommendations and explain how they help teams avoid congested time slots.
5. Open `/api/analytics/data-quality` to show backend validation.
6. Open `/api/exports/events.csv` to show Excel-friendly reporting.

## Best technical points to mention

- I used a normalized relational schema instead of storing everything in one flat file.
- I used SQL views so analytics calculations are consistent across API endpoints.
- I added generated columns for no-show count, attendance rate, and budget variance.
- I added an audit trigger for status changes.
- I wrote a Python ETL pipeline with duplicate removal, date/time standardization, category normalization, and a JSON quality report.
- I built more than 10 REST endpoints and added basic API tests.
