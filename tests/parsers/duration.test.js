import { name, parse } from '../../src/services/parser/parsers/duration.js';

describe('Duration Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[duration:2h30m]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[duration:2h30m]');
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
    test('should detect explicit duration markers', async () => {
      const result = await parse('Task takes [duration:2h30m]');
      expect(result.value).toEqual({
        hours: 2,
        minutes: 30,
        totalMinutes: 150
      });
      expect(result.metadata.pattern).toBe('explicit_duration');
      expect(result.metadata.originalMatch).toBe('[duration:2h30m]');
    });

    test('should detect natural duration expressions', async () => {
      const result = await parse('Takes about 2 hours and 30 minutes');
      expect(result.value).toEqual({
        hours: 2,
        minutes: 30,
        totalMinutes: 150
      });
      expect(result.metadata.pattern).toBe('natural');
      expect(result.metadata.originalMatch).toBe('2 hours and 30 minutes');
    });

    test('should detect short duration formats', async () => {
      const result = await parse('Duration: 2.5h');
      expect(result.value).toEqual({
        hours: 2,
        minutes: 30,
        totalMinutes: 150
      });
      expect(result.metadata.pattern).toBe('short_duration');
      expect(result.metadata.originalMatch).toBe('2.5h');
    });
  });

  describe('Duration Formats', () => {
    test('should handle hours and minutes format', async () => {
      const result = await parse('[duration:2h30m]');
      expect(result.value).toEqual({
        hours: 2,
        minutes: 30,
        totalMinutes: 150
      });
    });

    test('should handle decimal hours format', async () => {
      const result = await parse('Duration: 2.5h');
      expect(result.value).toEqual({
        hours: 2,
        minutes: 30,
        totalMinutes: 150
      });
    });

    test('should handle minutes only format', async () => {
      const result = await parse('takes 90m');
      expect(result.value).toEqual({
        hours: 1,
        minutes: 30,
        totalMinutes: 90
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid duration format', async () => {
      const result = await parse('[duration:]');
      expect(result).toBeNull();
    });

    test('should handle invalid time values', async () => {
      const result = await parse('[duration:25h]');
      expect(result).toBeNull();
    });
  });
});
