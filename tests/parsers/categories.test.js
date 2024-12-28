import { name, perfect } from '../../src/services/parser/parsers/categories.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Categories Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('#dev');
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
            const result = await perfect('#dev');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: expect.stringMatching(/^category_.*_improvement$/),
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
        test('should expand category prefixes', async () => {
            const variations = [
                { input: '#dev', expected: '#Development' },
                { input: '#ui', expected: '#UserInterface' },
                { input: '#qa', expected: '#QualityAssurance' },
                { input: '#ops', expected: '#Operations' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should format compound categories', async () => {
            const variations = [
                { input: '#dev-api', expected: '#DevelopmentApi' },
                { input: '#ui-components', expected: '#UserInterfaceComponents' },
                { input: '#qa-tests', expected: '#QualityAssuranceTests' },
                { input: '#ops-deploy', expected: '#OperationsDeploy' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should format multiple categories', async () => {
            const variations = [
                { 
                    input: '#dev #ui', 
                    expected: '#Development #UserInterface'
                },
                { 
                    input: '#qa #ops', 
                    expected: '#QualityAssurance #Operations'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should format category lists', async () => {
            const variations = [
                { 
                    input: 'categories: dev, ui', 
                    expected: 'Categories: Development, UserInterface'
                },
                { 
                    input: 'tags: qa, ops', 
                    expected: 'Categories: QualityAssurance, Operations'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format nested categories', async () => {
            const variations = [
                { 
                    input: '#dev/api/docs', 
                    expected: 'Category: Development/API/Documentation'
                },
                { 
                    input: 'under ui/components/forms', 
                    expected: 'Category: UserInterface/Components/Forms'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('#dev');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: '#dev'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Task under #dev');
            expect(result.corrections[0].position).toEqual({
                start: 'Task under '.length,
                end: 'Task under #dev'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('[URGENT] #dev task!');
            expect(result.text).toBe('[URGENT] #Development task!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to explicit category lists', async () => {
            const result = await perfect('categories: dev, ui');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to nested categories', async () => {
            const result = await perfect('#dev/api/docs');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to single categories', async () => {
            const result = await perfect('#dev');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid category names', async () => {
            const invalid = [
                '#123dev',
                '#dev!',
                '#@dev',
                '#dev.api'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle malformed categories', async () => {
            const malformed = [
                'categories:',
                'under: ',
                'in /',
                'category: /'
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
        test('should handle multiple category types', async () => {
            const variations = [
                { 
                    input: '#dev/api #ui/forms #qa', 
                    expected: '#Development/API #UserInterface/Forms #QualityAssurance'
                },
                { 
                    input: 'categories: dev-api, ui-forms, qa-tests', 
                    expected: 'Categories: DevelopmentApi, UserInterfaceForms, QualityAssuranceTests'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should handle categories with context', async () => {
            const variations = [
                { 
                    input: 'Task under #dev/api needs #qa review', 
                    expected: 'Task under #Development/API needs #QualityAssurance review'
                },
                { 
                    input: 'Update #ui/components for #ops deployment', 
                    expected: 'Update #UserInterface/Components for #Operations deployment'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should preserve special characters', async () => {
            const result = await perfect('[URGENT] Review #dev/api (#qa)');
            expect(result.text).toBe('[URGENT] Review #Development/API (#QualityAssurance)');
        });
    });
});
