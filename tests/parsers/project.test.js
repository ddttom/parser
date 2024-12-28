import { name, perfect } from '../../src/services/parser/parsers/project.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Project Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('re: project alpha');
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
            const result = await perfect('re: project alpha');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: expect.stringMatching(/^project_.*_improvement$/),
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
        test('should expand project abbreviations', async () => {
            const variations = [
                { input: 're: fe-auth', expected: 're: Project Frontend Authentication' },
                { input: 'for be-api', expected: 'for Project Backend API' },
                { input: 'under ui-admin', expected: 'under Project UI Administration' },
                { input: 'regarding qa-sys', expected: 'regarding Project Quality Assurance System' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format project identifiers', async () => {
            const variations = [
                { input: 'PRJ-123', expected: 'Project PRJ-123' },
                { input: 'PROJ-456', expected: 'Project PRJ-456' },
                { input: 'task for PRJ-789', expected: 'task for Project PRJ-789' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should standardize project references', async () => {
            const variations = [
                { input: 'project frontend', expected: 'Project Frontend' },
                { input: 'initiative backend', expected: 'Project Backend' },
                { input: 'program mobile', expected: 'Project Mobile' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should improve project name formatting', async () => {
            const variations = [
                { input: 'project auth_service', expected: 'Project Authentication Service' },
                { input: 'project user-mgmt', expected: 'Project User Management' },
                { input: 'project data_analytics', expected: 'Project Data Analytics' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('project alpha');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: 'project alpha'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Task for project alpha');
            expect(result.corrections[0].position).toEqual({
                start: 'Task for '.length,
                end: 'Task for project alpha'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('[URGENT] Task for project alpha!');
            expect(result.text).toBe('[URGENT] Task for Project Alpha!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to explicit references', async () => {
            const result = await perfect('re: project alpha');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to project identifiers', async () => {
            const result = await perfect('PRJ-123');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to project terms', async () => {
            const result = await perfect('project alpha');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });

        test('should assign LOW confidence to inferred projects', async () => {
            const result = await perfect('alpha');
            expect(result.corrections[0].confidence).toBe(Confidence.LOW);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid project names', async () => {
            const invalidNames = [
                'project 123',
                'project @#$',
                'project    '
            ];

            for (const input of invalidNames) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle malformed references', async () => {
            const malformed = [
                're:',
                're: ',
                'regarding',
                'regarding ',
                'for project',
                'in project'
            ];

            for (const input of malformed) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle invalid identifiers', async () => {
            const invalid = [
                'PRJ-',
                'PRJ-abc',
                'PRJ--123',
                'PRJ-0'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });
    });

    describe('Complex Cases', () => {
        test('should handle multiple project components', async () => {
            const variations = [
                { 
                    input: 'fe-auth-api project', 
                    expected: 'Project Frontend Authentication API'
                },
                { 
                    input: 'qa-ui-admin system', 
                    expected: 'Project Quality Assurance UI Administration System'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should handle project references with context', async () => {
            const variations = [
                { 
                    input: 'task for fe-auth regarding api docs', 
                    expected: 'task for Project Frontend Authentication regarding api docs'
                },
                { 
                    input: 'update from qa-sys about testing', 
                    expected: 'update from Project Quality Assurance System about testing'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should preserve special characters', async () => {
            const result = await perfect('[URGENT] Review PRJ-123 (ASAP)');
            expect(result.text).toBe('[URGENT] Review Project PRJ-123 (ASAP)');
        });
    });
});
