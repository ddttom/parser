import { parse } from '../../src/services/parser/parsers/sprint.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

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
        test('should parse explicit sprint format with high confidence', async () => {
            const result = await parse('[sprint:5]');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 5,
                    phase: 'general',
                    isExplicit: true
                },
                metadata: {
                    confidence: Confidence.HIGH,
                    pattern: 'explicit'
                }
            });
        });

        test('should parse explicit sprint with description', async () => {
            const result = await parse('[sprint:3, Planning Phase]');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 3,
                    phase: 'planning',
                    description: 'Planning Phase',
                    isExplicit: true
                },
                metadata: {
                    confidence: Confidence.HIGH,
                    pattern: 'explicit'
                }
            });
        });
    });

    describe('Labeled Format', () => {
        test('should parse labeled sprint format', async () => {
            const result = await parse('sprint 4: Development Phase');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 4,
                    description: 'Development Phase',
                    isExplicit: true
                },
                metadata: {
                    confidence: Confidence.HIGH,
                    pattern: 'labeled'
                }
            });
        });

        test('should parse sprint with hyphen separator', async () => {
            const result = await parse('sprint 6 - Final Review');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 6,
                    phase: 'review',
                    description: 'Final Review',
                    isExplicit: true
                }
            });
        });
    });

    describe('Phase Format', () => {
        test('should parse sprint planning format', async () => {
            const result = await parse('sprint planning for sprint 7');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 7,
                    phase: 'planning',
                    isExplicit: true
                },
                metadata: {
                    confidence: Confidence.MEDIUM,
                    pattern: 'phase'
                }
            });
        });

        test('should parse sprint review format', async () => {
            const result = await parse('sprint review for sprint 8');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 8,
                    phase: 'review',
                    isExplicit: true
                }
            });
        });

        test('should parse retrospective format', async () => {
            const result = await parse('sprint retrospective for sprint 9');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 9,
                    phase: 'retro',
                    isExplicit: true
                }
            });
        });
    });

    describe('Implicit Format', () => {
        test('should parse implicit sprint reference', async () => {
            const result = await parse('task assigned in sprint 10');
            expect(result).toMatchObject({
                type: 'sprint',
                value: {
                    number: 10,
                    phase: 'general',
                    isExplicit: false
                },
                metadata: {
                    confidence: Confidence.MEDIUM,
                    pattern: 'implicit'
                }
            });
        });
    });

    describe('Confidence Levels', () => {
        test('should have HIGH confidence for explicit patterns', async () => {
            const result = await parse('[sprint:5]');
            expect(result.metadata.confidence).toBe(Confidence.HIGH);
        });

        test('should have HIGH confidence for labeled patterns', async () => {
            const result = await parse('sprint 5: Development Phase');
            expect(result.metadata.confidence).toBe(Confidence.HIGH);
        });

        test('should have MEDIUM confidence for phase patterns', async () => {
            const result = await parse('sprint planning for sprint 7');
            expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
        });

        test('should have MEDIUM confidence for implicit patterns', async () => {
            const result = await parse('in sprint 5');
            expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
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
