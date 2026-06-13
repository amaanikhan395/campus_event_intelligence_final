PRAGMA foreign_keys = ON;

DROP VIEW IF EXISTS v_event_performance;
DROP VIEW IF EXISTS v_organization_performance;
DROP TABLE IF EXISTS event_audit_log;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS locations;

CREATE TABLE organizations (
  organization_id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_name TEXT NOT NULL UNIQUE,
  organization_type TEXT NOT NULL CHECK (organization_type IN (
    'Student Organization', 'Academic Program', 'Career Services', 'Department', 'Greek Life'
  )),
  contact_email TEXT,
  active_flag INTEGER NOT NULL DEFAULT 1 CHECK (active_flag IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
  location_id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_name TEXT NOT NULL,
  room_name TEXT NOT NULL,
  campus_zone TEXT NOT NULL CHECK (campus_zone IN ('College Ave', 'Livingston', 'Busch', 'Cook/Douglass', 'Online')),
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  has_av INTEGER NOT NULL DEFAULT 1 CHECK (has_av IN (0, 1)),
  UNIQUE(building_name, room_name)
);

CREATE TABLE events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  organization_id INTEGER NOT NULL,
  location_id INTEGER NOT NULL,
  event_category TEXT NOT NULL CHECK (event_category IN (
    'Career', 'Academic', 'Social', 'Workshop', 'Fundraiser', 'Networking', 'Community Service'
  )),
  event_date TEXT NOT NULL CHECK (event_date LIKE '____-__-__'),
  start_time TEXT NOT NULL CHECK (start_time LIKE '__:__'),
  end_time TEXT NOT NULL CHECK (end_time LIKE '__:__'),
  expected_attendance INTEGER NOT NULL DEFAULT 0 CHECK (expected_attendance >= 0),
  status TEXT NOT NULL DEFAULT 'Completed' CHECK (status IN ('Planned', 'Completed', 'Cancelled')),
  source_system TEXT NOT NULL DEFAULT 'seeded_demo',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_name, organization_id, event_date, start_time),
  FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
  FOREIGN KEY (location_id) REFERENCES locations(location_id)
);

CREATE TABLE attendance (
  attendance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL UNIQUE,
  registered_count INTEGER NOT NULL DEFAULT 0 CHECK (registered_count >= 0),
  attended_count INTEGER NOT NULL DEFAULT 0 CHECK (attended_count >= 0),
  waitlist_count INTEGER NOT NULL DEFAULT 0 CHECK (waitlist_count >= 0),
  checked_in_by TEXT DEFAULT 'system',
  no_show_count INTEGER GENERATED ALWAYS AS (MAX(registered_count - attended_count, 0)) VIRTUAL,
  attendance_rate REAL GENERATED ALWAYS AS (
    CASE WHEN registered_count = 0 THEN NULL ELSE ROUND(attended_count * 100.0 / registered_count, 2) END
  ) VIRTUAL,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

CREATE TABLE feedback (
  feedback_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  sentiment TEXT NOT NULL CHECK (sentiment IN ('Positive', 'Neutral', 'Negative')),
  comment TEXT,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

CREATE TABLE budgets (
  budget_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL UNIQUE,
  planned_budget REAL NOT NULL DEFAULT 0 CHECK (planned_budget >= 0),
  actual_spend REAL NOT NULL DEFAULT 0 CHECK (actual_spend >= 0),
  funding_source TEXT NOT NULL DEFAULT 'Organization Budget',
  cost_center TEXT,
  budget_variance REAL GENERATED ALWAYS AS (ROUND(actual_spend - planned_budget, 2)) VIRTUAL,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE CASCADE
);

CREATE TABLE event_audit_log (
  audit_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER,
  action TEXT NOT NULL,
  old_status TEXT,
  new_status TEXT,
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(event_id) ON DELETE SET NULL
);

CREATE TRIGGER trg_events_updated_at
AFTER UPDATE ON events
FOR EACH ROW
BEGIN
  UPDATE events SET updated_at = CURRENT_TIMESTAMP WHERE event_id = OLD.event_id;
END;

CREATE TRIGGER trg_event_status_audit
AFTER UPDATE OF status ON events
FOR EACH ROW
WHEN OLD.status <> NEW.status
BEGIN
  INSERT INTO event_audit_log(event_id, action, old_status, new_status)
  VALUES (NEW.event_id, 'STATUS_CHANGE', OLD.status, NEW.status);
END;

CREATE INDEX idx_events_date_time ON events(event_date, start_time);
CREATE INDEX idx_events_category ON events(event_category);
CREATE INDEX idx_events_org_date ON events(organization_id, event_date);
CREATE INDEX idx_locations_zone ON locations(campus_zone);
CREATE INDEX idx_feedback_event_rating ON feedback(event_id, rating);

CREATE VIEW v_event_performance AS
SELECT
  e.event_id,
  e.event_name,
  e.event_category,
  e.event_date,
  e.start_time,
  e.end_time,
  e.status,
  o.organization_id,
  o.organization_name,
  o.organization_type,
  l.location_id,
  l.building_name,
  l.room_name,
  l.campus_zone,
  l.capacity,
  a.registered_count,
  a.attended_count,
  a.waitlist_count,
  a.no_show_count,
  a.attendance_rate,
  ROUND(a.attended_count * 100.0 / NULLIF(l.capacity, 0), 2) AS room_utilization_rate,
  b.planned_budget,
  b.actual_spend,
  b.budget_variance,
  ROUND(b.actual_spend / NULLIF(a.attended_count, 0), 2) AS cost_per_attendee,
  ROUND(AVG(f.rating), 2) AS avg_rating,
  COUNT(f.feedback_id) AS feedback_count
FROM events e
JOIN organizations o ON e.organization_id = o.organization_id
JOIN locations l ON e.location_id = l.location_id
LEFT JOIN attendance a ON e.event_id = a.event_id
LEFT JOIN budgets b ON e.event_id = b.event_id
LEFT JOIN feedback f ON e.event_id = f.event_id
GROUP BY e.event_id;

CREATE VIEW v_organization_performance AS
SELECT
  organization_id,
  organization_name,
  organization_type,
  COUNT(event_id) AS event_count,
  SUM(attended_count) AS total_attendance,
  ROUND(AVG(attendance_rate), 2) AS avg_attendance_rate,
  ROUND(AVG(room_utilization_rate), 2) AS avg_room_utilization,
  ROUND(AVG(avg_rating), 2) AS avg_rating,
  ROUND(SUM(actual_spend), 2) AS total_spend,
  ROUND(SUM(actual_spend) / NULLIF(SUM(attended_count), 0), 2) AS cost_per_attendee
FROM v_event_performance
GROUP BY organization_id;
