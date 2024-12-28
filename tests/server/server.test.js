import { jest } from '@jest/globals';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { startServer } from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Parser Server', () => {
    let server;
    const testPort = 3001;

    beforeAll(async () => {
        server = await startServer(testPort);
    });

    afterAll((done) => {
        server.close(done);
    });

    it('should have health check endpoint', async () => {
        const response = await fetch(`http://localhost:${testPort}/health`);
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data).toEqual({ status: 'ok' });
    });

    it('should handle missing text in parse request', async () => {
        const response = await fetch(`http://localhost:${testPort}/parse`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });
        const data = await response.json();
        expect(response.status).toBe(400);
        expect(data).toEqual({
            success: false,
            error: 'No text provided'
        });
    });

    it('should parse text successfully', async () => {
        const response = await fetch(`http://localhost:${testPort}/parse`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: 'High priority meeting tomorrow at 2pm'
            })
        });
        const data = await response.json();
        expect(response.status).toBe(200);
        expect(data.success).toBe(true);
        expect(data.result).toBeDefined();
        expect(data.result.raw).toBe('High priority meeting tomorrow at 2pm');
    });
});
