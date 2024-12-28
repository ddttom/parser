import { name, perfect } from '../../src/services/parser/parsers/milestone.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Milestone Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('milestone: beta release');
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
            const result = await perfect('milestone: beta release');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: expect.stringMatching(/^milestone_.*_improvement$/),
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
        test('should expand milestone abbreviations', async () => {
            const variations = [
                { input: 'milestone: rel 1.0', expected: 'Release: Version 1.0' },
                { input: 'milestone: qa phase', expected: 'Milestone: Quality Assurance Phase' },
                { input: 'milestone: dev complete', expected: 'Milestone: Development Complete' },
                { input: 'milestone: poc delivery', expected: 'Milestone: Proof of Concept Delivery' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format delivery milestones', async () => {
            const variations = [
                { input: 'delivery: mvp', expected: 'Delivery: MVP Release' },
                { input: 'key delivery: beta', expected: 'Delivery: Beta Release' },
                { input: 'delivery: prod deploy', expected: 'Delivery: Production Deployment' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format phase completions', async () => {
            const variations = [
                { input: 'phase completion: dev', expected: 'Phase Completion: Development' },
                { input: 'phase completion: qa testing', expected: 'Phase Completion: Quality Assurance Testing' },
                { input: 'phase completion: uat', expected: 'Phase Completion: User Acceptance' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should improve milestone formatting', async () => {
            const variations = [
                { input: 'milestone: arch_review', expected: 'Review: Architecture' },
                { input: 'milestone: sys-test', expected: 'Milestone: System Testing' },
                { input: 'milestone: doc_complete', expected: 'Milestone: Documentation Complete' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('milestone: beta release');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: 'milestone: beta release'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Next milestone: beta release');
            expect(result.corrections[0].position).toEqual({
                start: 'Next '.length,
                end: 'Next milestone: beta release'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('[URGENT] milestone: beta release!');
            expect(result.text).toBe('[URGENT] Release: Beta Release!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to labeled milestones', async () => {
            const result = await perfect('milestone: beta release');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to delivery milestones', async () => {
            const result = await perfect('delivery: mvp release');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to phase completions', async () => {
            const result = await perfect('phase completion: development');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid milestone text', async () => {
            const invalid = [
                'milestone:',
                'milestone: ',
                'delivery:',
                'phase completion:'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle milestone exceeding length limit', async () => {
            const longText = 'A'.repeat(101);
            const variations = [
                `milestone: ${longText}`,
                `delivery: ${longText}`,
                `phase completion: ${longText}`
            ];

            for (const input of variations) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });
    });

    describe('Complex Cases', () => {
        test('should handle multiple milestone components', async () => {
            const variations = [
                { 
                    input: 'milestone: qa and uat complete', 
                    expected: 'Milestone: Quality Assurance and User Acceptance Complete'
                },
                { 
                    input: 'milestone: dev and test phase', 
                    expected: 'Milestone: Development and Testing Phase'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should handle milestone references with context', async () => {
            const variations = [
                { 
                    input: 'tasks for milestone: beta testing', 
                    expected: 'tasks for Release: Beta Testing'
                },
                { 
                    input: 'update from phase completion: qa', 
                    expected: 'update from Phase Completion: Quality Assurance'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should preserve special characters', async () => {
            const result = await perfect('[URGENT] Review milestone: rc-1 (ASAP)');
            expect(result.text).toBe('[URGENT] Review Release: Release Candidate 1 (ASAP)');
        });
    });
});
