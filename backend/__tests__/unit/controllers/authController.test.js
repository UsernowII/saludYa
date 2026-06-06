const bcrypt = require('bcryptjs');

// Mock the database module before requiring the controller
jest.mock('../../../src/config/database', () => ({
  query: jest.fn(),
}));

jest.mock('../../../src/services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(true),
  sendAppointmentConfirmation: jest.fn().mockResolvedValue(true),
}));

const { query } = require('../../../src/config/database');
const {
  register,
  login,
} = require('../../../src/controllers/authController');

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => jest.clearAllMocks());

// ─── register ─────────────────────────────────────────────────────────────────

describe('authController.register', () => {
  test('returns 400 when required fields are missing', async () => {
    const req = { body: { email: 'x@x.com' } };
    const res = makeRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(query).not.toHaveBeenCalled();
  });

  test('returns 400 when password is shorter than 6 chars', async () => {
    const req = { body: { name: 'Ana', email: 'a@a.com', password: '123', phone: '3001234567' } };
    const res = makeRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 409 when email already exists', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // email taken

    const req = { body: { name: 'Ana', email: 'taken@x.com', password: 'secret123', phone: '3001234567' } };
    const res = makeRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  test('creates user and returns token on success', async () => {
    query
      .mockResolvedValueOnce({ rows: [] })                    // email not taken
      .mockResolvedValueOnce({                                 // INSERT user
        rows: [{ id: 5, name: 'Ana', email: 'ana@x.com', phone: '300', role: 'patient', created_at: new Date() }],
      });

    const req = { body: { name: 'Ana', email: 'ana@x.com', password: 'secret123', phone: '300' } };
    const res = makeRes();

    await register(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toHaveProperty('token');
    expect(payload.user).toMatchObject({ name: 'Ana', email: 'ana@x.com' });
    expect(payload.user).not.toHaveProperty('password_hash');
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('authController.login', () => {
  test('returns 400 when email or password is missing', async () => {
    const req = { body: { email: 'x@x.com' } };
    const res = makeRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('returns 401 when user is not found', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    const req = { body: { email: 'ghost@x.com', password: 'pass123' } };
    const res = makeRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns 401 when password is wrong', async () => {
    const hash = await bcrypt.hash('correctpass', 10);
    query.mockResolvedValueOnce({
      rows: [{ id: 1, name: 'Ana', email: 'a@x.com', password_hash: hash, role: 'patient' }],
    });

    const req = { body: { email: 'a@x.com', password: 'wrongpass' } };
    const res = makeRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('returns token and user on successful login', async () => {
    const hash = await bcrypt.hash('mypassword', 10);
    query.mockResolvedValueOnce({
      rows: [{ id: 2, name: 'Juan', email: 'j@x.com', password_hash: hash, role: 'patient', phone: '300', created_at: new Date() }],
    });

    const req = { body: { email: 'j@x.com', password: 'mypassword' } };
    const res = makeRes();

    await login(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload).toHaveProperty('token');
    expect(payload.user.name).toBe('Juan');
    expect(payload.user).not.toHaveProperty('password_hash');
  });
});
