import { name, parse } from '../../src/services/parser/parsers/date.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Date Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[date:2024-01-20]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[date:2024-01-20]');
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
    test('should parse ISO format dates', async () => {
      const result = await parse('[date:2024-01-20]');
      expect(result).toMatchObject({
        type: 'date',
        value: {
          date: '2024-01-20',
          format: 'ISO'
        },
        metadata: {
          pattern: 'explicit_iso',
          confidence: Confidence.HIGH
        }
      });
    });

    test('should parse natural language dates', async () => {
      const result = await parse('on January 20th, 2024');
      expect(result).toMatchObject({
        type: 'date',
        value: {
          date: '2024-01-20',
          format: 'natural'
        },
        metadata: {
          pattern: 'natural_date',
          confidence: Confidence.HIGH
        }
      });
    });

    test('should parse relative dates', async () => {
      const result = await parse('tomorrow');
      expect(result).toMatchObject({
        type: 'date',
        value: {
          format: 'relative'
        },
        metadata: {
          pattern: 'relative_date',
          confidence: Confidence.MEDIUM
        }
      });
      expect(result.value.date).toBeDefined();
    });

    test('should parse weekday references', async () => {
      const result = await parse('next Wednesday');
      expect(result).toMatchObject({
        type: 'date',
        value: {
          format: 'weekday'
        },
        metadata: {
          pattern: 'weekday_reference',
          confidence: Confidence.MEDIUM
        }
      });
      expect(result.value.date).toBeDefined();
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit ISO patterns', async () => {
      const result = await parse('[date:2024-01-20]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for natural date patterns', async () => {
      const result = await parse('on January 20th, 2024');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for relative dates', async () => {
      const result = await parse('tomorrow');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have MEDIUM confidence for weekday references', async () => {
      const result = await parse('next Wednesday');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have LOW confidence for implicit patterns', async () => {
      const result = await parse('sometime next week');
      expect(result.metadata.confidence).toBe(Confidence.LOW);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid date format', async () => {
      const result = await parse('[date:invalid]');
      expect(result).toBeNull();
    });

    test('should handle invalid month', async () => {
      const result = await parse('[date:2024-13-01]');
      expect(result).toBeNull();
    });

    test('should handle invalid day', async () => {
      const result = await parse('[date:2024-01-32]');
      expect(result).toBeNull();
    });

    test('should handle malformed date strings', async () => {
      const result = await parse('[date:2024/01/01]');
      expect(result).toBeNull();
    });
  });

  describe('Date Calculations', () => {
    test('should calculate next weekday correctly', async () => {
      const result = await parse('next Wednesday');
      expect(result.value.date).toBeDefined();
      const date = new Date(result.value.date);
      expect(date.getDay()).toBe(3); // Wednesday is day 3
      expect(date > new Date()).toBe(true); // Should be in the future
    });

    test('should handle relative date calculations', async () => {
      const result = await parse('tomorrow');
      expect(result.value.date).toBeDefined();
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(result.value.date).toBe(tomorrow.toISOString().split('T')[0]);
    });
  });

  describe('Metadata Validation', () => {
    test('includes original match in metadata', async () => {
      const result = await parse('[date:2024-01-20]');
      expect(result.metadata.originalMatch).toBe('[date:2024-01-20]');
    });

    test('includes pattern type in metadata', async () => {
      const result = await parse('[date:2024-01-20]');
      expect(result.metadata.pattern).toBe('explicit_iso');
    });

    test('natural pattern is correctly identified', async () => {
      const result = await parse('on January 20th, 2024');
      expect(result.metadata.pattern).toBe('natural_date');
    });
  });
});
