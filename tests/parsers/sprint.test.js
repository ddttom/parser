import { parse } from '../../src/services/parser/parsers/sprint.js';

describe('Sprint Parser', () => {
    describe('Return Format', () => {
        test('should return correct type property', async () => {
            const result = await parse('[sprint:5]');
            expect(result.type).toBe('sprint');
        });

        test('should return metadata with required fields', async () => {
            const result = await parse('[sprint:5]');
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
        test('should parse explicit sprint format', async () => {
            const result = await parse('[sprint:5]');
            expect(result.value).toEqual({
                number: 5,
                phase: 'general',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('explicit');
            expect(result.metadata.originalMatch).toBe('[sprint:5]');
        });

        test('should parse explicit sprint with description', async () => {
            const result = await parse('[sprint:3, Planning Phase]');
            expect(result.value).toEqual({
                number: 3,
                phase: 'planning',
                description: 'Planning Phase',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('explicit');
            expect(result.metadata.originalMatch).toBe('[sprint:3, Planning Phase]');
        });
    });

    describe('Labeled Format', () => {
        test('should parse labeled sprint format', async () => {
            const result = await parse('sprint 4: Development Phase');
            expect(result.value).toEqual({
                number: 4,
                description: 'Development Phase',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('labeled');
            expect(result.metadata.originalMatch).toBe('sprint 4: Development Phase');
        });

        test('should parse sprint with hyphen separator', async () => {
            const result = await parse('sprint 6 - Final Review');
            expect(result.value).toEqual({
                number: 6,
                phase: 'review',
                description: 'Final Review',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('labeled');
            expect(result.metadata.originalMatch).toBe('sprint 6 - Final Review');
        });
    });

    describe('Phase Format', () => {
        test('should parse sprint planning format', async () => {
            const result = await parse('sprint planning for sprint 7');
            expect(result.value).toEqual({
                number: 7,
                phase: 'planning',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('phase');
            expect(result.metadata.originalMatch).toBe('sprint planning for sprint 7');
        });

        test('should parse sprint review format', async () => {
            const result = await parse('sprint review for sprint 8');
            expect(result.value).toEqual({
                number: 8,
                phase: 'review',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('phase');
            expect(result.metadata.originalMatch).toBe('sprint review for sprint 8');
        });

        test('should parse retrospective format', async () => {
            const result = await parse('sprint retrospective for sprint 9');
            expect(result.value).toEqual({
                number: 9,
                phase: 'retro',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('phase');
            expect(result.metadata.originalMatch).toBe('sprint retrospective for sprint 9');
        });
    });

    describe('Implicit Format', () => {
        test('should parse implicit sprint reference', async () => {
            const result = await parse('task assigned in sprint 10');
            expect(result.value).toEqual({
                number: 10,
                phase: 'general',
                isExplicit: false
            });
            expect(result.metadata.pattern).toBe('implicit');
            expect(result.metadata.originalMatch).toBe('task assigned in sprint 10');
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
