const express = require('express');
const { all, get, run } = require('../db/database');
const { buildEventFilters, toPositiveInt } = require('../utils/queryBuilder');
const { badRequest } = require('../middleware/errors');

const router = express.Router();
const allowedCategories = new Set(['Academic', 'Campus Life', 'Careers & Entrepreneurship', 'Commencement', 'Community', 'Arts', 'Training/Workshop', 'Student Organization', 'Athletics', 'Other']);
const allowedStatuses = new Set(['Published', 'Submitted', 'Cancelled']);

router.get('/', async (req, res, next) => {
  try {
    const limit = toPositiveInt(req.query.limit, 50, 200);
    const page = toPositiveInt(req.query.page, 1, 10000);
    const offset = (page - 1) * limit;
    const sortMap = {
      date: 'event_date ASC, start_time ASC',
      newest: 'created_at DESC',
      category: 'event_category ASC, event_date ASC',
      organization: 'organization_name ASC, event_date ASC'
    };
    const orderBy = sortMap[req.query.sort] || sortMap.date;
    const { whereSql, params } = buildEventFilters(req.query);

    const rows = await all(
      `SELECT * FROM v_event_catalog ${whereSql} ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );
    const count = await get(`SELECT COUNT(*) AS total FROM v_event_catalog ${whereSql}`, params);
    res.json({ page, limit, total: count.total, results: rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const event = await get('SELECT * FROM v_event_catalog WHERE event_id = ?', [req.params.id]);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const audit = await all('SELECT action, old_status, new_status, changed_at FROM event_audit_log WHERE event_id = ? ORDER BY changed_at DESC', [req.params.id]);
    res.json({ ...event, audit });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const body = req.body;
    const required = ['event_name', 'organization_name', 'event_category', 'event_date', 'start_time', 'end_time', 'building_name', 'campus_zone'];
    const missing = required.filter((field) => body[field] === undefined || body[field] === '');
    if (missing.length) throw badRequest(`Missing required fields: ${missing.join(', ')}`);
    if (!allowedCategories.has(body.event_category)) throw badRequest('Invalid event_category');
    if (body.status && !allowedStatuses.has(body.status)) throw badRequest('Invalid status');

    let userId = body.user_id ? Number(body.user_id) : null;
    if (!userId && body.email) {
      const existingUser = await get('SELECT user_id FROM users WHERE email = ?', [body.email.trim().toLowerCase()]);
      if (existingUser) userId = existingUser.user_id;
    }

    let org = await get('SELECT organization_id FROM organizations WHERE organization_name = ?', [body.organization_name.trim()]);
    if (!org) {
      const orgResult = await run(
        'INSERT INTO organizations (organization_name, organization_type, contact_email) VALUES (?, ?, ?)',
        [body.organization_name.trim(), body.organization_type || 'Student Organization', body.email || null]
      );
      org = { organization_id: orgResult.id };
    }

    let location = await get('SELECT location_id FROM locations WHERE building_name = ? AND room_name = ?', [body.building_name.trim(), (body.room_name || 'TBD').trim()]);
    if (!location) {
      const locResult = await run(
        'INSERT INTO locations (building_name, room_name, campus_zone, capacity, has_av) VALUES (?, ?, ?, ?, ?)',
        [body.building_name.trim(), (body.room_name || 'TBD').trim(), body.campus_zone, Number(body.capacity || 0), 1]
      );
      location = { location_id: locResult.id };
    }

    const result = await run(
      `INSERT INTO events
        (event_name, description, organization_id, location_id, event_category, event_date, start_time, end_time, status, source_system, source_url, submitted_by_user_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        body.event_name.trim(), body.description || '', org.organization_id, location.location_id, body.event_category,
        body.event_date, body.start_time, body.end_time, body.status || 'Submitted', 'user_submitted', body.source_url || null, userId
      ]
    );

    await run('INSERT INTO attendance (event_id, registered_count, attended_count, waitlist_count) VALUES (?, 0, 0, 0)', [result.id]);
    await run('INSERT INTO budgets (event_id, planned_budget, actual_spend) VALUES (?, 0, 0)', [result.id]);
    const created = await get('SELECT * FROM v_event_catalog WHERE event_id = ?', [result.id]);
    res.status(201).json(created);
  } catch (error) {
    if (String(error.message).includes('UNIQUE')) error.status = 409;
    next(error);
  }
});

router.patch('/:id/status', async (req, res, next) => {
  try {
    if (!allowedStatuses.has(req.body.status)) throw badRequest('Invalid status');
    const result = await run('UPDATE events SET status = ? WHERE event_id = ?', [req.body.status, req.params.id]);
    if (!result.changes) return res.status(404).json({ error: 'Event not found' });
    const updated = await get('SELECT * FROM v_event_catalog WHERE event_id = ?', [req.params.id]);
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
