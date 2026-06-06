// Global test environment variables — no real DB needed
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-jest';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.PORT = '3002';
