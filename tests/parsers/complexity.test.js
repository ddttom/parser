import { name, perfect } from '../../src/services/parser/parsers/complexity.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Complexity Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('complexity level is high');
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
            const result = await perfect('complexity level is high');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: expect.stringMatching(/^complexity_.*_improvement$/),
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
        test('should expand complexity aliases', async () => {
            const variations = [
                { input: 'hard task', expected: 'Complexity: High task' },
                { input: 'moderate difficulty', expected: 'Complexity: Medium difficulty' },
                { input: 'straightforward task', expected: 'Complexity: Low task' },
                { input: 'expert level', expected: 'Complexity: High level' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should format explicit complexity', async () => {
            const variations = [
                { input: 'complexity: high', expected: 'Complexity: High' },
                { input: 'complexity level is medium', expected: 'Complexity: Medium' },
                { input: 'difficulty: low', expected: 'Complexity: Low' },
                { input: 'difficulty level is high', expected: 'Complexity: High' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format numeric complexity', async () => {
            const variations = [
                { input: 'complexity level 3', expected: 'Complexity: High' },
                { input: 'difficulty: 2', expected: 'Complexity: Medium' },
                { input: 'complexity is 1', expected: 'Complexity: Low' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should standardize complexity references', async () => {
            const variations = [
                { input: 'complex task', expected: 'Complexity: High task' },
                { input: 'intermediate level', expected: 'Complexity: Medium level' },
                { input: 'basic task', expected: 'Complexity: Low task' },
                { input: 'beginner friendly', expected: 'Complexity: Low friendly' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('complex task');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: 'complex'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Task is complex');
            expect(result.corrections[0].position).toEqual({
                start: 'Task is '.length,
                end: 'Task is complex'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('[URGENT] Task is complex!');
            expect(result.text).toBe('[URGENT] Task is Complexity: High!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to explicit complexity', async () => {
            const result = await perfect('complexity: high');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to numeric complexity', async () => {
            const result = await perfect('complexity level 3');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to keyword complexity', async () => {
            const result = await perfect('complex task');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid complexity text', async () => {
            const invalid = [
                'complexity: extreme',
                'complexity: 0',
                'complexity: @#$',
                'complexity: invalid'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle invalid numeric values', async () => {
            const invalid = [
                'complexity level 0',
                'complexity level 4',
                'difficulty -1'
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
        test('should handle multiple complexity components', async () => {
            const variations = [
                { 
                    input: 'complex task with difficulty level 3', 
                    expected: 'Complexity: High task with Complexity: High'
                },
                { 
                    input: 'hard and challenging task', 
                    expected: 'Complexity: High and Complexity: High task'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should handle complexity references with context', async () => {
            const variations = [
                { 
                    input: 'task requires expert knowledge', 
                    expected: 'task requires Complexity: High knowledge'
                },
                { 
                    input: 'implementation is straightforward', 
                    expected: 'implementation is Complexity: Low'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should preserve special characters', async () => {
            const result = await perfect('[URGENT] Review task (complex)');
            expect(result.text).toBe('[URGENT] Review task (Complexity: High)');
        });
    });
});
