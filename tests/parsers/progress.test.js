import { name, parse } from '../../src/services/parser/parsers/progress.js';

describe('Progress Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[progress:75%]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[progress:75%]');
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
    test('should detect explicit progress markers', async () => {
      const result = await parse('[progress:75%]');
      expect(result.value).toEqual({
        percentage: 75,
        description: null
      });
      expect(result.metadata.pattern).toBe('explicit');
      expect(result.metadata.originalMatch).toBe('[progress:75%]');
    });

    test('should detect progress with description', async () => {
      const result = await parse('[progress:75%, coding phase]');
      expect(result.value).toEqual({
        percentage: 75,
        description: 'coding phase'
      });
      expect(result.metadata.pattern).toBe('explicit_with_description');
      expect(result.metadata.originalMatch).toBe('[progress:75%, coding phase]');
    });

    test('should detect percentage patterns', async () => {
      const result = await parse('Task is 50% complete');
      expect(result.value).toEqual({
        percentage: 50,
        description: null
      });
      expect(result.metadata.pattern).toBe('percentage');
      expect(result.metadata.originalMatch).toBe('50% complete');
    });

    test('should handle various completion terms', async () => {
      const terms = ['complete', 'done', 'finished', 'completed'];
      for (const term of terms) {
        const result = await parse(`25% ${term}`);
        expect(result.value.percentage).toBe(25);
        expect(result.metadata.pattern).toBe('percentage');
        expect(result.metadata.originalMatch).toBe(`25% ${term}`);
      }
    });

    test('should detect fractional progress', async () => {
      const result = await parse('Task is three-quarters done');
      expect(result.value).toEqual({
        percentage: 75,
        description: null
      });
      expect(result.metadata.pattern).toBe('fractional');
      expect(result.metadata.originalMatch).toBe('three-quarters done');
    });
  });

  describe('Percentage Validation', () => {
    test('should handle valid percentage range', async () => {
      const percentages = [0, 25, 50, 75, 100];
      for (const percentage of percentages) {
        const result = await parse(`[progress:${percentage}%]`);
        expect(result.value.percentage).toBe(percentage);
        expect(result.metadata.pattern).toBe('explicit');
      }
    });

    test('should handle decimal percentages', async () => {
      const result = await parse('[progress:33.3%]');
      expect(result.value.percentage).toBe(33.3);
      expect(result.metadata.pattern).toBe('explicit');
    });

    test('should reject invalid percentages', async () => {
      const invalidPercentages = [-10, 101, 150, 'abc'];
      for (const percentage of invalidPercentages) {
        const result = await parse(`[progress:${percentage}%]`);
        expect(result).toBeNull();
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid progress format', async () => {
      const result = await parse('[progress:]');
      expect(result).toBeNull();
    });

    test('should handle empty progress value', async () => {
      const result = await parse('[progress: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed percentages', async () => {
      const invalidFormats = [
        '[progress:%]',
        '[progress:75]',
        '[progress:75%%]',
        '[progress:percent]'
      ];

      for (const format of invalidFormats) {
        const result = await parse(format);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid descriptions', async () => {
      const invalidDescriptions = [
        '[progress:75%, ]',
        '[progress:75%,]',
        '[progress:75%, @#$]'
      ];

      for (const desc of invalidDescriptions) {
        const result = await parse(desc);
        expect(result).toBeNull();
      }
    });
  });
});
