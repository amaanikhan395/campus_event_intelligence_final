const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const createApp = require('../backend/server');

const app = createApp();

test('health endpoint returns project status', async () => {
  const res = await request(app).get('/api/health').expect(200);
  assert.equal(res.body.status, 'ok');
});

test('events endpoint supports pagination', async () => {
  const res = await request(app).get('/api/events?limit=5').expect(200);
  assert.equal(res.body.limit, 5);
  assert.ok(Array.isArray(res.body.results));
});

test('analytics summary returns KPI fields', async () => {
  const res = await request(app).get('/api/analytics/summary').expect(200);
  assert.ok(Object.prototype.hasOwnProperty.call(res.body, 'total_events'));
  assert.ok(Object.prototype.hasOwnProperty.call(res.body, 'avg_attendance_rate'));
});
