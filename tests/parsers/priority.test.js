import { name, perfect } from '../../src/services/parser/parsers/priority.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Priority Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('#high');
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
            const result = await perfect('#high');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: expect.stringMatching(/^priority_.*_improvement$/),
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

    describe('Text Improvement', () => {
        test('should expand priority aliases', async () => {
            const variations = [
                { input: '#p0', expected: '#CriticalPriority' },
                { input: '#p1', expected: '#HighPriority' },
                { input: '#p2', expected: '#MediumPriority' },
                { input: '#p3', expected: '#LowPriority' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format priority keywords', async () => {
            const variations = [
                { input: 'asap priority', expected: 'Urgent Priority' },
                { input: 'important priority task', expected: 'High Priority Task' },
                { input: 'normal priority', expected: 'Medium Priority' },
                { input: 'minor priority', expected: 'Low Priority' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should standardize priority levels', async () => {
            const variations = [
                { input: 'blocker', expected: 'Critical Priority' },
                { input: 'major', expected: 'High Priority' },
                { input: 'moderate', expected: 'Medium Priority' },
                { input: 'trivial', expected: 'Low Priority' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should improve priority formatting', async () => {
            const variations = [
                { input: 'high-priority', expected: 'High Priority' },
                { input: 'urgent_priority', expected: 'Urgent Priority' },
                { input: 'critical priority task', expected: 'Critical Priority Task' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('#high');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: '#high'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Task with #high');
            expect(result.corrections[0].position).toEqual({
                start: 'Task with '.length,
                end: 'Task with #high'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('[URGENT] #high priority!');
            expect(result.text).toBe('[URGENT] #HighPriority!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to hashtags', async () => {
            const result = await perfect('#high');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to explicit priorities', async () => {
            const result = await perfect('high priority');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to implicit priorities', async () => {
            const result = await perfect('high');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid priority text', async () => {
            const invalid = [
                '#',
                '# ',
                '#123',
                '#!@#'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle invalid priority words', async () => {
            const invalid = [
                'invalid priority',
                '123 priority',
                '!@# priority'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });
    });

    describe('Complex Cases', () => {
        test('should handle multiple priority components', async () => {
            const variations = [
                { 
                    input: '#p0 critical priority', 
                    expected: '#CriticalPriority Critical Priority'
                },
                { 
                    input: '#high high priority task', 
                    expected: '#HighPriority High Priority Task'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should handle priority references with context', async () => {
            const variations = [
                { 
                    input: 'task with #p0 needs review', 
                    expected: 'task with #CriticalPriority needs review'
                },
                { 
                    input: 'update from high priority team', 
                    expected: 'update from High Priority team'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should preserve special characters', async () => {
            const result = await perfect('[URGENT] Review #p0 (ASAP)');
            expect(result.text).toBe('[URGENT] Review #CriticalPriority (ASAP)');
        });
    });
});
