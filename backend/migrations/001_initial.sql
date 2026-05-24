-- SaludYa Initial Migration
-- Run this file against your PostgreSQL database to create the schema.
-- After running this migration, run `npm run seed` to create test data.

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  name         VARCHAR(255) NOT NULL,
  email        VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone        VARCHAR(50),
  role         VARCHAR(20) NOT NULL DEFAULT 'patient'
                 CHECK (role IN ('patient', 'doctor', 'admin')),
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Specialties table
CREATE TABLE IF NOT EXISTS specialties (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  description TEXT
);

-- Doctors table
CREATE TABLE IF NOT EXISTS doctors (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  specialty_id INT NOT NULL REFERENCES specialties(id),
  bio          TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Doctor weekly schedules
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id                    SERIAL PRIMARY KEY,
  doctor_id             INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week           INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time            TIME NOT NULL,
  end_time              TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 30,
  UNIQUE (doctor_id, day_of_week)
);

-- Blocked dates (holidays, vacations, etc.)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id           SERIAL PRIMARY KEY,
  doctor_id    INT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  blocked_date DATE NOT NULL,
  reason       VARCHAR(255)
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id            SERIAL PRIMARY KEY,
  patient_id    INT NOT NULL REFERENCES users(id),
  doctor_id     INT NOT NULL REFERENCES doctors(id),
  scheduled_at  TIMESTAMP NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'confirmed'
                  CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed', 'rescheduled')),
  notes         TEXT,
  reminder_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  used       BOOLEAN NOT NULL DEFAULT FALSE
);

-- ─── Seed Data ────────────────────────────────────────────────────────────────

-- Specialties
INSERT INTO specialties (name, description) VALUES
  ('Medicina General',  'Atención médica primaria y preventiva para todas las edades.'),
  ('Pediatría',         'Atención médica especializada en niños y adolescentes.'),
  ('Cardiología',       'Diagnóstico y tratamiento de enfermedades del corazón y sistema circulatorio.')
ON CONFLICT (name) DO NOTHING;

-- Admin user
-- Password hash corresponds to 'admin123' with bcrypt 10 rounds.
-- Generated with: bcryptjs.hashSync('admin123', 10)
INSERT INTO users (name, email, password_hash, phone, role) VALUES
  (
    'Administrador SaludYa',
    'admin@saludya.co',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lheO',
    '+57 300 000 0000',
    'admin'
  )
ON CONFLICT (email) DO NOTHING;
