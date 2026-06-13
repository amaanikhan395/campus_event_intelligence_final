const { run, all, db } = require('./database');

let seed = 42;
function random() {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
}
function randomInt(min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}
function randomItem(items) {
  return items[Math.floor(random() * items.length)];
}
function pad(value) {
  return String(value).padStart(2, '0');
}
function isoDateFromOffset(offset) {
  const date = new Date(Date.UTC(2025, 0, 13));
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
function timeFromHour(hour) {
  return `${pad(hour)}:00`;
}

const organizations = [
  ['Finance Association', 'Student Organization', 'finance@campus.edu'],
  ['Business Analytics Club', 'Student Organization', 'bait@campus.edu'],
  ['Career Services', 'Career Services', 'careers@campus.edu'],
  ['Computer Science Department', 'Department', 'cs@campus.edu'],
  ['Honors College', 'Academic Program', 'honors@campus.edu'],
  ['Student Government', 'Student Organization', 'sg@campus.edu'],
  ['Greek Life Council', 'Greek Life', 'greeklife@campus.edu'],
  ['Entrepreneurship Society', 'Student Organization', 'startup@campus.edu'],
  ['Supply Chain Club', 'Student Organization', 'supplychain@campus.edu'],
  ['Accounting Society', 'Student Organization', 'accounting@campus.edu'],
  ['Women in Technology', 'Student Organization', 'wit@campus.edu'],
  ['Data Science Institute', 'Academic Program', 'datascience@campus.edu']
];

const locations = [
  ['Livingston Student Center', 'Room 202', 'Livingston', 120, 1],
  ['Business School', 'Auditorium 1', 'Livingston', 300, 1],
  ['College Avenue Student Center', 'Multipurpose Room', 'College Ave', 180, 1],
  ['Busch Student Center', 'Conference Room A', 'Busch', 80, 1],
  ['Academic Building', 'Lecture Hall 1180', 'College Ave', 220, 1],
  ['Honors College', 'East Lounge', 'College Ave', 90, 1],
  ['Career Center', 'Interview Suite', 'College Ave', 60, 1],
  ['Library', 'Training Lab', 'Busch', 45, 1],
  ['Recreation Center', 'Main Gym', 'Livingston', 500, 1],
  ['Engineering Building', 'Room B120', 'Busch', 150, 1],
  ['Cook Student Center', 'Seminar Room', 'Cook/Douglass', 75, 1],
  ['Virtual Event Space', 'Zoom Webinar', 'Online', 1000, 0]
];

const categories = ['Career', 'Academic', 'Social', 'Workshop', 'Fundraiser', 'Networking', 'Community Service'];
const prefixes = ['Resume Review', 'Alumni Panel', 'Case Workshop', 'Excel Bootcamp', 'Python Lab', 'Networking Night', 'Speaker Series', 'Community Cleanup', 'Fundraiser', 'Leadership Training', 'SQL Clinic', 'Interview Prep'];
const fundingSources = ['Organization Budget', 'Student Affairs Grant', 'Department Budget', 'Corporate Sponsor', 'Ticket Revenue'];
const positiveComments = ['Strong turnout and practical content.', 'Students said the session was useful.', 'Great speaker quality and smooth check-in.'];
const neutralComments = ['Good event, but timing could be improved.', 'Content was helpful but room setup was tight.', 'Average turnout with some scheduling conflicts.'];
const negativeComments = ['Attendance was below expectations.', 'Room was too large for the audience.', 'Several students reported unclear instructions.'];

async function insertLookupData() {
  for (const org of organizations) {
    await run('INSERT INTO organizations (organization_name, organization_type, contact_email) VALUES (?, ?, ?)', org);
  }
  for (const location of locations) {
    await run('INSERT INTO locations (building_name, room_name, campus_zone, capacity, has_av) VALUES (?, ?, ?, ?, ?)', location);
  }
}

function buildEventName(index, category) {
  const prefix = randomItem(prefixes);
  const term = index % 3 === 0 ? 'Spring' : index % 3 === 1 ? 'Fall' : 'Mid-Semester';
  return `${prefix}: ${category} ${term} ${index + 1}`;
}

async function insertEvents() {
  const orgRows = await all('SELECT * FROM organizations');
  const locationRows = await all('SELECT * FROM locations');

  for (let i = 0; i < 720; i += 1) {
    const category = randomItem(categories);
    const org = randomItem(orgRows);
    const location = randomItem(locationRows);
    const eventDate = isoDateFromOffset(i % 310);
    const startHour = randomItem([9, 10, 11, 12, 14, 15, 16, 17, 18, 19]);
    const duration = randomItem([1, 1, 1, 2, 2, 3]);
    const capacity = location.capacity;
    const expected = Math.max(15, Math.min(capacity, Math.round(capacity * (0.25 + random() * 0.65))));
    const registered = Math.max(0, Math.round(expected * (0.7 + random() * 0.7)));
    const attended = Math.max(0, Math.min(registered, Math.round(registered * (0.55 + random() * 0.4))));
    const waitlist = registered > capacity ? randomInt(3, 35) : randomInt(0, 8);
    const plannedBudget = Number((randomInt(150, 5000) + expected * randomInt(3, 12)).toFixed(2));
    const actualSpend = Number((plannedBudget * (0.75 + random() * 0.55)).toFixed(2));
    const status = i % 37 === 0 ? 'Cancelled' : i % 11 === 0 ? 'Planned' : 'Completed';

    const eventResult = await run(
      `INSERT INTO events
        (event_name, organization_id, location_id, event_category, event_date, start_time, end_time, expected_attendance, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [buildEventName(i, category), org.organization_id, location.location_id, category, eventDate, timeFromHour(startHour), timeFromHour(startHour + duration), expected, status]
    );

    await run(
      'INSERT INTO attendance (event_id, registered_count, attended_count, waitlist_count) VALUES (?, ?, ?, ?)',
      [eventResult.id, registered, status === 'Cancelled' ? 0 : attended, waitlist]
    );

    await run(
      'INSERT INTO budgets (event_id, planned_budget, actual_spend, funding_source, cost_center) VALUES (?, ?, ?, ?, ?)',
      [eventResult.id, plannedBudget, status === 'Cancelled' ? 0 : actualSpend, randomItem(fundingSources), `CC-${1000 + org.organization_id}`]
    );

    const feedbackCount = status === 'Completed' ? randomInt(1, 5) : 0;
    for (let j = 0; j < feedbackCount; j += 1) {
      const rating = randomInt(2, 5);
      const sentiment = rating >= 4 ? 'Positive' : rating === 3 ? 'Neutral' : 'Negative';
      const comments = sentiment === 'Positive' ? positiveComments : sentiment === 'Neutral' ? neutralComments : negativeComments;
      await run(
        'INSERT INTO feedback (event_id, rating, sentiment, comment) VALUES (?, ?, ?, ?)',
        [eventResult.id, rating, sentiment, randomItem(comments)]
      );
    }
  }
}

async function seedDb() {
  await insertLookupData();
  await insertEvents();
  const summary = await all('SELECT COUNT(*) AS events FROM events');
  console.log(`Seed complete: ${summary[0].events} events inserted.`);
}

if (require.main === module) {
  seedDb()
    .then(() => db.close())
    .catch((error) => {
      console.error('Seed failed:', error.message);
      db.close();
      process.exit(1);
    });
}

module.exports = seedDb;
