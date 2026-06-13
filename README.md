# Campus Event Intelligence Platform

A recruiter-ready full-stack analytics platform for campus event operations. The project organizes **720 seeded event records** across student organizations, academic programs, career services, and departments, then turns the data into attendance trends, scheduling recommendations, budget efficiency metrics, and Excel-ready exports.

This version is intentionally built to look like a real internal operations tool, not a quick demo. It includes a normalized SQL model, generated views, audit triggers, data-quality checks, Python ETL, REST APIs, and a polished dashboard.

## What it does

- Tracks campus events, organizations, locations, attendance, feedback, and budgets in a relational SQL database.
- Uses SQL constraints, generated columns, indexes, views, and triggers to keep reporting data consistent.
- Seeds 720 realistic demo records using deterministic sample data.
- Provides REST APIs for event search, event creation, attendance updates, feedback, organization reports, CSV exports, and analytics.
- Includes a Python cleaning pipeline that standardizes messy exports, removes duplicates, creates derived metrics, and writes a JSON quality report.
- Presents the data in a browser dashboard with KPIs, charts, event filters, scheduling recommendations, top events, budget efficiency, and data-quality monitoring.

## Tech stack

| Layer | Tools |
|---|---|
| Backend | Node.js, Express.js |
| Database | SQLite, SQL views, indexes, constraints, triggers |
| Data cleaning | Python, Pandas |
| Frontend | HTML, CSS, vanilla JavaScript, Canvas charts |
| Reporting | CSV exports for Excel |
| Testing | Node test runner, Supertest |

## Project structure

```text
campus_event_intelligence/
  backend/
    db/
      schema.sql
      database.js
      initDb.js
      seed.js
    middleware/
      errors.js
    routes/
      analytics.js
      events.js
      exports.js
      organizations.js
    utils/
      queryBuilder.js
    config.js
    package.json
    server.js
  data/
    raw_events_sample.csv
  docs/
    api_examples.md
    architecture.md
    data_dictionary.md
    recruiter_demo_script.md
  frontend/
    index.html
    styles.css
    app.js
  scripts/
    clean_event_data.py
  tests/
    api.test.js
  README.md
```

## Quick start

From the project root:

```bash
cd backend
npm install
npm run reset
npm start
```

Open the dashboard:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/api/health
```

## Run the Python ETL pipeline

From the project root:

```bash
python scripts/clean_event_data.py \
  --input data/raw_events_sample.csv \
  --output data/clean_events.csv \
  --report data/quality_report.json
```

The cleaned CSV can be opened in Excel for pivot tables, charts, and manual review.

## Test the API

```bash
cd backend
npm test
```

## Main API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Backend health check |
| GET | `/api/events` | Search, filter, sort, and paginate events |
| GET | `/api/events/:id` | Event detail with feedback and audit history |
| POST | `/api/events` | Create a new event |
| PUT | `/api/events/:id/attendance` | Update registered, attended, and waitlist counts |
| PATCH | `/api/events/:id/status` | Update event status and trigger audit log |
| POST | `/api/events/:id/feedback` | Add event feedback |
| GET | `/api/organizations` | List organizations |
| GET | `/api/organizations/leaderboard` | Organization performance leaderboard |
| GET | `/api/organizations/:id/report` | Organization-level performance report |
| GET | `/api/analytics/summary` | Dashboard KPIs |
| GET | `/api/analytics/attendance-trends` | Attendance by month or day |
| GET | `/api/analytics/category-mix` | Category-level attendance and ratings |
| GET | `/api/analytics/scheduling-gaps` | Congested, weak, and growth-opportunity time slots |
| GET | `/api/analytics/top-events` | Highest-attendance completed events |
| GET | `/api/analytics/budget-efficiency` | Cost per attendee by category |
| GET | `/api/analytics/data-quality` | Duplicate, feedback, capacity, and budget checks |
| GET | `/api/exports/events.csv` | Excel-ready event export |

## Resume alignment

This project supports the resume bullet points more credibly because it now includes concrete engineering depth:

- **Full-stack platform:** Express API, SQL database, and browser dashboard.
- **500+ records:** deterministic seed inserts 720 event records.
- **Relational SQL design:** normalized tables for organizations, locations, events, attendance, feedback, budgets, and audit history.
- **Duplicate reduction:** SQL uniqueness plus Python deduplication and quality reporting.
- **Python automation:** ETL script standardizes dates, times, categories, locations, numeric fields, and derived metrics.
- **REST APIs:** more than 10 endpoints for event creation, attendance tracking, filtering, analytics, reporting, exports, and feedback.

## Suggested GitHub description

```text
Full-stack campus event analytics platform using Node.js, Express, SQLite, SQL views, Python ETL, and a JavaScript dashboard to analyze attendance trends, scheduling gaps, and budget efficiency across 720 campus events.
```
