import { name, parse } from '../../src/services/parser/parsers/team.js';

describe('Team Parser', () => {
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

        test('returns null for text without teams', async () => {
            const result = await parse('Regular text without teams');
            expect(result).toBeNull();
        });
    });

    describe('Pattern Matching', () => {
        test('should detect explicit team references', async () => {
            const result = await parse('[team:frontend]');
            expect(result).toEqual({
                type: 'team',
                value: {
                    team: 'frontend'
                },
                metadata: {
                    pattern: 'explicit',
                    confidence: 0.95,
                    originalMatch: '[team:frontend]'
                }
            });
        });

        test('should detect inferred team references', async () => {
            const result = await parse('frontend team');
            expect(result).toEqual({
                type: 'team',
                value: {
                    team: 'frontend'
                },
                metadata: {
                    pattern: 'inferred',
                    confidence: 0.80,
                    originalMatch: 'frontend team'
                }
            });
        });
    });

    describe('Team Validation', () => {
        test('should accept valid teams', async () => {
            const validTeams = [
                'frontend',
                'backend',
                'design',
                'qa',
                'devops',
                'mobile',
                'infrastructure',
                'security',
                'data',
                'platform'
            ];

            for (const team of validTeams) {
                const result = await parse(`[team:${team}]`);
                expect(result.value.team).toBe(team);
            }
        });

        test('should reject invalid teams', async () => {
            const result = await parse('[team:invalid]');
            expect(result).toBeNull();
        });

        test('should handle case insensitivity', async () => {
            const result = await parse('[team:FRONTEND]');
            expect(result.value.team).toBe('frontend');
        });
    });

    describe('Confidence Scoring', () => {
        test('should have higher confidence for explicit teams', async () => {
            const result = await parse('[team:frontend]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test('should have lower confidence for inferred teams', async () => {
            const result = await parse('frontend team');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid team format', async () => {
            const result = await parse('[team:]');
            expect(result).toBeNull();
        });

        test('should handle parser errors gracefully', async () => {
            // Mock validateTeam to throw
            const originalValidate = parse.validateTeam;
            parse.validateTeam = () => {
                throw new Error('Validation error');
            };

            try {
                const result = await parse('[team:frontend]');
                expect(result).toEqual({
                    type: 'error',
                    error: 'PARSER_ERROR',
                    message: 'Validation error'
                });
            } finally {
                // Restore original function
                parse.validateTeam = originalValidate;
            }
        });
    });
});
