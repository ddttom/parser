import { name, parse } from '../../src/services/parser/parsers/priority.js';

describe('Priority Parser', () => {
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

        test('returns null for text without priority', async () => {
            const result = await parse('Regular text without priority');
            expect(result).toBeNull();
        });
    });

    describe('Explicit Priority', () => {
        test('parses explicit priority declarations', async () => {
            const result = await parse('priority: high');
            expect(result).toEqual({
                type: 'priority',
                value: {
                    priority: 'high'
                },
                metadata: {
                    pattern: 'explicit',
                    confidence: expect.any(Number),
                    originalMatch: 'priority: high',
                    level: 2
                }
            });
        });

        test('handles various priority levels', async () => {
            const levels = ['urgent', 'high', 'medium', 'normal', 'low'];
            const expectedLevels = [1, 2, 3, 4, 5];

            for (let i = 0; i < levels.length; i++) {
                const result = await parse(`priority: ${levels[i]}`);
                expect(result.value.priority).toBe(levels[i]);
                expect(result.metadata.level).toBe(expectedLevels[i]);
            }
        });
    });

    describe('Prefix Format', () => {
        test('parses prefix format', async () => {
            const result = await parse('high priority task');
            expect(result.value.priority).toBe('high');
            expect(result.metadata.pattern).toBe('prefix');
        });

        test('handles urgent priority', async () => {
            const result = await parse('urgent priority');
            expect(result.value.priority).toBe('urgent');
            expect(result.metadata.level).toBe(1);
        });
    });

    describe('Shorthand Notation', () => {
        test('parses exclamation marks', async () => {
            const cases = [
                ['!!!', 'urgent'],
                ['!!', 'high'],
                ['!', 'medium']
            ];

            for (const [input, expected] of cases) {
                const result = await parse(input);
                expect(result.value.priority).toBe(expected);
            }
        });

        test('ignores invalid exclamation patterns', async () => {
            const result = await parse('!!!!');
            expect(result).toBeNull();
        });
    });

    describe('Numeric Priority', () => {
        test('parses numeric priorities', async () => {
            const result = await parse('p1 task');
            expect(result.value.priority).toBe('urgent');
            expect(result.metadata.pattern).toBe('numeric');
        });

        test('handles priority range', async () => {
            const priorities = ['urgent', 'high', 'medium', 'normal', 'low'];
            
            for (let i = 1; i <= 5; i++) {
                const result = await parse(`p${i} task`);
                expect(result.value.priority).toBe(priorities[i - 1]);
            }
        });

        test('ignores invalid numbers', async () => {
            const result = await parse('p6 task');
            expect(result).toBeNull();
        });
    });

    describe('Contextual Priority', () => {
        test('recognizes urgent contexts', async () => {
            const terms = ['asap', 'urgent', 'critical'];
            for (const term of terms) {
                const result = await parse(`${term} task`);
                expect(result.value.priority).toBe('urgent');
                expect(result.metadata.pattern).toBe('contextual');
            }
        });

        test('recognizes blocking as high priority', async () => {
            const result = await parse('blocking task');
            expect(result.value.priority).toBe('high');
        });
    });

    describe('Confidence Scoring', () => {
        test('should have higher confidence for explicit priority', async () => {
            const result = await parse('[priority:high]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test('should have lower confidence for inferred priority', async () => {
            const result = await parse('high priority task');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
        });
    });

    describe('Error Handling', () => {
        test('handles invalid priority values', async () => {
            const result = await parse('priority: invalid');
            expect(result).toBeNull();
        });

        test('handles parser errors gracefully', async () => {
            // Mock extractPriorityValue to throw
            const originalExtract = parse.extractPriorityValue;
            parse.extractPriorityValue = () => {
                throw new Error('Extraction error');
            };

            const result = await parse('priority: high');
            expect(result).toEqual({
                type: 'error',
                error: 'PARSER_ERROR',
                message: 'Extraction error'
            });

            // Restore original function
            parse.extractPriorityValue = originalExtract;
        });
    });
});
