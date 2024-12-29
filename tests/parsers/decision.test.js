import { name, perfect } from '../../src/services/parser/parsers/decision.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Decision Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('decided to use React');
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
            const result = await perfect('decided to use React');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: 'decision',
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

    describe('Pattern Matching', () => {
        test('should handle decided format with rationale', async () => {
            const variations = [
                {
                    input: 'decided to adopt microservices because of scalability needs',
                    expected: 'decided to adopt microservices because of scalability needs'
                },
                {
                    input: 'therefore, decided to use TypeScript because of type safety',
                    expected: 'therefore, decided to use TypeScript because of type safety'
                },
                {
                    input: 'thus, decided to implement CI/CD because of automation needs',
                    expected: 'thus, decided to implement CI/CD because of automation needs'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should handle choice format', async () => {
            const variations = [
                {
                    input: 'choice: implement agile workflow because it fits team better',
                    expected: 'choice: implement agile workflow because it fits team better'
                },
                {
                    input: 'choice: use MongoDB because of flexibility',
                    expected: 'choice: use MongoDB because of flexibility'
                },
                {
                    input: 'therefore, choice: adopt Docker because of containerization',
                    expected: 'therefore, choice: adopt Docker because of containerization'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should handle selected format with alternative', async () => {
            const variations = [
                {
                    input: 'selected React over Angular because of ecosystem',
                    expected: 'selected React over Angular because of ecosystem'
                },
                {
                    input: 'selected MongoDB over PostgreSQL because of flexibility',
                    expected: 'selected MongoDB over PostgreSQL because of flexibility'
                },
                {
                    input: 'selected TypeScript over JavaScript because of type safety',
                    expected: 'selected TypeScript over JavaScript because of type safety'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should handle going with format', async () => {
            const variations = [
                {
                    input: 'going with cloud deployment because of cost efficiency',
                    expected: 'going with cloud deployment because of cost efficiency'
                },
                {
                    input: 'therefore, going with React because of ecosystem',
                    expected: 'therefore, going with React because of ecosystem'
                },
                {
                    input: 'thus, going with agile workflow because of flexibility',
                    expected: 'thus, going with agile workflow because of flexibility'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('decided to use React');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: 'decided to use React'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Meeting: decided to use React');
            expect(result.corrections[0].position).toEqual({
                start: 'Meeting: '.length,
                end: 'Meeting: decided to use React'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('URGENT: decided to use React!');
            expect(result.text).toBe('URGENT: decided to use React!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to decided format', async () => {
            const result = await perfect('decided to use React');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to choice format', async () => {
            const result = await perfect('choice: use MongoDB');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to selected format', async () => {
            const result = await perfect('selected React over Angular');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });

        test('should assign MEDIUM confidence to going with format', async () => {
            const result = await perfect('going with React');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid formats', async () => {
            const invalid = [
                'decided',
                'choice:',
                'selected over',
                'going with'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle decision too short', async () => {
            const text = 'decided to a';
            const result = await perfect(text);
            expect(result).toEqual({
                text,
                corrections: []
            });
        });

        test('should handle decision too long', async () => {
            const text = `decided to ${'a'.repeat(201)}`;
            const result = await perfect(text);
            expect(result).toEqual({
                text,
                corrections: []
            });
        });

        test('should handle rationale too long', async () => {
            const text = `decided to use React because ${'a'.repeat(501)}`;
            const result = await perfect(text);
            expect(result).toEqual({
                text,
                corrections: []
            });
        });
    });
});
