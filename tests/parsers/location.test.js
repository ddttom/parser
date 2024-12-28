import { name, perfect } from '../../src/services/parser/parsers/location.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Location Parser', () => {
    describe('Return Format', () => {
        test('should return object with text and corrections', async () => {
            const result = await perfect('in room 123');
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
            const result = await perfect('in room 123');
            expect(result.corrections[0]).toEqual(expect.objectContaining({
                type: 'location_improvement',
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
        test('should standardize room locations', async () => {
            const variations = [
                { input: 'in room 123', expected: 'in Conference Room 123' },
                { input: 'at conf room A', expected: 'at Conference Room A' },
                { input: 'in mtg room B', expected: 'in Conference Room B' },
                { input: 'rm 123 floor 3', expected: 'Conference Room 123, Floor 3' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should standardize office locations', async () => {
            const variations = [
                { input: 'in ofc 456', expected: 'in Office 456' },
                { input: 'at office A12', expected: 'at Office A12' },
                { input: 'ofc B34 flr 2', expected: 'Office B34, Floor 2' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should standardize building locations', async () => {
            const variations = [
                { input: 'in bldg B', expected: 'in Building B' },
                { input: 'at building C', expected: 'at Building C' },
                { input: 'bldg D lvl 5', expected: 'Building D, Floor 5' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should expand location abbreviations', async () => {
            const variations = [
                { input: 'in west wing', expected: 'in West Wing' },
                { input: 'at east bldg', expected: 'at East Building' },
                { input: 'in north conf rm', expected: 'in North Conference Room' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });

    describe('Position Tracking', () => {
        test('should track position of changes at start of text', async () => {
            const result = await perfect('room 123');
            expect(result.corrections[0].position).toEqual({
                start: 0,
                end: 'room 123'.length
            });
        });

        test('should track position of changes with leading text', async () => {
            const result = await perfect('Meeting in room 123');
            expect(result.corrections[0].position).toEqual({
                start: 'Meeting in '.length,
                end: 'Meeting in room 123'.length
            });
        });

        test('should preserve surrounding text', async () => {
            const result = await perfect('URGENT: Meeting in room 123!');
            expect(result.text).toBe('URGENT: Meeting in Conference Room 123!');
        });
    });

    describe('Confidence Levels', () => {
        test('should assign HIGH confidence to specific locations', async () => {
            const result = await perfect('in room 123');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to office locations', async () => {
            const result = await perfect('in office A12');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign HIGH confidence to building locations', async () => {
            const result = await perfect('in building B');
            expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
        });

        test('should assign LOW confidence to inferred locations', async () => {
            const result = await perfect('in the lobby');
            expect(result.corrections[0].confidence).toBe(Confidence.LOW);
        });
    });

    describe('Error Handling', () => {
        test('should handle missing location identifiers', async () => {
            const invalid = [
                'in room',
                'at office',
                'in building'
            ];

            for (const input of invalid) {
                const result = await perfect(input);
                expect(result).toEqual({
                    text: input,
                    corrections: []
                });
            }
        });

        test('should handle invalid floor numbers', async () => {
            const invalid = [
                'room 123 floor',
                'office A12 level',
                'building B floor level'
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
        test('should handle multiple location components', async () => {
            const variations = [
                { 
                    input: 'mtg rm 123 flr 4 west wing', 
                    expected: 'Conference Room 123, Floor 4 West Wing'
                },
                { 
                    input: 'bldg B lvl 3 east', 
                    expected: 'Building B, Floor 3 East Wing'
                }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
                expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
            }
        });

        test('should preserve special characters in surrounding text', async () => {
            const result = await perfect('[URGENT] Meeting in rm 123 (4th floor)');
            expect(result.text).toBe('[URGENT] Meeting in Conference Room 123 (4th floor)');
        });

        test('should handle various floor formats', async () => {
            const variations = [
                { input: 'room 123 fl 4', expected: 'Conference Room 123, Floor 4' },
                { input: 'room 123 lvl 4', expected: 'Conference Room 123, Floor 4' },
                { input: 'room 123 floor 4', expected: 'Conference Room 123, Floor 4' }
            ];

            for (const { input, expected } of variations) {
                const result = await perfect(input);
                expect(result.text).toBe(expected);
            }
        });
    });
});
