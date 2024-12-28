import { name, parse } from '../../src/services/parser/parsers/priority.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Priority Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[priority:high]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[priority:high]');
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
    test('should detect explicit priority markers', async () => {
      const result = await parse('[priority:high]');
      expect(result).toEqual({
        type: 'priority',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'explicit_priority',
          confidence: Confidence.HIGH,
          originalMatch: '[priority:high]'
        }
      });
    });

    test('should detect priority hashtags', async () => {
      const result = await parse('Task #urgent');
      expect(result).toEqual({
        type: 'priority',
        value: {
          level: 'urgent',
          score: 4
        },
        metadata: {
          pattern: 'hashtag',
          confidence: Confidence.HIGH,
          originalMatch: '#urgent'
        }
      });
    });

    test('should detect priority keywords', async () => {
      const result = await parse('High priority task');
      expect(result).toEqual({
        type: 'priority',
        value: {
          level: 'high',
          score: 3
        },
        metadata: {
          pattern: 'keyword',
          confidence: Confidence.MEDIUM,
          originalMatch: 'high priority'
        }
      });
    });

    test('should detect multiple priority indicators', async () => {
      const result = await parse('[priority:high] #urgent High priority task');
      expect(result).toEqual({
        type: 'priority',
        value: {
          level: 'urgent',
          score: 4,
          indicators: ['high', 'urgent', 'high']
        },
        metadata: {
          pattern: 'multiple_indicators',
          confidence: Confidence.HIGH,
          originalMatch: '[priority:high] #urgent High priority'
        }
      });
    });
  });

  describe('Priority Levels', () => {
    test('should handle all priority levels', async () => {
      const levels = [
        { input: '[priority:critical]', level: 'critical', score: 5 },
        { input: '[priority:urgent]', level: 'urgent', score: 4 },
        { input: '[priority:high]', level: 'high', score: 3 },
        { input: '[priority:medium]', level: 'medium', score: 2 },
        { input: '[priority:low]', level: 'low', score: 1 }
      ];

      for (const { input, level, score } of levels) {
        const result = await parse(input);
        expect(result.value.level).toBe(level);
        expect(result.value.score).toBe(score);
      }
    });

    test('should handle priority aliases', async () => {
      const aliases = [
        { input: '#asap', level: 'urgent' },
        { input: '#important', level: 'high' },
        { input: '#normal', level: 'medium' },
        { input: '#minor', level: 'low' }
      ];

      for (const { input, level } of aliases) {
        const result = await parse(input);
        expect(result.value.level).toBe(level);
      }
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[priority:high]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for hashtag patterns', async () => {
      const result = await parse('#urgent');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for keyword patterns', async () => {
      const result = await parse('high priority task');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have LOW confidence for implicit patterns', async () => {
      const result = await parse('high priority');
      expect(result.metadata.confidence).toBe(Confidence.LOW);
    });

    test('should have HIGH confidence for multiple indicators', async () => {
      const result = await parse('[priority:high] #urgent');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have consistent confidence for same pattern type', async () => {
      const result1 = await parse('[priority:high]');
      const result2 = await parse('[priority:urgent]');
      expect(result1.metadata.confidence).toBe(result2.metadata.confidence);
      expect(result1.metadata.confidence).toBe(Confidence.HIGH);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid priority format', async () => {
      const result = await parse('[priority:]');
      expect(result).toBeNull();
    });

    test('should handle empty priority value', async () => {
      const result = await parse('[priority: ]');
      expect(result).toBeNull();
    });

    test('should handle invalid priority levels', async () => {
      const invalidLevels = [
        '[priority:invalid]',
        '[priority:123]',
        '[priority:!@#]'
      ];

      for (const level of invalidLevels) {
        const result = await parse(level);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed hashtags', async () => {
      const invalidTags = [
        '#',
        '# ',
        '#123',
        '#!@#'
      ];

      for (const tag of invalidTags) {
        const result = await parse(tag);
        expect(result).toBeNull();
      }
    });
  });
});
