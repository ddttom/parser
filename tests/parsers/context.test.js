import { name, parse } from '../../src/services/parser/parsers/context.js';

describe('Context Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('at the office');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('at the office');
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
      const variations = [
        { input: 'at the office', context: 'office' },
        { input: 'in the meeting room', context: 'meeting room' },
        { input: 'while at home', context: 'home' },
        { input: 'while in the building', context: 'building' }
      ];

      for (const { input, context } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          context,
          type: 'location'
        });
      }
    });

    test('infers time type', async () => {
      const variations = [
        { input: 'during morning', context: 'morning' },
        { input: 'in the afternoon', context: 'afternoon' },
        { input: 'during the evening', context: 'evening' },
        { input: 'at night', context: 'night' }
      ];

      for (const { input, context } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          context,
          type: 'time'
        });
      }
    });

    test('infers tool type', async () => {
      const variations = [
        { input: 'using the computer', context: 'computer' },
        { input: 'using laptop', context: 'laptop' },
        { input: 'using the phone', context: 'phone' },
        { input: 'using the software', context: 'software' }
      ];

      for (const { input, context } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          context,
          type: 'tool'
        });
      }
    });

    test('infers activity type', async () => {
      const variations = [
        { input: 'during meeting', context: 'meeting' },
        { input: 'during the call', context: 'call' },
        { input: 'during lunch', context: 'lunch' },
        { input: 'during workshop', context: 'workshop' }
      ];

      for (const { input, context } of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          context,
          type: 'activity'
        });
      }
    });

    test('defaults to general type for unknown contexts', async () => {
      const variations = [
        'at somewhere',
        'in someplace',
        'during something',
        'using something'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value.type).toBe('general');
      }
    });
  });

  describe('Preposition Patterns', () => {
    test('matches "at" pattern', async () => {
      const variations = [
        'at work',
        'at the office',
        'at home',
        'at the desk'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.metadata.pattern).toBe('at');
      }
    });

    test('matches "in" pattern', async () => {
      const variations = [
        'in office',
        'in the room',
        'in building',
        'in the space'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.metadata.pattern).toBe('in');
      }
    });

    test('matches "during" pattern', async () => {
      const variations = [
        'during lunch',
        'during the meeting',
        'during break',
        'during session'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.metadata.pattern).toBe('during');
      }
    });

    test('matches "using" pattern', async () => {
      const variations = [
        'using computer',
        'using the laptop',
        'using phone',
        'using software'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.metadata.pattern).toBe('using');
      }
    });

    test('matches "while" patterns', async () => {
      const variations = [
        { input: 'while in office', pattern: 'while_in' },
        { input: 'while at home', pattern: 'while_at' },
        { input: 'while in the meeting', pattern: 'while_in' },
        { input: 'while at work', pattern: 'while_at' }
      ];

      for (const { input, pattern } of variations) {
        const result = await parse(input);
        expect(result.metadata.pattern).toBe(pattern);
      }
    });
  });

  describe('Error Handling', () => {
    test('handles empty context value', async () => {
      const invalid = [
        'at ',
        'in ',
        'during ',
        'using '
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('handles malformed expressions', async () => {
      const malformed = [
        'at the',
        'in the',
        'during the',
        'using the'
      ];

      for (const input of malformed) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });

  describe('Confidence Levels', () => {
    test('assigns HIGH confidence to well-known contexts', async () => {
      const wellKnown = [
        'at the office',
        'during meeting',
        'using computer',
        'in the morning'
      ];

      for (const input of wellKnown) {
        const result = await parse(input);
        expect(result.metadata.confidence).toBe('HIGH');
      }
    });

    test('assigns MEDIUM confidence to common prepositions', async () => {
      const common = [
        'at somewhere',
        'in someplace',
        'during something',
        'using something'
      ];

      for (const input of common) {
        const result = await parse(input);
        expect(result.metadata.confidence).toBe('MEDIUM');
      }
    });
  });
});
