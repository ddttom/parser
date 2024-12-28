import { name, parse } from '../../src/services/parser/parsers/categories.js';

describe('Categories Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[category:Work]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[category:Work]');
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
    test('should detect explicit category markers', async () => {
      const result = await parse('[category:Work]');
      expect(result.value).toEqual({
        category: 'Work',
        subcategories: []
      });
      expect(result.metadata.pattern).toBe('explicit_category');
    });

    test('should detect nested categories', async () => {
      const result = await parse('[category:Work/Projects/Active]');
      expect(result.value).toEqual({
        category: 'Work',
        subcategories: ['Projects', 'Active']
      });
      expect(result.metadata.pattern).toBe('nested_category');
    });

    test('should handle multiple levels of nesting', async () => {
      const result = await parse('[category:Work/Projects/Active/High Priority]');
      expect(result.value).toEqual({
        category: 'Work',
        subcategories: ['Projects', 'Active', 'High Priority']
      });
      expect(result.metadata.pattern).toBe('nested_category');
    });

    test('should detect multiple categories', async () => {
      const result = await parse('[category:Work] [category:Projects]');
      expect(result.value).toEqual({
        categories: ['Work', 'Projects']
      });
      expect(result.metadata.pattern).toBe('multiple_categories');
    });

    test('should handle multiple categories with nesting', async () => {
      const result = await parse('[category:Work/Active] [category:Projects/High Priority]');
      expect(result.value).toEqual({
        categories: ['Work/Active', 'Projects/High Priority']
      });
      expect(result.metadata.pattern).toBe('multiple_categories');
    });

    test('should handle inferred categories', async () => {
      const result = await parse('Task with #work tag');
      expect(result.value).toEqual({
        category: 'work',
        subcategories: []
      });
      expect(result.metadata.pattern).toBe('inferred_category');
    });
  });

  describe('Nested Category Validation', () => {
    test('should handle empty subcategories', async () => {
      const result = await parse('[category:Work//Projects]');
      expect(result).toBeNull();
    });

    test('should handle whitespace in nested paths', async () => {
      const result = await parse('[category:Work / Projects / Active]');
      expect(result.value).toEqual({
        category: 'Work',
        subcategories: ['Projects', 'Active']
      });
    });

    test('should validate subcategory names', async () => {
      const invalidPaths = [
        '[category:Work/@Projects]',
        '[category:Work/123Projects]',
        '[category:Work/Projects!]'
      ];

      for (const path of invalidPaths) {
        const result = await parse(path);
        expect(result).toBeNull();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid category format', async () => {
      const invalidFormats = [
        '[category:]',
        '[category: ]',
        '[category:///]',
        '[category:123]',
        '[category:Work!]'
      ];

      for (const format of invalidFormats) {
        const result = await parse(format);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed nested categories', async () => {
      const malformedNested = [
        '[category:Work/]',
        '[category:/Projects]',
        '[category:Work//Projects]',
        '[category:Work/Projects/]'
      ];

      for (const nested of malformedNested) {
        const result = await parse(nested);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid multiple categories', async () => {
      const invalidMultiple = [
        '[category:Work] [category:]',
        '[category:] [category:Projects]',
        '[category:Work] [category:123]'
      ];

      for (const multiple of invalidMultiple) {
        const result = await parse(multiple);
        expect(result).toBeNull();
      }
    });
  });

  describe('Metadata Validation', () => {
    test('should include original match in metadata', async () => {
      const result = await parse('[category:Work/Projects]');
      expect(result.metadata.originalMatch).toBe('[category:Work/Projects]');
    });

    test('should include pattern type in metadata', async () => {
      const result = await parse('[category:Work/Projects]');
      expect(result.metadata.pattern).toBe('nested_category');
    });

    test('should handle pattern type correctly for multiple categories', async () => {
      const result = await parse('[category:Work] [category:Projects]');
      expect(result.metadata.pattern).toBe('multiple_categories');
    });
  });
});
