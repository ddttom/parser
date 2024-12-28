import { name, perfect } from '../../src/services/parser/parsers/version.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Version Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('version 1.0.0');
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
            const result = await perfect('version 1.0.0');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: 'version_improvement',
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
        test('should expand version prefixes', async () => {
            const variations = [
                { input: 'v1.0.0', expected: 'Version: 1.0.0' },
                { input: 'ver1.0.0', expected: 'Version: 1.0.0' },
                { input: 'rel1.0.0', expected: 'Release: 1.0.0' },
                { input: 'build1.0.0', expected: 'Build: 1.0.0' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format explicit versions', async () => {
            const variations = [
                { input: 'version 1.0.0', expected: 'Version: 1.0.0' },
                { input: 'release 2.3.4', expected: 'Release: 2.3.4' },
                { input: 'build 0.1.0', expected: 'Build: 0.1.0' },
                { input: 'version: 10.20.30', expected: 'Version: 10.20.30' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format implicit versions', async () => {
            const variations = [
                { input: 'using 1.0.0', expected: 'using Version: 1.0.0' },
                { input: 'updated to 2.3.4', expected: 'updated to Version: 2.3.4' },
                { input: 'current is 0.1.0', expected: 'current is Version: 0.1.0' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should standardize version formats', async () => {
            const variations = [
                { input: 'V1.0.0', expected: 'Version: 1.0.0' },
                { input: 'VERSION 2.3.4', expected: 'Version: 2.3.4' },
                { input: 'Release-1.0.0', expected: 'Release: 1.0.0' },
                { input: 'BUILD:1.0.0', expected: 'Build: 1.0.0' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('v1.0.0');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: 'v1.0.0'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Current version 1.0.0');
            expect(result.corrections[0].position).toEqual({
                start: 'Current '.length,
                end: 'Current version 1.0.0'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('[URGENT] v1.0.0 release!');
            expect(result.text).toBe('[URGENT] Version: 1.0.0 release!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to explicit versions', async () => {
            const result = await perfect('version 1.0.0');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to prefixed versions', async () => {
            const result = await perfect('v1.0.0');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to implicit versions', async () => {
            const result = await perfect('using 1.0.0');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid version formats', async () => {
            const invalid = [
                'version 1',
                'version 1.0',
                'version 1.0.0.0',
                'version a.b.c',
                'version -1.0.0'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle malformed versions', async () => {
            const malformed = [
                'version',
                'version:',
                'v.',
                'release:'
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
        test('should handle multiple version references', async () => {
            const variations = [
                { 
                    input: 'upgrade from v1.0.0 to version 2.0.0', 
                    expected: 'upgrade from Version: 1.0.0 to Version: 2.0.0'
                },
                { 
                    input: 'comparing rel1.0.0 with build2.0.0', 
                    expected: 'comparing Release: 1.0.0 with Build: 2.0.0'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should handle version references with context', async () => {
            const variations = [
                { 
                    input: 'deploying release v1.0.0 to production', 
                    expected: 'deploying release Version: 1.0.0 to production'
                },
                { 
                    input: 'current build is 2.0.0 stable', 
                    expected: 'current Build: 2.0.0 stable'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should preserve special characters', async () => {
            const result = await perfect('[URGENT] Deploy v1.0.0 (ASAP)');
            expect(result.text).toBe('[URGENT] Deploy Version: 1.0.0 (ASAP)');
        });
    });
});
