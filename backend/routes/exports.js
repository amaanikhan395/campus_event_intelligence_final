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
    const rows = await all(`SELECT * FROM v_event_catalog ${whereSql} ORDER BY event_date ASC, start_time ASC`, params);
    const headers = [
      'event_id', 'event_name', 'event_category', 'event_date', 'start_time', 'end_time',
      'organization_name', 'building_name', 'campus_zone', 'status', 'source_system', 'source_url'
    ];
    const csv = [headers.join(','), ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))].join('\n');
    res.header('Content-Type', 'text/csv');
    res.attachment('rutgers_event_catalog.csv');
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
