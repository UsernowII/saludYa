const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

// Solo disponible si ENABLE_SEED=true en las variables de entorno
router.post('/', async (req, res) => {
  if (process.env.ENABLE_SEED !== 'true') {
    return res.status(403).json({ error: 'Seed endpoint disabled in this environment.' });
  }

  try {
    // ── 1. ESPECIALIDADES ──────────────────────────────────────────────────────
    await query(`
      INSERT INTO specialties (name, description) VALUES
        ('Medicina General',  'Atención médica primaria y preventiva'),
        ('Pediatría',         'Atención médica para niños y adolescentes'),
        ('Cardiología',       'Diagnóstico y tratamiento de enfermedades del corazón'),
        ('Dermatología',      'Enfermedades de la piel, cabello y uñas'),
        ('Ginecología',       'Salud femenina y reproductiva')
      ON CONFLICT (name) DO NOTHING
    `);

    const specs = await query('SELECT id, name FROM specialties');
    const specMap = {};
    specs.rows.forEach(s => specMap[s.name] = s.id);

    // ── 2. USUARIOS ────────────────────────────────────────────────────────────
    const users = [
      { name: 'Administrador SaludYa', email: 'admin@saludya.co',       password: 'admin123',    phone: '3001000001', role: 'admin'   },
      { name: 'Dr. Carlos Mendoza',    email: 'cmendoza@saludya.co',    password: 'medico123',   phone: '3001000002', role: 'doctor'  },
      { name: 'Dra. Camila Ríos',      email: 'crios@saludya.co',       password: 'medico123',   phone: '3001000003', role: 'doctor'  },
      { name: 'Dr. Andrés Torres',     email: 'atorres@saludya.co',     password: 'medico123',   phone: '3001000004', role: 'doctor'  },
      { name: 'Ana López',             email: 'ana.lopez@gmail.com',    password: 'paciente123', phone: '3101000001', role: 'patient' },
      { name: 'Carlos Pérez',          email: 'carlos.perez@gmail.com', password: 'paciente123', phone: '3101000002', role: 'patient' },
      { name: 'María Fernanda Ruiz',   email: 'mruiz@gmail.com',        password: 'paciente123', phone: '3101000003', role: 'patient' },
    ];

    const userIds = {};
    for (const u of users) {
      const hash = await bcrypt.hash(u.password, 10);
      const r = await query(
        `INSERT INTO users (name, email, password_hash, phone, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (email) DO UPDATE SET password_hash = $3, role = $5
         RETURNING id`,
        [u.name, u.email, hash, u.phone, u.role]
      );
      userIds[u.email] = r.rows[0].id;
    }

    // ── 3. DOCTORES ────────────────────────────────────────────────────────────
    const doctorData = [
      { email: 'cmendoza@saludya.co', specialty: 'Medicina General', bio: 'Médico general con 8 años de experiencia.' },
      { email: 'crios@saludya.co',    specialty: 'Pediatría',        bio: 'Pediatra especializada en desarrollo infantil.' },
      { email: 'atorres@saludya.co',  specialty: 'Cardiología',      bio: 'Cardiólogo con subespecialidad intervencionista.' },
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
    }

    // ── 4. HORARIOS ────────────────────────────────────────────────────────────
    for (let day = 1; day <= 5; day++) {
      await query(
        `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
         VALUES ($1, $2, '08:00', '17:00', 30) ON CONFLICT (doctor_id, day_of_week) DO NOTHING`,
        [doctorIds['cmendoza@saludya.co'], day]
      );
    }
    for (const day of [1, 3, 5]) {
      await query(
        `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
         VALUES ($1, $2, '09:00', '13:00', 30) ON CONFLICT (doctor_id, day_of_week) DO NOTHING`,
        [doctorIds['crios@saludya.co'], day]
      );
    }
    for (const day of [2, 4]) {
      await query(
        `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes)
         VALUES ($1, $2, '10:00', '18:00', 30) ON CONFLICT (doctor_id, day_of_week) DO NOTHING`,
        [doctorIds['atorres@saludya.co'], day]
      );
    }

    // ── 5. CITAS DE EJEMPLO ────────────────────────────────────────────────────
    function toISO(daysFromNow, hour, min = 0) {
      const d = new Date();
      d.setDate(d.getDate() + daysFromNow);
      d.setUTCHours(hour, min, 0, 0);
      return d.toISOString();
    }

    const appointments = [
      { patient: 'ana.lopez@gmail.com',    doctor: 'cmendoza@saludya.co', at: toISO(1, 13),    status: 'confirmed', notes: 'Control general' },
      { patient: 'carlos.perez@gmail.com', doctor: 'cmendoza@saludya.co', at: toISO(1, 14),    status: 'confirmed', notes: 'Seguimiento tensión' },
      { patient: 'mruiz@gmail.com',        doctor: 'crios@saludya.co',    at: toISO(2, 14),    status: 'confirmed', notes: 'Control de niño' },
      { patient: 'ana.lopez@gmail.com',    doctor: 'atorres@saludya.co',  at: toISO(7, 15),    status: 'confirmed', notes: 'Electrocardiograma' },
      { patient: 'carlos.perez@gmail.com', doctor: 'cmendoza@saludya.co', at: toISO(7, 10, 30), status: 'cancelled', notes: null },
    ];

    for (const a of appointments) {
      await query(
        `INSERT INTO appointments (patient_id, doctor_id, scheduled_at, status, notes)
         VALUES ($1, $2, $3, $4, $5)`,
        [userIds[a.patient], doctorIds[a.doctor], a.at, a.status, a.notes]
      );
    }

    res.status(201).json({
      message: '✅ Seed completado exitosamente',
      credentials: [
        { role: 'admin',   email: 'admin@saludya.co',       password: 'admin123'    },
        { role: 'doctor',  email: 'cmendoza@saludya.co',    password: 'medico123'   },
        { role: 'doctor',  email: 'crios@saludya.co',       password: 'medico123'   },
        { role: 'doctor',  email: 'atorres@saludya.co',     password: 'medico123'   },
        { role: 'patient', email: 'ana.lopez@gmail.com',    password: 'paciente123' },
        { role: 'patient', email: 'carlos.perez@gmail.com', password: 'paciente123' },
        { role: 'patient', email: 'mruiz@gmail.com',        password: 'paciente123' },
      ],
    });

  } catch (err) {
    console.error('Seed error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
