import { name, parse } from '../../src/services/parser/parsers/time.js';

describe('Time Parser', () => {
    describe('Input Validation', () => {
        test('handles null input', async () => {
            const result = await parse(null);
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('handles empty string', async () => {
            const result = await parse('');
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('returns null for text without time', async () => {
            const result = await parse('Regular text without time');
            expect(result).toBeNull();
        });
    });

    describe('Specific Time', () => {
        test('parses 12-hour format', async () => {
            const result = await parse('Meeting at 2:30pm');
            expect(result).toEqual({
                type: 'time',
                value: {
                    hours: 14,
                    minutes: 30
                },
                metadata: {
                    pattern: 'specific',
                    confidence: expect.any(Number),
                    originalMatch: '2:30pm'
                }
            });
        });

        test('parses 24-hour format', async () => {
            const result = await parse('Meeting at 14:30');
            expect(result.value).toEqual({
                hours: 14,
                minutes: 30
            });
        });

        test('handles missing minutes', async () => {
            const result = await parse('Meeting at 2pm');
            expect(result.value).toEqual({
                hours: 14,
                minutes: 0
            });
        });
    });

    describe('Time Periods', () => {
        test('parses morning period', async () => {
            const result = await parse('Meeting in the morning');
            expect(result.value).toEqual({
                period: 'morning',
                start: 9,
                end: 12
            });
        });

        test('parses afternoon period', async () => {
            const result = await parse('Meeting in the afternoon');
            expect(result.value).toEqual({
                period: 'afternoon',
                start: 12,
                end: 17
            });
        });

        test('parses evening period', async () => {
            const result = await parse('Meeting in the evening');
            expect(result.value).toEqual({
                period: 'evening',
                start: 17,
                end: 21
            });
        });
    });

    describe('Error Handling', () => {
        test('handles invalid hours', async () => {
            const result = await parse('Meeting at 25:00');
            expect(result).toEqual({
                type: 'error',
                error: 'PARSER_ERROR',
                message: 'Invalid time values'
            });
        });

        test('handles invalid minutes', async () => {
            const result = await parse('Meeting at 2:60');
            expect(result).toEqual({
                type: 'error',
                error: 'PARSER_ERROR',
                message: 'Invalid time values'
            });
        });
    });

    describe('Confidence Scoring', () => {
        test('assigns higher confidence to specific times', async () => {
            const specific = await parse('Meeting at 2:30pm');
            const period = await parse('Meeting in the morning');
            expect(specific.metadata.confidence)
                .toBeGreaterThan(period.metadata.confidence);
        });

        test('adjusts confidence based on position', async () => {
            const atStart = await parse('2:30pm meeting');
            const inMiddle = await parse('Schedule meeting at 2:30pm');
            expect(atStart.metadata.confidence)
                .toBeGreaterThan(inMiddle.metadata.confidence);
        });
    });
}); 
