import { name, perfect } from '../../src/services/parser/parsers/timeBlock.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Time Block Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('10:00am to 11:30am for focused work');
            expect(result).toEqual(expect.objectContaining({
                text: expect.any(String),
                corrections: expect.any(Array)
            }));
        });

        test('should return original text with empty corrections for no matches', async () => {
            const text = '   ';
            const result = await perfect(text);
            expect(result).toEqual({
                text,
                corrections: []
            });
        });

        test('should include all required correction properties', async () => {
            const result = await perfect('10:00am to 11:30am for focused work');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: 'timeblock',
                original: expect.any(String),
                correction: expect.any(String),
                position: expect.objectContaining({
                    start: expect.any(Number),
                    end: expect.any(Number)
                }),
                confidence: expect.any(String)
            }));
        });
    });

    describe('Range Format', () => {
        test('should handle time range with AM/PM', async () => {
            const variations = [
                {
                    input: '10:00am to 11:30am for focused work',
                    expected: '10:00am to 11:30am for deep (focused work)'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should handle time range with hyphen', async () => {
            const variations = [
                {
                    input: '2pm-3:30pm for planning session',
                    expected: '2:00pm to 3:30pm for admin (planning session)'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should handle time range without description', async () => {
            const variations = [
                {
                    input: '9am to 10am',
                    expected: '9:00am to 10:00am'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });
    });

    describe('Block Format', () => {
        test('should handle block schedule format', async () => {
            const variations = [
                {
                    input: 'block 1:00pm to 2:30pm for team meeting',
                    expected: '1:00pm to 2:30pm for meeting (team meeting)'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should handle schedule format', async () => {
            const variations = [
                {
                    input: 'schedule 3pm to 4pm for break',
                    expected: '3:00pm to 4:00pm for break (break)'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should handle block format without description', async () => {
            const variations = [
                {
                    input: 'block 2pm to 3pm',
                    expected: '2:00pm to 3:00pm'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });
    });

    describe('Period Format', () => {
        test('should handle period format with default duration', async () => {
            const variations = [
                {
                    input: '9am deep work block',
                    expected: '9:00am to 10:00am for deep'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should handle period format with minutes', async () => {
            const variations = [
                {
                    input: '2:30pm focused time',
                    expected: '2:30pm to 3:30pm for deep'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should handle different block types', async () => {
            const variations = [
                {
                    input: '9am deep work block',
                    expected: '9:00am to 10:00am for deep'
                },
                {
                    input: '10am meeting time',
                    expected: '10:00am to 11:00am for meeting'
                },
                {
                    input: '12pm break time',
                    expected: '12:00pm to 1:00pm for break'
                },
                {
                    input: '2pm admin block',
                    expected: '2:00pm to 3:00pm for admin'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });
    });

    describe('Invalid Cases', () => {
        test('should handle invalid time format', async () => {
            const text = 'block 25:00 to 26:00';
            const result = await perfect(text);
            expect(result).toEqual({
                text,
                corrections: []
            });
        });

        test('should handle invalid hour in 12-hour format', async () => {
            const text = '13am to 2pm';
            const result = await perfect(text);
            expect(result).toEqual({
                text,
                corrections: []
            });
        });

        test('should handle missing time component', async () => {
            const text = 'block to 2pm';
            const result = await perfect(text);
            expect(result).toEqual({
                text,
                corrections: []
            });
        });

        test('should handle invalid minutes', async () => {
            const text = '9:60am to 10am';
            const result = await perfect(text);
            expect(result).toEqual({
                text,
                corrections: []
            });
        });
    });
});
