const express = require('express');
const { all, get } = require('../db/database');

const router = express.Router();

router.get('/summary', async (req, res, next) => {
  try {
    const summary = await get(`
      SELECT
        COUNT(*) AS total_events,
        SUM(CASE WHEN source_system = 'rutgers_public_source' THEN 1 ELSE 0 END) AS verified_source_events,
        SUM(CASE WHEN source_system LIKE 'user_submitted%' THEN 1 ELSE 0 END) AS submitted_events,
        COUNT(DISTINCT organization_id) AS total_organizations,
        COUNT(DISTINCT campus_zone) AS campus_zones,
        MIN(event_date) AS first_event_date,
        MAX(event_date) AS last_event_date
      FROM v_event_catalog
      WHERE event_date BETWEEN '2025-09-01' AND '2026-05-31'
    `);
    const byStatus = await all('SELECT status, COUNT(*) AS event_count FROM events GROUP BY status ORDER BY event_count DESC');
    res.json({ ...summary, by_status: byStatus });
  } catch (error) {
    next(error);
  }
});

router.get('/event-trends', async (req, res, next) => {
  try {
    const rows = await all(`
      SELECT substr(event_date, 1, 7) AS period, COUNT(*) AS event_count
      FROM v_event_catalog
      WHERE event_date BETWEEN '2025-09-01' AND '2026-05-31'
      GROUP BY period
      ORDER BY period
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/category-mix', async (req, res, next) => {
  try {
    const rows = await all(`
      SELECT event_category, COUNT(*) AS event_count
      FROM v_event_catalog
      GROUP BY event_category
      ORDER BY event_count DESC, event_category ASC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/source-mix', async (req, res, next) => {
  try {
    const rows = await all(`
      SELECT source_system, COUNT(*) AS event_count
      FROM v_event_catalog
      GROUP BY source_system
      ORDER BY event_count DESC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/upcoming', async (req, res, next) => {
  try {
    const rows = await all(`
      SELECT * FROM v_event_catalog
      WHERE event_date >= date('now') AND status <> 'Cancelled'
      ORDER BY event_date ASC, start_time ASC
      LIMIT 10
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/insights', async (req, res, next) => {
  try {
    const topCategory = await get(`SELECT event_category, COUNT(*) AS event_count FROM v_event_catalog GROUP BY event_category ORDER BY event_count DESC LIMIT 1`);
    const topZone = await get(`SELECT campus_zone, COUNT(*) AS event_count FROM v_event_catalog GROUP BY campus_zone ORDER BY event_count DESC LIMIT 1`);
    const topOrg = await get(`SELECT organization_name, COUNT(*) AS event_count FROM v_event_catalog GROUP BY organization_name ORDER BY event_count DESC LIMIT 1`);
    const userSubmitted = await get(`SELECT COUNT(*) AS submitted_events FROM v_event_catalog WHERE source_system LIKE 'user_submitted%'`);
    res.json({ top_category: topCategory, top_zone: topZone, top_organization: topOrg, ...userSubmitted });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
