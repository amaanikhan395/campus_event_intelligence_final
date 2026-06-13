# Data Dictionary

## organizations

| Column | Purpose |
|---|---|
| organization_id | Primary key |
| organization_name | Unique organization name |
| organization_type | Student Organization, Academic Program, Career Services, Department, or Greek Life |
| contact_email | Contact inbox |
| active_flag | Indicates whether the organization is active |

## locations

| Column | Purpose |
|---|---|
| location_id | Primary key |
| building_name | Building or platform name |
| room_name | Room, hall, or virtual event space |
| campus_zone | Campus area |
| capacity | Maximum attendance capacity |
| has_av | Indicates room has AV support |

## events

| Column | Purpose |
|---|---|
| event_id | Primary key |
| event_name | Event title |
| organization_id | Foreign key to organizations |
| location_id | Foreign key to locations |
| event_category | Event type |
| event_date | ISO date |
| start_time | 24-hour start time |
| end_time | 24-hour end time |
| expected_attendance | Planning estimate |
| status | Planned, Completed, or Cancelled |
| source_system | Data source label |

## attendance

| Column | Purpose |
|---|---|
| registered_count | Number of registrations |
| attended_count | Number of check-ins |
| waitlist_count | Number of waitlisted students |
| no_show_count | Generated no-show metric |
| attendance_rate | Generated attendance percentage |

## budgets

| Column | Purpose |
|---|---|
| planned_budget | Approved budget |
| actual_spend | Actual event spend |
| funding_source | Source of funding |
| cost_center | Internal cost center |
| budget_variance | Generated spend variance |
