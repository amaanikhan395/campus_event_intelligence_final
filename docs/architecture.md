# Architecture Notes

## System flow

```text
Raw campus event CSV exports
        ↓
Python ETL cleaning script
        ↓
Clean CSV / quality report
        ↓
SQLite relational database
        ↓
SQL views and analytics queries
        ↓
Express REST API
        ↓
Browser dashboard / Excel CSV export
```

## Design choices

### Normalized relational model

The database separates organizations, locations, events, attendance, feedback, and budgets. This avoids repeated organization and room data across hundreds of events and makes reporting easier.

### SQL views for analytics

The API reads most dashboard data from `v_event_performance` and `v_organization_performance`. This keeps business logic close to the data and avoids repeating the same joins across multiple route files.

### Generated columns

Attendance rate, no-show count, budget variance, and cost-per-attendee metrics are calculated consistently instead of manually stored in multiple places.

### Audit trigger

Changing an event status writes to `event_audit_log`, which demonstrates a real operational control pattern.

### Excel-friendly export

The `/api/exports/events.csv` endpoint lets non-technical users open filtered event data in Excel without querying the database.
