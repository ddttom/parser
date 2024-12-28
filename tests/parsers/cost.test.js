import { name, perfect } from '../../src/services/parser/parsers/cost.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Cost Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('costs $100');
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
            const result = await perfect('costs $100');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: expect.stringMatching(/^cost_.*_improvement$/),
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
        test('should format natural cost expressions', async () => {
            const variations = [
                { input: 'costs $99.99', expected: 'Cost: $99.99' },
                { input: 'price: $150.00', expected: 'Cost: $150.00' },
                { input: 'budget is $200', expected: 'Cost: $200.00' },
                { input: 'estimated to be $500', expected: 'Cost: $500.00' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format amount expressions', async () => {
            const variations = [
                { input: 'amount: $150', expected: 'Amount: $150.00' },
                { input: 'total of $200', expected: 'Amount: $200.00' },
                { input: 'sum is $250.50', expected: 'Amount: $250.50' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should format currency expressions', async () => {
            const variations = [
                { input: '$200 for project', expected: '$200.00 for project' },
                { input: '£150 total', expected: '£150.00 total' },
                { input: '€100.5 budget', expected: '€100.50 budget' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should standardize currency formats', async () => {
            const variations = [
                { input: 'costs £75.5', expected: 'Cost: £75.50' },
                { input: 'price is €120', expected: 'Cost: €120.00' },
                { input: 'budget: $199.99', expected: 'Cost: $199.99' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('$100 budget');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: '$100'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Task costs $100');
            expect(result.corrections[0].position).toEqual({
                start: 'Task '.length,
                end: 'Task costs $100'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('[URGENT] Budget is $100!');
            expect(result.text).toBe('[URGENT] Cost: $100.00!');
        });
    });

    describe('Number Formats', () => {
        test('should format thousands with k suffix', async () => {
            const variations = [
                { input: 'costs $1.5k', expected: 'Cost: $1,500.00' },
                { input: 'budget is $2k', expected: 'Cost: $2,000.00' },
                { input: 'price: $5.5k', expected: 'Cost: $5,500.00' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should format comma-separated thousands', async () => {
            const variations = [
                { input: 'costs $1,500', expected: 'Cost: $1,500.00' },
                { input: 'budget is $2,000', expected: 'Cost: $2,000.00' },
                { input: 'price: $10,500.50', expected: 'Cost: $10,500.50' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to explicit costs', async () => {
            const result = await perfect('costs $100');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to currency amounts', async () => {
            const result = await perfect('$100.00');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to amount references', async () => {
            const result = await perfect('amount is $100');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid number formats', async () => {
            const invalid = [
                'costs $abc',
                'price is $1.2.3',
                'budget: $'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle negative numbers', async () => {
            const invalid = [
                'costs $-50.00',
                'price is -$100',
                'budget: £-200'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle invalid decimal formats', async () => {
            const invalid = [
                'costs $50.123',
                'price is $100.0',
                'budget: £200.5'
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
        test('should handle multiple cost components', async () => {
            const variations = [
                { 
                    input: 'budget $100 with total $150', 
                    expected: 'Cost: $100.00 with Amount: $150.00'
                },
                { 
                    input: 'costs $200 and price is $250', 
                    expected: 'Cost: $200.00 and Cost: $250.00'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should handle cost references with context', async () => {
            const variations = [
                { 
                    input: 'project with budget $500k', 
                    expected: 'project with Cost: $500,000.00'
                },
                { 
                    input: 'total amount needed is $750', 
                    expected: 'total Amount: $750.00 needed'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });

        test('should preserve special characters', async () => {
            const result = await perfect('[URGENT] Review cost ($1.5k)');
            expect(result.text).toBe('[URGENT] Review Cost: $1,500.00');
        });
    });
});
