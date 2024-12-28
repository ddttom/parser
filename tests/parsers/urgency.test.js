import { name, parse } from '../../src/services/parser/parsers/urgency.js';

describe('Urgency Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[urgency:high]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[urgency:high]');
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
    test('should detect explicit urgency markers', async () => {
      const result = await parse('[urgency:high]');
      expect(result.value).toEqual({
        level: 'high',
        score: 3
      });
      expect(result.metadata.pattern).toBe('explicit_urgency');
      expect(result.metadata.originalMatch).toBe('[urgency:high]');
    });

    test('should detect urgency with parameters', async () => {
      const result = await parse('[urgency:high(reason=deadline)]');
      expect(result.value).toEqual({
        level: 'high',
        score: 3,
        parameters: {
          reason: 'deadline'
        }
      });
      expect(result.metadata.pattern).toBe('parameterized');
      expect(result.metadata.originalMatch).toBe('[urgency:high(reason=deadline)]');
    });

    test('should detect urgency keywords', async () => {
      const keywords = [
        { input: 'URGENT', level: 'high', score: 3, match: 'URGENT: Complete report' },
        { input: 'ASAP', level: 'high', score: 3, match: 'ASAP: Complete report' },
        { input: 'Critical', level: 'critical', score: 4, match: 'Critical: Complete report' },
        { input: 'Time-sensitive', level: 'high', score: 3, match: 'Time-sensitive: Complete report' }
      ];

      for (const { input, level, score, match } of keywords) {
        const result = await parse(`${input}: Complete report`);
        expect(result.value).toEqual({
          level,
          score,
          keyword: input.toLowerCase()
        });
        expect(result.metadata.pattern).toBe('keyword');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });

    test('should detect time-based urgency', async () => {
      const expressions = [
        { input: 'Must complete ASAP', match: 'Must complete ASAP' },
        { input: 'Need this right away', match: 'Need this right away' },
        { input: 'Required immediately', match: 'Required immediately' },
        { input: 'Do this now', match: 'Do this now' }
      ];

      for (const { input, match } of expressions) {
        const result = await parse(input);
        expect(result.value).toEqual({
          level: 'high',
          score: 3,
          timeBased: true
        });
        expect(result.metadata.pattern).toBe('time_based');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });

    test('should detect multiple urgency indicators', async () => {
      const result = await parse('[urgency:high] URGENT: Complete ASAP');
      expect(result.value).toEqual({
        level: 'critical',
        score: 4,
        indicators: ['high', 'urgent', 'asap']
      });
      expect(result.metadata.pattern).toBe('multiple_indicators');
      expect(result.metadata.originalMatch).toBe('[urgency:high] URGENT: Complete ASAP');
    });
  });

  describe('Urgency Levels', () => {
    test('should handle all urgency levels', async () => {
      const levels = [
        { input: '[urgency:low]', level: 'low', score: 1, match: '[urgency:low]' },
        { input: '[urgency:medium]', level: 'medium', score: 2, match: '[urgency:medium]' },
        { input: '[urgency:high]', level: 'high', score: 3, match: '[urgency:high]' },
        { input: '[urgency:critical]', level: 'critical', score: 4, match: '[urgency:critical]' }
      ];

      for (const { input, level, score, match } of levels) {
        const result = await parse(input);
        expect(result.value.level).toBe(level);
        expect(result.value.score).toBe(score);
        expect(result.metadata.pattern).toBe('explicit_urgency');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });

    test('should normalize urgency values', async () => {
      const variations = [
        { input: 'URGENT', expected: 'high', match: '[urgency:URGENT]' },
        { input: 'Critical', expected: 'critical', match: '[urgency:Critical]' },
        { input: 'Normal', expected: 'medium', match: '[urgency:Normal]' }
      ];

      for (const { input, expected, match } of variations) {
        const result = await parse(`[urgency:${input}]`);
        expect(result.value.level).toBe(expected);
        expect(result.metadata.pattern).toBe('explicit_urgency');
        expect(result.metadata.originalMatch).toBe(match);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid urgency format', async () => {
      const result = await parse('[urgency:]');
      expect(result).toBeNull();
    });

    test('should handle empty urgency value', async () => {
      const result = await parse('[urgency: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[urgency:high()]',
        '[urgency:high(reason)]',
        '[urgency:high(reason=)]',
        '[urgency:high(=deadline)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid urgency levels', async () => {
      const invalidLevels = [
        '[urgency:123]',
        '[urgency:@#$]',
        '[urgency:   ]',
        '[urgency:invalid]'
      ];

      for (const level of invalidLevels) {
        const result = await parse(level);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid urgency keywords', async () => {
      const invalidKeywords = [
        'kinda urgent',
        'sort of important',
        'maybe critical'
      ];

      for (const keyword of invalidKeywords) {
        const result = await parse(keyword);
        expect(result).toBeNull();
      }
    });
  });
});
