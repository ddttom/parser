import { name, parse } from '../../src/services/parser/parsers/tags.js';

describe('Tags Parser', () => {
  describe('Return Format', () => {
    test('should return correct type property', async () => {
      const result = await parse('#important');
      expect(result.type).toBe(name);
    });

    test('should return metadata with required fields', async () => {
      const result = await parse('#important');
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
    test('should detect single hashtag', async () => {
      const result = await parse('#important');
      expect(result.value).toEqual(['important']);
      expect(result.metadata.pattern).toBe('hashtag');
      expect(result.metadata.originalMatch).toBe('#important');
    });

    test('should detect multiple hashtags', async () => {
      const result = await parse('#frontend #backend');
      expect(result.value).toEqual(['frontend', 'backend']);
      expect(result.metadata.pattern).toBe('hashtag');
      expect(result.metadata.originalMatch).toBe('#frontend #backend');
    });

    test('should detect hashtags in text', async () => {
      const result = await parse('Task for #frontend team with #priority-high');
      expect(result.value).toEqual(['frontend', 'priority-high']);
      expect(result.metadata.pattern).toBe('hashtag');
      expect(result.metadata.originalMatch).toBe('#frontend #priority-high');
    });
  });

  describe('Tag Validation', () => {
    test('should validate tag names', async () => {
      const validTags = [
        'feature',
        'bug-fix',
        'ui_update',
        'v1',
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
        expect(result.value).toContain(expected.toLowerCase());
        expect(result.metadata.pattern).toBe('hashtag');
        expect(result.metadata.originalMatch).toBe(`#${input}`);
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid tag names', async () => {
      const invalidTags = [
        '#123',           // Cannot start with number
        '#!@#',          // Invalid characters
        '#',             // Empty tag
        '# ',            // Space after hash
        '#-start',       // Cannot start with hyphen
        '#.invalid',     // Cannot contain period
        '#tag!',         // Invalid character
        '#tag@',         // Invalid character
        '#tag#',         // Invalid character
        '#tag//'         // Invalid character
      ];

      for (const tag of invalidTags) {
        const result = await parse(tag);
        expect(result).toBeNull();
      }
    });

    test('should handle malformed hashtags', async () => {
      const malformed = [
        '# tag',         // Space between hash and tag
        '#tag space',    // Space in tag
        '#tag.name',     // Period in tag
        '#tag/name',     // Forward slash in tag
        '#tag\\name'     // Backslash in tag
      ];

      for (const tag of malformed) {
        const result = await parse(tag);
        expect(result).toBeNull();
      }
    });
  });
});
