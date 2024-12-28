import { name, parse } from '../../src/services/parser/parsers/tags.js';

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
      expect(result.value).toEqual(['important']);
      expect(result.metadata.pattern).toBe('explicit_tag');
      expect(result.metadata.originalMatch).toBe('[tag:important]');
    });

    test('should detect tag with parameters', async () => {
      const result = await parse('[tag:feature(type=enhancement)]');
      expect(result.value).toEqual(['feature']);
      expect(result.parameters).toEqual({
        type: 'enhancement'
      });
      expect(result.metadata.pattern).toBe('parameterized_tag');
      expect(result.metadata.originalMatch).toBe('[tag:feature(type=enhancement)]');
    });

    test('should detect hashtags', async () => {
      const result = await parse('#frontend #backend');
      expect(result.value).toEqual(['frontend', 'backend']);
      expect(result.metadata.pattern).toBe('hashtag');
      expect(result.metadata.originalMatch).toBe('#frontend #backend');
    });

    test('should detect multiple tag formats', async () => {
      const result = await parse('[tag:important] #frontend #backend');
      expect(result.value).toEqual(['important', 'frontend', 'backend']);
      expect(result.metadata.pattern).toBe('mixed_format');
      expect(result.metadata.originalMatch).toBe('[tag:important] #frontend #backend');
    });

    test('should handle tag categories', async () => {
      const result = await parse('#feature/ui');
      expect(result.value).toEqual(['feature/ui']);
      expect(result.metadata.pattern).toBe('categorized_tag');
      expect(result.metadata.originalMatch).toBe('#feature/ui');
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
        expect(result.metadata.pattern).toBe('hashtag');
        expect(result.metadata.originalMatch).toBe(`#${tag}`);
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
        expect(result.metadata.pattern).toBe('hashtag');
        expect(result.metadata.originalMatch).toBe(`#${input}`);
      }
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
