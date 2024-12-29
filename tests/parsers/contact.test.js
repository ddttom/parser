import { name, perfect } from '../../src/services/parser/parsers/contact.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Contact Parser', () => {
  describe('Return Format', () => {
    test('should return object with text and corrections', async () => {
      const result = await perfect('contact John Smith');
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
      const result = await perfect('contact John Smith');
      expect(result.corrections[0]).toEqual(expect.objectContaining({
        type: 'contact',
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
    test('should handle email addresses', async () => {
      const variations = [
        {
          input: 'contact john.doe@example.com',
          expected: 'contact John Doe <john.doe@example.com>'
        },
        {
          input: 'email from john.doe@example.com',
          expected: 'email from John Doe <john.doe@example.com>'
        },
        {
          input: 'send to john.doe@example.com',
          expected: 'send to John Doe <john.doe@example.com>'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle phone numbers', async () => {
      const variations = [
        {
          input: 'call +1-555-123-4567',
          expected: 'call +1-555-123-4567'
        },
        {
          input: 'phone +1-555-123-4567',
          expected: 'phone +1-555-123-4567'
        },
        {
          input: 'contact at +1-555-123-4567',
          expected: 'contact at +1-555-123-4567'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle name references', async () => {
      const variations = [
        {
          input: 'contact John Smith',
          expected: 'John Smith'
        },
        {
          input: 'reaching out to John Smith',
          expected: 'John Smith'
        },
        {
          input: 'contacting John Smith',
          expected: 'John Smith'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.HIGH);
      }
    });

    test('should handle inferred contacts', async () => {
      const variations = [
        {
          input: 'meet with John Smith',
          expected: 'meet with John Smith'
        },
        {
          input: 'call John Smith',
          expected: 'call John Smith'
        },
        {
          input: 'email John Smith',
          expected: 'email John Smith'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
        expect(result.corrections[0].confidence).toBe(Confidence.MEDIUM);
      }
    });
  });

  describe('Name Handling', () => {
    test('should handle single names', async () => {
      const variations = [
        {
          input: 'contact John',
          expected: 'John'
        },
        {
          input: 'meet with Sarah',
          expected: 'meet with Sarah'
        },
        {
          input: 'call Mike',
          expected: 'call Mike'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
      }
    });

    test('should handle full names', async () => {
      const variations = [
        {
          input: 'contact John Smith',
          expected: 'John Smith'
        },
        {
          input: 'meet with Sarah Johnson',
          expected: 'meet with Sarah Johnson'
        },
        {
          input: 'call Mike Brown',
          expected: 'call Mike Brown'
        }
      ];

      for (const { input, expected } of variations) {
        const result = await perfect(input);
        expect(result.text).toBe(expected);
      }
    });

    test('should handle email addresses with names', async () => {
      const variations = [
        {
          input: 'john.doe@example.com',
          expected: 'John Doe <john.doe@example.com>'
        },
        {
          input: 'sarah.j.smith@example.com',
          expected: 'Sarah J Smith <sarah.j.smith@example.com>'
        },
        {
          input: 'mike_brown@example.com',
          expected: 'Mike Brown <mike_brown@example.com>'
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
    test('should handle invalid email formats', async () => {
      const invalid = [
        'invalid.email@',
        '@invalid.com',
        'invalid@.com',
        'invalid@com'
      ];

      for (const input of invalid) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle invalid phone formats', async () => {
      const invalid = [
        '+1-555-123',
        '555-123-4567',
        '+1-5551234567',
        '+1-555-123-456'
      ];

      for (const input of invalid) {
        const result = await perfect(input);
        expect(result).toEqual({
          text: input,
          corrections: []
        });
      }
    });

    test('should handle malformed expressions', async () => {
      const invalid = [
        'contact',
        'call',
        'email',
        'meet with'
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
