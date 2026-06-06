const request = require('supertest');
const bcrypt = require('bcryptjs');

// Mock DB before requiring app
jest.mock('../../src/config/database', () => ({ query: jest.fn() }));
jest.mock('../../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendAppointmentConfirmation: jest.fn().mockResolvedValue(true),
}));
jest.mock('../../src/services/reminderJob', () => ({ startReminderJob: jest.fn() }));

const { query } = require('../../src/config/database');
const app = require('../../src/app');

beforeEach(() => jest.clearAllMocks());

describe('POST /api/auth/register', () => {
  test('201 — creates a new patient account', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({
        rows: [{ id: 1, name: 'María', email: 'maria@x.com', phone: '300', role: 'patient', created_at: new Date() }],
      });

    const res = await request(app).post('/api/auth/register').send({
      name: 'María', email: 'maria@x.com', password: 'pass123', phone: '3001112233',
    });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.email).toBe('maria@x.com');
  });

  test('400 — missing required fields', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'x@x.com' });
    expect(res.statusCode).toBe(400);
  });

  test('409 — duplicate email', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 99 }] });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana', email: 'dup@x.com', password: 'pass123', phone: '300',
    });
    expect(res.statusCode).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  test('200 — returns token on valid credentials', async () => {
    const hash = await bcrypt.hash('pass123', 10);
    query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Admin', email: 'admin@x.com', password_hash: hash, role: 'admin', phone: '', created_at: new Date() }],
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'admin@x.com', password: 'pass123',
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  test('401 — wrong password', async () => {
    const hash = await bcrypt.hash('correctpass', 10);
    query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'X', email: 'x@x.com', password_hash: hash, role: 'patient' }],
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'x@x.com', password: 'wrongpass',
    });
    expect(res.statusCode).toBe(401);
  });

  test('401 — user not found', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/auth/login').send({
      email: 'nobody@x.com', password: 'pass123',
    });
    expect(res.statusCode).toBe(401);
  });
});

describe('GET /ping', () => {
  test('200 — health check always works', async () => {
    const res = await request(app).get('/ping');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
