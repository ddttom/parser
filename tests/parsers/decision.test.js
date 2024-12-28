import { parse } from '../../src/services/parser/parsers/decision.js';

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
        });

        test('should return null for no matches', async () => {
            const result = await parse('   ');
            expect(result).toBeNull();
        });
    });

    describe('Explicit Format', () => {
        test('should parse explicit decision with rationale', async () => {
            const result = await parse('[decision:use React, because of team expertise]');
            expect(result.value).toEqual({
                decision: 'use React',
                type: 'technical',
                rationale: 'of team expertise',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('explicit');
            expect(result.metadata.originalMatch).toBe('[decision:use React, because of team expertise]');
        });

        test('should parse explicit decision without rationale', async () => {
            const result = await parse('[decision:implement CI/CD pipeline]');
            expect(result.value).toEqual({
                decision: 'implement CI/CD pipeline',
                type: 'technical',
                rationale: null,
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('explicit');
            expect(result.metadata.originalMatch).toBe('[decision:implement CI/CD pipeline]');
        });
    });

    describe('Decided Format', () => {
        test('should parse decided format with rationale', async () => {
            const result = await parse('decided to adopt microservices because of scalability needs');
            expect(result.value).toEqual({
                decision: 'adopt microservices',
                type: 'technical',
                rationale: 'of scalability needs',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('decided');
            expect(result.metadata.originalMatch).toBe('decided to adopt microservices because of scalability needs');
        });
    });

    describe('Choice Format', () => {
        test('should parse choice format', async () => {
            const result = await parse('choice: implement agile workflow because it fits team better');
            expect(result.value).toEqual({
                decision: 'implement agile workflow',
                type: 'process',
                rationale: 'it fits team better',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('choice');
            expect(result.metadata.originalMatch).toBe('choice: implement agile workflow because it fits team better');
        });
    });

    describe('Selected Format', () => {
        test('should parse selected format with alternative', async () => {
            const result = await parse('selected React over Angular because of ecosystem');
            expect(result.value).toEqual({
                decision: 'React',
                type: 'technical',
                alternative: 'Angular',
                rationale: 'of ecosystem',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('selected');
            expect(result.metadata.originalMatch).toBe('selected React over Angular because of ecosystem');
        });
    });

    describe('Going Format', () => {
        test('should parse going with format', async () => {
            const result = await parse('going with cloud deployment because of cost efficiency');
            expect(result.value).toEqual({
                decision: 'cloud deployment',
                type: 'technical',
                rationale: 'of cost efficiency',
                isExplicit: false
            });
            expect(result.metadata.pattern).toBe('going');
            expect(result.metadata.originalMatch).toBe('going with cloud deployment because of cost efficiency');
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
