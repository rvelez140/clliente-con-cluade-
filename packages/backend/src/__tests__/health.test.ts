import request from 'supertest';
import express from 'express';
import router from '../routes';

const app = express();
app.use('/api', router);

describe('Health Check Endpoint', () => {
  it('GET /api/health - should return status ok', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
    expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
  });

  it('GET /api/health - timestamp should be valid ISO string', async () => {
    const response = await request(app).get('/api/health');

    const timestamp = new Date(response.body.timestamp);
    expect(timestamp.toISOString()).toBe(response.body.timestamp);
  });

  it('GET /api/health - should respond quickly', async () => {
    const start = Date.now();
    await request(app).get('/api/health');
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(100); // Should respond in less than 100ms
  });
});
