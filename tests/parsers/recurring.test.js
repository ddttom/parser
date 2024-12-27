import { name, parse } from '../../src/services/parser/parsers/recurring.js';

describe('Recurring Parser', () => {
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

        test('returns null for non-recurring text', async () => {
            const result = await parse('regular text without recurring pattern');
            expect(result).toBeNull();
        });
    });

    describe('Pattern Matching', () => {
        test('matches explicit pattern', async () => {
            const result = await parse('[recur:daily]');
            expect(result.value).toEqual({
                type: 'day',
                interval: 1,
                end: null
            });
            expect(result.metadata.pattern).toBe('explicit');
        });

        test('matches business days pattern', async () => {
            const result = await parse('every business day');
            expect(result.value).toEqual({
                type: 'business',
                interval: 1,
                excludeWeekends: true,
                end: null
            });
            expect(result.metadata.pattern).toBe('business');
        });

        test('matches weekday pattern', async () => {
            const result = await parse('every monday');
            expect(result.value).toEqual({
                type: 'specific',
                day: 'monday',
                dayIndex: 1,
                interval: 1,
                end: null
            });
            expect(result.metadata.pattern).toBe('weekday');
        });

        test('matches hourly pattern', async () => {
            const result = await parse('every hour');
            expect(result.value).toEqual({
                type: 'hour',
                interval: 1,
                end: null
            });
            expect(result.metadata.pattern).toBe('hourly');
        });

        test('matches daily pattern', async () => {
            const result = await parse('every day');
            expect(result.value).toEqual({
                type: 'day',
                interval: 1,
                end: null
            });
            expect(result.metadata.pattern).toBe('daily');
        });

        test('matches weekly pattern', async () => {
            const result = await parse('every week');
            expect(result.value).toEqual({
                type: 'week',
                interval: 1,
                end: null
            });
            expect(result.metadata.pattern).toBe('weekly');
        });

        test('matches monthly pattern', async () => {
            const result = await parse('every month');
            expect(result.value).toEqual({
                type: 'month',
                interval: 1,
                end: null
            });
            expect(result.metadata.pattern).toBe('monthly');
        });

        test('matches interval pattern', async () => {
            const result = await parse('every 2 weeks');
            expect(result.value).toEqual({
                type: 'week',
                interval: 2,
                end: null
            });
            expect(result.metadata.pattern).toBe('interval');
        });
    });

    describe('End Conditions', () => {
        test('extracts count end condition', async () => {
            const result = await parse('every day for 5 times');
            expect(result.value.end).toEqual({
                type: 'count',
                value: 5
            });
            expect(result.metadata.includesEndCondition).toBe(true);
        });

        test('extracts date end condition', async () => {
            const result = await parse('every week until December 31');
            expect(result.value.end).toEqual({
                type: 'until',
                value: 'December 31'
            });
            expect(result.metadata.includesEndCondition).toBe(true);
        });

        test('prioritizes count over date when both present', async () => {
            const result = await parse('every month for 3 times until December 31');
            expect(result.value.end).toEqual({
                type: 'count',
                value: 3
            });
        });
    });

    describe('Confidence Scoring', () => {
        test('has highest confidence for explicit pattern', async () => {
            const result = await parse('[recur:daily]');
            expect(result.metadata.confidence).toBe(0.95);
        });

        test('has high confidence for weekday pattern', async () => {
            const result = await parse('every monday');
            expect(result.metadata.confidence).toBe(0.9);
        });

        test('has medium confidence for business days', async () => {
            const result = await parse('every business day');
            expect(result.metadata.confidence).toBe(0.85);
        });

        test('has lower confidence for natural patterns', async () => {
            const result = await parse('every 2 weeks');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
        });

        test('increases confidence with end condition', async () => {
            const withEnd = await parse('every day for 5 times');
            const withoutEnd = await parse('every day');
            expect(withEnd.metadata.confidence).toBeGreaterThan(withoutEnd.metadata.confidence);
        });
    });

    describe('Error Handling', () => {
        test('handles invalid interval values', async () => {
            const result = await parse('every 0 days');
            expect(result).toEqual({
                type: 'error',
                error: 'PARSER_ERROR',
                message: 'Invalid interval value'
            });
        });

        test('handles negative intervals', async () => {
            const result = await parse('every -1 days');
            expect(result).toEqual({
                type: 'error',
                error: 'PARSER_ERROR',
                message: 'Invalid interval value'
            });
        });

        test('handles non-integer intervals', async () => {
            const result = await parse('every 1.5 days');
            expect(result).toEqual({
                type: 'error',
                error: 'PARSER_ERROR',
                message: 'Invalid interval value'
            });
        });

        test('handles invalid end count values', async () => {
            const result = await parse('every day for 0 times');
            expect(result.value.end).toBeNull();
        });
    });
});
