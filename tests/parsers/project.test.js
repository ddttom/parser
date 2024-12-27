import { name, parse } from '../../src/services/parser/parsers/project.js';

describe('Project Parser', () => {
    describe('Input Validation', () => {
        test('handles null input', async () => {
            const result = await parse(null);
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('handles empty string', async () => {
            const result = await parse('');
            expect(result).toEqual({
                type: 'error',
                error: 'INVALID_INPUT',
                message: 'Input must be a non-empty string'
            });
        });

        test('returns null for text without project', async () => {
            const result = await parse('Regular text without project');
            expect(result).toBeNull();
        });
    });

    describe('Project References', () => {
        test('parses explicit project declarations', async () => {
            const result = await parse('project: Alpha');
            expect(result).toEqual({
                type: 'project',
                value: {
                    project: 'Alpha',
                    originalName: 'Alpha'
                },
                metadata: {
                    pattern: 'explicit',
                    confidence: expect.any(Number),
                    originalMatch: 'project: Alpha',
                    indicators: expect.any(Array)
                }
            });
        });

        test('parses project references', async () => {
            const result = await parse('re: Project Beta');
            expect(result.value.project).toBe('Beta');
            expect(result.metadata.pattern).toBe('reference');
        });

        test('parses project identifiers', async () => {
            const result = await parse('PRJ-123');
            expect(result.value.project).toBe('123');
            expect(result.metadata.pattern).toBe('identifier');
        });

        test('parses shorthand notation', async () => {
            const result = await parse('$Frontend');
            expect(result.value.project).toBe('Frontend');
            expect(result.metadata.pattern).toBe('shorthand');
        });

        test('parses contextual references', async () => {
            const result = await parse('Task for project Backend');
            expect(result.value.project).toBe('Backend');
            expect(result.metadata.pattern).toBe('contextual');
        });
    });

    describe('Project Name Validation', () => {
        test('validates minimum length', async () => {
            const result = await parse('project: A');
            expect(result).toBeNull();
        });

        test('validates maximum length', async () => {
            const longName = 'A'.repeat(51);
            const result = await parse(`project: ${longName}`);
            expect(result).toBeNull();
        });

        test('validates allowed characters', async () => {
            const validNames = ['Project123', 'Frontend_API', 'Backend-Service'];
            const invalidNames = ['Project!', 'Front@end', 'Back#end'];

            for (const name of validNames) {
                const result = await parse(`project: ${name}`);
                expect(result).not.toBeNull();
            }

            for (const name of invalidNames) {
                const result = await parse(`project: ${name}`);
                expect(result).toBeNull();
            }
        });

        test('rejects ignored terms', async () => {
            const ignoredTerms = ['the', 'this', 'new', 'project'];
            for (const term of ignoredTerms) {
                const result = await parse(`project: ${term}`);
                expect(result).toBeNull();
            }
        });
    });

    describe('Project Indicators', () => {
        test('detects project terms', async () => {
            const result = await parse('milestone for project Alpha');
            expect(result.metadata.indicators).toContain('project_term');
        });

        test('detects task organization', async () => {
            const result = await parse('story under project Beta');
            expect(result.metadata.indicators).toContain('task_organization');
        });

        test('detects stakeholders', async () => {
            const result = await parse('client project Gamma');
            expect(result.metadata.indicators).toContain('stakeholder');
        });

        test('detects timeline references', async () => {
            const result = await parse('roadmap for project Delta');
            expect(result.metadata.indicators).toContain('timeline');
        });
    });

    describe('Confidence Scoring', () => {
        test('should have higher confidence for explicit projects', async () => {
            const result = await parse('[project:Website Redesign]');
            expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
        });

        test('should have lower confidence for inferred projects', async () => {
            const result = await parse('for website project');
            expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
        });
    });

    describe('Error Handling', () => {
        test('handles validation errors gracefully', async () => {
            const result = await parse('project: Invalid!@#');
            expect(result).toBeNull();
        });

        test('handles parser errors', async () => {
            // Mock validateProjectName to throw
            const originalValidate = parse.validateProjectName;
            parse.validateProjectName = () => {
                throw new Error('Validation error');
            };

            const result = await parse('project: Test');
            expect(result).toEqual({
                type: 'error',
                error: 'PARSER_ERROR',
                message: 'Validation error'
            });

            // Restore original function
            parse.validateProjectName = originalValidate;
        });
    });
}); 
