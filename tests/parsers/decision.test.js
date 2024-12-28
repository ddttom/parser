import { parse } from '../../src/services/parser/parsers/decision.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Decision Parser', () => {
    describe('Return Format', () => {
        test('should return correct type property', async () => {
            const result = await parse('[decision:use React]');
            expect(result.type).toBe('decision');
        });

        test('should return metadata with required fields', async () => {
            const result = await parse('[decision:use React]');
            expect(result.metadata).toEqual(expect.objectContaining({
                confidence: expect.any(String),
                pattern: expect.any(String),
                originalMatch: expect.any(String)
            }));
            // Verify confidence is one of the enum values
            expect([Confidence.HIGH, Confidence.MEDIUM, Confidence.LOW]).toContain(result.metadata.confidence);
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
                    confidence: Confidence.HIGH,
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
                    confidence: Confidence.HIGH,
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
                    confidence: Confidence.HIGH,
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
                    confidence: Confidence.MEDIUM,
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
                    confidence: Confidence.MEDIUM,
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

    describe('Confidence Levels', () => {
        test('should have HIGH confidence for explicit patterns', async () => {
            const result = await parse('[decision:use React]');
            expect(result.metadata.confidence).toBe(Confidence.HIGH);
        });

        test('should have HIGH confidence for decided patterns', async () => {
            const result = await parse('decided to use React');
            expect(result.metadata.confidence).toBe(Confidence.HIGH);
        });

        test('should have MEDIUM confidence for going patterns', async () => {
            const result = await parse('going with React');
            expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
        });

        test('should boost confidence for special case', async () => {
            const result = await parse('decided to use TypeScript because of type safety');
            expect(result.metadata.confidence).toBe(Confidence.HIGH);
        });

        test('should handle context words appropriately', async () => {
            const result = await parse('therefore, going with MongoDB because of flexibility');
            expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
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
