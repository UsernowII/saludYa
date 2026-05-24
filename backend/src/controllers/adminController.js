const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/admin/metrics
 * Return appointment counts for today.
 */
async function getMetrics(req, res) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const result = await query(
      `SELECT
         COUNT(*)                                                        AS total_today,
         COUNT(*) FILTER (WHERE status = 'confirmed')                   AS confirmed_today,
         COUNT(*) FILTER (WHERE status = 'cancelled')                   AS cancelled_today,
         COUNT(*) FILTER (WHERE status = 'completed')                   AS completed_today
       FROM appointments
       WHERE scheduled_at::date = $1`,
      [today]
    );

    const row = result.rows[0];
    const totalToday = parseInt(row.total_today, 10);
    const cancelledToday = parseInt(row.cancelled_today, 10);

    const cancellationRate =
      totalToday > 0
        ? parseFloat(((cancelledToday / totalToday) * 100).toFixed(2))
        : 0;

    return res.status(200).json({
      totalToday,
      confirmedToday: parseInt(row.confirmed_today, 10),
      cancelledToday,
      completedToday: parseInt(row.completed_today, 10),
      cancellationRate,
    });
  } catch (err) {
    console.error('getMetrics error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/admin/doctors
 * Return all doctors with user info and specialty.
 */
async function getDoctors(req, res) {
  try {
    const result = await query(
      `SELECT
         d.id,
         d.bio,
         d.active,
         d.created_at,
         u.id    AS user_id,
         u.name,
         u.email,
         u.phone,
         sp.id   AS specialty_id,
         sp.name AS specialty
       FROM doctors d
       JOIN users       u  ON u.id  = d.user_id
       JOIN specialties sp ON sp.id = d.specialty_id
       ORDER BY u.name ASC`
    );

    return res.status(200).json(result.rows);
  } catch (err) {
    console.error('getDoctors error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/admin/doctors
 * Create a new doctor (also creates the underlying user account).
 * Body: { name, email, specialtyId, bio? }
 */
async function createDoctor(req, res) {
  try {
    const { name, email, specialtyId, bio } = req.body;

    if (!name || !email || !specialtyId) {
      return res
        .status(400)
        .json({ error: 'name, email, and specialtyId are required.' });
    }

    // Verify specialty exists
    const specRes = await query(
      'SELECT id FROM specialties WHERE id = $1',
      [specialtyId]
    );
    if (specRes.rows.length === 0) {
      return res.status(404).json({ error: 'Specialty not found.' });
    }

    // Check email uniqueness
    const existing = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ error: 'An account with that email already exists.' });
    }

    // Create user with a temporary password
    const tempPassword = 'saludya123';
    const password_hash = await bcrypt.hash(tempPassword, 10);

    const userRes = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'doctor')
       RETURNING id, name, email, role`,
      [name, email.toLowerCase(), password_hash]
    );

    const user = userRes.rows[0];

    const doctorRes = await query(
      `INSERT INTO doctors (user_id, specialty_id, bio)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user.id, specialtyId, bio || null]
    );

    const doctor = doctorRes.rows[0];

    return res.status(201).json({
      ...doctor,
      name: user.name,
      email: user.email,
      role: user.role,
      specialtyId,
      tempPassword,
    });
  } catch (err) {
    console.error('createDoctor error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * PATCH /api/admin/doctors/:id/status
 * Toggle a doctor's active status.
 */
async function toggleDoctorStatus(req, res) {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT id, active FROM doctors WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Doctor not found.' });
    }

    const currentActive = existing.rows[0].active;

    const result = await query(
      `UPDATE doctors SET active = $1 WHERE id = $2
       RETURNING *`,
      [!currentActive, id]
    );

    return res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error('toggleDoctorStatus error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { getMetrics, getDoctors, createDoctor, toggleDoctorStatus };
