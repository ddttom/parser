import { name, parse } from '../../src/services/parser/parsers/status.js';

describe('Status Parser', () => {
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

        test('returns null for text without status', async () => {
            const result = await parse('Regular text without status');
            expect(result).toBeNull();
        });
    });

    describe('Explicit Status', () => {
        test('parses explicit status declarations', async () => {
            const result = await parse('status: completed');
            expect(result).toEqual({
                type: 'status',
                value: {
                    status: 'completed'
                },
                metadata: {
                    pattern: 'explicit',
                    confidence: expect.any(Number),
                    originalMatch: 'status: completed',
                    level: 3
                }
            });
        });

        test('handles all status types', async () => {
            const statuses = ['pending', 'started', 'completed', 'blocked', 'cancelled'];
            const levels = [0, 1, 3, 2, 4];

            for (let i = 0; i < statuses.length; i++) {
                const result = await parse(`status: ${statuses[i]}`);
                expect(result.value.status).toBe(statuses[i]);
                expect(result.metadata.level).toBe(levels[i]);
            }
        });
    });

    describe('Progress Indicators', () => {
        test('parses percentage complete', async () => {
            const result = await parse('50% complete');
            expect(result.value.progress).toBe(50);
            expect(result.metadata.pattern).toBe('progress');
        });

        test('validates percentage range', async () => {
            const result = await parse('150% complete');
            expect(result).toBeNull();
        });
    });

    describe('State Format', () => {
        test('parses state declarations', async () => {
            const result = await parse('is completed');
            expect(result.value.status).toBe('completed');
            expect(result.metadata.pattern).toBe('state');
        });

        test('handles marked as format', async () => {
            const result = await parse('marked as blocked');
            expect(result.value.status).toBe('blocked');
        });
    });

    describe('Shorthand Notation', () => {
        test('parses bracketed status', async () => {
            const result = await parse('[completed]');
            expect(result.value.status).toBe('completed');
            expect(result.metadata.pattern).toBe('shorthand');
        });

        test('parses parenthesized status', async () => {
            const result = await parse('(blocked)');
            expect(result.value.status).toBe('blocked');
        });
    });

    describe('Contextual Status', () => {
        test('recognizes status contexts', async () => {
            const mappings = {
                'waiting': 'blocked',
                'done': 'completed',
                'finished': 'completed',
                'cancelled': 'cancelled'
            };

            for (const [input, expected] of Object.entries(mappings)) {
                const result = await parse(input);
                expect(result.value.status).toBe(expected);
                expect(result.metadata.pattern).toBe('contextual');
            }
        });
    });

    describe('Confidence Scoring', () => {
        test('should have higher confidence for explicit status', async () => {
            const result = await parse('[status:completed]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test('should have lower confidence for inferred status', async () => {
            const result = await parse('task is done');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
        });
    });

    describe('Error Handling', () => {
        test('handles invalid status values', async () => {
            const result = await parse('status: invalid');
            expect(result).toBeNull();
        });

        test('handles parser errors gracefully', async () => {
            const result = await parse('status: ');
            expect(result).toBeNull();
        });
    });
});
