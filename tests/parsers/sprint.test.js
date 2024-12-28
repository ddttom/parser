import { name, perfect } from '../../src/services/parser/parsers/sprint.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Sprint Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('sprint 5: development phase');
            expect(result).toEqual(expect.objectContaining({
                text: expect.any(String),
                corrections: expect.any(Array)
            }));
        });

        test('should return original text with empty corrections for no matches', async () => {
            const text = '   ';
            const result = await perfect(text);
            expect(result).toEqual({
                text,
                corrections: []
            });
        });

        test('should include all required correction properties', async () => {
            const result = await perfect('sprint 5: development phase');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: expect.stringMatching(/^sprint_.*_improvement$/),
                original: expect.any(String),
                correction: expect.any(String),
                position: expect.objectContaining({
                    start: expect.any(Number),
                    end: expect.any(Number)
                }),
                confidence: expect.any(String)
            }));
        });
    });

    describe('Text Improvement', () => {
        test('should expand sprint phases', async () => {
            const variations = [
                { input: 'retro for sprint 5', expected: 'Sprint 5 Retrospective' },
                { input: 'sprint 6 planning', expected: 'Sprint 6 Planning' },
                { input: 'review for sprint 7', expected: 'Sprint 7 Review' },
                { input: 'sprint 8 demo', expected: 'Sprint 8 Review' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format labeled sprints', async () => {
            const variations = [
                { input: 'sprint 4: dev phase', expected: 'Sprint 4: Development Phase' },
                { input: 'sprint 5 - final review', expected: 'Sprint 5 - Sprint Review' },
                { input: 'sprint 6: retro session', expected: 'Sprint 6: Sprint Retrospective' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should standardize sprint references', async () => {
            const variations = [
                { input: 'in sprint 7', expected: 'in Sprint 7' },
                { input: 'during sprint 8', expected: 'during Sprint 8' },
                { input: 'for sprint 9', expected: 'for Sprint 9' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should improve phase descriptions', async () => {
            const variations = [
                { input: 'sprint 10: start', expected: 'Sprint 10: Sprint Start' },
                { input: 'sprint 11: begin', expected: 'Sprint 11: Sprint Start' },
                { input: 'sprint 12: completion', expected: 'Sprint 12: Sprint End' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('sprint 5 planning');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: 'sprint 5 planning'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Meeting for sprint 5 planning');
            expect(result.corrections[0].position).toEqual({
                start: 'Meeting for '.length,
                end: 'Meeting for sprint 5 planning'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('[URGENT] sprint 5 planning!');
            expect(result.text).toBe('[URGENT] Sprint 5 Planning!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to phase references', async () => {
            const result = await perfect('sprint 5 planning');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to labeled sprints', async () => {
            const result = await perfect('sprint 5: development');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to implicit references', async () => {
            const result = await perfect('in sprint 5');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid sprint numbers', async () => {
            const invalid = [
                'sprint 0',
                'sprint 1000',
                'sprint abc'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle malformed references', async () => {
            const malformed = [
                'sprint',
                'sprint #',
                'sprint#',
                'sprint ##5',
                'sprint # 5'
            ];

            for (const input of malformed) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });
    });

    describe('Complex Cases', () => {
        test('should handle multiple phase components', async () => {
            const variations = [
                { 
                    input: 'sprint 5 planning and retro', 
                    expected: 'Sprint 5 Planning and Retrospective'
                },
                { 
                    input: 'sprint 6 demo and retro', 
                    expected: 'Sprint 6 Review and Retrospective'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should handle sprint references with context', async () => {
            const variations = [
                { 
                    input: 'tasks for sprint 5 planning phase', 
                    expected: 'tasks for Sprint 5 Planning Phase'
                },
                { 
                    input: 'update from sprint 6 retro session', 
                    expected: 'update from Sprint 6 Retrospective Session'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should preserve special characters', async () => {
            const result = await perfect('[URGENT] Review sprint 5 demo (ASAP)');
            expect(result.text).toBe('[URGENT] Review Sprint 5 Review (ASAP)');
        });
    });
});
