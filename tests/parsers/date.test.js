import { name, parse } from '../../src/services/parser/parsers/date.js';
import { jest } from '@jest/globals';

describe('Date Parser', () => {
    let now;

    beforeEach(() => {
        now = new Date('2024-01-01T12:00:00.000Z');
        jest.useFakeTimers();
        jest.setSystemTime(now);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

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

        test('returns null for text without dates', async () => {
            const result = await parse('Regular text without dates');
            expect(result).toBeNull();
        });
    });

    describe('ISO Format', () => {
        test('parses ISO dates', async () => {
            const result = await parse('Meeting on 2024-02-15');
            expect(result).toEqual({
                type: 'date',
                value: '2024-02-15',
                metadata: {
                    pattern: 'iso',
                    confidence: expect.any(Number),
                    originalMatch: '2024-02-15',
                    format: 'iso'
                }
            });
        });

        test('handles invalid ISO dates', async () => {
            const result = await parse('Meeting on 2024-13-45');
            expect(result).toBeNull();
        });

        test('validates year range', async () => {
            const invalidYears = ['1899-01-01', '2101-01-01'];
            for (const date of invalidYears) {
                const result = await parse(`Meeting on ${date}`);
                expect(result).toBeNull();
            }
        });
    });

    describe('Natural Format', () => {
        test('parses natural dates', async () => {
            const result = await parse('Meeting on January 15th, 2024');
            expect(result.value).toBe('2024-01-15');
            expect(result.metadata.format).toBe('natural');
        });

        test('handles abbreviated months', async () => {
            const result = await parse('Meeting on Jan 15, 2024');
            expect(result.value).toBe('2024-01-15');
        });

        test('handles various ordinal suffixes', async () => {
            const inputs = ['1st', '2nd', '3rd', '4th'];
            await Promise.all(inputs.map(async (day) => {
                const result = await parse(`Meeting on January ${day}, 2024`);
                expect(result.value).toBe(`2024-01-0${day[0]}`);
            }));
        });

        test('handles month boundary cases', async () => {
            const boundaries = [
                'January 31, 2024',
                'April 30, 2024',
                'February 28, 2024',
                'February 29, 2024' // Leap year
            ];
            for (const date of boundaries) {
                const result = await parse(`Meeting on ${date}`);
                expect(result).not.toBeNull();
            }
        });

        test('handles invalid month boundaries', async () => {
            const invalidDates = [
                'February 30, 2024',
                'April 31, 2024',
                'June 31, 2024',
                'September 31, 2024',
                'November 31, 2024'
            ];
            for (const date of invalidDates) {
                const result = await parse(`Meeting on ${date}`);
                expect(result).toBeNull();
            }
        });
    });

    describe('Relative Dates', () => {
        test('handles today', async () => {
            const result = await parse('Due today');
            expect(result.value).toBe('2024-01-01');
            expect(result.metadata.format).toBe('relative');
        });

        test('handles tomorrow', async () => {
            const result = await parse('Due tomorrow');
            expect(result.value).toBe('2024-01-02');
        });

        test('handles yesterday', async () => {
            const result = await parse('Due yesterday');
            expect(result.value).toBe('2023-12-31');
        });

        test('handles next weekday', async () => {
            const weekdays = [
                ['next monday', '2024-01-08'],
                ['next tuesday', '2024-01-09'],
                ['next wednesday', '2024-01-10'],
                ['next thursday', '2024-01-11'],
                ['next friday', '2024-01-12'],
                ['next saturday', '2024-01-13'],
                ['next sunday', '2024-01-14']
            ];
            for (const [input, expected] of weekdays) {
                const result = await parse(input);
                expect(result.value).toBe(expected);
                expect(result.metadata.format).toBe('relative');
            }
        });

        test('handles in-period patterns', async () => {
            const periods = [
                ['in 2 days', '2024-01-03'],
                ['in 1 week', '2024-01-08'],
                ['in 3 weeks', '2024-01-22'],
                ['in 1 month', '2024-02-01'],
                ['in 2 months', '2024-03-01'],
                ['in 1 year', '2025-01-01']
            ];
            for (const [input, expected] of periods) {
                const result = await parse(input);
                expect(result.value).toBe(expected);
            }
        });

        test('handles next-period patterns', async () => {
            const periods = [
                ['next week', '2024-01-08'],
                ['next month', '2024-02-01'],
                ['next year', '2025-01-01']
            ];
            for (const [input, expected] of periods) {
                const result = await parse(input);
                expect(result.value).toBe(expected);
            }
        });

        test('handles month boundary transitions', async () => {
            // Set date to January 31st
            jest.setSystemTime(new Date('2024-01-31T12:00:00.000Z'));
            
            const result = await parse('in 1 month');
            expect(result.value).toBe('2024-02-29'); // Leap year handles overflow
        });
    });

    describe('Deadline Format', () => {
        test('parses due dates', async () => {
            const result = await parse('Task due: January 15, 2024');
            expect(result.value).toBe('2024-01-15');
            expect(result.metadata.format).toBe('deadline');
        });

        test('handles various due formats', async () => {
            const formats = [
                'due: Jan 15 2024',
                'due Jan 15 2024',
                'due:Jan 15 2024'
            ];
            await Promise.all(formats.map(async (format) => {
                const result = await parse(format);
                expect(result.value).toBe('2024-01-15');
            }));
        });
    });

    describe('Scheduled Format', () => {
        test('parses scheduled dates', async () => {
            const result = await parse('Task scheduled: January 15, 2024');
            expect(result.value).toBe('2024-01-15');
            expect(result.metadata.format).toBe('scheduled');
        });

        test('handles various scheduled formats', async () => {
            const formats = [
                'scheduled: Jan 15 2024',
                'scheduled Jan 15 2024',
                'scheduled:Jan 15 2024'
            ];
            await Promise.all(formats.map(async (format) => {
                const result = await parse(format);
                expect(result.value).toBe('2024-01-15');
            }));
        });
    });

    describe('Leap Year Handling', () => {
        test('handles leap year correctly', async () => {
            const leapYearDates = [
                ['February 29, 2024', true],  // Leap year
                ['February 29, 2023', false], // Not a leap year
                ['February 29, 2000', true],  // Century leap year
                ['February 29, 2100', false]  // Not a century leap year
            ];
            
            for (const [date, shouldBeValid] of leapYearDates) {
                const result = await parse(`Meeting on ${date}`);
                if (shouldBeValid) {
                    expect(result).not.toBeNull();
                } else {
                    expect(result).toBeNull();
                }
            }
        });

        test('handles leap year transitions', async () => {
            // Set date to February 29th, 2024
            jest.setSystemTime(new Date('2024-02-29T12:00:00.000Z'));
            
            const result = await parse('in 1 year');
            expect(result.value).toBe('2025-02-28'); // Should adjust to Feb 28th
        });
    });

    describe('Mixed Date Formats', () => {
        test('prioritizes explicit formats', async () => {
            const result = await parse('Due: Jan 15 2024 (scheduled for 2024-02-01)');
            expect(result.value).toBe('2024-01-15');
            expect(result.metadata.format).toBe('deadline');
        });

        test('handles multiple date references', async () => {
            const result = await parse('Start on January 15, 2024 and end on 2024-02-01');
            expect(result.value).toBe('2024-01-15'); // Should pick the first valid date
        });
    });

    describe('Error Handling', () => {
        test('handles invalid dates gracefully', async () => {
            const result = await parse('Meeting on February 30, 2024');
            expect(result).toBeNull();
        });

        test('handles malformed dates', async () => {
            const result = await parse('Meeting on Jxn 15, 2024');
            expect(result).toBeNull();
        });

        test('handles invalid period values', async () => {
            const invalidPeriods = [
                'in 0 days',
                'in -1 week',
                'in 1000 years'
            ];
            for (const period of invalidPeriods) {
                const result = await parse(period);
                expect(result).toBeNull();
            }
        });
    });

    describe('Confidence Scoring', () => {
        test('should have higher confidence for explicit dates', async () => {
            const result = await parse('[date:2024-03-15]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test('should have lower confidence for natural dates', async () => {
            const result = await parse('next Monday');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
        });

        test('should have consistent confidence for same pattern', async () => {
            const result1 = await parse('next Monday');
            const result2 = await parse('next Tuesday');
            expect(result1.metadata.confidence).toBe(result2.metadata.confidence);
        });

        test('adjusts confidence based on context', async () => {
            const withContext = await parse('Meeting scheduled: 2024-01-15');
            const withoutContext = await parse('2024-01-15');
            expect(withContext.metadata.confidence).toBeGreaterThan(withoutContext.metadata.confidence);
        });
    });
});
