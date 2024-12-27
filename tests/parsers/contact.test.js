import { name, parse } from '../../src/services/parser/parsers/contact.js';

describe('Contact Parser', () => {
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
  });

  describe('Pattern Matching', () => {
    test('should detect email addresses', async () => {
      const result = await parse('Contact john.doe@example.com');
      expect(result).toEqual({
        type: 'contact',
        value: {
          type: 'email',
          value: 'john.doe@example.com',
          name: 'John Doe'
        },
        metadata: {
          pattern: 'email',
          confidence: 0.95,
          originalMatch: 'john.doe@example.com'
        }
      });
    });

    test('should detect phone numbers', async () => {
      const result = await parse('Call +1-555-123-4567');
      expect(result).toEqual({
        type: 'contact',
        value: {
          type: 'phone',
          value: '+15551234567',
          formatted: '+1-555-123-4567'
        },
        metadata: {
          pattern: 'phone',
          confidence: 0.9,
          originalMatch: '+1-555-123-4567'
        }
      });
    });

    test('should detect contact references', async () => {
      const result = await parse('Meeting with [contact:John Doe]');
      expect(result).toEqual({
        type: 'contact',
        value: {
          type: 'reference',
          name: 'John Doe',
          id: expect.any(String)
        },
        metadata: {
          pattern: 'contact_reference',
          confidence: 0.95,
          originalMatch: '[contact:John Doe]'
        }
      });
    });
  });

  describe('Confidence Scoring', () => {
    test('should have higher confidence for explicit contacts', async () => {
      const result = await parse('[contact:John Smith]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.9);
    });

    test('should have lower confidence for inferred contacts', async () => {
      const result = await parse('call John');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.8);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid contact format', async () => {
      const result = await parse('[contact:]');
      expect(result).toBeNull();
    });

    test('should handle invalid email format', async () => {
      const result = await parse('invalid.email@');
      expect(result).toBeNull();
    });
  });
});
