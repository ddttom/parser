import { name, perfect } from '../../src/services/parser/parsers/team.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Team Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('frontend team');
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
            const result = await perfect('frontend team');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: expect.stringMatching(/^team_.*_improvement$/),
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
        test('should expand team abbreviations', async () => {
            const variations = [
                { input: 'fe team', expected: 'Frontend Team' },
                { input: 'be team', expected: 'Backend Team' },
                { input: 'ui team', expected: 'UI/UX Design Team' },
                { input: 'qa team', expected: 'Quality Assurance Team' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format team mentions', async () => {
            const variations = [
                { input: '@fe, @be', expected: '@Frontend, @Backend' },
                { input: '@ui and @qa', expected: '@UI/UX Design and @Quality Assurance' },
                { input: '@dev, @qa and @infra', expected: '@Development, @Quality Assurance and @Infrastructure' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format team member lists', async () => {
            const variations = [
                { input: 'with john smith', expected: 'with John Smith' },
                { input: 'involving alice, bob', expected: 'with Alice, Bob' },
                { input: 'with tom, dick and harry', expected: 'with Tom, Dick and Harry' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should standardize team references', async () => {
            const variations = [
                { input: 'frontend', expected: 'Frontend Team' },
                { input: 'backend team', expected: 'Backend Team' },
                { input: 'design', expected: 'UI/UX Design Team' },
                { input: 'qa team', expected: 'Quality Assurance Team' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('frontend team');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: 'frontend team'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Meeting with frontend team');
            expect(result.corrections[0].position).toEqual({
                start: 'Meeting with '.length,
                end: 'Meeting with frontend team'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('URGENT: Meeting with frontend team!');
            expect(result.text).toBe('URGENT: Meeting with Frontend Team!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to explicit team references', async () => {
            const result = await perfect('frontend team');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to team mentions', async () => {
            const result = await perfect('@frontend and @backend');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to implicit team references', async () => {
            const result = await perfect('frontend');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });

        test('should assign MEDIUM confidence to member lists', async () => {
            const result = await perfect('with john and sarah');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid team names', async () => {
            const invalidTeams = [
                '123 team',
                '@#$ team',
                'invalid team',
                'unknown team'
            ];

            for (const input of invalidTeams) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle malformed member lists', async () => {
            const malformed = [
                'involving',
                'involving and',
                'involving ,',
                'with ,',
                'with and'
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
        test('should handle mixed team references', async () => {
            const result = await perfect('Meeting with frontend team and @backend');
            expect(result.text).toBe('Meeting with Frontend Team and @Backend');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should handle team references with context', async () => {
            const variations = [
                { 
                    input: 'sync with fe team about api design', 
                    expected: 'sync with Frontend Team about api design'
                },
                { 
                    input: 'review from qa team on release', 
                    expected: 'review from Quality Assurance Team on release'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should preserve special characters', async () => {
            const result = await perfect('[URGENT] Review needed from qa team (ASAP)');
            expect(result.text).toBe('[URGENT] Review needed from Quality Assurance Team (ASAP)');
        });
    });
});
