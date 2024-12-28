import { name, parse } from '../../src/services/parser/parsers/context.js';

describe('Context Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('at the office');
      expect(result.type).toBe(name);
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

});
