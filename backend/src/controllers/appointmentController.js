const { query } = require('../config/database');
const { sendAppointmentConfirmation } = require('../services/emailService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate all HH:MM time slots for a schedule block.
 * @param {string} startTime   - 'HH:MM:SS' or 'HH:MM'
 * @param {string} endTime     - 'HH:MM:SS' or 'HH:MM'
 * @param {number} durationMin - Slot length in minutes
 * @returns {string[]} e.g. ['09:00', '09:30', '10:00']
 */
function generateSlots(startTime, endTime, durationMin) {
  const slots = [];
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  let current = startH * 60 + startM;
  const end = endH * 60 + endM;

  while (current + durationMin <= end) {
    const h = String(Math.floor(current / 60)).padStart(2, '0');
    const m = String(current % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
    current += durationMin;
  }

  return slots;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/appointments/available?specialtyId=&date=YYYY-MM-DD
 * Returns available time slots grouped by doctor for a given date.
 */
async function getAvailable(req, res) {
  try {
    const { specialtyId, date } = req.query;

    if (!specialtyId || !date) {
      return res
        .status(400)
        .json({ error: 'specialtyId and date query parameters are required.' });
    }

    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res
        .status(400)
        .json({ error: 'date must be a valid date in YYYY-MM-DD format.' });
    }

    // day_of_week: 0=Sunday ... 6=Saturday (matches JS getDay())
    const dayOfWeek = dateObj.getUTCDay();

    // Find doctors in this specialty with a schedule for that weekday
    const doctorsRes = await query(
      `SELECT
         d.id          AS doctor_id,
         u.name        AS doctor_name,
         sp.name       AS specialty,
         ds.start_time,
         ds.end_time,
         ds.slot_duration_minutes
       FROM doctors d
       JOIN users          u  ON u.id  = d.user_id
       JOIN specialties    sp ON sp.id = d.specialty_id
       JOIN doctor_schedules ds ON ds.doctor_id = d.id
       WHERE d.specialty_id = $1
         AND d.active = TRUE
         AND ds.day_of_week = $2`,
      [specialtyId, dayOfWeek]
    );

    if (doctorsRes.rows.length === 0) {
      return res.status(200).json([]);
    }

    const doctorIds = doctorsRes.rows.map((r) => r.doctor_id);

    // Fetch blocked dates for those doctors on this specific date
    const blockedRes = await query(
      `SELECT doctor_id FROM blocked_dates
       WHERE doctor_id = ANY($1::int[])
         AND blocked_date = $2`,
      [doctorIds, date]
    );
    const blockedDoctorIds = new Set(blockedRes.rows.map((r) => r.doctor_id));

    // Fetch already-booked slots
    const bookedRes = await query(
      `SELECT doctor_id, scheduled_at
       FROM appointments
       WHERE doctor_id = ANY($1::int[])
         AND scheduled_at::date = $2
         AND status IN ('confirmed', 'pending')`,
      [doctorIds, date]
    );

    // Build a Set of "doctorId|HH:MM" for O(1) lookup
    const bookedSet = new Set(
      bookedRes.rows.map((r) => {
        const dt = new Date(r.scheduled_at);
        const hh = String(dt.getUTCHours()).padStart(2, '0');
        const mm = String(dt.getUTCMinutes()).padStart(2, '0');
        return `${r.doctor_id}|${hh}:${mm}`;
      })
    );

    const result = [];

    for (const doc of doctorsRes.rows) {
      if (blockedDoctorIds.has(doc.doctor_id)) continue;

      const allSlots = generateSlots(
        doc.start_time,
        doc.end_time,
        doc.slot_duration_minutes
      );

      const availableSlots = allSlots.filter(
        (slot) => !bookedSet.has(`${doc.doctor_id}|${slot}`)
      );

      result.push({
        doctorId: doc.doctor_id,
        doctorName: doc.doctor_name,
        specialty: doc.specialty,
        slots: availableSlots,
      });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.error('getAvailable error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/appointments
 * Book a new appointment for the authenticated patient.
 */
async function create(req, res) {
  try {
    const { doctorId, scheduledAt, notes } = req.body;

    if (!doctorId || !scheduledAt) {
      return res
        .status(400)
        .json({ error: 'doctorId and scheduledAt are required.' });
    }

    const dt = new Date(scheduledAt);
    if (isNaN(dt.getTime())) {
      return res
        .status(400)
        .json({ error: 'scheduledAt must be a valid ISO datetime string.' });
    }

    // Check slot is not already taken
    const conflict = await query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1
         AND scheduled_at = $2
         AND status IN ('confirmed', 'pending')`,
      [doctorId, scheduledAt]
    );

    if (conflict.rows.length > 0) {
      return res
        .status(409)
        .json({ error: 'That time slot is no longer available.' });
    }

    // Verify doctor exists
    const docRes = await query(
      `SELECT d.id, u.name AS doctor_name, sp.name AS specialty, u.email AS doctor_email
       FROM doctors d
       JOIN users       u  ON u.id  = d.user_id
       JOIN specialties sp ON sp.id = d.specialty_id
       WHERE d.id = $1 AND d.active = TRUE`,
      [doctorId]
    );

    if (docRes.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found or inactive.' });
    }

    const doctor = docRes.rows[0];

    const apptRes = await query(
      `INSERT INTO appointments (patient_id, doctor_id, scheduled_at, notes, status)
       VALUES ($1, $2, $3, $4, 'confirmed')
       RETURNING *`,
      [req.user.id, doctorId, scheduledAt, notes || null]
    );

    const appointment = {
      ...apptRes.rows[0],
      doctorName: doctor.doctor_name,
      specialty: doctor.specialty,
    };

    // Send confirmation email (non-blocking)
    const patientRes = await query(
      'SELECT name, email FROM users WHERE id = $1',
      [req.user.id]
    );
    if (patientRes.rows.length > 0) {
      sendAppointmentConfirmation(patientRes.rows[0], appointment, doctor).catch(
        (e) => console.error('Confirmation email error:', e)
      );
    }

    return res.status(201).json(appointment);
  } catch (err) {
    console.error('create appointment error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/appointments/my
 * Return all appointments for the authenticated patient.
 */
async function getMyAppointments(req, res) {
  try {
    const result = await query(
      `SELECT
         a.id,
         a.scheduled_at,
         a.status,
         a.notes,
         a.reminder_sent,
         a.created_at,
         u.name        AS doctor_name,
         sp.name       AS specialty,
         d.id          AS doctor_id
       FROM appointments a
       JOIN doctors     d  ON d.id  = a.doctor_id
       JOIN users       u  ON u.id  = d.user_id
       JOIN specialties sp ON sp.id = d.specialty_id
       WHERE a.patient_id = $1
       ORDER BY a.scheduled_at DESC`,
      [req.user.id]
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getMyAppointments error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * PATCH /api/appointments/:id/cancel
 * Cancel an appointment owned by the authenticated user.
 */
async function cancel(req, res) {
  try {
    const { id } = req.params;

    // Verify ownership
    const existing = await query(
      `SELECT id, status, patient_id FROM appointments WHERE id = $1`,
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const appt = existing.rows[0];

    if (appt.patient_id !== req.user.id && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'You are not allowed to cancel this appointment.' });
    }

    if (appt.status === 'cancelled') {
      return res
        .status(400)
        .json({ error: 'Appointment is already cancelled.' });
    }

    const result = await query(
      `UPDATE appointments SET status = 'cancelled' WHERE id = $1 RETURNING *`,
      [id]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('cancel error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * PATCH /api/appointments/:id/reschedule
 * Move an appointment to a new time slot.
 */
async function reschedule(req, res) {
  try {
    const { id } = req.params;
    const { scheduledAt } = req.body;

    if (!scheduledAt) {
      return res.status(400).json({ error: 'scheduledAt is required.' });
    }

    const dt = new Date(scheduledAt);
    if (isNaN(dt.getTime())) {
      return res
        .status(400)
        .json({ error: 'scheduledAt must be a valid ISO datetime string.' });
    }

    const existing = await query(
      'SELECT id, patient_id, doctor_id, status FROM appointments WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found.' });
    }

    const appt = existing.rows[0];

    if (appt.patient_id !== req.user.id && req.user.role !== 'admin') {
      return res
        .status(403)
        .json({ error: 'You are not allowed to reschedule this appointment.' });
    }

    if (appt.status === 'cancelled' || appt.status === 'completed') {
      return res
        .status(400)
        .json({ error: `Cannot reschedule a ${appt.status} appointment.` });
    }

    // Check new slot is free
    const conflict = await query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1
         AND scheduled_at = $2
         AND status IN ('confirmed', 'pending')
         AND id <> $3`,
      [appt.doctor_id, scheduledAt, id]
    );

    if (conflict.rows.length > 0) {
      return res
        .status(409)
        .json({ error: 'That time slot is no longer available.' });
    }

    const result = await query(
      `UPDATE appointments
       SET scheduled_at = $1, status = 'confirmed', reminder_sent = FALSE
       WHERE id = $2
       RETURNING *`,
      [scheduledAt, id]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('reschedule error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = {
  getAvailable,
  create,
  getMyAppointments,
  cancel,
  reschedule,
};
