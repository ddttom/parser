import { name, parse } from '../../src/services/parser/parsers/task.js';

describe('Task Parser', () => {
    describe('Input Validation', () => {
        test('should handle null input', async () => {
            const result = await parse(null);
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('should handle empty string', async () => {
            const result = await parse('');
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('returns null for text without tasks', async () => {
            const result = await parse('Regular text without tasks');
            expect(result).toBeNull();
        });
    });

    describe('Pattern Matching', () => {
        test('should detect explicit task references', async () => {
            const result = await parse('[task:123]');
            expect(result).toEqual({
                type: 'task',
                value: {
                    taskId: 123
                },
                metadata: {
                    pattern: 'explicit',
                    confidence: 0.95,
                    originalMatch: '[task:123]'
                }
            });
        });

        test('should detect inferred task references', async () => {
            const formats = [
                'task 123',
                'ticket #123',
                'issue 123'
            ];

            for (const format of formats) {
                const result = await parse(format);
                expect(result.value.taskId).toBe(123);
                expect(result.metadata.pattern).toBe('inferred');
            }
        });

        test('should handle optional hash symbol', async () => {
            const withHash = await parse('task #123');
            const withoutHash = await parse('task 123');
            expect(withHash.value.taskId).toBe(123);
            expect(withoutHash.value.taskId).toBe(123);
        });
    });

    describe('Task ID Validation', () => {
        test('should validate numeric task IDs', async () => {
            const result = await parse('[task:abc]');
            expect(result).toBeNull();
        });

        test('should parse task IDs as integers', async () => {
            const result = await parse('[task:123]');
            expect(typeof result.value.taskId).toBe('number');
            expect(result.value.taskId).toBe(123);
        });
    });

    describe('Confidence Scoring', () => {
        test('should have higher confidence for explicit tasks', async () => {
            const result = await parse('[task:123]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test('should have lower confidence for inferred tasks', async () => {
            const result = await parse('related to task 123');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid task format', async () => {
            const result = await parse('[task:]');
            expect(result).toBeNull();
        });

        test('should handle parser errors gracefully', async () => {
            // Mock validateTaskId to throw
            const originalValidate = parse.validateTaskId;
            parse.validateTaskId = () => {
                throw new Error('Validation error');
            };

            try {
                const result = await parse('[task:123]');
                expect(result).toEqual({
                    type: 'error',
                    error: 'PARSER_ERROR',
                    message: 'Validation error'
                });
            } finally {
                // Restore original function
                parse.validateTaskId = originalValidate;
            }
        });
    });
});
