import { name, parse } from '../../src/services/parser/parsers/priority.js';

describe('Priority Parser', () => {
  describe('Return Format', () => {
    test('should return object with priority key', async () => {
      const result = await parse('#high');
      expect(result).toHaveProperty('priority');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('#high');
      expect(result.priority).toEqual(expect.objectContaining({
        level: expect.any(String),
        score: expect.any(Number),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });
  });

  describe('Pattern Matching', () => {
    test('should detect priority hashtags', async () => {
      const result = await parse('Task #urgent');
      expect(result.priority).toEqual(expect.objectContaining({
        level: 'urgent',
        score: 4
      }));
    });

    test('should detect priority keywords', async () => {
      const result = await parse('High priority task');
      expect(result.priority).toEqual(expect.objectContaining({
        level: 'high',
        score: 3
      }));
    });

    test('should detect implicit priority', async () => {
      const result = await parse('This is high priority');
      expect(result.priority).toEqual(expect.objectContaining({
        level: 'high',
        score: 3
      }));
    });

    test('should detect multiple priority indicators', async () => {
      const result = await parse('#urgent High priority task');
      expect(result.priority).toEqual(expect.objectContaining({
        level: 'urgent',
        score: 4,
        indicators: ['urgent', 'high']
      }));
    });
  });

  describe('Priority Levels', () => {
    test('should handle all priority levels', async () => {
      const levels = [
        { input: '#critical', level: 'critical', score: 5 },
        { input: '#urgent', level: 'urgent', score: 4 },
        { input: '#high', level: 'high', score: 3 },
        { input: '#medium', level: 'medium', score: 2 },
        { input: '#low', level: 'low', score: 1 }
      ];

      for (const { input, level, score } of levels) {
        const result = await parse(input);
        expect(result.priority.level).toBe(level);
        expect(result.priority.score).toBe(score);
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
        expect(result.priority.level).toBe(level);
      }
    });
  });

  describe('Error Handling', () => {
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

    test('should handle invalid priority words', async () => {
      const invalidPriorities = [
        'invalid priority',
        '123 priority',
        '!@# priority'
      ];

      for (const priority of invalidPriorities) {
        const result = await parse(priority);
        expect(result).toBeNull();
      }
    });
  });
});
