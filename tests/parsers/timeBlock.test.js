import { parse } from '../../src/services/parser/parsers/timeBlock.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Time Block Parser', () => {
    describe('Input Validation', () => {
        test('should return error for null input', async () => {
            const result = await parse(null);
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('should return error for empty string', async () => {
            const result = await parse('');
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('should handle undefined input', async () => {
            const result = await parse(undefined);
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('should handle non-string input', async () => {
            const numberResult = await parse(123);
            expect(numberResult).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });

            const objectResult = await parse({});
            expect(objectResult).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });

            const arrayResult = await parse([]);
            expect(arrayResult).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });
    });

    describe('Return Format', () => {
        test('should return correct type property', async () => {
            const result = await parse('[timeblock:9:00am, 10:00am]');
            expect(result.type).toBe('timeblock');
        });

        test('should return metadata with required fields', async () => {
            const result = await parse('[timeblock:9:00am, 10:00am]');
            expect(result.metadata).toEqual(expect.objectContaining({
                confidence: expect.any(String),
                pattern: expect.any(String),
                originalMatch: expect.any(String)
            }));
        });

        test('should return null for no matches', async () => {
            const result = await parse('   ');
            expect(result).toBeNull();
        });
    });

    describe('Explicit Format', () => {
        test('should parse explicit timeblock with 12-hour format', async () => {
            const result = await parse('[timeblock:9:00am, 10:30am, deep work]');
            expect(result).toMatchObject({
                type: 'timeblock',
                value: {
                    start: { hours: 9, minutes: 0 },
                    end: { hours: 10, minutes: 30 },
                    type: 'deep',
                    description: 'deep work'
                },
                metadata: {
                    confidence: Confidence.HIGH,
                    pattern: 'explicit'
                }
            });
        });

        test('should parse explicit timeblock with 24-hour format', async () => {
            const result = await parse('[timeblock:14:00, 15:30, team meeting]');
            expect(result).toMatchObject({
                type: 'timeblock',
                value: {
                    start: { hours: 14, minutes: 0 },
                    end: { hours: 15, minutes: 30 },
                    type: 'meeting',
                    description: 'team meeting'
                }
            });
        });
    });

    describe('Range Format', () => {
        test('should parse time range with AM/PM', async () => {
            const result = await parse('10:00am to 11:30am for focused work');
            expect(result).toMatchObject({
                type: 'timeblock',
                value: {
                    start: { hours: 10, minutes: 0 },
                    end: { hours: 11, minutes: 30 },
                    type: 'deep',
                    description: 'focused work'
                },
                metadata: {
                    confidence: Confidence.MEDIUM,
                    pattern: 'range'
                }
            });
        });

        test('should parse time range with hyphen', async () => {
            const result = await parse('2pm-3:30pm for planning session');
            expect(result).toMatchObject({
                type: 'timeblock',
                value: {
                    start: { hours: 14, minutes: 0 },
                    end: { hours: 15, minutes: 30 },
                    type: 'admin',
                    description: 'planning session'
                }
            });
        });
    });

    describe('Block Format', () => {
        test('should parse block schedule format', async () => {
            const result = await parse('block 1:00pm to 2:30pm for team meeting');
            expect(result).toMatchObject({
                type: 'timeblock',
                value: {
                    start: { hours: 13, minutes: 0 },
                    end: { hours: 14, minutes: 30 },
                    type: 'meeting',
                    description: 'team meeting'
                },
                metadata: {
                    confidence: Confidence.HIGH,
                    pattern: 'block'
                }
            });
        });

        test('should parse schedule format', async () => {
            const result = await parse('schedule 3pm to 4pm for break');
            expect(result).toMatchObject({
                type: 'timeblock',
                value: {
                    start: { hours: 15, minutes: 0 },
                    end: { hours: 16, minutes: 0 },
                    type: 'break',
                    description: 'break'
                }
            });
        });
    });

    describe('Period Format', () => {
        test('should parse period format with default duration', async () => {
            const result = await parse('9am deep work block');
            expect(result).toMatchObject({
                type: 'timeblock',
                value: {
                    start: { hours: 9, minutes: 0 },
                    end: { hours: 10, minutes: 0 },
                    type: 'deep',
                    description: null
                },
                metadata: {
                    confidence: Confidence.MEDIUM,
                    pattern: 'period'
                }
            });
        });

        test('should parse period format with minutes', async () => {
            const result = await parse('2:30pm focused time');
            expect(result).toMatchObject({
                type: 'timeblock',
                value: {
                    start: { hours: 14, minutes: 30 },
                    end: { hours: 15, minutes: 30 },
                    type: 'deep'
                }
            });
        });
    });

    describe('Confidence Levels', () => {
        test('should have HIGH confidence for explicit patterns', async () => {
            const result = await parse('[timeblock:9:00am, 10:00am]');
            expect(result.metadata.confidence).toBe(Confidence.HIGH);
        });

        test('should have HIGH confidence for block patterns', async () => {
            const result = await parse('block 9:00am to 10:00am');
            expect(result.metadata.confidence).toBe(Confidence.HIGH);
        });

        test('should have MEDIUM confidence for range patterns', async () => {
            const result = await parse('9:00am to 10:00am');
            expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
        });

        test('should have MEDIUM confidence for period patterns', async () => {
            const result = await parse('9am deep work time');
            expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
        });

        test('should maintain HIGH confidence for special block format', async () => {
            const result = await parse('block 1pm to 2pm for meeting');
            expect(result.metadata.confidence).toBe(Confidence.HIGH);
        });
    });

    describe('Invalid Cases', () => {
        test('should return null for invalid time format', async () => {
            const result = await parse('block 25:00 to 26:00');
            expect(result).toBeNull();
        });

        test('should return null for invalid hour in 12-hour format', async () => {
            const result = await parse('13am to 2pm');
            expect(result).toBeNull();
        });

        test('should return null for missing time component', async () => {
            const result = await parse('block to 2pm');
            expect(result).toBeNull();
        });

        test('should return null for invalid minutes', async () => {
            const result = await parse('9:60am to 10am');
            expect(result).toBeNull();
        });
    });
});
