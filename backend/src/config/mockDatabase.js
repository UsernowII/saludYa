/**
 * In-memory mock database — activo cuando USE_MOCK_DB=true en .env
 *
 * Usuarios precargados:
 *   admin@saludya.co    / admin123    (role: admin)
 *   medico@saludya.co   / medico123   (role: doctor)
 *   paciente@saludya.co / paciente123 (role: patient)
 */

const bcrypt = require('bcryptjs');

// Estado en memoria (persiste mientras el servidor esté corriendo)
let initialized = false;
let mockUsers = [];
let mockAppointments = [];

const mockSpecialties = [
  { id: 1, name: 'Medicina General', description: 'Atención médica primaria' },
  { id: 2, name: 'Pediatría',        description: 'Atención médica para niños' },
  { id: 3, name: 'Cardiología',      description: 'Enfermedades del corazón' },
];

const mockDoctors = [
  { id: 1, user_id: 2, specialty_id: 1, bio: 'Especialista en medicina general.', active: true, created_at: new Date() },
];

const mockSchedules = [
  { id: 1, doctor_id: 1, day_of_week: 1, start_time: '08:00:00', end_time: '17:00:00', slot_duration_minutes: 30 },
  { id: 2, doctor_id: 1, day_of_week: 2, start_time: '08:00:00', end_time: '17:00:00', slot_duration_minutes: 30 },
  { id: 3, doctor_id: 1, day_of_week: 3, start_time: '08:00:00', end_time: '17:00:00', slot_duration_minutes: 30 },
  { id: 4, doctor_id: 1, day_of_week: 4, start_time: '08:00:00', end_time: '17:00:00', slot_duration_minutes: 30 },
  { id: 5, doctor_id: 1, day_of_week: 5, start_time: '08:00:00', end_time: '12:00:00', slot_duration_minutes: 30 },
];

async function init() {
  if (initialized) return;
  initialized = true;
  mockUsers = [
    { id: 1, name: 'Administrador SaludYa', email: 'admin@saludya.co',
      password_hash: await bcrypt.hash('admin123', 10),
      phone: '3001000001', role: 'admin', created_at: new Date() },
    { id: 2, name: 'Dra. Camila Ríos', email: 'medico@saludya.co',
      password_hash: await bcrypt.hash('medico123', 10),
      phone: '3001000002', role: 'doctor', created_at: new Date() },
    { id: 3, name: 'Ana López', email: 'paciente@saludya.co',
      password_hash: await bcrypt.hash('paciente123', 10),
      phone: '3001000003', role: 'patient', created_at: new Date() },
  ];
  console.log('[mockDB] ✓ Usuarios precargados listos');
}

// ─── Query router ─────────────────────────────────────────────────────────────

