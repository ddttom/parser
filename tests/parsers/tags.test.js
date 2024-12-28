import { name, parse } from '../../src/services/parser/parsers/tags.js';
import { Confidence } from '../../src/services/parser/utils/confidence.js';

describe('Tags Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('[tag:important]');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('[tag:important]');
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
    test('should detect explicit tag markers', async () => {
      const result = await parse('[tag:important]');
      expect(result).toEqual({
        type: 'tag',
        value: ['important'],
        metadata: {
          pattern: 'explicit_tag',
          confidence: Confidence.HIGH,
          originalMatch: '[tag:important]'
        }
      });
    });

    test('should detect tag with parameters', async () => {
      const result = await parse('[tag:feature(type=enhancement)]');
      expect(result).toEqual({
        type: 'tag',
        value: ['feature'],
        parameters: {
          type: 'enhancement'
        },
        metadata: {
          pattern: 'parameterized_tag',
          confidence: Confidence.HIGH,
          originalMatch: '[tag:feature(type=enhancement)]'
        }
      });
    });

    test('should detect hashtags', async () => {
      const result = await parse('#frontend #backend');
      expect(result).toEqual({
        type: 'tag',
        value: ['frontend', 'backend'],
        metadata: {
          pattern: 'hashtag',
          confidence: Confidence.MEDIUM,
          originalMatch: '#frontend #backend'
        }
      });
    });

    test('should detect multiple tag formats', async () => {
      const result = await parse('[tag:important] #frontend #backend');
      expect(result).toEqual({
        type: 'tag',
        value: ['important', 'frontend', 'backend'],
        metadata: {
          pattern: 'mixed_format',
          confidence: Confidence.HIGH,
          originalMatch: '[tag:important] #frontend #backend'
        }
      });
    });

    test('should handle tag categories', async () => {
      const result = await parse('#feature/ui');
      expect(result).toEqual({
        type: 'tag',
        value: ['feature/ui'],
        metadata: {
          pattern: 'categorized_tag',
          confidence: Confidence.MEDIUM,
          originalMatch: '#feature/ui'
        }
      });
    });
  });

  describe('Tag Validation', () => {
    test('should validate tag names', async () => {
      const validTags = [
        'feature',
        'bug-fix',
        'ui_update',
        'v1.0.0',
        'api2'
      ];

      for (const tag of validTags) {
        const result = await parse(`#${tag}`);
        expect(result.value).toContain(tag);
      }
    });

    test('should normalize tag names', async () => {
      const variations = [
        { input: 'FEATURE', expected: 'feature' },
        { input: 'Bug-Fix', expected: 'bug-fix' },
        { input: 'UI_Update', expected: 'ui_update' }
      ];

      for (const { input, expected } of variations) {
        const result = await parse(`#${input}`);
        expect(result.value).toContain(expected);
      }
    });
  });

  describe('Confidence Levels', () => {
    test('should have HIGH confidence for explicit patterns', async () => {
      const result = await parse('[tag:important]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have HIGH confidence for parameterized patterns', async () => {
      const result = await parse('[tag:feature(type=enhancement)]');
      expect(result.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should have MEDIUM confidence for hashtag patterns', async () => {
      const result = await parse('#frontend');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });

    test('should have consistent confidence for same pattern type', async () => {
      const result1 = await parse('[tag:important]');
      const result2 = await parse('[tag:feature]');
      expect(result1.metadata.confidence).toBe(result2.metadata.confidence);
      expect(result1.metadata.confidence).toBe(Confidence.HIGH);
    });

    test('should maintain MEDIUM confidence for multiple hashtags', async () => {
      const result = await parse('#frontend #backend #api');
      expect(result.metadata.confidence).toBe(Confidence.MEDIUM);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid tag format', async () => {
      const result = await parse('[tag:]');
      expect(result).toBeNull();
    });

    test('should handle empty tag value', async () => {
      const result = await parse('[tag: ]');
      expect(result).toBeNull();
    });

    test('should handle malformed parameters', async () => {
      const invalidParams = [
        '[tag:feature()]',
        '[tag:feature(type)]',
        '[tag:feature(type=)]',
        '[tag:feature(=enhancement)]'
      ];

      for (const param of invalidParams) {
        const result = await parse(param);
        expect(result).toBeNull();
      }
    });

    test('should handle invalid tag names', async () => {
      const invalidTags = [
        '#123',
        '#!@#',
        '#',
        '# ',
        '#-start',
        '#.invalid'
      ];

      for (const tag of invalidTags) {
        const result = await parse(tag);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed hashtags', async () => {
      const malformed = [
        '# tag',
        '#tag!',
        '#tag@',
        '#tag#',
        '#tag//'
      ];

      for (const tag of malformed) {
        const result = await parse(tag);
        expect(result).toBeNull();
      }
    });
  });
});
