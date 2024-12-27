import { name, parse } from '../../src/services/parser/parsers/reminders.js';

describe('Reminders Parser', () => {
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

        test('returns null for non-reminder text', async () => {
            const result = await parse('Regular text without reminders');
            expect(result).toBeNull();
        });
    });

    describe('Explicit Reminders', () => {
        test('parses explicit time-based reminders', async () => {
            const result = await parse('remind me in 30 minutes');
            expect(result).toEqual({
                type: 'reminder',
                value: {
                    type: 'offset',
                    minutes: 30
                },
                metadata: {
                    pattern: 'explicit',
                    confidence: expect.any(Number),
                    originalMatch: 'remind me in 30 minutes',
                    isRelative: true
                }
            });
        });

        test('handles various time units', async () => {
            const cases = [
                ['remind me in 1 hour', 60],
                ['remind me in 2 days', 2880],
                ['remind me in 1 week', 10080]
            ];

            for (const [input, expectedMinutes] of cases) {
                const result = await parse(input);
                expect(result.value.minutes).toBe(expectedMinutes);
            }
        });
    });

    describe('Before Reminders', () => {
        test('parses before-event reminders', async () => {
            const result = await parse('30 minutes before');
            expect(result.value).toEqual({
                type: 'before',
                minutes: 30
            });
            expect(result.metadata.pattern).toBe('before');
        });

        test('handles invalid time amounts', async () => {
            const result = await parse('0 minutes before');
            expect(result).toBeNull();
        });
    });

    describe('At Time Reminders', () => {
        test('parses specific time reminders', async () => {
            const result = await parse('remind me at 2:30pm');
            expect(result.value).toEqual({
                type: 'time',
                hour: 14,
                minutes: 30
            });
        });

        test('handles 12-hour format', async () => {
            const cases = [
                ['remind me at 12:00am', 0, 0],
                ['remind me at 12:00pm', 12, 0],
                ['remind me at 1:00pm', 13, 0],
                ['remind me at 11:30pm', 23, 30]
            ];

            for (const [input, expectedHour, expectedMinutes] of cases) {
                const result = await parse(input);
                expect(result.value).toEqual({
                    type: 'time',
                    hour: expectedHour,
                    minutes: expectedMinutes
                });
            }
        });

        test('handles missing minutes', async () => {
            const result = await parse('remind me at 3pm');
            expect(result.value).toEqual({
                type: 'time',
                hour: 15,
                minutes: 0
            });
        });
    });

    describe('On Date Reminders', () => {
        test('parses date-based reminders', async () => {
            const result = await parse('remind me on next Monday');
            expect(result.value).toEqual({
                type: 'date',
                value: 'next Monday'
            });
        });

        test('handles various date formats', async () => {
            const dates = [
                'remind me on tomorrow',
                'remind me on Jan 15',
                'remind me on next week'
            ];

            for (const input of dates) {
                const result = await parse(input);
                expect(result.value.type).toBe('date');
                expect(result.metadata.pattern).toBe('on');
            }
        });
    });

    describe('Relative Reminders', () => {
        test('parses relative time expressions', async () => {
            const result = await parse('in 2 hours');
            expect(result.value).toEqual({
                type: 'offset',
                minutes: 120
            });
            expect(result.metadata.isRelative).toBe(true);
        });

        test('handles plural and singular units', async () => {
            const cases = [
                ['in 1 hour', 60],
                ['in 2 hours', 120],
                ['in 1 day', 1440],
                ['in 2 days', 2880]
            ];

            for (const [input, expectedMinutes] of cases) {
                const result = await parse(input);
                expect(result.value.minutes).toBe(expectedMinutes);
            }
        });
    });

    describe('Confidence Scoring', () => {
        test('assigns higher confidence to explicit patterns', async () => {
            const results = [
                await parse('remind me in 30 minutes'),
                await parse('in 30 minutes'),
                await parse('30 minutes before')
            ];

            const confidences = results.map(r => r.metadata.confidence);
            expect(confidences[0]).toBeGreaterThan(confidences[1]);
            expect(confidences[2]).toBeGreaterThan(confidences[1]);
        });

        test('adjusts confidence based on position', async () => {
            const results = [
                await parse('remind me in 30 minutes'),
                await parse('task remind me in 30 minutes')
            ];

            expect(results[0].metadata.confidence)
                .toBeGreaterThan(results[1].metadata.confidence);
        });
    });

    describe('Error Handling', () => {
        test('handles invalid time values', async () => {
            const result = await parse('remind me at 25:00');
            expect(result).toBeNull();
        });

        test('handles parser errors gracefully', async () => {
            const result = await parse('remind me in -1 hours');
            expect(result).toBeNull();
        });
    });
});
