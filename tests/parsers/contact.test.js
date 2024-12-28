import { name, parse } from '../../src/services/parser/parsers/contact.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Contact Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[contact:John Smith]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[contact:John Smith]');
      expect(result.metadata).toEqual(expect.objectContaining({
        confidence: expect.any(String),
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
          confidence: Confidence.HIGH,
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
          confidence: Confidence.HIGH,
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
          confidence: Confidence.HIGH,
          originalMatch: '[contact:John Doe]'
        }
      });
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for email addresses', async () => {
      const result = await parse('Contact john.doe@example.com');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for contact references', async () => {
      const result = await parse('[contact:John Smith]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for phone numbers', async () => {
      const result = await parse('Call +1-555-123-4567');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have LOW confidence for inferred contacts', async () => {
      const result = await parse('call John');
      expect(result.metadata.confidence).toBe(Confidence.LOW);
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
