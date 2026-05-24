const { query } = require('../config/database');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Resolve the doctor record id from the authenticated user.
 * Returns null if the user is not a doctor.
 */
async function getDoctorIdForUser(userId) {
  const result = await query(
    'SELECT id FROM doctors WHERE user_id = $1',
    [userId]
  );
  return result.rows.length > 0 ? result.rows[0].id : null;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/doctors/appointments?date=YYYY-MM-DD
 * Return the authenticated doctor's appointments for today (or the given date).
 */
async function getMyAppointments(req, res) {
  try {
    const doctorId = await getDoctorIdForUser(req.user.id);
    if (!doctorId) {
      return res.status(404).json({ error: 'Doctor record not found.' });
    }

    const date = req.query.date || new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT
         a.id,
         a.scheduled_at,
         a.status,
         a.notes,
         a.reminder_sent,
         a.created_at,
         u.name  AS patient_name,
         u.email AS patient_email,
         u.phone AS patient_phone
       FROM appointments a
       JOIN users u ON u.id = a.patient_id
       WHERE a.doctor_id = $1
         AND a.scheduled_at::date = $2
       ORDER BY a.scheduled_at ASC`,
      [doctorId, date]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('doctor getMyAppointments error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/doctors/schedule
 * Return the authenticated doctor's weekly schedule.
 */
async function getSchedule(req, res) {
  try {
    const doctorId = await getDoctorIdForUser(req.user.id);
    if (!doctorId) {
      return res.status(404).json({ error: 'Doctor record not found.' });
    }

    const result = await query(
      `SELECT id, day_of_week, start_time, end_time, slot_duration_minutes
       FROM doctor_schedules
       WHERE doctor_id = $1
       ORDER BY day_of_week`,
      [doctorId]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getSchedule error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * PUT /api/doctors/schedule
 * Upsert the authenticated doctor's weekly schedule.
 * Body: { schedules: [{ dayOfWeek, startTime, endTime, slotDurationMinutes }] }
 */
async function updateSchedule(req, res) {
  try {
    const doctorId = await getDoctorIdForUser(req.user.id);
    if (!doctorId) {
      return res.status(404).json({ error: 'Doctor record not found.' });
    }

    const { schedules } = req.body;

    if (!Array.isArray(schedules) || schedules.length === 0) {
      return res
        .status(400)
        .json({ error: 'schedules must be a non-empty array.' });
    }

    const upserted = [];

    for (const s of schedules) {
      const { dayOfWeek, startTime, endTime, slotDurationMinutes } = s;

      if (
        dayOfWeek === undefined ||
        dayOfWeek === null ||
        !startTime ||
        !endTime
      ) {
        return res.status(400).json({
          error:
            'Each schedule entry must include dayOfWeek, startTime, and endTime.',
        });
      }

      const duration = slotDurationMinutes || 30;

      const result = await query(
        `INSERT INTO doctor_schedules
           (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (doctor_id, day_of_week)
         DO UPDATE SET
           start_time            = EXCLUDED.start_time,
           end_time              = EXCLUDED.end_time,
           slot_duration_minutes = EXCLUDED.slot_duration_minutes
         RETURNING *`,
        [doctorId, dayOfWeek, startTime, endTime, duration]
      );

      upserted.push(result.rows[0]);
    }

    return res.status(200).json(upserted);
  } catch (err) {
    console.error('updateSchedule error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/doctors/blocked-dates
 * Add a blocked date for the authenticated doctor.
 * Body: { date: 'YYYY-MM-DD', reason?: string }
 */
async function addBlockedDate(req, res) {
  try {
    const doctorId = await getDoctorIdForUser(req.user.id);
    if (!doctorId) {
      return res.status(404).json({ error: 'Doctor record not found.' });
    }

    const { date, reason } = req.body;

    if (!date) {
      return res.status(400).json({ error: 'date is required.' });
    }

    const dt = new Date(date);
    if (isNaN(dt.getTime())) {
      return res
        .status(400)
        .json({ error: 'date must be a valid date in YYYY-MM-DD format.' });
    }

    const result = await query(
      `INSERT INTO blocked_dates (doctor_id, blocked_date, reason)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [doctorId, date, reason || null]
    );

    return res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('addBlockedDate error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/doctors/blocked-dates
 * Return all blocked dates for the authenticated doctor.
 */
async function getBlockedDates(req, res) {
  try {
    const doctorId = await getDoctorIdForUser(req.user.id);
    if (!doctorId) {
      return res.status(404).json({ error: 'Doctor record not found.' });
    }

    const result = await query(
      `SELECT id, blocked_date, reason
       FROM blocked_dates
       WHERE doctor_id = $1
       ORDER BY blocked_date ASC`,
      [doctorId]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getBlockedDates error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = {
  getMyAppointments,
  getSchedule,
  updateSchedule,
  addBlockedDate,
  getBlockedDates,
};
