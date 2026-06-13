const express = require('express');
const { all, get, run } = require('../db/database');
const { buildEventFilters, toPositiveInt } = require('../utils/queryBuilder');
const { badRequest } = require('../middleware/errors');

const router = express.Router();
const allowedCategories = new Set(['Career', 'Academic', 'Social', 'Workshop', 'Fundraiser', 'Networking', 'Community Service']);
const allowedStatuses = new Set(['Planned', 'Completed', 'Cancelled']);

router.get('/', async (req, res, next) => {
  try {
    const limit = toPositiveInt(req.query.limit, 50, 200);
    const page = toPositiveInt(req.query.page, 1, 10000);
    const offset = (page - 1) * limit;
    const sortMap = {
      date: 'event_date DESC, start_time DESC',
      attendance: 'attended_count DESC',
      rating: 'avg_rating DESC',
      efficiency: 'cost_per_attendee ASC'
    };
    const orderBy = sortMap[req.query.sort] || sortMap.date;
    const { whereSql, params } = buildEventFilters(req.query);

    const rows = await all(
      `SELECT * FROM v_event_performance ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const count = await get(`SELECT COUNT(*) AS total FROM v_event_performance ${whereSql}`, params);
    res.json({ page, limit, total: count.total, results: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await get('SELECT * FROM v_event_performance WHERE event_id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const feedback = await all('SELECT rating, sentiment, comment, submitted_at FROM feedback WHERE event_id = ? ORDER BY submitted_at DESC', [req.params.id]);
    const audit = await all('SELECT action, old_status, new_status, changed_at FROM event_audit_log WHERE event_id = ? ORDER BY changed_at DESC', [req.params.id]);
    res.json({ ...event, feedback, audit });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = req.body;
    const required = ['event_name', 'organization_id', 'location_id', 'event_category', 'event_date', 'start_time', 'end_time'];
    const missing = required.filter((field) => body[field] === undefined || body[field] === '');
    if (missing.length) throw badRequest(`Missing required fields: ${missing.join(', ')}`);
    if (!allowedCategories.has(body.event_category)) throw badRequest('Invalid event_category');
    if (body.status && !allowedStatuses.has(body.status)) throw badRequest('Invalid status');

    const result = await run(
      `INSERT INTO events
        (event_name, organization_id, location_id, event_category, event_date, start_time, end_time, expected_attendance, status, source_system)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.event_name.trim(), Number(body.organization_id), Number(body.location_id), body.event_category,
        body.event_date, body.start_time, body.end_time, Number(body.expected_attendance || 0),
        body.status || 'Planned', body.source_system || 'manual_api'
      ]
    );

    await run('INSERT INTO attendance (event_id, registered_count, attended_count, waitlist_count) VALUES (?, ?, ?, ?)', [result.id, 0, 0, 0]);
    await run('INSERT INTO budgets (event_id, planned_budget, actual_spend, funding_source) VALUES (?, ?, ?, ?)', [result.id, Number(body.planned_budget || 0), Number(body.actual_spend || 0), body.funding_source || 'Organization Budget']);
    const created = await get('SELECT * FROM v_event_performance WHERE event_id = ?', [result.id]);
    res.status(201).json(created);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) error.status = 409;
    next(error);
  }
});

router.put('/:id/attendance', async (req, res, next) => {
  try {
    const registered = Number(req.body.registered_count);
    const attended = Number(req.body.attended_count);
    const waitlist = Number(req.body.waitlist_count || 0);
    if ([registered, attended, waitlist].some((value) => Number.isNaN(value) || value < 0)) throw badRequest('Attendance counts must be non-negative numbers');
    if (attended > registered) throw badRequest('attended_count cannot exceed registered_count');

    const result = await run(
      'UPDATE attendance SET registered_count = ?, attended_count = ?, waitlist_count = ?, checked_in_by = ? WHERE event_id = ?',
      [registered, attended, waitlist, req.body.checked_in_by || 'api_user', req.params.id]
    );
    if (!result.changes) return res.status(404).json({ error: 'Event not found' });
    const updated = await get('SELECT * FROM v_event_performance WHERE event_id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    if (!allowedStatuses.has(req.body.status)) throw badRequest('Invalid status');
    const result = await run('UPDATE events SET status = ? WHERE event_id = ?', [req.body.status, req.params.id]);
    if (!result.changes) return res.status(404).json({ error: 'Event not found' });
    const updated = await get('SELECT * FROM v_event_performance WHERE event_id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/feedback', async (req, res, next) => {
  try {
    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw badRequest('rating must be an integer from 1 to 5');
    const sentiment = req.body.sentiment || (rating >= 4 ? 'Positive' : rating === 3 ? 'Neutral' : 'Negative');
    await run('INSERT INTO feedback (event_id, rating, sentiment, comment) VALUES (?, ?, ?, ?)', [req.params.id, rating, sentiment, req.body.comment || '']);
    const updated = await get('SELECT * FROM v_event_performance WHERE event_id = ?', [req.params.id]);
    res.status(201).json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
