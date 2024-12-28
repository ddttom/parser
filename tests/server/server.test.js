import request from 'supertest';
import { startServer } from './index.js';

let server;

beforeAll(async () => {
  server = await startServer(0); // Use port 0 for random available port
});

afterAll(async () => {
  await server.close();
});

describe('Parser Server', () => {
  describe('Input Validation', () => {
    test('should reject empty requests', async () => {
      const response = await request(server)
        .post('/parse')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'No text provided'
      });
    });

    test('should reject non-string text', async () => {
      const response = await request(server)
        .post('/parse')
        .send({ text: 123 });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid input: text must be a string under 1000 characters'
      });
    });

    test('should reject invalid options', async () => {
      const response = await request(server)
        .post('/parse')
        .send({ 
          text: 'test',
          options: 'invalid'
        });
      
      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        success: false,
        error: 'Invalid options: must be an object'
      });
    });
  });

  describe('Text Processing', () => {
    test('should process text through all stages', async () => {
      const response = await request(server)
        .post('/parse')
        .send({ 
          text: 'urgent meeting tomorrow at 2pm with John about project alpha'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.result).toEqual(expect.objectContaining({
        original: expect.any(String),
        perfected: expect.any(String),
        stages: expect.any(Array),
        confidence: expect.any(String),
        totalDuration: expect.any(Number)
      }));

      // Verify stages
      expect(response.body.result.stages).toHaveLength(6);
      expect(response.body.result.stages[0]).toEqual(expect.objectContaining({
        stage: 1,
        parsers: ['subject', 'action'],
        changes: expect.any(Array),
        duration: expect.any(Number)
      }));
    });

    test('should track changes through stages', async () => {
      const response = await request(server)
        .post('/parse')
        .send({ 
          text: 'meeting tomorrow at 2pm'
        });
      
      expect(response.status).toBe(200);
      
      // Stage 1: Action improvement
      const stage1 = response.body.result.stages[0];
      expect(stage1.changes.some(c => c.parser === 'action')).toBe(true);
      
      // Stage 2: Date/Time improvements
      const stage2 = response.body.result.stages[1];
      expect(stage2.changes.some(c => 
        c.parser === 'date' || c.parser === 'time'
      )).toBe(true);
    });

    test('should respect parser exclusions', async () => {
      const response = await request(server)
        .post('/parse')
        .send({ 
          text: 'meeting tomorrow at 2pm',
          options: {
            exclude: ['time']
          }
        });
      
      expect(response.status).toBe(200);
      
      // Time parser should be skipped
      const stage2 = response.body.result.stages[1];
      expect(stage2.changes.every(c => c.parser !== 'time')).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should handle parser errors gracefully', async () => {
      const response = await request(server)
        .post('/parse')
        .send({ 
          text: ''.padStart(1001, 'a') // Text too long
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('should include error details in stage results', async () => {
      const response = await request(server)
        .post('/parse')
        .send({ 
          text: 'meeting with @#$invalid&chars'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Some parsers may report errors in their changes
      const hasErrors = response.body.result.stages.some(stage =>
        stage.changes.some(change => change.error)
      );
      expect(hasErrors).toBe(true);
    });
  });

  describe('Performance', () => {
    test('should process text within time limit', async () => {
      const response = await request(server)
        .post('/parse')
        .send({ 
          text: 'urgent meeting tomorrow at 2pm with John about project alpha'
        });
      
      expect(response.status).toBe(200);
      expect(response.body.result.totalDuration).toBeLessThan(500); // 500ms limit
    });

    test('should handle concurrent requests', async () => {
      const requests = Array(10).fill().map(() =>
        request(server)
          .post('/parse')
          .send({ 
            text: 'meeting tomorrow'
          })
      );
      
      const responses = await Promise.all(requests);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });
});
