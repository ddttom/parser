import { name, parse } from '../../src/services/parser/parsers/tags.js';

describe('Tags Parser', () => {
  describe('Return Format', () => {
    test('should return object with tag key', async () => {
      const result = await parse('#important');
      expect(result).toHaveProperty('tag');
    });

    test('should return null for no matches', async () => {
      const result = await parse('   ');
      expect(result).toBeNull();
    });

    test('should include all required properties', async () => {
      const result = await parse('#important');
      expect(result.tag).toEqual(expect.objectContaining({
        tags: expect.any(Array),
        confidence: expect.any(Number),
        pattern: expect.any(String),
        originalMatch: expect.any(String)
      }));
    });
  });

  describe('Pattern Matching', () => {
    test('should detect single hashtag', async () => {
      const result = await parse('#important');
      expect(result.tag.tags).toEqual(['important']);
    });

    test('should detect multiple hashtags', async () => {
      const result = await parse('#frontend #backend');
      expect(result.tag.tags).toEqual(['frontend', 'backend']);
    });

    test('should detect hashtags in text', async () => {
      const result = await parse('Task for #frontend team with #priority-high');
      expect(result.tag.tags).toEqual(['frontend', 'priority-high']);
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
        expect(result.tag.tags).toContain(tag);
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
        expect(result.tag.tags).toContain(expected.toLowerCase());
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
