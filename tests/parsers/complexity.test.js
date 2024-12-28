import { name, parse } from '../../src/services/parser/parsers/complexity.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Complexity Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[complexity:high]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[complexity:high]');
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
    test('should detect explicit complexity markers', async () => {
      const result = await parse('Task [complexity:high]');
      expect(result).toEqual({
        type: 'complexity',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'explicit_complexity',
          confidence: Confidence.HIGH,
          originalMatch: '[complexity:high]'
        }
      });
    });

    test('should detect numeric complexity', async () => {
      const result = await parse('Task [complexity:3]');
      expect(result).toEqual({
        type: 'complexity',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'numeric_complexity',
          confidence: Confidence.HIGH,
          originalMatch: '[complexity:3]'
        }
      });
    });

    test('should detect complexity keywords', async () => {
      const result = await parse('This is a complex task');
      expect(result).toEqual({
        type: 'complexity',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'keyword_complexity',
          confidence: Confidence.MEDIUM,
          originalMatch: 'complex'
        }
      });
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for numeric complexity', async () => {
      const result = await parse('[complexity:3]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for explicit complexity', async () => {
      const result = await parse('[complexity:high]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for keyword patterns', async () => {
      const result = await parse('this is a complex task');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid complexity values', async () => {
      const result = await parse('[complexity:invalid]');
      expect(result).toBeNull();
    });
  });
});
