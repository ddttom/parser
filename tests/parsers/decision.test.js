import { parse } from '../../src/services/parser/parsers/decision.js';

describe('Decision Parser', () => {
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
            const result = await parse('[decision:use React]');
            expect(result.type).toBe('decision');
        });

        test('should return metadata with required fields', async () => {
            const result = await parse('[decision:use React]');
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
        test('should parse explicit decision with rationale', async () => {
            const result = await parse('[decision:use React, because of team expertise]');
            expect(result).toMatchObject({
                type: 'decision',
                value: {
                    decision: 'use React',
                    type: 'technical',
                    rationale: 'of team expertise',
                    isExplicit: true
                },
                metadata: {
                    confidence: 0.95,
                    pattern: 'explicit'
                }
            });
        });

        test('should parse explicit decision without rationale', async () => {
            const result = await parse('[decision:implement CI/CD pipeline]');
            expect(result).toMatchObject({
                type: 'decision',
                value: {
                    decision: 'implement CI/CD pipeline',
                    type: 'technical',
                    rationale: null,
                    isExplicit: true
                }
            });
        });
    });

    describe('Decided Format', () => {
        test('should parse decided format with rationale', async () => {
            const result = await parse('decided to adopt microservices because of scalability needs');
            expect(result).toMatchObject({
                type: 'decision',
                value: {
                    decision: 'adopt microservices',
                    type: 'technical',
                    rationale: 'of scalability needs',
                    isExplicit: true
                },
                metadata: {
                    confidence: 0.90,
                    pattern: 'decided'
                }
            });
        });
    });

    describe('Choice Format', () => {
        test('should parse choice format', async () => {
            const result = await parse('choice: implement agile workflow because it fits team better');
            expect(result).toMatchObject({
                type: 'decision',
                value: {
                    decision: 'implement agile workflow',
                    type: 'process',
                    rationale: 'it fits team better',
                    isExplicit: true
                },
                metadata: {
                    confidence: 0.90,
                    pattern: 'choice'
                }
            });
        });
    });

    describe('Selected Format', () => {
        test('should parse selected format with alternative', async () => {
            const result = await parse('selected React over Angular because of ecosystem');
            expect(result).toMatchObject({
                type: 'decision',
                value: {
                    decision: 'React',
                    type: 'technical',
                    alternative: 'Angular',
                    rationale: 'of ecosystem',
                    isExplicit: true
                },
                metadata: {
                    confidence: 0.85,
                    pattern: 'selected'
                }
            });
        });
    });

    describe('Going Format', () => {
        test('should parse going with format', async () => {
            const result = await parse('going with cloud deployment because of cost efficiency');
            expect(result).toMatchObject({
                type: 'decision',
                value: {
                    decision: 'cloud deployment',
                    type: 'technical',
                    rationale: 'of cost efficiency',
                    isExplicit: false
                },
                metadata: {
                    confidence: 0.80,
                    pattern: 'going'
                }
            });
        });
    });

    describe('Decision Types', () => {
        test('should identify technical decisions', async () => {
            const result = await parse('decided to upgrade database');
            expect(result.value.type).toBe('technical');
        });

        test('should identify process decisions', async () => {
            const result = await parse('decided to improve workflow');
            expect(result.value.type).toBe('process');
        });

        test('should identify resource decisions', async () => {
            const result = await parse('decided to hire new developer');
            expect(result.value.type).toBe('resource');
        });

        test('should identify business decisions', async () => {
            const result = await parse('decided to update roadmap');
            expect(result.value.type).toBe('business');
        });
    });

    describe('Confidence Scoring', () => {
        test('should have high confidence (>=0.90) for explicit patterns', async () => {
            const result = await parse('[decision:use React]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
        });

        test('should have medium confidence (>=0.80) for standard patterns', async () => {
            const result = await parse('decided to use React');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
        });

        test('should have low confidence (<=0.80) for implicit patterns', async () => {
            const result = await parse('going with React');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
        });

        test('should increase confidence for decision at start of text', async () => {
            const result = await parse('decided to use TypeScript because of type safety');
            expect(result.metadata.confidence).toBe(0.95); // 0.90 + 0.05
        });

        test('should increase confidence with context words', async () => {
            const result = await parse('therefore, going with MongoDB because of flexibility');
            expect(result.metadata.confidence).toBe(0.85); // 0.80 + 0.05
        });

        test('should not increase confidence beyond 1.0', async () => {
            const result = await parse('therefore [decision:use Docker] for consistency');
            expect(result.metadata.confidence).toBe(0.95);
        });
    });

    describe('Invalid Cases', () => {
        test('should return null for decision too short', async () => {
            const result = await parse('[decision:a]');
            expect(result).toBeNull();
        });

        test('should return null for decision too long', async () => {
            const result = await parse(`[decision:${'a'.repeat(201)}]`);
            expect(result).toBeNull();
        });

        test('should return null for rationale too long', async () => {
            const result = await parse(`[decision:use React, because ${'a'.repeat(501)}]`);
            expect(result).toBeNull();
        });
    });
});
