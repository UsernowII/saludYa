const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { query } = require('../config/database');
const { sendEmail } = require('../services/emailService');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

function sanitizeUser(user) {
  const { password_hash, ...safe } = user;
  return safe;
}

// ─── Controllers ──────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Create a new patient account.
 */
async function register(req, res) {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password || !phone) {
      return res
        .status(400)
        .json({ error: 'name, email, password, and phone are required.' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters long.' });
    }

    // Check email uniqueness
    const existing = await query('SELECT id FROM users WHERE email = $1', [
      email.toLowerCase(),
    ]);
    if (existing.rows.length > 0) {
      return res
        .status(409)
        .json({ error: 'An account with that email already exists.' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const result = await query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, 'patient')
       RETURNING id, name, email, phone, role, created_at`,
      [name, email.toLowerCase(), password_hash, phone]
    );

    const user = result.rows[0];
    const token = signToken(user);

    return res.status(201).json({ user, token });
  } catch (err) {
    console.error('register error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/login
 * Authenticate an existing user and return a JWT.
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ error: 'email and password are required.' });
    }

    const result = await query(
      `SELECT id, name, email, password_hash, phone, role, created_at
       FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = signToken(user);

    return res.status(200).json({ user: sanitizeUser(user), token });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/forgot-password
 * Generate a password-reset token and send it by email.
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'email is required.' });
    }

    const result = await query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    // Always respond with 200 to avoid leaking which emails exist.
    if (result.rows.length === 0) {
      return res.status(200).json({
        message:
          'If an account with that email exists, a reset link has been sent.',
      });
    }

    const user = result.rows[0];
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    await sendEmail({
      to: user.email,
      subject: 'Recupera tu contraseña — SaludYa',
      html: `
        <h2>Recuperación de contraseña</h2>
        <p>Hola ${user.name},</p>
        <p>Haz clic en el siguiente enlace para restablecer tu contraseña. El enlace expira en 1 hora.</p>
        <p><a href="${resetUrl}" style="background:#0ea5e9;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;">Restablecer contraseña</a></p>
        <p>Si no solicitaste este cambio, ignora este correo.</p>
        <br><p>Equipo SaludYa</p>
      `,
    });

    return res.status(200).json({
      message:
        'If an account with that email exists, a reset link has been sent.',
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * POST /api/auth/reset-password
 * Consume a reset token and update the user's password.
 */
async function resetPassword(req, res) {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res
        .status(400)
        .json({ error: 'token and password are required.' });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: 'Password must be at least 6 characters long.' });
    }

    const result = await query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token = $1
         AND expires_at > NOW()
         AND used = FALSE`,
      [token]
    );

    if (result.rows.length === 0) {
      return res
        .status(400)
        .json({ error: 'Invalid or expired reset token.' });
    }

    const { id: tokenId, user_id } = result.rows[0];
    const password_hash = await bcrypt.hash(password, 10);

    await query('UPDATE users SET password_hash = $1 WHERE id = $2', [
      password_hash,
      user_id,
    ]);

    await query(
      'UPDATE password_reset_tokens SET used = TRUE WHERE id = $1',
      [tokenId]
    );

    return res
      .status(200)
      .json({ message: 'Password updated successfully. You may now log in.' });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

/**
 * GET /api/auth/me
 * Return the profile of the currently-authenticated user.
 */
async function me(req, res) {
  try {
    const result = await query(
      `SELECT id, name, email, phone, role, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found.' });
    }

    return res.status(200).json({ user: result.rows[0] });
  } catch (err) {
    console.error('me error:', err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
}

module.exports = { register, login, forgotPassword, resetPassword, me };
