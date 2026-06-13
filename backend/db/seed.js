const { run, all, db } = require('./database');

const organizations = [
  ['Rutgers Academic Scheduling and Instructional Space', 'Rutgers Office', 'sched@echo.rutgers.edu'],
  ['Rutgers University-New Brunswick', 'Rutgers Office', 'events@rutgers.edu'],
  ['Rutgers Geology Museum', 'Public Event Series', 'geologymuseum@eps.rutgers.edu'],
  ['Rutgers Career Exploration and Success', 'Rutgers Office', 'careers@rutgers.edu'],
  ['Student Organization Demo Account', 'Student Organization', 'studentorgs@rutgers.edu']
];

const locations = [
  ['Rutgers University', 'Academic Calendar', 'New Brunswick', 0, 0],
  ['Multiple Campuses', 'Busch, College Ave, Cook/Douglass', 'Multiple Campuses', 0, 0],
  ['Geology Museum', 'Museum Floor', 'College Ave', 0, 1],
  ['College Avenue Student Center', 'Multipurpose Room', 'College Ave', 0, 1],
  ['Busch Student Center', 'Main Hall', 'Busch', 0, 1],
  ['Livingston Student Center', 'Event Hall', 'Livingston', 0, 1],
  ['Online', 'Virtual Event', 'Online', 0, 0]
];

