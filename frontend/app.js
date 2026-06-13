const API = '/api';
const categories = ['Academic', 'Campus Life', 'Careers & Entrepreneurship', 'Commencement', 'Community', 'Arts', 'Training/Workshop', 'Student Organization', 'Athletics', 'Other'];
const zones = ['College Ave', 'Livingston', 'Busch', 'Cook/Douglass', 'Online', 'New Brunswick', 'Piscataway', 'Multiple Campuses'];
const integer = new Intl.NumberFormat('en-US');

function num(value) { return value === null || value === undefined ? '0' : integer.format(value); }
function monthLabel(value) {
  const [year, month] = value.split('-');
  return new Date(Number(year), Number(month) - 1).toLocaleString('en-US', { month: 'short' });
}
function currentUser() { return JSON.parse(localStorage.getItem('cei_user') || 'null'); }
function saveUser(user) { localStorage.setItem('cei_user', JSON.stringify(user)); renderSignedInState(); }
async function api(path, options = {}) {
  const response = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...options });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `API request failed: ${path}`);
  return payload;
}
function populateSelect(id, values) {
  const select = document.getElementById(id);
  values.forEach((value) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}
function renderSignedInState() {
  const user = currentUser();
  document.getElementById('signedInState').textContent = user ? `Signed in as ${user.full_name} (${user.email})` : '';
}
function renderCards(summary) {
  const cards = [
    ['Verified Rutgers records', num(summary.verified_source_events)],
    ['Submitted events', num(summary.submitted_events)],
    ['Organizations indexed', num(summary.total_organizations)],
    ['Campus zones', num(summary.campus_zones)]
  ];
  document.getElementById('summaryCards').innerHTML = cards.map(([label, value]) => `
    <article class="card"><p>${label}</p><strong>${value}</strong></article>
  `).join('');
}
function renderInsights(data) {
  const insights = [
    ['Top category', `${data.top_category?.event_category || 'n/a'} · ${num(data.top_category?.event_count)} records`],
    ['Most common zone', `${data.top_zone?.campus_zone || 'n/a'} · ${num(data.top_zone?.event_count)} records`],
    ['Most active organization', `${data.top_organization?.organization_name || 'n/a'} · ${num(data.top_organization?.event_count)} records`],
    ['User-submitted listings', `${num(data.submitted_events)} events available in filters`]
  ];
  document.getElementById('insightsPanel').innerHTML = insights.map(([label, value]) => `
    <article class="insight-card"><p>${label}</p><strong>${value}</strong></article>
  `).join('');
}
function queryString() {
  const params = new URLSearchParams({ limit: '80', sort: 'date' });
  const search = document.getElementById('searchInput').value.trim();
  const category = document.getElementById('categoryFilter').value;
  const zone = document.getElementById('zoneFilter').value;
  const status = document.getElementById('statusFilter').value;
  if (search) params.set('search', search);
  if (category) params.set('category', category);
  if (zone) params.set('zone', zone);
  if (status) params.set('status', status);
  return params.toString();
}
async function loadEvents() {
  const data = await api(`/events?${queryString()}`);
  document.getElementById('eventsTable').innerHTML = data.results.map((event) => `
    <tr>
      <td>${event.event_date}<small>${event.start_time} to ${event.end_time}</small></td>
      <td><strong>${event.event_name}</strong><small>${event.description || ''}</small></td>
      <td>${event.organization_name}<small>${event.organization_type}</small></td>
      <td><span class="pill">${event.event_category}</span></td>
      <td>${event.building_name}<small>${event.room_name} · ${event.campus_zone}</small></td>
      <td><span class="status ${event.status}">${event.status}</span><small>${event.source_system.replaceAll('_', ' ')}</small></td>
      <td>${event.source_url ? `<a class="source-link" href="${event.source_url}" target="_blank" rel="noreferrer">View source</a>` : '<span class="pill">Submitted</span>'}</td>
    </tr>
  `).join('');
}
function drawBarChart(canvasId, rows, labelKey, valueKey) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth * dpr;
  const height = canvas.height * dpr;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.font = `${12 * dpr}px system-ui`;
  const padding = 42 * dpr;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 1.7;
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  const gap = 10 * dpr;
  const barWidth = chartWidth / rows.length - gap;
  ctx.strokeStyle = '#eadde0'; ctx.lineWidth = 1 * dpr;
  ctx.beginPath(); ctx.moveTo(padding, padding / 2); ctx.lineTo(padding, chartHeight + padding / 2); ctx.lineTo(width - padding / 2, chartHeight + padding / 2); ctx.stroke();
  rows.forEach((row, index) => {
    const value = Number(row[valueKey] || 0);
    const barHeight = Math.max(4 * dpr, chartHeight * (value / max));
    const x = padding + index * (barWidth + gap);
    const y = chartHeight + padding / 2 - barHeight;
    const gradient = ctx.createLinearGradient(0, y, 0, chartHeight + padding / 2);
    gradient.addColorStop(0, '#cc0033'); gradient.addColorStop(1, '#8f001f');
    ctx.fillStyle = gradient; ctx.fillRect(x, y, Math.max(barWidth, 1), barHeight);
    ctx.fillStyle = '#7a1026';
    const label = labelKey === 'period' ? monthLabel(row[labelKey]) : String(row[labelKey]).slice(0, 10);
    ctx.fillText(label, x, height - 10 * dpr);
  });
}
async function loadCharts() {
  const trends = await api('/analytics/event-trends');
  const categoryRows = await api('/analytics/category-mix');
  drawBarChart('trendChart', trends, 'period', 'event_count');
  drawBarChart('categoryChart', categoryRows, 'event_category', 'event_count');
}
async function loadLists() {
  const [upcoming, organizations, sources] = await Promise.all([
    api('/analytics/upcoming'),
    api('/organizations/leaderboard'),
    api('/analytics/source-mix')
  ]);
  document.getElementById('upcomingList').innerHTML = (upcoming.length ? upcoming : []).slice(0, 8).map((event) => `
    <div class="item"><strong>${event.event_name}</strong><span>${event.event_date} · ${event.building_name} · ${event.event_category}</span></div>
  `).join('') || '<div class="item"><strong>No future seeded events</strong><span>Add one through the submission form.</span></div>';
  document.getElementById('organizationList').innerHTML = organizations.slice(0, 8).map((org) => `
    <div class="item"><strong>${org.organization_name}</strong><span>${num(org.event_count)} records · ${org.organization_type}</span></div>
  `).join('');
  document.getElementById('sourceList').innerHTML = sources.map((row) => `
    <div class="item"><strong>${row.source_system.replaceAll('_', ' ')}</strong><span>${num(row.event_count)} records</span></div>
  `).join('');
}
async function refreshDashboard() {
  const [summary, insights] = await Promise.all([api('/analytics/summary'), api('/analytics/insights')]);
  renderCards(summary); renderInsights(insights);
  await Promise.all([loadEvents(), loadCharts(), loadLists()]);
}
document.getElementById('accountForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const user = await api('/auth/signup', { method: 'POST', body: JSON.stringify({ full_name: fullName.value, email: email.value, role: role.value }) });
  saveUser(user);
});
document.getElementById('eventForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const user = currentUser();
  if (!user) { formMessage.textContent = 'Create or sign in to an account before posting an event.'; return; }
  const payload = {
    user_id: user.user_id, email: user.email,
    event_name: eventName.value, organization_name: organizationName.value, event_category: eventCategory.value,
    event_date: eventDate.value, start_time: startTime.value, end_time: endTime.value,
    building_name: buildingName.value, room_name: roomName.value || 'TBD', campus_zone: campusZone.value,
    description: eventDescription.value, status: 'Submitted'
  };
  const created = await api('/events', { method: 'POST', body: JSON.stringify(payload) });
  formMessage.textContent = `Submitted: ${created.event_name}. It is now visible in the Event Explorer.`;
  event.target.reset();
  await refreshDashboard();
});
document.getElementById('openAccountButton').addEventListener('click', () => document.getElementById('accountPanel').scrollIntoView({ behavior: 'smooth' }));
document.getElementById('openPostButton').addEventListener('click', () => document.getElementById('postPanel').scrollIntoView({ behavior: 'smooth' }));
document.getElementById('filterButton').addEventListener('click', loadEvents);
document.getElementById('searchInput').addEventListener('keydown', (event) => { if (event.key === 'Enter') loadEvents(); });
window.addEventListener('resize', () => loadCharts().catch(console.error));

populateSelect('categoryFilter', categories); populateSelect('eventCategory', categories); populateSelect('zoneFilter', zones); populateSelect('campusZone', zones); renderSignedInState();
refreshDashboard().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML('afterbegin', `<div style="padding:16px;background:#fee4e2;color:#b42318">${error.message}. Run <code>npm run reset</code> and <code>npm start</code> from the backend folder.</div>`);
});
