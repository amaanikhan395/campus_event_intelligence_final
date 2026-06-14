const API = '/api';

const categories = ['Academic','Campus Life','Careers & Entrepreneurship','Commencement','Community','Arts','Training/Workshop','Student Organization','Athletics','Other'];
const zones = ['College Ave','Livingston','Busch','Cook/Douglass','Online','New Brunswick','Piscataway','Multiple Campuses'];

function token() { return localStorage.getItem('rutgers_events_token'); }

function setMessage(text, type = 'info') {
  const box = document.getElementById('messageBox');
  if (!box) return;
  box.textContent = text;
  box.className = `message ${type}`;
  box.style.display = text ? 'block' : 'none';
}

function updateNav() {
  const loggedIn = Boolean(token());
  document.querySelectorAll('.auth-only').forEach((el) => el.classList.toggle('hidden', !loggedIn));
  document.querySelectorAll('.guest-only').forEach((el) => el.classList.toggle('hidden', loggedIn));
  const logout = document.getElementById('logoutButton');
  if (logout) logout.addEventListener('click', () => {
    localStorage.removeItem('rutgers_events_token');
    localStorage.removeItem('rutgers_events_user');
    window.location.href = '/';
  });
}

function populateSelect(id, values) {
  const select = document.getElementById(id);
  if (!select) return;
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

function time(value) { return value ? value.slice(0, 5) : ''; }
function statusClass(status) { return `status ${status || 'pending'}`; }

function eventCard(event) {
  const source = event.source_url ? `<a href="${event.source_url}" target="_blank" rel="noreferrer">Source</a>` : '';
  return `
    <article class="event-card">
      <div class="event-card-top">
        <span class="${statusClass(event.status)}">${event.status || 'pending'}</span>
        <span class="going-count">${event.going_count || 0} going</span>
      </div>
      <h3>${event.title}</h3>
      <p>${event.description || ''}</p>
      <dl>
        <div><dt>Date</dt><dd>${formatDate(event.event_date)}</dd></div>
        <div><dt>Time</dt><dd>${time(event.start_time_est)}-${time(event.end_time_est)} EST</dd></div>
        <div><dt>Category</dt><dd>${event.category}</dd></div>
        <div><dt>Campus</dt><dd>${event.campus_zone}</dd></div>
        <div><dt>Location</dt><dd>${event.location}</dd></div>
        <div><dt>Posted by</dt><dd>${event.posted_by || 'Rutgers source'}</dd></div>
      </dl>
      <div class="event-actions">
        <button class="primary-button going-button" data-event-id="${event.id}">Going</button>
        ${source}
      </div>
    </article>
  `;
}

async function loadEvents() {
  const params = new URLSearchParams();
  const search = document.getElementById('searchInput')?.value.trim();
  const category = document.getElementById('categoryFilter')?.value;
  const campusZone = document.getElementById('zoneFilter')?.value;
  const status = document.getElementById('statusFilter')?.value;
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (campusZone) params.set('campus_zone', campusZone);
  if (status) params.set('status', status);

  const response = await fetch(`${API}/events?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load events.');

  const events = data.events || [];
  const grid = document.getElementById('eventsGrid');
  grid.innerHTML = events.length ? events.map(eventCard).join('') : `<div class="empty-state">No events found. Try changing your filters.</div>`;
  updateSummary(events);
  attachGoingButtons();
}

function updateSummary(events) {
  const total = events.length;
  const upcoming = events.filter((e) => e.status === 'pending' || e.status === 'ongoing').length;
  const zoneCount = new Set(events.map((e) => e.campus_zone).filter(Boolean)).size;
  const categoryCount = new Set(events.map((e) => e.category).filter(Boolean)).size;
  const values = { totalEvents: total, upcomingEvents: upcoming, campusZones: zoneCount, categoriesCount: categoryCount, previewEventCount: total, previewCategoryCount: categoryCount, previewZoneCount: zoneCount };
  Object.entries(values).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
}

function attachGoingButtons() {
  document.querySelectorAll('.going-button').forEach((button) => {
    button.addEventListener('click', async () => {
      if (!token()) {
        window.location.href = '/login.html';
        return;
      }
      try {
        const response = await fetch(`${API}/events/${button.dataset.eventId}/going`, { method: 'POST', headers: { Authorization: `Bearer ${token()}` } });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not RSVP.');
        setMessage(data.message || 'You are marked as going.', 'success');
        await loadEvents();
      } catch (error) {
        setMessage(error.message, 'error');
      }
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  updateNav();
  populateSelect('categoryFilter', categories);
  populateSelect('zoneFilter', zones);
  document.getElementById('applyFilters')?.addEventListener('click', loadEvents);
  try { await loadEvents(); } catch (error) { setMessage(error.message, 'error'); }
});
