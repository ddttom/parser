import { name, perfect } from '../../src/services/parser/parsers/tags.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Tags Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('#feature');
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
            const result = await perfect('#feature');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: 'tag_improvement',
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
        test('should expand tag prefixes', async () => {
            const variations = [
                { input: '#docs', expected: '#Documentation' },
                { input: '#feature', expected: '#Feature' },
                { input: '#bug', expected: '#Bug' },
                { input: '#perf', expected: '#Performance' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format compound tags', async () => {
            const variations = [
                { input: '#feature-login', expected: '#FeatureLogin' },
                { input: '#bug_fix', expected: '#BugFix' },
                { input: '#docs-api', expected: '#DocumentationApi' },
                { input: '#test_suite', expected: '#TestingSuite' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format multiple tags', async () => {
            const variations = [
                { 
                    input: '#feature #bug', 
                    expected: '#Feature #Bug'
                },
                { 
                    input: '#docs-api #test-unit', 
                    expected: '#DocumentationApi #TestingUnit'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should format custom tags in PascalCase', async () => {
            const variations = [
                { input: '#frontend', expected: '#Frontend' },
                { input: '#user-interface', expected: '#UserInterface' },
                { input: '#api_endpoint', expected: '#ApiEndpoint' },
                { input: '#mobile-app', expected: '#MobileApp' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('#feature');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: '#feature'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Task with #feature');
            expect(result.corrections[0].position).toEqual({
                start: 'Task with '.length,
                end: 'Task with #feature'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('[URGENT] #feature request!');
            expect(result.text).toBe('[URGENT] #Feature request!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to known prefix tags', async () => {
            const result = await perfect('#feature');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to compound prefix tags', async () => {
            const result = await perfect('#feature-login');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to custom tags', async () => {
            const result = await perfect('#frontend');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid tag names', async () => {
            const invalid = [
                '#123',
                '#!@#',
                '#',
                '# ',
                '#-start'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle malformed tags', async () => {
            const malformed = [
                '# tag',
                '#tag space',
                '#tag.name',
                '#tag/name',
                '#tag\\name'
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
        test('should handle multiple tag types', async () => {
            const variations = [
                { 
                    input: '#feature-login #bug-fix #frontend', 
                    expected: '#FeatureLogin #BugFix #Frontend'
                },
                { 
                    input: '#docs-api #test-unit #mobile-app', 
                    expected: '#DocumentationApi #TestingUnit #MobileApp'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should handle tags with context', async () => {
            const variations = [
                { 
                    input: 'Task needs #feature-auth and #bug-fix', 
                    expected: 'Task needs #FeatureAuth and #BugFix'
                },
                { 
                    input: 'Update #docs-api for #mobile-app', 
                    expected: 'Update #DocumentationApi for #MobileApp'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should preserve special characters', async () => {
            const result = await perfect('[URGENT] Review #feature-auth (#bug-fix)');
            expect(result.text).toBe('[URGENT] Review #FeatureAuth (#BugFix)');
        });
    });
});
