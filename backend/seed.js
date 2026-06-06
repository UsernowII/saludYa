/**
 * Seed script — carga datos de prueba en la DB de producción
 * Uso: node seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { query } = require('./src/config/database');

async function seed() {
  console.log('🌱 Iniciando carga de datos de prueba...\n');

  // ── 1. ESPECIALIDADES ──────────────────────────────────────────────────────
  console.log('→ Especialidades...');
  await query(`
    INSERT INTO specialties (name, description) VALUES
      ('Medicina General',  'Atención médica primaria y preventiva'),
      ('Pediatría',         'Atención médica para niños y adolescentes'),
      ('Cardiología',       'Diagnóstico y tratamiento de enfermedades del corazón'),
      ('Dermatología',      'Enfermedades de la piel, cabello y uñas'),
      ('Ginecología',       'Salud femenina y reproductiva')
    ON CONFLICT (name) DO NOTHING
  `);

  const specs = await query('SELECT id, name FROM specialties ORDER BY id');
  const specMap = {};
  specs.rows.forEach(s => specMap[s.name] = s.id);
  console.log('  ✓', specs.rows.length, 'especialidades');

  // ── 2. USUARIOS ────────────────────────────────────────────────────────────
  console.log('→ Usuarios...');

  const users = [
    { name: 'Administrador SaludYa', email: 'admin@saludya.co',       password: 'admin123',    phone: '3001000001', role: 'admin'    },
    { name: 'Dr. Carlos Mendoza',    email: 'cmendoza@saludya.co',    password: 'medico123',   phone: '3001000002', role: 'doctor'   },
    { name: 'Dra. Camila Ríos',      email: 'crios@saludya.co',       password: 'medico123',   phone: '3001000003', role: 'doctor'   },
    { name: 'Dr. Andrés Torres',     email: 'atorres@saludya.co',     password: 'medico123',   phone: '3001000004', role: 'doctor'   },
    { name: 'Ana López',             email: 'ana.lopez@gmail.com',    password: 'paciente123', phone: '3101000001', role: 'patient'  },
    { name: 'Carlos Pérez',          email: 'carlos.perez@gmail.com', password: 'paciente123', phone: '3101000002', role: 'patient'  },
    { name: 'María Fernanda Ruiz',   email: 'mruiz@gmail.com',        password: 'paciente123', phone: '3101000003', role: 'patient'  },
  ];

  const userIds = {};
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    const res = await query(
      `INSERT INTO users (name, email, password_hash, phone, role)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET password_hash = $3, role = $5
       RETURNING id, name, role`,
      [u.name, u.email, hash, u.phone, u.role]
    );
    userIds[u.email] = res.rows[0].id;
    console.log(`  ✓ ${u.role.padEnd(7)} | ${u.name} (${u.email})`);
  }

  // ── 3. DOCTORES ────────────────────────────────────────────────────────────
  console.log('→ Perfiles de médico...');

  const doctorData = [
    { email: 'cmendoza@saludya.co', specialty: 'Medicina General', bio: 'Médico general con 8 años de experiencia en atención primaria.' },
    { email: 'crios@saludya.co',    specialty: 'Pediatría',        bio: 'Pediatra especializada en desarrollo infantil y neonatología.' },
    { email: 'atorres@saludya.co',  specialty: 'Cardiología',      bio: 'Cardiólogo con subespecialidad en cardiología intervencionista.' },
  ];

  const doctorIds = {};
  for (const d of doctorData) {
    const userId = userIds[d.email];
    const existing = await query('SELECT id FROM doctors WHERE user_id = $1', [userId]);
    let doctorId;
    if (existing.rows.length > 0) {
      doctorId = existing.rows[0].id;
      await query('UPDATE doctors SET specialty_id = $1, bio = $2 WHERE id = $3',
        [specMap[d.specialty], d.bio, doctorId]);
    } else {
      const r = await query(
        `INSERT INTO doctors (user_id, specialty_id, bio, active)
         VALUES ($1, $2, $3, true) RETURNING id`,
        [userId, specMap[d.specialty], d.bio]
      );
      doctorId = r.rows[0].id;
    }
    doctorIds[d.email] = doctorId;
    console.log(`  ✓ Dr. perfil | ${d.specialty}`);
  }

  // ── 4. HORARIOS DE ATENCIÓN ────────────────────────────────────────────────
  console.log('→ Horarios de atención...');

  // Dr. Mendoza: lunes a viernes 8am-5pm
  const mendozaId = doctorIds['cmendoza@saludya.co'];
  for (let day = 1; day <= 5; day++) {
    await query(
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
       VALUES ($1, $2, '08:00', '17:00', 30)
       ON CONFLICT (doctor_id, day_of_week) DO NOTHING`,
      [mendozaId, day]
    );
  }

  // Dra. Ríos: lunes, miércoles y viernes 9am-1pm
  const riosId = doctorIds['crios@saludya.co'];
  for (const day of [1, 3, 5]) {
    await query(
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
       VALUES ($1, $2, '09:00', '13:00', 30)
       ON CONFLICT (doctor_id, day_of_week) DO NOTHING`,
      [riosId, day]
    );
  }

  // Dr. Torres: martes y jueves 10am-6pm
  const torresId = doctorIds['atorres@saludya.co'];
  for (const day of [2, 4]) {
    await query(
      `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
       VALUES ($1, $2, '10:00', '18:00', 30)
       ON CONFLICT (doctor_id, day_of_week) DO NOTHING`,
      [torresId, day]
    );
  }
  console.log('  ✓ Horarios configurados para 3 médicos');

  // ── 5. CITAS DE EJEMPLO ────────────────────────────────────────────────────
  console.log('→ Citas de ejemplo...');

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  function toISO(date, hour, min = 0) {
    const d = new Date(date);
    d.setUTCHours(hour, min, 0, 0);
    return d.toISOString();
  }

  const appointments = [
    { patient: 'ana.lopez@gmail.com',    doctor: 'cmendoza@saludya.co', at: toISO(tomorrow, 13, 0),  status: 'confirmed', notes: 'Control general' },
    { patient: 'carlos.perez@gmail.com', doctor: 'cmendoza@saludya.co', at: toISO(tomorrow, 14, 0),  status: 'confirmed', notes: 'Seguimiento tensión' },
    { patient: 'mruiz@gmail.com',        doctor: 'crios@saludya.co',    at: toISO(dayAfter, 14, 0),  status: 'confirmed', notes: 'Cita de niño' },
    { patient: 'ana.lopez@gmail.com',    doctor: 'atorres@saludya.co',  at: toISO(nextWeek, 15, 0),  status: 'confirmed', notes: 'Electrocardiograma' },
    { patient: 'carlos.perez@gmail.com', doctor: 'cmendoza@saludya.co', at: toISO(nextWeek, 10, 30), status: 'cancelled', notes: null },
  ];

  for (const a of appointments) {
    await query(
      `INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, notes)
       VALUES ($1, $2, $3, $4, $5)`,
      [userIds[a.patient], doctorIds[a.doctor], a.at, a.status, a.notes]
    );
  }
  console.log('  ✓', appointments.length, 'citas creadas');

  // ── RESUMEN ────────────────────────────────────────────────────────────────
  console.log('\n✅ Seed completado. Credenciales de prueba:\n');
  console.log('  ROL      | EMAIL                      | PASSWORD');
  console.log('  ---------|----------------------------|-----------');
  console.log('  admin    | admin@saludya.co           | admin123');
  console.log('  doctor   | cmendoza@saludya.co        | medico123');
  console.log('  doctor   | crios@saludya.co           | medico123');
  console.log('  doctor   | atorres@saludya.co         | medico123');
  console.log('  patient  | ana.lopez@gmail.com        | paciente123');
  console.log('  patient  | carlos.perez@gmail.com     | paciente123');
  console.log('  patient  | mruiz@gmail.com            | paciente123');

  process.exit(0);
}

seed().catch(err => {
  console.error('\n✗ Error en seed:', err.message);
  process.exit(1);
});
