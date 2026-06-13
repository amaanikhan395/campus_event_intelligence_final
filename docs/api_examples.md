# API Examples

Start the app first:

```bash
cd backend
npm install
npm run reset
npm start
```

## Health check

```bash
curl http://localhost:4000/api/health
```

## Search events

```bash
curl "http://localhost:4000/api/events?category=Career&zone=College%20Ave&limit=5"
```

## Get one event

```bash
curl http://localhost:4000/api/events/1
```

## Create an event

```bash
curl -X POST http://localhost:4000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "event_name": "AI Career Prep Night",
    "organization_id": 3,
    "location_id": 7,
    "event_category": "Career",
    "event_date": "2025-10-15",
    "start_time": "18:00",
    "end_time": "20:00",
    "expected_attendance": 80,
    "planned_budget": 650
  }'
```

## Update attendance

```bash
curl -X PUT http://localhost:4000/api/events/1/attendance \
  -H "Content-Type: application/json" \
  -d '{"registered_count": 100, "attended_count": 82, "waitlist_count": 5}'
```

## Add feedback

```bash
curl -X POST http://localhost:4000/api/events/1/feedback \
  -H "Content-Type: application/json" \
  -d '{"rating": 5, "comment": "Great event with useful career advice."}'
```

## Analytics

```bash
curl http://localhost:4000/api/analytics/summary
curl http://localhost:4000/api/analytics/scheduling-gaps
curl http://localhost:4000/api/analytics/data-quality
```

## Export CSV

```bash
curl "http://localhost:4000/api/exports/events.csv?category=Workshop" -o workshop_events.csv
```
