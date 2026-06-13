const express = require('express');
const { all } = require('../db/database');
const { buildEventFilters } = require('../utils/queryBuilder');

const router = express.Router();

function csvEscape(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

router.get('/events.csv', async (req, res, next) => {
  try {
    const { whereSql, params } = buildEventFilters(req.query);
    const rows = await all(`SELECT * FROM v_event_performance ${whereSql} ORDER BY event_date DESC, start_time DESC`, params);
    const headers = [
      'event_id', 'event_name', 'organization_name', 'event_category', 'event_date', 'start_time', 'campus_zone',
      'capacity', 'registered_count', 'attended_count', 'attendance_rate', 'room_utilization_rate', 'actual_spend',
      'cost_per_attendee', 'avg_rating', 'status'
    ];
    const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('campus_event_export.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
