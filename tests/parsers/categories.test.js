import { name, parse } from '../../src/services/parser/parsers/categories.js';

describe('Categories Parser', () => {
  describe('Return Format', () => {
    test('should return object with categories key', async () => {
      const result = await parse('#Work');
      expect(result).toHaveProperty('categories');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('#Work');
      const expectedProps = {
        category: expect.any(String),
        subcategories: expect.any(Array),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      };
      expect(result.categories).toMatchObject(expectedProps);
    });
  });

  describe('Pattern Matching', () => {
    test('should detect multiple hashtag categories', async () => {
      const variations = [
        '#Work #Projects',
        '#Work, #Projects',
        '#Work #Projects #Active'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.categories).toHaveProperty('categories');
        expect(result.categories.categories.length).toBeGreaterThanOrEqual(2);
      }
    });

    test('should detect category lists', async () => {
      const variations = [
        'categories: Work, Projects',
        'tags: Work, Projects, Active',
        'in Work, Projects',
        'under Work, Projects'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.categories).toHaveProperty('categories');
        expect(result.categories.categories.length).toBeGreaterThanOrEqual(2);
      }
    });

    test('should detect nested hashtag categories', async () => {
      const variations = [
        '#Work/Projects/Active',
        '#Projects/Active/High',
        '#Tasks/Work/Important'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.categories).toMatchObject({
          category: expect.any(String),
          subcategories: expect.any(Array)
        });
        expect(result.categories.subcategories.length).toBeGreaterThanOrEqual(1);
      }
    });

    test('should detect nested category expressions', async () => {
      const variations = [
        'under Work/Projects/Active',
        'in Projects/Active/High',
        'category: Tasks/Work/Important'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.categories).toMatchObject({
          category: expect.any(String),
          subcategories: expect.any(Array)
        });
        expect(result.categories.subcategories.length).toBeGreaterThanOrEqual(1);
      }
    });

    test('should detect single hashtags', async () => {
      const variations = [
        '#Work',
        '#Projects',
        '#Important'
      ];

      for (const input of variations) {
        const result = await parse(input);
        expect(result.categories).toMatchObject({
          category: expect.any(String),
          subcategories: []
        });
      }
    });
  });

  describe('Category Name Validation', () => {
    test('should validate category names', async () => {
      const valid = [
        '#Work',
        '#Project123',
        '#Dev-Team',
        '#Important Tasks'
      ];

      for (const input of valid) {
        const result = await parse(input);
        expect(result).not.toBeNull();
      }
    });

    test('should reject invalid category names', async () => {
      const invalid = [
        '#123Work',
        '#Work!',
        '#@Work',
        '#Work.Project'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });

  describe('Nested Category Validation', () => {
    test('should validate nested paths', async () => {
      const valid = [
        '#Work/Projects/Active',
        'under Work/Projects/Dev',
        'category: Tasks/Important/High'
      ];

      for (const input of valid) {
        const result = await parse(input);
        expect(result).not.toBeNull();
        expect(result.categories.subcategories.length).toBeGreaterThan(0);
      }
    });

    test('should reject invalid nested paths', async () => {
      const invalid = [
        '#Work//Projects',
        '#Work/123Projects',
        '#Work/Projects!',
        'under Work/@Projects'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed expressions', async () => {
      const malformed = [
        'categories:',
        'under: ',
        'in /',
        'category: /'
      ];

      for (const input of malformed) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid category lists', async () => {
      const invalid = [
        'categories: ,',
        'tags: Work,,Projects',
        'in: 123, @Work'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });
});
