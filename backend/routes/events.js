const express = require('express');
const db = require('../db/database');
const { requireAuth, requireVerified } = require('../middleware/auth');

const router = express.Router();

function getComputedStatus(eventDate, startTime, endTime) {
  const now = new Date();

  const start = new Date(`${eventDate}T${startTime}`);
  const end = new Date(`${eventDate}T${endTime}`);

  if (now < start) return 'pending';
  if (now >= start && now <= end) return 'ongoing';
  return 'ended';
}

router.get('/', async (req, res) => {
  try {
    const {
      search = '',
      category = '',
      campus_zone = '',
      status = ''
    } = req.query;

    const params = [];
    const filters = ['e.deleted_at IS NULL'];

    if (search) {
      params.push(`%${search.toLowerCase()}%`);
      filters.push(
        `(LOWER(e.title) LIKE $${params.length}
          OR LOWER(e.description) LIKE $${params.length}
          OR LOWER(e.location) LIKE $${params.length}
          OR LOWER(e.category) LIKE $${params.length}
          OR LOWER(e.campus_zone) LIKE $${params.length})`
      );
    }

    if (category) {
      params.push(category);
      filters.push(`e.category = $${params.length}`);
    }

    if (campus_zone) {
      params.push(campus_zone);
      filters.push(`e.campus_zone = $${params.length}`);
    }

    const result = await db.query(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.category,
        e.campus_zone,
        e.location,
        e.event_date,
        e.start_time_est,
        e.end_time_est,
        e.status,
        e.source_url,
        e.created_at,
        u.full_name AS posted_by,
        COUNT(r.id)::int AS going_count
      FROM events e
      LEFT JOIN users u ON u.id = e.creator_user_id
      LEFT JOIN event_rsvps r ON r.event_id = e.id
      WHERE ${filters.join(' AND ')}
      GROUP BY e.id, u.full_name
      ORDER BY e.event_date ASC, e.start_time_est ASC
      `,
      params
    );

    let events = result.rows.map((event) => {
      const computedStatus = getComputedStatus(
        event.event_date.toISOString().slice(0, 10),
        event.start_time_est,
        event.end_time_est
      );

      return {
        ...event,
        status: computedStatus
      };
    });

    if (status) {
      events = events.filter((event) => event.status === status);
    }

    res.json({ events });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Could not load events.' });
  }
});

router.post('/', requireAuth, requireVerified, async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      campus_zone,
      location,
      event_date,
      start_time_est,
      end_time_est,
      source_url
    } = req.body;

    if (
      !title ||
      !description ||
      !category ||
      !campus_zone ||
      !location ||
      !event_date ||
      !start_time_est ||
      !end_time_est
    ) {
      return res.status(400).json({
        error: 'Title, description, category, campus zone, location, date, start time, and end time are required.'
      });
    }

    const result = await db.query(
      `
      INSERT INTO events (
        creator_user_id,
        title,
        description,
        category,
        campus_zone,
        location,
        event_date,
        start_time_est,
        end_time_est,
        source_url
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
      `,
      [
        req.user.id,
        title,
        description,
        category,
        campus_zone,
        location,
        event_date,
        start_time_est,
        end_time_est,
        source_url || null
      ]
    );

    res.status(201).json({
      message: 'Event posted successfully.',
      event: result.rows[0]
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Could not create event.' });
  }
});

router.post('/:id/going', requireAuth, requireVerified, async (req, res) => {
  try {
    const eventId = req.params.id;

    const eventCheck = await db.query(
      'SELECT id FROM events WHERE id = $1 AND deleted_at IS NULL',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    await db.query(
      `
      INSERT INTO event_rsvps (event_id, user_id)
      VALUES ($1, $2)
      ON CONFLICT (event_id, user_id) DO NOTHING
      `,
      [eventId, req.user.id]
    );

    const countResult = await db.query(
      'SELECT COUNT(*)::int AS going_count FROM event_rsvps WHERE event_id = $1',
      [eventId]
    );

    res.json({
      message: 'You are marked as going.',
      going_count: countResult.rows[0].going_count
    });
  } catch (error) {
    console.error('Going error:', error);
    res.status(500).json({ error: 'Could not RSVP to event.' });
  }
});

router.delete('/:id/going', requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;

    await db.query(
      'DELETE FROM event_rsvps WHERE event_id = $1 AND user_id = $2',
      [eventId, req.user.id]
    );

    const countResult = await db.query(
      'SELECT COUNT(*)::int AS going_count FROM event_rsvps WHERE event_id = $1',
      [eventId]
    );

    res.json({
      message: 'You are no longer marked as going.',
      going_count: countResult.rows[0].going_count
    });
  } catch (error) {
    console.error('Remove going error:', error);
    res.status(500).json({ error: 'Could not remove RSVP.' });
  }
});

router.get('/profile/mine', requireAuth, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT
        e.id,
        e.title,
        e.description,
        e.category,
        e.campus_zone,
        e.location,
        e.event_date,
        e.start_time_est,
        e.end_time_est,
        e.status,
        e.created_at,
        COUNT(r.id)::int AS going_count
      FROM events e
      LEFT JOIN event_rsvps r ON r.event_id = e.id
      WHERE e.creator_user_id = $1
        AND e.deleted_at IS NULL
      GROUP BY e.id
      ORDER BY e.event_date ASC, e.start_time_est ASC
      `,
      [req.user.id]
    );

    const events = result.rows.map((event) => ({
      ...event,
      status: getComputedStatus(
        event.event_date.toISOString().slice(0, 10),
        event.start_time_est,
        event.end_time_est
      )
    }));

    res.json({ events });
  } catch (error) {
    console.error('Profile events error:', error);
    res.status(500).json({ error: 'Could not load your events.' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const eventId = req.params.id;

    const eventCheck = await db.query(
      'SELECT creator_user_id FROM events WHERE id = $1 AND deleted_at IS NULL',
      [eventId]
    );

    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    if (eventCheck.rows[0].creator_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own events.' });
    }

    await db.query(
      'UPDATE events SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1',
      [eventId]
    );

    res.json({ message: 'Event deleted successfully.' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Could not delete event.' });
  }
});

module.exports = router;