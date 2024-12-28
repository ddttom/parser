import { parse } from '../../src/services/parser/parsers/sprint.js';

describe('Sprint Parser', () => {
    describe('Return Format', () => {
        test('should return correct type property', async () => {
            const result = await parse('sprint 5: Development Phase');
            expect(result.type).toBe('sprint');
        });

        test('should return metadata with required fields', async () => {
            const result = await parse('sprint 5: Development Phase');
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

        test('should infer phase from description', async () => {
            const phases = [
                { input: 'sprint 7: Planning Week', phase: 'planning' },
                { input: 'sprint 8: Sprint Review', phase: 'review' },
                { input: 'sprint 9: Team Retrospective', phase: 'retro' }
            ];

            for (const { input, phase } of phases) {
                const result = await parse(input);
                expect(result.value.phase).toBe(phase);
                expect(result.metadata.pattern).toBe('labeled');
            }
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
            const variations = [
                'sprint retrospective for sprint 9',
                'sprint retro for sprint 9',
                'retrospective for sprint 9',
                'retro for sprint 9'
            ];

            for (const input of variations) {
                const result = await parse(input);
                expect(result.value).toEqual({
                    number: 9,
                    phase: 'retro',
                    isExplicit: true
                });
                expect(result.metadata.pattern).toBe('phase');
            }
        });
    });

    describe('Implicit Format', () => {
        test('should parse implicit sprint references', async () => {
            const references = [
                'task assigned in sprint 10',
                'work during sprint 10',
                'for sprint 10',
                'scheduled for sprint 10'
            ];

            for (const input of references) {
                const result = await parse(input);
                expect(result.value).toEqual({
                    number: 10,
                    phase: 'general',
                    isExplicit: false
                });
                expect(result.metadata.pattern).toBe('implicit');
            }
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

        test('should return null for malformed references', async () => {
            const malformed = [
                'sprint',
                'sprint #',
                'sprint#',
                'sprint ##5',
                'sprint # 5'
            ];

            for (const input of malformed) {
                const result = await parse(input);
                expect(result).toBeNull();
            }
        });
    });
});
