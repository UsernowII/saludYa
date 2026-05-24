const sgMail = require('@sendgrid/mail');

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@saludya.co';

// ─── Core send helper ─────────────────────────────────────────────────────────

/**
 * Send an email using SendGrid when the API key is configured,
 * or log the email to stdout in development mode.
 *
 * @param {{ to: string, subject: string, html: string }} options
 * @returns {Promise<void>}
 */
async function sendEmail({ to, subject, html }) {
  if (!process.env.SENDGRID_API_KEY) {
    // Development fallback — print to console instead of sending
    console.log('\n────────────────────────────────────────');
    console.log('[DEV] Email not sent (no SENDGRID_API_KEY configured)');
    console.log(`  To:      ${to}`);
    console.log(`  Subject: ${subject}`);
    console.log(`  Body:\n${html}`);
    console.log('────────────────────────────────────────\n');
    return;
  }

  const msg = {
    to,
    from: FROM_EMAIL,
    subject,
    html,
  };

  await sgMail.send(msg);
}

// ─── Email templates ──────────────────────────────────────────────────────────

function formatDate(isoString) {
  const dt = new Date(isoString);
  return dt.toLocaleString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Bogota',
  });
}

/**
 * Send an appointment confirmation email to the patient.
 *
 * @param {{ name: string, email: string }} patient
 * @param {{ id: number, scheduled_at: string, notes?: string }} appointment
 * @param {{ doctor_name: string, specialty: string }} doctor
 */
async function sendAppointmentConfirmation(patient, appointment, doctor) {
  const formattedDate = formatDate(appointment.scheduled_at);

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background-color: #0ea5e9; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">SaludYa</h1>
        <p style="color: #e0f2fe; margin: 5px 0 0;">Confirmación de cita médica</p>
      </div>

      <div style="background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
        <h2 style="color: #0f172a;">¡Tu cita está confirmada!</h2>
        <p>Hola <strong>${patient.name}</strong>,</p>
        <p>Tu cita médica ha sido confirmada con los siguientes detalles:</p>

        <div style="background-color: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Médico:</strong> Dr(a). ${doctor.doctor_name}</p>
          <p style="margin: 5px 0;"><strong>Especialidad:</strong> ${doctor.specialty}</p>
          <p style="margin: 5px 0;"><strong>Fecha y hora:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>N.° de cita:</strong> #${appointment.id}</p>
          ${appointment.notes ? `<p style="margin: 5px 0;"><strong>Notas:</strong> ${appointment.notes}</p>` : ''}
        </div>

        <p style="color: #64748b; font-size: 14px;">
          Si necesitas cancelar o reprogramar, ingresa a tu cuenta en SaludYa con al menos 2 horas de anticipación.
        </p>
      </div>

      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #94a3b8;">
        &copy; ${new Date().getFullYear()} SaludYa — Todos los derechos reservados
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: patient.email,
    subject: `Cita confirmada — ${formattedDate}`,
    html,
  });
}

/**
 * Send a reminder email to the patient one day before their appointment.
 *
 * @param {{ name: string, email: string }} patient
 * @param {{ id: number, scheduled_at: string }} appointment
 * @param {{ doctor_name: string, specialty: string }} doctor
 */
async function sendReminder(patient, appointment, doctor) {
  const formattedDate = formatDate(appointment.scheduled_at);

  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
      <div style="background-color: #f59e0b; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px;">SaludYa</h1>
        <p style="color: #fef3c7; margin: 5px 0 0;">Recordatorio de cita médica</p>
      </div>

      <div style="background-color: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none;">
        <h2 style="color: #0f172a;">Recuerda tu cita de mañana</h2>
        <p>Hola <strong>${patient.name}</strong>,</p>
        <p>Te recordamos que tienes una cita médica programada para <strong>mañana</strong>:</p>

        <div style="background-color: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Médico:</strong> Dr(a). ${doctor.doctor_name}</p>
          <p style="margin: 5px 0;"><strong>Especialidad:</strong> ${doctor.specialty}</p>
          <p style="margin: 5px 0;"><strong>Fecha y hora:</strong> ${formattedDate}</p>
          <p style="margin: 5px 0;"><strong>N.° de cita:</strong> #${appointment.id}</p>
        </div>

        <p>Por favor llega 10 minutos antes de tu cita.</p>
        <p style="color: #64748b; font-size: 14px;">
          Si no puedes asistir, cancela o reprograma desde tu cuenta en SaludYa.
        </p>
      </div>

      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; font-size: 12px; color: #94a3b8;">
        &copy; ${new Date().getFullYear()} SaludYa — Todos los derechos reservados
      </div>
    </body>
    </html>
  `;

  await sendEmail({
    to: patient.email,
    subject: `Recordatorio: cita médica mañana — ${formattedDate}`,
    html,
  });
}

module.exports = { sendEmail, sendAppointmentConfirmation, sendReminder };
