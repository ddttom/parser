import { parse } from '../../src/services/parser/parsers/timeBlock.js';

describe('Time Block Parser', () => {
    describe('Return Format', () => {
        test('should return correct type property', async () => {
            const result = await parse('10:00am to 11:30am for focused work');
            expect(result.type).toBe('timeblock');
        });

        test('should return metadata with required fields', async () => {
            const result = await parse('10:00am to 11:30am for focused work');
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

    describe('Range Format', () => {
        test('should parse time range with AM/PM', async () => {
            const result = await parse('10:00am to 11:30am for focused work');
            expect(result.value).toEqual({
                start: { hours: 10, minutes: 0 },
                end: { hours: 11, minutes: 30 },
                type: 'deep',
                description: 'focused work'
            });
            expect(result.metadata.pattern).toBe('range');
            expect(result.metadata.originalMatch).toBe('10:00am to 11:30am for focused work');
        });

        test('should parse time range with hyphen', async () => {
            const result = await parse('2pm-3:30pm for planning session');
            expect(result.value).toEqual({
                start: { hours: 14, minutes: 0 },
                end: { hours: 15, minutes: 30 },
                type: 'admin',
                description: 'planning session'
            });
            expect(result.metadata.pattern).toBe('range');
            expect(result.metadata.originalMatch).toBe('2pm-3:30pm for planning session');
        });

        test('should parse time range without description', async () => {
            const result = await parse('9am to 10am');
            expect(result.value).toEqual({
                start: { hours: 9, minutes: 0 },
                end: { hours: 10, minutes: 0 },
                type: 'general',
                description: null
            });
            expect(result.metadata.pattern).toBe('range');
            expect(result.metadata.originalMatch).toBe('9am to 10am');
        });
    });

    describe('Block Format', () => {
        test('should parse block schedule format', async () => {
            const result = await parse('block 1:00pm to 2:30pm for team meeting');
            expect(result.value).toEqual({
                start: { hours: 13, minutes: 0 },
                end: { hours: 14, minutes: 30 },
                type: 'meeting',
                description: 'team meeting'
            });
            expect(result.metadata.pattern).toBe('block');
            expect(result.metadata.originalMatch).toBe('block 1:00pm to 2:30pm for team meeting');
        });

        test('should parse schedule format', async () => {
            const result = await parse('schedule 3pm to 4pm for break');
            expect(result.value).toEqual({
                start: { hours: 15, minutes: 0 },
                end: { hours: 16, minutes: 0 },
                type: 'break',
                description: 'break'
            });
            expect(result.metadata.pattern).toBe('block');
            expect(result.metadata.originalMatch).toBe('schedule 3pm to 4pm for break');
        });

        test('should parse block format without description', async () => {
            const result = await parse('block 2pm to 3pm');
            expect(result.value).toEqual({
                start: { hours: 14, minutes: 0 },
                end: { hours: 15, minutes: 0 },
                type: 'general',
                description: null
            });
            expect(result.metadata.pattern).toBe('block');
            expect(result.metadata.originalMatch).toBe('block 2pm to 3pm');
        });
    });

    describe('Period Format', () => {
        test('should parse period format with default duration', async () => {
            const result = await parse('9am deep work block');
            expect(result.value).toEqual({
                start: { hours: 9, minutes: 0 },
                end: { hours: 10, minutes: 0 },
                type: 'deep',
                description: null
            });
            expect(result.metadata.pattern).toBe('period');
            expect(result.metadata.originalMatch).toBe('9am deep work block');
        });

        test('should parse period format with minutes', async () => {
            const result = await parse('2:30pm focused time');
            expect(result.value).toEqual({
                start: { hours: 14, minutes: 30 },
                end: { hours: 15, minutes: 30 },
                type: 'deep',
                description: null
            });
            expect(result.metadata.pattern).toBe('period');
            expect(result.metadata.originalMatch).toBe('2:30pm focused time');
        });

        test('should parse different block types', async () => {
            const blocks = [
                { input: '9am deep work block', type: 'deep' },
                { input: '10am meeting time', type: 'meeting' },
                { input: '12pm break time', type: 'break' },
                { input: '2pm admin block', type: 'admin' }
            ];

            for (const { input, type } of blocks) {
                const result = await parse(input);
                expect(result.value.type).toBe(type);
                expect(result.metadata.pattern).toBe('period');
            }
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
