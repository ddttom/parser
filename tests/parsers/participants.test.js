import { name, perfect } from '../../src/services/parser/parsers/participants.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Participants Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('Meeting with john and sarah');
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
            const result = await perfect('Meeting with john and sarah');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: expect.stringMatching(/^participant_.*_improvement$/),
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
        test('should capitalize participant names', async () => {
            const result = await perfect('Meeting with john smith and sarah johnson');
            expect(result.text).toBe('Meeting with John Smith and Sarah Johnson');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });

        test('should expand role abbreviations', async () => {
            const variations = [
                { input: 'john(dev) and sarah(pm)', expected: 'John (Developer) and Sarah (Project Manager)' },
                { input: 'mike(qa) and emma(lead)', expected: 'Mike (QA Engineer) and Emma (Team Lead)' },
                { input: 'alex(eng) and lisa(arch)', expected: 'Alex (Engineer) and Lisa (Architect)' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should format participant lists', async () => {
            const variations = [
                { 
                    input: 'with john,sarah,mike', 
                    expected: 'with John, Sarah and Mike'
                },
                { 
                    input: 'includes john, sarah and mike', 
                    expected: 'includes John, Sarah and Mike'
                },
                { 
                    input: 'has john,sarah,mike,emma', 
                    expected: 'has John, Sarah, Mike and Emma'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
            }
        });

        test('should format mentions', async () => {
            const result = await perfect('with @john and @sarah');
            expect(result.text).toBe('with @John and @Sarah');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('john and sarah');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: 'john and sarah'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Meeting with john and sarah');
            expect(result.corrections[0].position).toEqual({
                start: 'Meeting with '.length,
                end: 'Meeting with john and sarah'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('URGENT: Meeting with john and sarah!');
            expect(result.text).toBe('URGENT: Meeting with John and Sarah!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to role assignments', async () => {
            const result = await perfect('john(dev) and sarah(pm)');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to mentions', async () => {
            const result = await perfect('@john and @sarah');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign MEDIUM confidence to natural lists', async () => {
            const result = await perfect('with john, sarah and mike');
            expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
        });

        test('should assign LOW confidence to implicit lists', async () => {
            const result = await perfect('with john');
            expect(result.corrections[0].confidence).toBe(Confidence.LOW);
        });
    });

    describe('Error Handling', () => {
        test('should handle invalid names gracefully', async () => {
            const invalidNames = [
                'Meeting with 123 and 456',
                'Discussion with @#$ and %^&',
                'Call with    and    '
            ];

            for (const input of invalidNames) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle invalid role formats', async () => {
            const invalidRoles = [
                'john() and sarah()',
                'mike(123) and emma(456)',
                'alex(@#$) and lisa(%^&)'
            ];

            for (const input of invalidRoles) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });
    });

    describe('Complex Cases', () => {
        test('should handle mixed formats', async () => {
            const result = await perfect('Meeting with john(dev), @sarah and mike(qa)');
            expect(result.text).toBe('Meeting with John (Developer), @Sarah and Mike (QA Engineer)');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should preserve special characters in surrounding text', async () => {
            const result = await perfect('[URGENT] Meeting with john and sarah (high priority)');
            expect(result.text).toBe('[URGENT] Meeting with John and Sarah (high priority)');
        });

        test('should handle multiple improvements', async () => {
            const result = await perfect('meeting with john smith(dev) and sarah jones(pm) and @mike');
            expect(result.text).toBe('meeting with John Smith (Developer) and Sarah Jones (Project Manager) and @Mike');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should handle various list formats', async () => {
            const variations = [
                { 
                    input: 'with john,sarah,@mike,emma(dev)', 
                    expected: 'with John, Sarah, @Mike and Emma (Developer)'
                },
                { 
                    input: 'includes john smith, sarah(qa), mike', 
                    expected: 'includes John Smith, Sarah (QA Engineer) and Mike'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });
});
