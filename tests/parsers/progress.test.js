import { name, parse } from '../../src/services/parser/parsers/progress.js';

describe('Progress Parser', () => {
  describe('Return Format', () => {
    test('should return object with progress key', async () => {
      const result = await parse('Task is 75% complete');
      expect(result).toHaveProperty('progress');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('Task is 75% complete');
      const expectedProps = {
        percentage: expect.any(Number),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      };
      expect(result.progress).toMatchObject(expectedProps);
    });
  });

  describe('Pattern Matching', () => {
    test('should detect percentage patterns', async () => {
      const result = await parse('Task is 50% complete');
      expect(result.progress).toMatchObject({
        percentage: 50
      });
    });

    test('should handle various completion terms', async () => {
      const terms = [
        { input: '25% complete', percentage: 25 },
        { input: '50% done', percentage: 50 },
        { input: '75% finished', percentage: 75 }
      ];

      for (const { input, percentage } of terms) {
        const result = await parse(input);
        expect(result.progress).toMatchObject({ percentage });
      }
    });

    test('should detect progress in context', async () => {
      const contexts = [
        'Project is now 30% complete',
        'Task progress: 45% done',
        'Development is 60% finished',
        'Implementation: 75% complete'
      ];

      for (const input of contexts) {
        const result = await parse(input);
        expect(result.progress.percentage).toBeGreaterThan(0);
      }
    });
  });

  describe('Percentage Validation', () => {
    test('should handle valid percentage range', async () => {
      const percentages = [
        { input: '0% complete', percentage: 0 },
        { input: '25% complete', percentage: 25 },
        { input: '50% complete', percentage: 50 },
        { input: '75% complete', percentage: 75 },
        { input: '100% complete', percentage: 100 }
      ];

      for (const { input, percentage } of percentages) {
        const result = await parse(input);
        expect(result.progress.percentage).toBe(percentage);
      }
    });

    test('should reject invalid percentages', async () => {
      const invalidPercentages = [
        '-10% complete',
        '101% complete',
        '150% complete',
        'abc% complete'
      ];

      for (const input of invalidPercentages) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed percentages', async () => {
      const malformed = [
        '% complete',
        'percent complete',
        '75 percent complete',
        '75%% complete'
      ];

      for (const input of malformed) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle missing completion terms', async () => {
      const missing = [
        '75%',
        '75% of',
        '75% the',
        '75% in'
      ];

      for (const input of missing) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid formats', async () => {
      const invalid = [
        'complete 75%',
        'done 75%',
        'finished 75%',
        '75 complete%'
      ];

      for (const input of invalid) {
        const result = await parse(input);
        expect(result).toBeNull();
      }
    });
  });
});
