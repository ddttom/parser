import { parse } from '../../src/services/parser/parsers/milestone.js';

describe('Milestone Parser', () => {
    describe('Return Format', () => {
        test('should return correct type property', async () => {
            const result = await parse('[milestone:Test Release]');
            expect(result.type).toBe('milestone');
        });

        test('should return metadata with required fields', async () => {
            const result = await parse('[milestone:Test Release]');
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
        test('should parse explicit milestone format', async () => {
            const result = await parse('[milestone:Beta Release]');
            expect(result.value).toEqual({
                milestone: 'Beta Release',
                type: 'release',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('explicit');
            expect(result.metadata.originalMatch).toBe('[milestone:Beta Release]');
        });

        test('should parse milestone with type inference', async () => {
            const result = await parse('[milestone:Final Review Phase]');
            expect(result.value).toEqual({
                milestone: 'Final Review Phase',
                type: 'review',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('explicit');
            expect(result.metadata.originalMatch).toBe('[milestone:Final Review Phase]');
        });
    });

    describe('Labeled Format', () => {
        test('should parse labeled milestone format', async () => {
            const result = await parse('milestone: Product Launch');
            expect(result.value).toEqual({
                milestone: 'Product Launch',
                type: 'release',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('labeled');
            expect(result.metadata.originalMatch).toBe('milestone: Product Launch');
        });

        test('should parse delivery format', async () => {
            const result = await parse('key delivery: Client Handoff');
            expect(result.value).toEqual({
                milestone: 'Client Handoff',
                type: 'delivery',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('delivery');
            expect(result.metadata.originalMatch).toBe('key delivery: Client Handoff');
        });
    });

    describe('Phase Format', () => {
        test('should parse phase completion format', async () => {
            const result = await parse('phase completion: Development Phase');
            expect(result.value).toEqual({
                milestone: 'Development Phase',
                type: 'phase',
                isExplicit: true
            });
            expect(result.metadata.pattern).toBe('phase');
            expect(result.metadata.originalMatch).toBe('phase completion: Development Phase');
        });
    });

    describe('Implicit Format', () => {
        test('should parse implicit milestone format', async () => {
            const result = await parse('target: Complete Documentation');
            expect(result.value).toEqual({
                milestone: 'Complete Documentation',
                type: 'completion',
                isExplicit: false
            });
            expect(result.metadata.pattern).toBe('implicit');
            expect(result.metadata.originalMatch).toBe('target: Complete Documentation');
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
