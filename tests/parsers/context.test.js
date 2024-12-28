import { name, parse } from '../../src/services/parser/parsers/context.js';

describe('Context Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[context:office]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[context:office]');
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

  describe('Context Type Inference', () => {
    test('infers location type', async () => {
      const locations = ['office', 'room', 'building', 'home', 'work'];
      for (const location of locations) {
        const result = await parse(`at ${location}`);
        expect(result.value.type).toBe('location');
      }
    });

    test('infers time type', async () => {
      const times = ['morning', 'afternoon', 'evening', 'night', 'day', 'week'];
      for (const time of times) {
        const result = await parse(`during ${time}`);
        expect(result.value.type).toBe('time');
      }
    });

    test('infers tool type', async () => {
      const tools = ['computer', 'laptop', 'phone', 'device', 'software', 'app'];
      for (const tool of tools) {
        const result = await parse(`using ${tool}`);
        expect(result.value.type).toBe('tool');
      }
    });

    test('infers activity type', async () => {
      const activities = ['meeting', 'call', 'lunch', 'break', 'session'];
      for (const activity of activities) {
        const result = await parse(`during ${activity}`);
        expect(result.value.type).toBe('activity');
      }
    });

    test('defaults to general type for unknown contexts', async () => {
      const result = await parse('at somewhere');
      expect(result.value.type).toBe('general');
    });
  });

  describe('Preposition Patterns', () => {
    test('matches "at" pattern', async () => {
      const result = await parse('at work');
      expect(result.metadata.pattern).toBe('at');
      expect(result.value.context).toBe('work');
    });

    test('matches "in" pattern', async () => {
      const result = await parse('in office');
      expect(result.metadata.pattern).toBe('in');
      expect(result.value.context).toBe('office');
    });

    test('matches "during" pattern', async () => {
      const result = await parse('during lunch');
      expect(result.metadata.pattern).toBe('during');
      expect(result.value.context).toBe('lunch');
    });

    test('matches "using" pattern', async () => {
      const result = await parse('using computer');
      expect(result.metadata.pattern).toBe('using');
      expect(result.value.context).toBe('computer');
    });

    test('handles multiple prepositions correctly', async () => {
      const result = await parse('at work during lunch');
      expect(result.metadata.pattern).toBe('at');
      expect(result.value.context).toBe('work');
    });

    test('handles prepositions with punctuation', async () => {
      const result = await parse('at work, during lunch');
      expect(result.metadata.pattern).toBe('at');
      expect(result.value.context).toBe('work');
    });
  });

  describe('Explicit Pattern', () => {
    test('parses explicit context tag', async () => {
      const result = await parse('[context:meeting room]');
      expect(result.value.context).toBe('meeting room');
      expect(result.metadata.pattern).toBe('explicit');
    });

    test('handles whitespace in explicit context', async () => {
      const result = await parse('[context:home office]');
      expect(result.value.context).toBe('home office');
    });
  });

  describe('Error Handling', () => {
    test('handles malformed explicit context', async () => {
      const result = await parse('[context:]');
      expect(result.type).toBe('error');
    });

    test('handles empty context value', async () => {
      const result = await parse('at ');
      expect(result).toBeNull();
    });

    test('handles invalid context format', async () => {
      const result = await parse('[context:test');
      expect(result.type).toBe('error');
    });
  });

  describe('Metadata Validation', () => {
    test('includes original match in metadata', async () => {
      const result = await parse('at work');
      expect(result.metadata.originalMatch).toBe('at work');
    });

    test('includes pattern type in metadata', async () => {
      const result = await parse('[context:office]');
      expect(result.metadata.pattern).toBe('explicit');
    });
  });
});