const publicEvents = [
  {
    event_name: 'Fall Semester Begins',
    description: 'Official Rutgers 2025-2026 academic calendar date.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2025-09-02', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Fall First 7-Week Minicourse Period Begins',
    description: 'Official Rutgers 2025-2026 academic calendar date range begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2025-09-02', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Fall Second 7-Week Minicourse Period Begins',
    description: 'Official Rutgers 2025-2026 academic calendar date range begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2025-10-21', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Disability Awareness Month at Rutgers',
    description: 'Rutgers-New Brunswick event category page highlights Disability Awareness Month during October.',
    org: 'Rutgers University-New Brunswick',
    location: 'Multiple Campuses',
    event_category: 'Community',
    event_date: '2025-10-01', start_time: '09:00', end_time: '17:00',
    source_url: 'https://newbrunswick.rutgers.edu/events/disability-awareness-month-rutgers'
  },
  {
    event_name: 'Thanksgiving Recess Begins',
    description: 'Official Rutgers 2025-2026 academic calendar no-class period begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2025-11-27', start_time: '00:00', end_time: '23:59',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Regular Fall Classes End',
    description: 'Official Rutgers 2025-2026 academic calendar date.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2025-12-10', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Fall Reading Days Begin',
    description: 'Official Rutgers 2025-2026 academic calendar no-class reading day period begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2025-12-11', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Fall Exams Begin',
    description: 'Official Rutgers 2025-2026 academic calendar exam period begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2025-12-15', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Winter Session Begins',
    description: 'Official Rutgers 2025-2026 academic calendar Winter Session begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2025-12-22', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'January Intersession Begins',
    description: 'Official Rutgers 2025-2026 academic calendar January Intersession begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2026-01-05', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Spring Semester Begins',
    description: 'Official Rutgers 2025-2026 academic calendar date.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2026-01-20', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Spring First 7-Week Minicourse Period Begins',
    description: 'Official Rutgers 2025-2026 academic calendar date range begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2026-01-20', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Spring Second 7-Week Minicourse Period Begins',
    description: 'Official Rutgers 2025-2026 academic calendar date range begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2026-03-10', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Spring Recess Begins',
    description: 'Official Rutgers 2025-2026 academic calendar no-class period begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2026-03-14', start_time: '00:00', end_time: '23:59',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Rutgers Day 2026',
    description: 'Rutgers Day is scheduled for Saturday, April 25, 2026, 10 a.m.-4 p.m., across Busch, College Avenue, and Cook/Douglass campuses.',
    org: 'Rutgers University-New Brunswick',
    location: 'Multiple Campuses',
    event_category: 'Campus Life',
    event_date: '2026-04-25', start_time: '10:00', end_time: '16:00',
    source_url: 'https://newbrunswick.rutgers.edu/events/campus-life'
  },
  {
    event_name: 'Regular Spring Classes End',
    description: 'Official Rutgers 2025-2026 academic calendar date.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2026-05-04', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Spring Reading Days Begin',
    description: 'Official Rutgers 2025-2026 academic calendar no-class reading day period begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2026-05-05', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Late Night: Prehistoric Creatures May 2026',
    description: 'Rutgers Geology Museum event listed for May 7, 2026 from 4:00 PM to 8:00 PM at the Geology Museum.',
    org: 'Rutgers Geology Museum',
    location: 'Geology Museum',
    event_category: 'Campus Life',
    event_date: '2026-05-07', start_time: '16:00', end_time: '20:00',
    source_url: 'https://eps.rutgers.edu/about-us/event-details/1649-late-nigh-prehistoric-creature'
  },
  {
    event_name: 'Spring Exams Begin',
    description: 'Official Rutgers 2025-2026 academic calendar exam period begins.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Academic',
    event_date: '2026-05-07', start_time: '08:00', end_time: '17:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  },
  {
    event_name: 'Rutgers-New Brunswick and Rutgers Health Commencement',
    description: 'Official Rutgers 2025-2026 academic calendar commencement date.',
    org: 'Rutgers Academic Scheduling and Instructional Space',
    location: 'Rutgers University',
    event_category: 'Commencement',
    event_date: '2026-05-17', start_time: '10:00', end_time: '13:00',
    source_url: 'https://scheduling.rutgers.edu/academic-calendar/'
  }
];

const demoStudentEvents = [
  {
    event_name: 'Student Organization Showcase Demo',
    description: 'Example of a student-submitted listing. Replace this with a real user-created event through the dashboard.',
    org: 'Student Organization Demo Account',
    location: 'College Avenue Student Center',
    event_category: 'Student Organization',
    event_date: '2026-02-18', start_time: '18:00', end_time: '20:00',
    source_system: 'user_submitted_demo'
  },
  {
    event_name: 'Rutgers Career Prep Demo Event',
    description: 'Example submission showing how organizations can publish events into the catalog.',
    org: 'Student Organization Demo Account',
    location: 'Livingston Student Center',
    event_category: 'Careers & Entrepreneurship',
    event_date: '2026-03-26', start_time: '19:00', end_time: '20:30',
    source_system: 'user_submitted_demo'
  }
];

async function insertLookupData() {
  for (const org of organizations) {
    await run('INSERT INTO organizations (organization_name, organization_type, contact_email) VALUES (?, ?, ?)', org);
  }
  for (const location of locations) {
    await run('INSERT INTO locations (building_name, room_name, campus_zone, capacity, has_av) VALUES (?, ?, ?, ?, ?)', location);
  }
}

async function orgId(name) {
  const row = await all('SELECT organization_id FROM organizations WHERE organization_name = ?', [name]);
  return row[0].organization_id;
}

async function locationId(name) {
  const row = await all('SELECT location_id FROM locations WHERE building_name = ?', [name]);
  return row[0].location_id;
}

async function insertEvent(event, status = 'Published') {
  const result = await run(
    `INSERT INTO events
      (event_name, description, organization_id, location_id, event_category, event_date, start_time, end_time, status, source_system, source_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      event.event_name,
      event.description,
      await orgId(event.org),
      await locationId(event.location),
      event.event_category,
      event.event_date,
      event.start_time,
      event.end_time,
      status,
      event.source_system || 'rutgers_public_source',
      event.source_url || null
    ]
  );
  await run('INSERT INTO attendance (event_id, registered_count, attended_count, waitlist_count) VALUES (?, 0, 0, 0)', [result.id]);
  await run('INSERT INTO budgets (event_id, planned_budget, actual_spend) VALUES (?, 0, 0)', [result.id]);
}

async function main() {
  await insertLookupData();
  for (const event of publicEvents) await insertEvent(event, 'Published');
  for (const event of demoStudentEvents) await insertEvent(event, 'Submitted');
  console.log(`Seed complete: ${publicEvents.length} verified Rutgers records and ${demoStudentEvents.length} demo submissions inserted.`);
  db.close();
}

main().catch((error) => {
  console.error('Seed failed:', error.message);
  db.close();
  process.exit(1);
});
