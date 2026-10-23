const request = require('supertest');
const { createApp } = require('../src/app');
const { User } = require('../src/models/User');
const { startMemoryDb, stopMemoryDb, clearCollections } = require('./helpers/memoryDb');

const app = createApp();

const sampleUser = {
  name: 'Asha Verma',
  email: 'asha@example.com',
  password: 'securePass1',
  shopName: 'Asha Mart',
  shopAddress: '12 Market Road',
};

async function registerUser(overrides = {}) {
  return request(app).post('/api/auth/register').send({ ...sampleUser, ...overrides });
}

describe('Authentication', () => {
  beforeAll(async () => {
    await startMemoryDb();
  });

  afterAll(async () => {
    await stopMemoryDb();
  });

  afterEach(async () => {
    await clearCollections();
  });

  test('registers a user and returns a token without a password hash', async () => {
    const response = await registerUser();

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user.email).toBe('asha@example.com');
    expect(response.body.data.user.shopName).toBe('Asha Mart');
    expect(response.body.data.user).not.toHaveProperty('password');
    expect(JSON.stringify(response.body)).not.toMatch(/\$2[aby]\$/);

    const stored = await User.findOne({ email: 'asha@example.com' }).select('+password');
    expect(stored.password).not.toBe(sampleUser.password);
    expect(stored.password.startsWith('$2')).toBe(true);
  });

  test('rejects duplicate email registration', async () => {
    await registerUser();
    const response = await registerUser();

    expect(response.status).toBe(409);
    expect(response.body.success).toBe(false);
  });

  test('rejects invalid registration payloads', async () => {
    const response = await registerUser({
      email: 'not-an-email',
      password: 'short',
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Validation failed');
  });

  test('logs in with valid credentials', async () => {
    await registerUser();

    const response = await request(app).post('/api/auth/login').send({
      email: sampleUser.email,
      password: sampleUser.password,
    });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toEqual(expect.any(String));
    expect(response.body.data.user.email).toBe('asha@example.com');
    expect(response.body.data.user).not.toHaveProperty('password');
  });

  test('rejects invalid login credentials', async () => {
    await registerUser();

    const response = await request(app).post('/api/auth/login').send({
      email: sampleUser.email,
      password: 'wrong-password',
    });

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid email or password');
  });

  test('rejects login for an unknown email', async () => {
    const response = await request(app).post('/api/auth/login').send({
      email: 'missing@example.com',
      password: 'securePass1',
    });

    expect(response.status).toBe(401);
  });

  test('protects /api/auth/me without a token', async () => {
    const response = await request(app).get('/api/auth/me');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Authentication required');
  });

  test('rejects a malformed token', async () => {
    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not-a-real-token');

    expect(response.status).toBe(401);
    expect(response.body.message).toBe('Invalid token');
  });

  test('returns the current user for a valid token', async () => {
    const created = await registerUser();
    const token = created.body.data.token;

    const response = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe('asha@example.com');
    expect(response.body.data.user).not.toHaveProperty('password');
  });
});
