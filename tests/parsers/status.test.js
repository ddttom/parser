import { name, perfect } from '../../src/services/parser/parsers/status.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Status Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('is completed');
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
            const result = await perfect('is completed');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: expect.stringMatching(/^status_.*_improvement$/),
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
        test('should expand status aliases', async () => {
            const variations = [
                { input: 'wip', expected: 'Status: In Progress' },
                { input: 'todo', expected: 'Status: Pending' },
                { input: 'on hold', expected: 'Status: Blocked' },
                { input: 'done', expected: 'Status: Completed' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should format explicit status', async () => {
            const variations = [
                { input: 'status: in dev', expected: 'Status: In Progress' },
                { input: 'status is testing', expected: 'Status: In Progress' },
                { input: 'marked as reviewing', expected: 'Status: In Progress' },
                { input: 'is developing', expected: 'Status: In Progress' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(
                    input.toLowerCase().includes('status') ? Confidence.HIGH : Confidence.MEDIUM
                );
            }
        });

        test('should format progress status', async () => {
            const variations = [
                { input: '50% complete', expected: 'Status: 50% Complete' },
                { input: '75% done', expected: 'Status: 75% Complete' },
                { input: '90% finished', expected: 'Status: 90% Complete' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should standardize status references', async () => {
            const variations = [
                { input: 'stuck', expected: 'Status: Blocked' },
                { input: 'ongoing', expected: 'Status: In Progress' },
                { input: 'dropped', expected: 'Status: Cancelled' },
                { input: 'ready', expected: 'Status: Pending' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('completed');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: 'completed'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Task is completed');
            expect(result.corrections[0].position).toEqual({
                start: 'Task '.length,
                end: 'Task is completed'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('[URGENT] Task is completed!');
            expect(result.text).toBe('[URGENT] Task Status: Completed!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to explicit status', async () => {
            const result = await perfect('status: completed');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to progress status', async () => {
            const result = await perfect('50% complete');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to implicit status', async () => {
            const result = await perfect('completed');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid status text', async () => {
            const invalid = [
                'status: 123',
                'status: @#$',
                'status:    ',
                'status: invalid'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle invalid progress values', async () => {
            const invalid = [
                '-10% complete',
                '150% complete',
                '0% complete',
                'abc% complete'
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
        test('should handle multiple status components', async () => {
            const variations = [
                { 
                    input: 'status: wip (50% complete)', 
                    expected: 'Status: In Progress (50% Complete)'
                },
                { 
                    input: 'task is blocked and on hold', 
                    expected: 'task Status: Blocked and Status: Blocked'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should handle status references with context', async () => {
            const variations = [
                { 
                    input: 'development is ongoing and in testing', 
                    expected: 'development Status: In Progress and Status: In Progress'
                },
                { 
                    input: 'project was dropped due to issues', 
                    expected: 'project Status: Cancelled due to issues'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should preserve special characters', async () => {
            const result = await perfect('[URGENT] Review task (wip)');
            expect(result.text).toBe('[URGENT] Review task (Status: In Progress)');
        });
    });
});