async function query(text, params = []) {
  await init();
  const sql = text.toLowerCase().trim();

  // ── SPECIALTIES ──────────────────────────────────────────────────────────────
  if (sql.includes('from specialties')) {
    return { rows: mockSpecialties };
  }

  // ── USERS: find by email ──────────────────────────────────────────────────────
  if (sql.includes('from users') && sql.includes('where') && sql.includes('email')) {
    const email = String(params[0] || '').toLowerCase();
    const user = mockUsers.find(u => u.email === email);
    return { rows: user ? [user] : [] };
  }

  // ── USERS: find by id ─────────────────────────────────────────────────────────
  if (sql.includes('from users') && sql.includes('where') && sql.includes('id')) {
    const id = parseInt(params[0]);
    const user = mockUsers.find(u => u.id === id);
    return { rows: user ? [user] : [] };
  }

  // ── USERS: INSERT (register) ──────────────────────────────────────────────────
  if (sql.startsWith('insert into users')) {
    const [name, email, password_hash, phone] = params;
    const newUser = {
      id: mockUsers.length + 1, name,
      email: String(email).toLowerCase(), password_hash,
      phone, role: 'patient', created_at: new Date(),
    };
    mockUsers.push(newUser);
    return { rows: [newUser] };
  }

  // ── DOCTORS + SCHEDULE JOIN (availability query) ─────────────────────────────
  // Detecta el JOIN entre doctors, users, specialties y doctor_schedules
  if (sql.includes('from doctors') && sql.includes('join doctor_schedules')) {
    const specialtyId = parseInt(params[0]);
    const dayOfWeek   = parseInt(params[1]);
    const rows = [];
    for (const doc of mockDoctors) {
      if (doc.specialty_id !== specialtyId || !doc.active) continue;
      const schedule = mockSchedules.find(s => s.doctor_id === doc.id && s.day_of_week === dayOfWeek);
      if (!schedule) continue;
      const user = mockUsers.find(u => u.id === doc.user_id) || {};
      const spec = mockSpecialties.find(s => s.id === doc.specialty_id) || {};
      rows.push({
        doctor_id: doc.id,
        doctor_name: user.name,
        specialty: spec.name,
        start_time: schedule.start_time,
        end_time: schedule.end_time,
        slot_duration_minutes: schedule.slot_duration_minutes,
      });
    }
    return { rows };
  }

  // ── DOCTORS: list for admin (JOIN users + specialties, sin schedules) ─────────
  if (sql.includes('from doctors') && sql.includes('join users')) {
    const rows = mockDoctors.map(d => {
      const user = mockUsers.find(u => u.id === d.user_id) || {};
      const spec = mockSpecialties.find(s => s.id === d.specialty_id) || {};
      return {
        id: d.id, bio: d.bio, active: d.active, created_at: d.created_at,
        user_id: user.id, name: user.name, email: user.email,
        phone: user.phone, specialty: spec.name, specialty_id: spec.id,
      };
    });
    return { rows };
  }

  // ── DOCTOR SCHEDULES ─────────────────────────────────────────────────────────
  if (sql.includes('from doctor_schedules')) {
    const doctorId = parseInt(params[0]);
    const rows = mockSchedules.filter(s => s.doctor_id === doctorId);
    return { rows };
  }

  // ── BLOCKED DATES ─────────────────────────────────────────────────────────────
  if (sql.includes('from blocked_dates')) {
    return { rows: [] };
  }

  // ── APPOINTMENTS: booked slots for availability (ANY array param) ─────────────
  if (sql.includes('from appointments') && sql.includes('any($1')) {
    return { rows: [] };
  }

  // ── APPOINTMENTS: my appointments (patient) con JOIN ─────────────────────────
  if (sql.includes('from appointments a') && sql.includes('join doctors')) {
    const patientId = parseInt(params[0]);
    const rows = mockAppointments
      .filter(a => a.patient_id === patientId)
      .map(a => {
        const doc  = mockDoctors.find(d => d.id === a.doctor_id) || {};
        const user = mockUsers.find(u => u.id === doc.user_id) || {};
        const spec = mockSpecialties.find(s => s.id === doc.specialty_id) || {};
        return {
          ...a, doctor_name: user.name, specialty: spec.name, doctor_id: doc.id,
        };
      });
    return { rows };
  }

  // ── APPOINTMENTS: doctor's agenda (doctor_id param) con JOIN ──────────────────
  if (sql.includes('from appointments') && sql.includes('doctor_id') && !sql.includes('insert')) {
    const id = parseInt(params[0]);
    // Si params[0] parece un appointment id (cancel/reschedule)
    const apptById = mockAppointments.find(a => a.id === id);
    if (apptById) return { rows: [apptById] };
    // Si es por doctor_id o patient_id
    const rows = mockAppointments.filter(a => a.doctor_id === id || a.patient_id === id);
    return { rows };
  }

  // ── APPOINTMENTS: find single by id (cancel / reschedule) ────────────────────
  if (sql.includes('from appointments') && sql.includes('where id')) {
    const id = parseInt(params[0]);
    const appt = mockAppointments.find(a => a.id === id);
    return { rows: appt ? [appt] : [] };
  }

  // ── APPOINTMENTS: INSERT ──────────────────────────────────────────────────────
  if (sql.startsWith('insert into appointments')) {
    const [patient_id, doctor_id, scheduled_at, notes] = params;
    const newAppt = {
      id: mockAppointments.length + 1,
      patient_id: parseInt(patient_id),
      doctor_id: parseInt(doctor_id),
      scheduled_at: new Date(scheduled_at),
      status: 'confirmed',
      notes: notes || null,
      reminder_sent: false,
      created_at: new Date(),
    };
    mockAppointments.push(newAppt);
    return { rows: [newAppt] };
  }

  // ── APPOINTMENTS: UPDATE (cancel / reschedule) ────────────────────────────────
  if (sql.startsWith('update appointments')) {
    const id = parseInt(params[params.length - 1]);
    const appt = mockAppointments.find(a => a.id === id);
    if (appt) {
      if (sql.includes("'cancelled'"))  appt.status = 'cancelled';
      if (sql.includes("'confirmed'"))  appt.status = 'confirmed';
      if (sql.includes('scheduled_at = $1')) appt.scheduled_at = new Date(params[0]);
    }
    return { rows: appt ? [appt] : [] };
  }

  // ── ADMIN METRICS (COUNT con FILTER) ─────────────────────────────────────────
  if (sql.includes('count(*)') && sql.includes('from appointments')) {
    const today = new Date().toISOString().split('T')[0];
    const todayAppts = mockAppointments.filter(a => {
      const d = new Date(a.scheduled_at).toISOString().split('T')[0];
      return d === today;
    });
    return {
      rows: [{
        total_today:     String(todayAppts.length),
        confirmed_today: String(todayAppts.filter(a => a.status === 'confirmed').length),
        cancelled_today: String(todayAppts.filter(a => a.status === 'cancelled').length),
        completed_today: String(todayAppts.filter(a => a.status === 'completed').length),
      }],
    };
  }

  // ── PASSWORD RESET TOKENS ─────────────────────────────────────────────────────
  if (sql.includes('password_reset_tokens')) {
    return { rows: [] };
  }

  // ── INSERT upsert doctor_schedules ───────────────────────────────────────────
  if (sql.includes('doctor_schedules')) {
    return { rows: [] };
  }

  // Fallback: query no reconocida → log y retorna vacío
  console.warn('[mockDB] Query no manejada:', text.slice(0, 100));
  return { rows: [] };
}

module.exports = { query };
