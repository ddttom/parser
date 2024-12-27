import { jest } from '@jest/globals';
import { parse } from '../../src/services/parser/parsers/time.js';

describe('Time Parser Edge Cases', () => {
    test('should not match numbers in date contexts', async () => {
        const inputs = [
            "in 2 weeks",
            "2 days from now",
            "2 months",
            "2nd of March"
        ];

        for (const input of inputs) {
            const result = await parse(input);
            expect(result).toBeNull();
        }
    });

    test('should match valid time formats', async () => {
        const inputs = [
            "2pm",
            "2:00pm",
            "14:00",
            "2:30 PM"
        ];

        for (const input of inputs) {
            const result = await parse(input);
            expect(result).not.toBeNull();
            expect(result.type).toBe('time');
            expect(result.value).toMatch(/^\d{2}:\d{2}:\d{2}$/);
        }
    });
});
