import { parse } from '../../src/services/parser/parsers/milestone.js';

describe('Milestone Parser', () => {
    describe('Return Format', () => {
    test('should return object with milestone key', async () => {
        const result = await parse('milestone: Beta Release');
        expect(result).toHaveProperty('milestone');
    });

    test('should return null for no matches', async () => {
        const result = await parse('   ');
        expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
        const result = await parse('milestone: Beta Release');
        const expectedProps = {
            milestone: expect.any(String),
            type: expect.any(String),
            isExplicit: expect.any(Boolean),
            confidence: expect.any(Number),
            pattern: expect.any(String),
            originalMatch: expect.any(String)
        };
        expect(result.milestone).toMatchObject(expectedProps);
    });
    });

    describe('Pattern Matching', () => {
        test('should parse labeled milestone format', async () => {
            const variations = [
                { input: 'milestone: Product Launch', type: 'release' },
                { input: 'milestone: Final Review', type: 'review' },
                { input: 'milestone: Client Handoff', type: 'delivery' },
                { input: 'milestone: Project Completion', type: 'completion' }
            ];

            for (const { input, type } of variations) {
                const result = await parse(input);
                expect(result.milestone).toMatchObject({
                    milestone: input.split(': ')[1],
                    type,
                    isExplicit: true
                });
            }
        });

        test('should parse delivery format', async () => {
            const variations = [
                'delivery: Client Handoff',
                'key delivery: Final Deliverables',
                'delivery: Project Handover'
            ];

            for (const input of variations) {
                const result = await parse(input);
                expect(result.milestone).toMatchObject({
                    milestone: input.split(': ')[1],
                    type: 'delivery',
                    isExplicit: true
                });
            }
        });

        test('should parse phase completion format', async () => {
            const variations = [
                'phase completion: Development Phase',
                'phase completion: Testing Phase',
                'phase completion: Design Phase'
            ];

            for (const input of variations) {
                const result = await parse(input);
                expect(result.milestone).toMatchObject({
                    milestone: input.split(': ')[1],
                    type: 'phase',
                    isExplicit: true
                });
            }
        });

        test('should parse implicit milestone format', async () => {
            const variations = [
                { input: 'target: Complete Documentation', type: 'completion' },
                { input: 'target: Release Version 1.0', type: 'release' },
                { input: 'target: Client Review', type: 'review' }
            ];

            for (const { input, type } of variations) {
                const result = await parse(input);
                expect(result.milestone).toMatchObject({
                    milestone: input.split(': ')[1],
                    type,
                    isExplicit: false
                });
            }
        });
    });

    describe('Type Inference', () => {
        test('should infer release type', async () => {
            const releases = [
                'milestone: Product Launch',
                'milestone: Version 2.0 Release',
                'milestone: Feature Deployment',
                'milestone: System Rollout'
            ];

            for (const input of releases) {
                const result = await parse(input);
                expect(result.milestone.type).toBe('release');
            }
        });

        test('should infer review type', async () => {
            const reviews = [
                'milestone: Final Review',
                'milestone: Project Assessment',
                'milestone: Code Evaluation'
            ];

            for (const input of reviews) {
                const result = await parse(input);
                expect(result.milestone.type).toBe('review');
            }
        });

        test('should infer completion type', async () => {
            const completions = [
                'milestone: Project Completion',
                'milestone: Task Finished',
                'milestone: Development Done'
            ];

            for (const input of completions) {
                const result = await parse(input);
                expect(result.milestone.type).toBe('completion');
            }
        });
    });

    describe('Invalid Cases', () => {
        test('should return null for invalid milestone text', async () => {
            const invalid = [
                'milestone:',
                'milestone: ',
                'delivery:',
                'phase completion:'
            ];

            for (const input of invalid) {
                const result = await parse(input);
                expect(result).toBeNull();
            }
        });

        test('should return null for milestone exceeding length limit', async () => {
            const longText = 'A'.repeat(101);
            const variations = [
                `milestone: ${longText}`,
                `delivery: ${longText}`,
                `phase completion: ${longText}`
            ];

            for (const input of variations) {
                const result = await parse(input);
                expect(result).toBeNull();
            }
        });
    });
});
