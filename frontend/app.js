const API = '/api';
const categories = ['Career', 'Academic', 'Social', 'Workshop', 'Fundraiser', 'Networking', 'Community Service'];
const zones = ['College Ave', 'Livingston', 'Busch', 'Cook/Douglass', 'Online'];

const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('en-US');

function money(value) { return value === null || value === undefined ? 'n/a' : currency.format(value); }
function pct(value) { return value === null || value === undefined ? 'n/a' : `${decimal.format(value)}%`; }
function num(value) { return value === null || value === undefined ? '0' : integer.format(value); }

async function api(path) {
  const response = await fetch(`${API}${path}`);
  if (!response.ok) throw new Error(`API request failed: ${path}`);
  return response.json();
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

function renderCards(summary) {
  const cards = [
    ['Total Events', num(summary.total_events)],
    ['Total Attendance', num(summary.total_attendance)],
    ['Avg Attendance Rate', pct(summary.avg_attendance_rate)],
    ['Avg Room Utilization', pct(summary.avg_room_utilization)],
    ['Cost / Attendee', money(summary.cost_per_attendee)]
  ];
  document.getElementById('summaryCards').innerHTML = cards.map(([label, value]) => `
    <article class="card"><p>${label}</p><strong>${value}</strong></article>
  `).join('');
}

function renderInsights(data) {
  const insights = [
    ['Top attendance driver', `${data.attendance_driver?.event_category || 'n/a'} · ${num(data.attendance_driver?.attended)} attended`],
    ['Best time slot', `${data.best_time_slot?.hour_slot || 'n/a'} · ${pct(data.best_time_slot?.rate)} avg rate`],
    ['Strongest organization', `${data.strongest_organization?.organization_name || 'n/a'} · ${num(data.strongest_organization?.total_attendance)} attended`],
    ['Most cost efficient', `${data.most_cost_efficient_category?.event_category || 'n/a'} · ${money(data.most_cost_efficient_category?.cost_per_attendee)}`]
  ];
  document.getElementById('insightsPanel').innerHTML = insights.map(([label, value]) => `
    <article class="insight-card"><p>${label}</p><strong>${value}</strong></article>
  `).join('');
}

function queryString() {
  const params = new URLSearchParams({ limit: '25', sort: 'date' });
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
      <td><strong>${event.event_name}</strong><small>${event.status}</small></td>
      <td>${event.organization_name}<small>${event.organization_type}</small></td>
      <td><span class="pill">${event.event_category}</span></td>
      <td>${event.building_name}<small>${event.room_name} · ${event.campus_zone}</small></td>
      <td>${num(event.attended_count)} / ${num(event.registered_count)}<small>${pct(event.attendance_rate)}</small></td>
      <td>${pct(event.room_utilization_rate)}<small>Capacity ${num(event.capacity)}</small></td>
      <td>${money(event.cost_per_attendee)}<small>Spend ${money(event.actual_spend)}</small></td>
    </tr>
  `).join('');
}

function drawBarChart(canvasId, rows, labelKey, valueKey) {
  const canvas = document.getElementById(canvasId);
  const ctx = canvas.getContext('2d');
  const width = canvas.clientWidth * window.devicePixelRatio;
  const height = canvas.height * window.devicePixelRatio;
  canvas.width = width;
  canvas.height = height;
  ctx.clearRect(0, 0, width, height);
  ctx.font = `${12 * window.devicePixelRatio}px system-ui`;
  const padding = 38 * window.devicePixelRatio;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 1.6;
  const max = Math.max(...rows.map((row) => Number(row[valueKey] || 0)), 1);
  const gap = 8 * window.devicePixelRatio;
  const barWidth = chartWidth / rows.length - gap;

  ctx.strokeStyle = '#d9e2ec';
  ctx.beginPath();
  ctx.moveTo(padding, padding / 2);
  ctx.lineTo(padding, chartHeight + padding / 2);
  ctx.lineTo(width - padding / 2, chartHeight + padding / 2);
  ctx.stroke();

  rows.forEach((row, index) => {
    const value = Number(row[valueKey] || 0);
    const barHeight = chartHeight * (value / max);
    const x = padding + index * (barWidth + gap);
    const y = chartHeight + padding / 2 - barHeight;
    ctx.fillStyle = '#155eef';
    ctx.fillRect(x, y, Math.max(barWidth, 1), barHeight);
    ctx.fillStyle = '#64748b';
    const label = String(row[labelKey]).slice(-5);
    ctx.fillText(label, x, height - 8 * window.devicePixelRatio);
  });
}

async function loadCharts() {
  const trends = await api('/analytics/attendance-trends');
  const categories = await api('/analytics/category-mix');
  drawBarChart('trendChart', trends.slice(-12), 'period', 'attended');
  drawBarChart('categoryChart', categories, 'event_category', 'attended');
}

async function loadLists() {
  const [gaps, topEvents, budget] = await Promise.all([
    api('/analytics/scheduling-gaps'),
    api('/analytics/top-events'),
    api('/analytics/budget-efficiency')
  ]);

  document.getElementById('gapList').innerHTML = gaps.slice(0, 8).map((row) => {
    const cls = row.recommendation === 'Growth Opportunity' ? 'good' : row.recommendation === 'Congested' ? 'warn' : row.recommendation === 'Weak Slot' ? 'danger' : '';
    return `<div class="item"><strong>${row.day_of_week} at ${row.hour_slot}</strong><span>${num(row.event_count)} events · ${num(row.attended)} attended · ${pct(row.avg_room_utilization)} utilization</span><div class="badge ${cls}">${row.recommendation}</div></div>`;
  }).join('');

  document.getElementById('topEvents').innerHTML = topEvents.slice(0, 8).map((event) => `
    <div class="item"><strong>${event.event_name}</strong><span>${event.organization_name} · ${event.event_date} · ${num(event.attended_count)} attended</span><div class="badge good">${pct(event.attendance_rate)} attendance</div></div>
  `).join('');

  document.getElementById('budgetList').innerHTML = budget.map((row) => `
    <div class="item"><strong>${row.event_category}</strong><span>${num(row.event_count)} events · ${money(row.spend)} spend · ${num(row.attended)} attended</span><div class="badge good">${money(row.cost_per_attendee)} per attendee</div></div>
  `).join('');
}

async function loadQuality() {
  const q = await api('/analytics/data-quality');
  const items = [
    ['Duplicate risks', q.duplicate_risk_count],
    ['Completed events without feedback', q.events_without_feedback],
    ['Over-capacity events', q.over_capacity_events],
    ['Over-budget events', q.over_budget_events]
  ];
  document.getElementById('qualityGrid').innerHTML = items.map(([label, value]) => `
    <div class="quality-box"><strong>${num(value)}</strong><span>${label}</span></div>
  `).join('');
}

async function init() {
  populateSelect('categoryFilter', categories);
  populateSelect('zoneFilter', zones);
  const [summary, insights] = await Promise.all([api('/analytics/summary'), api('/analytics/insights')]);
  renderCards(summary);
  renderInsights(insights);
  await Promise.all([loadEvents(), loadCharts(), loadLists(), loadQuality()]);
}

document.getElementById('filterButton').addEventListener('click', loadEvents);
document.getElementById('searchInput').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') loadEvents();
});
window.addEventListener('resize', () => loadCharts().catch(console.error));

init().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML('afterbegin', '<div style="padding:16px;background:#fee4e2;color:#b42318">Could not load data. Run <code>npm run reset</code> and <code>npm start</code> from the backend folder.</div>');
});
