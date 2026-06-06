const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../src/config/database', () => ({ query: jest.fn() }));
jest.mock('../../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendAppointmentConfirmation: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../src/services/reminderJob', () => ({ startReminderJob: jest.fn() }));

const { query } = require('../../src/config/database');
const app = require('../../src/app');

function tokenFor(role = 'patient', id = 1) {
  return jwt.sign({ id, email: 'test@x.com', role }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

beforeEach(() => jest.clearAllMocks());

describe('GET /api/appointments/available', () => {
  test('400 — missing query params', async () => {
    const res = await request(app)
      .get('/api/appointments/available')
      .set('Authorization', `Bearer ${tokenFor()}`);
    expect(res.statusCode).toBe(400);
  });

  test('200 — returns available slots', async () => {
    // Query 1: JOIN doctors + users + specialties + doctor_schedules
    query.mockResolvedValueOnce({
      rows: [{
        doctor_id: 1,
        doctor_name: 'Dr. García',
        specialty: 'Medicina General',
        start_time: '08:00:00',
        end_time: '12:00:00',
        slot_duration_minutes: 30,
      }],
    });
    // Query 2: blocked dates
    query.mockResolvedValueOnce({ rows: [] });
    // Query 3: booked appointments
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/appointments/available?specialtyId=1&date=2026-12-15')
      .set('Authorization', `Bearer ${tokenFor()}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('401 — no token', async () => {
    const res = await request(app).get('/api/appointments/available?specialtyId=1&date=2026-12-15');
    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/appointments', () => {
  test('403 — doctors cannot book appointments', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenFor('doctor')}`)
      .send({ doctorId: 1, scheduledAt: '2026-12-15T09:00:00Z' });
    expect(res.statusCode).toBe(403);
  });

  test('400 — missing required body fields', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenFor('patient')}`)
      .send({ notes: 'only notes' });
    expect(res.statusCode).toBe(400);
  });
});

describe('PATCH /api/appointments/:id/cancel', () => {
  test('404 — appointment not found or not owned by user', async () => {
    query.mockResolvedValueOnce({ rows: [] }); // not found

    const res = await request(app)
      .patch('/api/appointments/999/cancel')
      .set('Authorization', `Bearer ${tokenFor('patient', 1)}`);
    expect(res.statusCode).toBe(404);
  });

  test('200 — cancels the appointment', async () => {
    query
      .mockResolvedValueOnce({ rows: [{ id: 5, patient_id: 1, status: 'confirmed' }] })
      .mockResolvedValueOnce({ rows: [{ id: 5, status: 'cancelled' }] });

    const res = await request(app)
      .patch('/api/appointments/5/cancel')
      .set('Authorization', `Bearer ${tokenFor('patient', 1)}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });
});
