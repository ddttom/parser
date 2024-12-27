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

    test('should handle undefined input', async () => {
      const result = await parse(undefined);
      expect(result).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });

    test('should handle non-string input', async () => {
      const numberResult = await parse(123);
      expect(numberResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const objectResult = await parse({});
      expect(objectResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });

      const arrayResult = await parse([]);
      expect(arrayResult).toEqual({
        type: 'error',
        error: 'INVALID_INPUT',
        message: 'Input must be a non-empty string'
      });
    });
  });

  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[contact:John Smith]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[contact:John Smith]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
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
    test('should have high confidence (>=0.90) for explicit patterns', async () => {
      const result = await parse('[contact:John Smith]');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.90);
    });

    test('should have medium confidence (>=0.80) for standard patterns', async () => {
      const result = await parse('Contact +1-555-123-4567');
      expect(result.metadata.confidence).toBeGreaterThanOrEqual(0.80);
    });

    test('should have low confidence (<=0.80) for implicit patterns', async () => {
      const result = await parse('call John');
      expect(result.metadata.confidence).toBeLessThanOrEqual(0.80);
    });

    test('should increase confidence for contact at start of text', async () => {
      const result = await parse('[contact:John Smith] is the lead');
      expect(result.metadata.confidence).toBe(0.95); // Base + 0.05
    });

    test('should not increase confidence beyond 1.0', async () => {
      const result = await parse('Contact john.doe@example.com immediately');
      expect(result.metadata.confidence).toBe(0.95);
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
