const express = require('express');
const { all, get } = require('../db/database');
const { buildEventFilters } = require('../utils/queryBuilder');

const router = express.Router();

router.get('/summary', async (req, res, next) => {
  try {
    const summary = await get(`
      SELECT
        COUNT(*) AS total_events,
        COUNT(DISTINCT organization_id) AS total_organizations,
        COUNT(DISTINCT location_id) AS total_locations,
        COALESCE(SUM(attended_count), 0) AS total_attendance,
        ROUND(AVG(attendance_rate), 2) AS avg_attendance_rate,
        ROUND(AVG(room_utilization_rate), 2) AS avg_room_utilization,
        ROUND(AVG(avg_rating), 2) AS avg_rating,
        ROUND(SUM(actual_spend), 2) AS total_spend,
        ROUND(SUM(actual_spend) / NULLIF(SUM(attended_count), 0), 2) AS cost_per_attendee
      FROM v_event_performance
    `);
    const byStatus = await all('SELECT status, COUNT(*) AS event_count FROM events GROUP BY status ORDER BY event_count DESC');
    res.json({ ...summary, by_status: byStatus });
  } catch (error) {
    next(error);
  }
});

router.get('/attendance-trends', async (req, res, next) => {
  try {
    const grain = req.query.grain === 'day' ? 'day' : 'month';
    const bucketExpr = grain === 'day' ? 'event_date' : "substr(event_date, 1, 7)";
    const rows = await all(`
      SELECT
        ${bucketExpr} AS period,
        COUNT(*) AS event_count,
        SUM(attended_count) AS attended,
        SUM(registered_count) AS registered,
        ROUND(AVG(attendance_rate), 2) AS avg_attendance_rate
      FROM v_event_performance
      WHERE status <> 'Cancelled'
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
      SELECT
        event_category,
        COUNT(*) AS event_count,
        SUM(attended_count) AS attended,
        ROUND(AVG(attendance_rate), 2) AS avg_attendance_rate,
        ROUND(AVG(avg_rating), 2) AS avg_rating
      FROM v_event_performance
      GROUP BY event_category
      ORDER BY attended DESC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/scheduling-gaps', async (req, res, next) => {
  try {
    const rows = await all(`
      WITH slots AS (
        SELECT
          CASE strftime('%w', event_date)
            WHEN '0' THEN 'Sunday'
            WHEN '1' THEN 'Monday'
            WHEN '2' THEN 'Tuesday'
            WHEN '3' THEN 'Wednesday'
            WHEN '4' THEN 'Thursday'
            WHEN '5' THEN 'Friday'
            ELSE 'Saturday'
          END AS day_of_week,
          substr(start_time, 1, 2) || ':00' AS hour_slot,
          COUNT(*) AS event_count,
          SUM(attended_count) AS attended,
          ROUND(AVG(attendance_rate), 2) AS avg_attendance_rate,
          ROUND(AVG(room_utilization_rate), 2) AS avg_room_utilization
        FROM v_event_performance
        WHERE status <> 'Cancelled'
        GROUP BY day_of_week, hour_slot
      )
      SELECT *,
        CASE
          WHEN event_count >= 18 AND avg_room_utilization >= 70 THEN 'Congested'
          WHEN event_count <= 6 AND avg_attendance_rate >= 70 THEN 'Growth Opportunity'
          WHEN avg_attendance_rate < 55 THEN 'Weak Slot'
          ELSE 'Balanced'
        END AS recommendation
      FROM slots
      ORDER BY
        CASE recommendation
          WHEN 'Growth Opportunity' THEN 1
          WHEN 'Congested' THEN 2
          WHEN 'Weak Slot' THEN 3
          ELSE 4
        END,
        event_count DESC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/top-events', async (req, res, next) => {
  try {
    const rows = await all(`
      SELECT event_id, event_name, organization_name, event_category, event_date, attended_count, attendance_rate, avg_rating, cost_per_attendee
      FROM v_event_performance
      WHERE status = 'Completed'
      ORDER BY attended_count DESC, avg_rating DESC
      LIMIT 15
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/budget-efficiency', async (req, res, next) => {
  try {
    const rows = await all(`
      SELECT
        event_category,
        COUNT(*) AS event_count,
        ROUND(SUM(actual_spend), 2) AS spend,
        SUM(attended_count) AS attended,
        ROUND(SUM(actual_spend) / NULLIF(SUM(attended_count), 0), 2) AS cost_per_attendee,
        ROUND(AVG(budget_variance), 2) AS avg_budget_variance
      FROM v_event_performance
      WHERE status = 'Completed'
      GROUP BY event_category
      ORDER BY cost_per_attendee ASC
    `);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

router.get('/data-quality', async (req, res, next) => {
  try {
    const duplicateRisk = await all(`
      SELECT event_name, organization_name, event_date, start_time, COUNT(*) AS duplicate_count
      FROM v_event_performance
      GROUP BY event_name, organization_name, event_date, start_time
      HAVING COUNT(*) > 1
      ORDER BY duplicate_count DESC
    `);
    const missingFeedback = await get(`SELECT COUNT(*) AS events_without_feedback FROM v_event_performance WHERE feedback_count = 0 AND status = 'Completed'`);
    const capacityIssues = await get(`SELECT COUNT(*) AS over_capacity_events FROM v_event_performance WHERE attended_count > capacity`);
    const budgetIssues = await get(`SELECT COUNT(*) AS over_budget_events FROM v_event_performance WHERE budget_variance > 0`);
    res.json({
      duplicate_risk_count: duplicateRisk.length,
      duplicate_risks: duplicateRisk,
      ...missingFeedback,
      ...capacityIssues,
      ...budgetIssues
    });
  } catch (error) {
    next(error);
  }
});

router.get('/insights', async (req, res, next) => {
  try {
    const category = await get(`
      SELECT event_category, SUM(attended_count) AS attended
      FROM v_event_performance
      WHERE status = 'Completed'
      GROUP BY event_category
      ORDER BY attended DESC
      LIMIT 1
    `);
    const slot = await get(`
      SELECT substr(start_time, 1, 2) || ':00' AS hour_slot, ROUND(AVG(attendance_rate), 2) AS rate, COUNT(*) AS events
      FROM v_event_performance
      WHERE status = 'Completed'
      GROUP BY hour_slot
      HAVING events >= 10
      ORDER BY rate DESC
      LIMIT 1
    `);
    const org = await get('SELECT * FROM v_organization_performance ORDER BY total_attendance DESC LIMIT 1');
    const budget = await get(`
      SELECT event_category, ROUND(SUM(actual_spend) / NULLIF(SUM(attended_count), 0), 2) AS cost_per_attendee
      FROM v_event_performance
      WHERE status = 'Completed'
      GROUP BY event_category
      ORDER BY cost_per_attendee ASC
      LIMIT 1
    `);
    res.json({
      attendance_driver: category,
      best_time_slot: slot,
      strongest_organization: org,
      most_cost_efficient_category: budget
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
