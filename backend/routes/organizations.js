const express = require('express');
const { all, get } = require('../db/database');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const rows = await all('SELECT * FROM organizations ORDER BY organization_name');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    const rows = await all('SELECT * FROM v_organization_performance ORDER BY event_count DESC LIMIT 20');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/report', async (req, res, next) => {
  try {
    const organization = await get('SELECT * FROM v_organization_performance WHERE organization_id = ?', [req.params.id]);
    if (!organization) return res.status(404).json({ error: 'Organization not found' });
    const events = await all(`
      SELECT event_id, event_name, event_category, event_date, status, source_url
      FROM v_event_catalog
      WHERE organization_id = ?
      ORDER BY event_date ASC
      LIMIT 50
    `, [req.params.id]);
    const categoryBreakdown = await all(`
      SELECT event_category, COUNT(*) AS event_count
      FROM v_event_catalog
      WHERE organization_id = ?
      GROUP BY event_category
      ORDER BY event_count DESC
    `, [req.params.id]);
    res.json({ organization, category_breakdown: categoryBreakdown, recent_events: events });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
