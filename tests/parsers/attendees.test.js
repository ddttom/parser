import { name, perfect } from '../../src/services/parser/parsers/attendees.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Attendees Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('attendees: John, Sarah');
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
      const result = await perfect('attendees: John, Sarah');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'attendees',
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
    test('should handle explicit attendee lists', async () => {
      const variations = [
        {
          input: 'attendees: John, Sarah',
          expected: 'John and Sarah'
        },
        {
          input: 'participants: John, Sarah, Mike',
          expected: 'John, Sarah, and Mike'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle attendees with roles', async () => {
      const variations = [
        {
          input: 'Meeting with @john(host) and @sarah(presenter)',
          expected: 'Meeting with john (host), sarah (presenter)'
        },
        {
          input: '@john(dev), @jane(qa)',
          expected: 'john (dev), jane (qa)'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle single attendee', async () => {
      const variations = [
        {
          input: '1:1 with @mike',
          expected: '1:1 with mike'
        },
        {
          input: 'meeting with John',
          expected: 'meeting with John'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.LOW);
      }
    });

    test('should handle joining/attending', async () => {
      const variations = [
        {
          input: 'joining: John, Sarah',
          expected: 'John and Sarah'
        },
        {
          input: 'attending: John, Sarah, Mike',
          expected: 'John, Sarah, and Mike'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid patterns', async () => {
      const invalid = [
        '@@@@',
        '@()',
        '@name()',
        'attendees:',
        'joining:'
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
});
