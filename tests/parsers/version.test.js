import { name, parse } from '../../src/services/parser/parsers/version.js';

describe('Version Parser', () => {
    describe('Input Validation', () => {
        test('should handle null input', async () => {
            const result = await parse(null);
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('should handle empty string', async () => {
            const result = await parse('');
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('returns null for text without versions', async () => {
            const result = await parse('Regular text without versions');
            expect(result).toBeNull();
        });
    });

    describe('Pattern Matching', () => {
        test('should detect explicit version markers', async () => {
            const result = await parse('[version:1.0.0]');
            expect(result).toEqual({
                type: 'version',
                value: {
                    major: 1,
                    minor: 0,
                    patch: 0
                },
                metadata: {
                    pattern: 'explicit_version',
                    confidence: 0.95,
                    originalMatch: '[version:1.0.0]'
                }
            });
        });

        test('should detect inferred version references', async () => {
            const formats = [
                'version 1.0.0',
                'v1.0.0'
            ];

            for (const format of formats) {
                const result = await parse(format);
                expect(result.value).toEqual({
                    major: 1,
                    minor: 0,
                    patch: 0
                });
                expect(result.metadata.pattern).toBe('inferred_version');
            }
        });
    });

    describe('Version Validation', () => {
        test('should validate semantic versioning format', async () => {
            const validVersions = [
                '1.0.0',
                '2.3.4',
                '0.1.0'
            ];

            for (const version of validVersions) {
                const result = await parse(`[version:${version}]`);
                expect(result).not.toBeNull();
            }
        });

        test('should reject invalid version formats', async () => {
            const invalidVersions = [
                '1',
                '1.0',
                '1.0.0.0',
                'a.b.c',
                '1.0.x'
            ];

            for (const version of invalidVersions) {
                const result = await parse(`[version:${version}]`);
                expect(result).toBeNull();
            }
        });

        test('should parse version components correctly', async () => {
            const result = await parse('[version:2.3.4]');
            expect(result.value).toEqual({
                major: 2,
                minor: 3,
                patch: 4
            });
        });
    });

    describe('Confidence Scoring', () => {
        test('should have higher confidence for explicit versions', async () => {
            const result = await parse('[version:1.0.0]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test('should have lower confidence for inferred versions', async () => {
            const result = await parse('version 1.0.0');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid version format', async () => {
            const result = await parse('[version:]');
            expect(result).toBeNull();
        });

        test('should handle parser errors gracefully', async () => {
            // Mock validateVersion to throw
            const originalValidate = parse.validateVersion;
            parse.validateVersion = () => {
                throw new Error('Validation error');
            };

            try {
                const result = await parse('[version:1.0.0]');
                expect(result).toEqual({
                    type: 'error',
                    error: 'PARSER_ERROR',
                    message: 'Validation error'
                });
            } finally {
                // Restore original function
                parse.validateVersion = originalValidate;
            }
        });
    });
});
