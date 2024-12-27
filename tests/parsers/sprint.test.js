import { parse } from '../../src/services/parser/parsers/sprint.js';

describe('Sprint Parser', () => {
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
            const result = await parse('[sprint:5]');
            expect(result.type).toBe('sprint');
        });

        test('should return metadata with required fields', async () => {
            const result = await parse('[sprint:5]');
            expect(result.metadata).toEqual(expect.objectContaining({
                confidence: expect.any(Number),
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
        test('should parse explicit sprint format with high confidence', async () => {
            const result = await parse('[sprint:5]');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 5,
                    phase: 'general',
                    isExplicit: true
                },
                metadata: {
                    confidence: 0.95,
                    pattern: 'explicit'
                }
            });
        });

        test('should parse explicit sprint with description', async () => {
            const result = await parse('[sprint:3, Planning Phase]');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 3,
                    phase: 'planning',
                    description: 'Planning Phase',
                    isExplicit: true
                },
                metadata: {
                    confidence: 0.95,
                    pattern: 'explicit'
                }
            });
        });
    });

    describe('Labeled Format', () => {
        test('should parse labeled sprint format', async () => {
            const result = await parse('sprint 4: Development Phase');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 4,
                    description: 'Development Phase',
                    isExplicit: true
                },
                metadata: {
                    confidence: 0.90,
                    pattern: 'labeled'
                }
            });
        });

        test('should parse sprint with hyphen separator', async () => {
            const result = await parse('sprint 6 - Final Review');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 6,
                    phase: 'review',
                    description: 'Final Review',
                    isExplicit: true
                }
            });
        });
    });

    describe('Phase Format', () => {
        test('should parse sprint planning format', async () => {
            const result = await parse('sprint planning for sprint 7');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 7,
                    phase: 'planning',
                    isExplicit: true
                },
                metadata: {
                    confidence: 0.85,
                    pattern: 'phase'
                }
            });
        });

        test('should parse sprint review format', async () => {
            const result = await parse('sprint review for sprint 8');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 8,
                    phase: 'review',
                    isExplicit: true
                }
            });
        });

        test('should parse retrospective format', async () => {
            const result = await parse('sprint retrospective for sprint 9');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 9,
                    phase: 'retro',
                    isExplicit: true
                }
            });
        });
    });

    describe('Implicit Format', () => {
        test('should parse implicit sprint reference', async () => {
            const result = await parse('task assigned in sprint 10');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 10,
                    phase: 'general',
                    isExplicit: false
                },
                metadata: {
                    confidence: 0.80,
                    pattern: 'implicit'
                }
            });
        });
    });

    describe('Confidence Scoring', () => {
        test('should have high confidence (>=0.90) for explicit patterns', async () => {
            const result = await parse('[sprint:5]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
        });

        test('should have medium confidence (>=0.80) for standard patterns', async () => {
            const result = await parse('sprint 5: Development Phase');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
        });

        test('should have low confidence (<=0.80) for implicit patterns', async () => {
            const result = await parse('in sprint 5');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
        });

        test('should increase confidence for sprint at start of text', async () => {
            const result = await parse('sprint 11: Development Phase');
            expect(result.metadata.confidence).toBe(0.95); // 0.90 + 0.05
        });

        test('should increase confidence for context words', async () => {
            const result = await parse('task for sprint 12 planning');
            expect(result.metadata.confidence).toBe(0.85); // 0.80 + 0.05
        });

        test('should not increase confidence beyond 1.0', async () => {
            const result = await parse('[sprint:13] planning session');
            expect(result.metadata.confidence).toBe(0.95);
        });
    });

    describe('Invalid Cases', () => {
        test('should return null for invalid sprint number', async () => {
            const result = await parse('sprint 0');
            expect(result).toBeNull();
        });

        test('should return null for sprint number too large', async () => {
            const result = await parse('sprint 1000');
            expect(result).toBeNull();
        });

        test('should return null for non-numeric sprint', async () => {
            const result = await parse('sprint abc');
            expect(result).toBeNull();
        });
    });
});
