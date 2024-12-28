import { name, parse } from '../../src/services/parser/parsers/urgency.js';

describe('Urgency Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('URGENT: Complete report');
      expect(result.type).toBe(name);
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });
  });

  describe('Pattern Matching', () => {
    test('should detect time-based urgency', async () => {
      const expressions = [
        { input: 'Must complete ASAP', match: 'ASAP' },
        { input: 'Need this right away', match: 'right away' },
        { input: 'Required immediately', match: 'immediately' },
        { input: 'Do this right now', match: 'right now' },
        { input: 'Complete as soon as possible', match: 'as soon as possible' }
      ];

      for (const { input, match } of expressions) {
        const result = await parse(input);
        expect(result.value).toEqual({
          level: 'high',
          score: 3,
          timeBased: true
        });
      }
    });

    test('should detect urgency keywords', async () => {
      const keywords = [
        { input: 'URGENT task', level: 'high', keyword: 'urgent' },
        { input: 'Critical issue', level: 'high', keyword: 'critical' },
        { input: 'Important meeting', level: 'high', keyword: 'important' },
        { input: 'High priority task', level: 'high', keyword: 'priority' },
        { input: 'Normal priority', level: 'medium', keyword: 'normal' },
        { input: 'Low priority', level: 'low', keyword: 'low' }
      ];

      for (const { input, level, keyword } of keywords) {
        const result = await parse(input);
        expect(result.value).toEqual({
          level,
          score: level === 'high' ? 3 : level === 'medium' ? 2 : 1,
          keyword
        });
      }
    });
  });

  describe('Urgency Levels', () => {
    test('should handle all urgency levels', async () => {
      const levels = [
        { input: 'routine task', level: 'low', score: 1 },
        { input: 'normal priority', level: 'medium', score: 2 },
        { input: 'urgent task', level: 'high', score: 3 }
      ];

      for (const { input, level, score } of levels) {
        const result = await parse(input);
        expect(result.value.level).toBe(level);
        expect(result.value.score).toBe(score);
      }
    });

    test('should normalize urgency values', async () => {
      const variations = [
        { input: 'URGENT', expected: 'high' },
        { input: 'CRITICAL', expected: 'high' },
        { input: 'IMPORTANT', expected: 'high' },
        { input: 'NORMAL', expected: 'medium' },
        { input: 'LOW', expected: 'low' }
      ];

      for (const { input, expected } of variations) {
        const result = await parse(input);
        expect(result.value.level).toBe(expected);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid urgency keywords', async () => {
      const invalidKeywords = [
        'kinda urgent',
        'sort of important',
        'maybe critical',
        'somewhat urgent',
        'slightly important'
      ];

      for (const keyword of invalidKeywords) {
        const result = await parse(keyword);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed time expressions', async () => {
      const malformed = [
        'do it soon',
        'need it quick',
        'hurry up',
        'fast please',
        'rush it'
      ];

      for (const expr of malformed) {
        const result = await parse(expr);
        expect(result).toBeNull();
      }
    });
  });
});
