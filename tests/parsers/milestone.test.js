import { parse } from '../../src/services/parser/parsers/milestone.js';

describe('Milestone Parser', () => {
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
            const result = await parse('[milestone:Test Release]');
            expect(result.type).toBe('milestone');
        });

        test('should return metadata with required fields', async () => {
            const result = await parse('[milestone:Test Release]');
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
        test('should parse explicit milestone format with high confidence', async () => {
            const result = await parse('[milestone:Beta Release]');
            expect(result).toMatchObject({
                type: 'milestone',
                value: {
                    milestone: 'Beta Release',
                    type: 'release',
                    isExplicit: true
                },
                metadata: {
                    confidence: 0.95,
                    pattern: 'explicit'
                }
            });
        });

        test('should parse milestone with type inference', async () => {
            const result = await parse('[milestone:Final Review Phase]');
            expect(result).toMatchObject({
                type: 'milestone',
                value: {
                    milestone: 'Final Review Phase',
                    type: 'review',
                    isExplicit: true
                }
            });
        });
    });

    describe('Labeled Format', () => {
        test('should parse labeled milestone format', async () => {
            const result = await parse('milestone: Product Launch');
            expect(result).toMatchObject({
                type: 'milestone',
                value: {
                    milestone: 'Product Launch',
                    type: 'release',
                    isExplicit: true
                },
                metadata: {
                    confidence: 0.90,
                    pattern: 'labeled'
                }
            });
        });

        test('should parse delivery format', async () => {
            const result = await parse('key delivery: Client Handoff');
            expect(result).toMatchObject({
                type: 'milestone',
                value: {
                    milestone: 'Client Handoff',
                    type: 'delivery',
                    isExplicit: true
                },
                metadata: {
                    pattern: 'delivery'
                }
            });
        });
    });

    describe('Phase Format', () => {
        test('should parse phase completion format', async () => {
            const result = await parse('phase completion: Development Phase');
            expect(result).toMatchObject({
                type: 'milestone',
                value: {
                    milestone: 'Development Phase',
                    type: 'phase',
                    isExplicit: true
                },
                metadata: {
                    confidence: 0.85,
                    pattern: 'phase'
                }
            });
        });
    });

    describe('Implicit Format', () => {
        test('should parse implicit milestone format', async () => {
            const result = await parse('target: Complete Documentation');
            expect(result).toMatchObject({
                type: 'milestone',
                value: {
                    milestone: 'Complete Documentation',
                    type: 'completion',
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
            const result = await parse('[milestone:Release 1.0]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
        });

        test('should have medium confidence (>=0.80) for standard patterns', async () => {
            const result = await parse('milestone: Release 1.0');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
        });

        test('should have low confidence (<=0.80) for implicit patterns', async () => {
            const result = await parse('target: Release 1.0');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
        });

        test('should increase confidence for milestone at start of text', async () => {
            const result = await parse('milestone: Project Launch, scheduled for next week');
            expect(result.metadata.confidence).toBe(0.95); // 0.90 + 0.05
        });

        test('should not increase confidence beyond 1.0', async () => {
            const result = await parse('[milestone:Beta Release] scheduled for next week');
            expect(result.metadata.confidence).toBe(0.95);
        });
    });

    describe('Invalid Cases', () => {
        test('should return null for invalid milestone text', async () => {
            const result = await parse('milestone:');
            expect(result).toBeNull();
        });

        test('should return null for milestone exceeding length limit', async () => {
            const longText = 'A'.repeat(101);
            const result = await parse(`milestone: ${longText}`);
            expect(result).toBeNull();
        });
    });
});
