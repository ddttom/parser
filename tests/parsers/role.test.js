import { name, parse, validateRole } from '../../src/services/parser/parsers/role.js';

describe('Role Parser', () => {
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

        test('returns null for text without roles', async () => {
            const result = await parse('Regular text without roles');
            expect(result).toBeNull();
        });
    });

    describe('Pattern Matching', () => {
        test('should detect explicit role markers', async () => {
            const result = await parse('[role:developer]');
            expect(result).toEqual({
                type: 'role',
                value: {
                    role: 'developer',
                    originalName: 'developer'
                },
                metadata: {
                    pattern: 'explicit',
                    confidence: 0.95,
                    originalMatch: '[role:developer]'
                }
            });
        });

        test('should detect inferred roles', async () => {
            const result = await parse('acting as developer');
            expect(result).toEqual({
                type: 'role',
                value: {
                    role: 'developer',
                    originalName: 'developer'
                },
                metadata: {
                    pattern: 'inferred',
                    confidence: 0.8,
                    originalMatch: 'acting as developer'
                }
            });
        });

        test('should handle various role patterns', async () => {
            const patterns = [
                'as developer',
                'acting as developer',
                '[role:developer]'
            ];

            for (const pattern of patterns) {
                const result = await parse(pattern);
                expect(result.value.role).toBe('developer');
            }
        });
    });

    describe('Role Validation', () => {
        test('should accept valid roles', async () => {
            const validRoles = [
                'developer',
                'designer',
                'manager',
                'tester',
                'analyst',
                'admin',
                'lead',
                'coordinator',
                'consultant'
            ];

            for (const role of validRoles) {
                const result = await parse(`[role:${role}]`);
                expect(result.value.role).toBe(role);
            }
        });

        test('should reject invalid roles', async () => {
            const result = await parse('[role:invalid]');
            expect(result).toBeNull();
        });

        test('should handle case insensitivity', async () => {
            const result = await parse('[role:DEVELOPER]');
            expect(result.value.role).toBe('developer');
            expect(result.value.originalName).toBe('DEVELOPER');
        });
    });

    describe('Confidence Scoring', () => {
        test('should have higher confidence for explicit roles', async () => {
            const result = await parse('[role:developer]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test('should have lower confidence for inferred roles', async () => {
            const result = await parse('as developer');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid role format', async () => {
            const result = await parse('[role:]');
            expect(result).toBeNull();
        });

        test('should handle parser errors gracefully', async () => {
            // Save original function
            const originalValidate = parse.validateRole;

            // Replace with mock that throws
            parse.validateRole = () => {
                throw new Error('Validation error');
            };

            try {
                const result = await parse('[role:developer]');
                expect(result).toEqual({
                    type: 'error',
                    error: 'PARSER_ERROR',
                    message: 'Validation error'
                });
            } finally {
                // Restore original function
                parse.validateRole = originalValidate;
            }
        });
    });
});
