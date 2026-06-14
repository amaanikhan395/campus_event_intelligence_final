const API = '/api';

function token() { return localStorage.getItem('rutgers_events_token'); }

function setMessage(text, type = 'info') {
  const box = document.getElementById('messageBox');
  if (!box) return;
  box.textContent = text;
  box.className = `message ${type}`;
  box.style.display = text ? 'block' : 'none';
}

function logout() {
  localStorage.removeItem('rutgers_events_token');
  localStorage.removeItem('rutgers_events_user');
  window.location.href = '/login.html';
}

function requireLogin() {
  if (!token()) window.location.href = '/login.html';
}

function setupLogout() {
  document.getElementById('logoutButton')?.addEventListener('click', logout);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token()) headers.Authorization = `Bearer ${token()}`;
  const response = await fetch(`${API}${path}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Request failed.');
  return data;
}

function formData(form) { return Object.fromEntries(new FormData(form).entries()); }

function handleSignup() {
  const form = document.getElementById('signupForm');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const data = await api('/auth/signup', { method: 'POST', body: JSON.stringify(formData(form)) });
      setMessage(data.message || 'Account created. Check your email to verify your account.', 'success');
      form.reset();
    } catch (error) { setMessage(error.message, 'error'); }
  });
}

function handleLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(formData(form)) });
      localStorage.setItem('rutgers_events_token', data.token);
      localStorage.setItem('rutgers_events_user', JSON.stringify(data.user));
      setMessage('Login successful. Redirecting...', 'success');
      setTimeout(() => { window.location.href = '/profile.html'; }, 600);
    } catch (error) { setMessage(error.message, 'error'); }
  });
}

function handleCreateEvent() {
  const form = document.getElementById('eventForm');
  if (!form) return;
  requireLogin();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');
    try {
      const data = await api('/events', { method: 'POST', body: JSON.stringify(formData(form)) });
      setMessage(data.message || 'Event posted successfully.', 'success');
      form.reset();
    } catch (error) { setMessage(error.message, 'error'); }
  });
}

function myEventCard(event) {
  const date = new Date(event.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
  return `
    <article class="event-card">
      <div class="event-card-top"><span class="status ${event.status || 'pending'}">${event.status || 'pending'}</span><span class="going-count">${event.going_count || 0} going</span></div>
      <h3>${event.title}</h3>
      <p>${event.description || ''}</p>
      <dl>
        <div><dt>Date</dt><dd>${date}</dd></div>
        <div><dt>Time</dt><dd>${event.start_time_est?.slice(0, 5)}-${event.end_time_est?.slice(0, 5)} EST</dd></div>
        <div><dt>Campus</dt><dd>${event.campus_zone}</dd></div>
        <div><dt>Location</dt><dd>${event.location}</dd></div>
      </dl>
      <button class="danger-button delete-event-button" data-event-id="${event.id}">Delete Event</button>
    </article>
  `;
}

async function handleProfile() {
  if (!document.getElementById('profileName')) return;
  requireLogin();

  try {
    const me = await api('/auth/me');
    const u = me.user;
    document.getElementById('profileName').textContent = u.full_name;
    document.getElementById('profileEmail').textContent = u.email;
    const verification = document.getElementById('verificationStatus');
    verification.textContent = u.is_verified ? 'Verified account' : 'Email not verified';
    verification.className = `verification-pill ${u.is_verified ? 'verified' : 'unverified'}`;

    const eventsData = await api('/events/profile/mine');
    const events = eventsData.events || [];
    const grid = document.getElementById('myEventsGrid');
    grid.innerHTML = events.length ? events.map(myEventCard).join('') : `<div class="empty-state">You have not posted any events yet.</div>`;

    document.querySelectorAll('.delete-event-button').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!confirm('Delete this event?')) return;
        try {
          await api(`/events/${button.dataset.eventId}`, { method: 'DELETE' });
          setMessage('Event deleted.', 'success');
          await handleProfile();
        } catch (error) { setMessage(error.message, 'error'); }
      });
    });
  } catch (error) { setMessage(error.message, 'error'); }

  document.getElementById('deleteAccountButton')?.addEventListener('click', async () => {
    if (!confirm('Delete your account? This will disable your account access.')) return;
    try {
      await api('/auth/account', { method: 'DELETE' });
      localStorage.removeItem('rutgers_events_token');
      localStorage.removeItem('rutgers_events_user');
      window.location.href = '/';
    } catch (error) { setMessage(error.message, 'error'); }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupLogout();
  handleSignup();
  handleLogin();
  handleCreateEvent();
  handleProfile();
});
