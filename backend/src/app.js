require('dotenv').config();

const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');

const swaggerSpec = require('./config/swagger');
const { startReminderJob } = require('./services/reminderJob');

// Routes
const authRoutes        = require('./routes/auth');
const appointmentRoutes = require('./routes/appointments');
const doctorRoutes      = require('./routes/doctors');
const adminRoutes       = require('./routes/admin');

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Health check ─────────────────────────────────────────────────────────────

app.get('/ping', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Documentation ────────────────────────────────────────────────────────

app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'SaludYa API Docs',
    customCss: '.swagger-ui .topbar { background-color: #0ea5e9; }',
  })
);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use('/api/auth',         authRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/doctors',      doctorRoutes);
app.use('/api/admin',        adminRoutes);

// ─── 404 handler ─────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ─── Global error handler ─────────────────────────────────────────────────────

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);

  const status = err.status || err.statusCode || 500;
  const message =
    process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : err.message || 'Internal server error.';

  res.status(status).json({ error: message });
});

// ─── Start server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`\nSaludYa backend running on http://localhost:${PORT}`);
  console.log(`API docs available at http://localhost:${PORT}/api/docs\n`);

  // Start the daily reminder cron job
  startReminderJob();
});

module.exports = app;
