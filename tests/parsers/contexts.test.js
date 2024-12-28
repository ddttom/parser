import { name, parse } from '../../src/services/parser/parsers/contexts.js';

describe('Contexts Parser', () => {
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

  describe('Pattern Matching', () => {
    test('should detect @ symbol contexts', async () => {
      const variations = [
        'Task @home',
        'Working @office',
        'Using @computer'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          context: expect.any(String),
          type: expect.any(String)
        });
      }
    });

    test('should detect multiple @ contexts', async () => {
      const variations = [
        'Task @home @computer',
        '@office @morning @computer',
        '@home @evening @computer'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value).toHaveProperty('contexts');
        expect(result.value.contexts.length).toBeGreaterThan(1);
      }
    });

    test('should detect parameterized contexts', async () => {
      const variations = [
        '@office(desk)',
        '@home(study)',
        '@computer(laptop)'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          context: expect.any(String),
          type: expect.any(String),
          parameter: expect.any(String)
        });
      }
    });

    test('should detect natural language contexts', async () => {
      const variations = [
        'at the office',
        'in the morning',
        'while at home',
        'during afternoon'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.value).toEqual({
          context: expect.any(String),
          type: expect.any(String)
        });
      }
    });
  });

  describe('Context Types', () => {
    test('should identify location contexts', async () => {
      const locations = [
        { input: '@home', context: 'home', type: 'location' },
        { input: '@office', context: 'office', type: 'location' },
        { input: 'at the office', context: 'office', type: 'location' }
      ];

      for (const { input, context, type } of locations) {
        const result = await parse(input);
        expect(result.value).toEqual(expect.objectContaining({ context, type }));
      }
    });

    test('should identify tool contexts', async () => {
      const tools = [
        { input: '@computer', context: 'computer', type: 'tool' },
        { input: 'using computer', context: 'computer', type: 'tool' }
      ];

      for (const { input, context, type } of tools) {
        const result = await parse(input);
        expect(result.value).toEqual(expect.objectContaining({ context, type }));
      }
    });

    test('should identify time contexts', async () => {
      const times = [
        { input: '@morning', context: 'morning', type: 'time' },
        { input: '@afternoon', context: 'afternoon', type: 'time' },
        { input: '@evening', context: 'evening', type: 'time' },
        { input: 'in the morning', context: 'morning', type: 'time' }
      ];

      for (const { input, context, type } of times) {
        const result = await parse(input);
        expect(result.value).toEqual(expect.objectContaining({ context, type }));
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid @ contexts', async () => {
      const invalid = [
        '@',
        '@ ',
        '@123',
        '@!invalid'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid parameters', async () => {
      const invalid = [
        '@office()',
        '@home()',
        '@computer(  )'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed expressions', async () => {
      const malformed = [
        'at the',
        'in',
        'during the',
        'while at'
      ];

      for (const input of malformed) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });
});
