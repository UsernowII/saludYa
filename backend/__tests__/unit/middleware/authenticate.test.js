const jwt = require('jsonwebtoken');
const { authenticate, authorize } = require('../../../src/middlewares/authenticate');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

function validToken(payload = {}) {
  return jwt.sign(
    { id: 1, email: 'test@test.com', role: 'patient', ...payload },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// ─── authenticate ─────────────────────────────────────────────────────────────

describe('authenticate middleware', () => {
  test('calls next() and sets req.user when token is valid', () => {
    const token = validToken();
    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = makeRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ id: 1, email: 'test@test.com', role: 'patient' });
  });

  test('returns 401 when Authorization header is missing', () => {
    const req = { headers: {} };
    const res = makeRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.any(String) })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token format is not Bearer', () => {
    const req = { headers: { authorization: 'Basic abc123' } };
    const res = makeRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token is expired', () => {
    const expiredToken = jwt.sign(
      { id: 1, email: 'x@x.com', role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }
    );
    const req = { headers: { authorization: `Bearer ${expiredToken}` } };
    const res = makeRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.stringContaining('expired') })
    );
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when token is tampered', () => {
    const req = { headers: { authorization: 'Bearer invalid.token.here' } };
    const res = makeRes();
    const next = jest.fn();

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── authorize ────────────────────────────────────────────────────────────────

describe('authorize middleware', () => {
  test('calls next() when user role is in allowed roles', () => {
    const req = { user: { id: 1, email: 'doc@test.com', role: 'doctor' } };
    const res = makeRes();
    const next = jest.fn();

    authorize('doctor', 'admin')(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
  });

  test('returns 403 when user role is not in allowed roles', () => {
    const req = { user: { id: 1, email: 'p@test.com', role: 'patient' } };
    const res = makeRes();
    const next = jest.fn();

    authorize('doctor', 'admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when req.user is not set', () => {
    const req = {};
    const res = makeRes();
    const next = jest.fn();

    authorize('admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
