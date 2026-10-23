const request = require('supertest');
const { createApp } = require('../src/app');
const { startMemoryDb, stopMemoryDb } = require('./helpers/memoryDb');

const app = createApp();

describe('GET /api/health', () => {
  afterAll(async () => {
    await stopMemoryDb();
  });

  test('returns 503 when MongoDB is not connected', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(503);
    expect(response.body.success).toBe(false);
    expect(response.body.data.database.connected).toBe(false);
    expect(response.body.data.service).toBe('marketmind-server');
  });

  test('returns 200 when MongoDB is connected', async () => {
    await startMemoryDb();

    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
    expect(response.body.data.database.connected).toBe(true);
  });
});
