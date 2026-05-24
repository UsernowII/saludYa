const cron = require('node-cron');
const { query } = require('../config/database');
const { sendReminder } = require('./emailService');

/**
 * Send reminder emails for all confirmed appointments scheduled for tomorrow
 * that have not yet received a reminder.
 *
 * Runs every day at 08:00 server time.
 */
async function runReminderJob() {
  console.log('[ReminderJob] Starting — looking for tomorrow\'s appointments...');

  try {
    // Build tomorrow's date window in UTC
    const now = new Date();
    const tomorrowStart = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        0, 0, 0, 0
      )
    );
    const tomorrowEnd = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + 1,
        23, 59, 59, 999
      )
    );

    const result = await query(
      `SELECT
         a.id              AS appointment_id,
         a.scheduled_at,
         u.id              AS patient_id,
         u.name            AS patient_name,
         u.email           AS patient_email,
         du.name           AS doctor_name,
         sp.name           AS specialty
       FROM appointments a
       JOIN users       u  ON u.id  = a.patient_id
       JOIN doctors     d  ON d.id  = a.doctor_id
       JOIN users       du ON du.id = d.user_id
       JOIN specialties sp ON sp.id = d.specialty_id
       WHERE a.scheduled_at >= $1
         AND a.scheduled_at <= $2
         AND a.status         = 'confirmed'
         AND a.reminder_sent  = FALSE`,
      [tomorrowStart.toISOString(), tomorrowEnd.toISOString()]
    );

    if (result.rows.length === 0) {
      console.log('[ReminderJob] No reminders to send today.');
      return;
    }

    console.log(`[ReminderJob] Sending ${result.rows.length} reminder(s)...`);

    for (const row of result.rows) {
      try {
        await sendReminder(
          { name: row.patient_name, email: row.patient_email },
          { id: row.appointment_id, scheduled_at: row.scheduled_at },
          { doctor_name: row.doctor_name, specialty: row.specialty }
        );

        await query(
          'UPDATE appointments SET reminder_sent = TRUE WHERE id = $1',
          [row.appointment_id]
        );

        console.log(
          `[ReminderJob] Reminder sent for appointment #${row.appointment_id} → ${row.patient_email}`
        );
      } catch (emailErr) {
        console.error(
          `[ReminderJob] Failed to send reminder for appointment #${row.appointment_id}:`,
          emailErr.message
        );
      }
    }

    console.log('[ReminderJob] Finished.');
  } catch (err) {
    console.error('[ReminderJob] Unexpected error:', err);
  }
}

/**
 * Register the cron job.
 * Schedule: every day at 08:00 (server local time).
 */
function startReminderJob() {
  cron.schedule('0 8 * * *', runReminderJob, {
    scheduled: true,
    timezone: 'America/Bogota',
  });

  console.log('[ReminderJob] Scheduled — will run daily at 08:00 (Bogota time).');
}

module.exports = { startReminderJob, runReminderJob };
