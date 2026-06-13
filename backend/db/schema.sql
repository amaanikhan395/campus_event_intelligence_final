PRAGMA foreign_keys = ON;

DROP VIEW IF EXISTS v_event_catalog;
DROP VIEW IF EXISTS v_event_performance;
DROP VIEW IF EXISTS v_organization_performance;
DROP TABLE IF EXISTS event_audit_log;
DROP TABLE IF EXISTS feedback;
DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS budgets;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS locations;

CREATE TABLE users (
  user_id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'Student' CHECK (role IN ('Student', 'Organization Admin', 'Faculty/Staff')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE organizations (
  organization_id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization_name TEXT NOT NULL UNIQUE,
  organization_type TEXT NOT NULL CHECK (organization_type IN (
    'Rutgers Office', 'Academic Program', 'Student Organization', 'Department', 'Public Event Series'
  )),
  contact_email TEXT,
  active_flag INTEGER NOT NULL DEFAULT 1 CHECK (active_flag IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE locations (
  location_id INTEGER PRIMARY KEY AUTOINCREMENT,
  building_name TEXT NOT NULL,
  room_name TEXT NOT NULL,
  campus_zone TEXT NOT NULL CHECK (campus_zone IN ('College Ave', 'Livingston', 'Busch', 'Cook/Douglass', 'Online', 'New Brunswick', 'Piscataway', 'Multiple Campuses')),
  capacity INTEGER NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  has_av INTEGER NOT NULL DEFAULT 1 CHECK (has_av IN (0, 1)),
  UNIQUE(building_name, room_name)
);

CREATE TABLE events (
  event_id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_name TEXT NOT NULL,
  description TEXT,
  organization_id INTEGER NOT NULL,
  location_id INTEGER NOT NULL,
  event_category TEXT NOT NULL CHECK (event_category IN (
    'Academic', 'Campus Life', 'Careers & Entrepreneurship', 'Commencement', 'Community', 'Arts', 'Training/Workshop', 'Student Organization', 'Athletics', 'Other'
  )),
  event_date TEXT NOT NULL CHECK (event_date LIKE '____-__-__'),
  start_time TEXT NOT NULL CHECK (start_time LIKE '__:__'),
  end_time TEXT NOT NULL CHECK (end_time LIKE '__:__'),
  status TEXT NOT NULL DEFAULT 'Published' CHECK (status IN ('Published', 'Submitted', 'Cancelled')),
  source_system TEXT NOT NULL DEFAULT 'rutgers_public_source',
  source_url TEXT,
  submitted_by_user_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(event_name, organization_id, event_date, start_time),
  FOREIGN KEY (organization_id) REFERENCES organizations(organization_id),
  FOREIGN KEY (location_id) REFERENCES locations(location_id),
  FOREIGN KEY (submitted_by_user_id) REFERENCES users(user_id)
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
  funding_source TEXT NOT NULL DEFAULT 'Not shown in student dashboard',
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
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_locations_zone ON locations(campus_zone);

CREATE VIEW v_event_catalog AS
SELECT
  e.event_id,
  e.event_name,
  e.description,
  e.event_category,
  e.event_date,
  e.start_time,
  e.end_time,
  e.status,
  e.source_system,
  e.source_url,
  e.created_at,
  e.updated_at,
  o.organization_id,
  o.organization_name,
  o.organization_type,
  l.location_id,
  l.building_name,
  l.room_name,
  l.campus_zone,
  l.capacity,
  u.user_id AS submitted_by_user_id,
  u.full_name AS submitted_by_name
FROM events e
JOIN organizations o ON e.organization_id = o.organization_id
JOIN locations l ON e.location_id = l.location_id
LEFT JOIN users u ON e.submitted_by_user_id = u.user_id;

CREATE VIEW v_event_performance AS
SELECT
  c.*,
  a.registered_count,
  a.attended_count,
  a.waitlist_count,
  a.attendance_rate,
  NULL AS room_utilization_rate,
  0 AS planned_budget,
  0 AS actual_spend,
  0 AS budget_variance,
  NULL AS cost_per_attendee,
  NULL AS avg_rating,
  0 AS feedback_count
FROM v_event_catalog c
LEFT JOIN attendance a ON c.event_id = a.event_id;

CREATE VIEW v_organization_performance AS
SELECT
  organization_id,
  organization_name,
  organization_type,
  COUNT(event_id) AS event_count,
  SUM(CASE WHEN status = 'Published' THEN 1 ELSE 0 END) AS published_events,
  SUM(CASE WHEN status = 'Submitted' THEN 1 ELSE 0 END) AS submitted_events
FROM v_event_catalog
GROUP BY organization_id;
